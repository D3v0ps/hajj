"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import { queueEmail, EMAIL_KIND } from "@/lib/email";
import { env } from "@/lib/env";

/**
 * Kund-skickade meddelanden i kundportalen.
 *
 * - `sendCustomerMessage` skapar en INBOUND-rad (riktning sett från kontorets sida) på
 *   kundens namn, kopplad till valfri bokning (eller "Allmän fråga"). Mejl-notis köas till
 *   kontoret så ingen kund-fråga missas. Rate-limit 10/min/användare för att stoppa missbruk.
 * - `markThreadRead` stämplar OUTBOUND (från kontoret), icke-interna meddelanden som lästa
 *   så olästa-räknaren på översikten minskar. Interna anteckningar rörs aldrig.
 */

const messageSchema = z.object({
  body: z.string().min(1, "Skriv ett meddelande").max(4000, "Meddelandet är för långt (max 4000 tecken)"),
  subject: z.string().max(200).optional().or(z.literal("")),
  bookingId: z.string().min(1).optional().or(z.literal("")),
});

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  return session.user;
}

function back(bookingId: string | null, q?: Record<string, string>): string {
  const params = new URLSearchParams(q);
  if (bookingId) params.set("bookingId", bookingId);
  const qs = params.toString();
  return `/min-sida/meddelanden${qs ? `?${qs}` : ""}`;
}

/**
 * Kund skickar nytt meddelande. Validerar input, rate-limitar 10/min/user, sparar
 * Message + köar intern mejl-notis till kontoret. Redirectar tillbaka till tråden.
 */
export async function sendCustomerMessage(formData: FormData): Promise<void> {
  const user = await requireUser();

  const rawBookingId = String(formData.get("bookingId") ?? "").trim();
  // Validera först så vi kan redirecta till rätt tråd vid fel.
  const parsed = messageSchema.safeParse({
    body: String(formData.get("body") ?? "").trim(),
    subject: String(formData.get("subject") ?? "").trim(),
    bookingId: rawBookingId,
  });
  if (!parsed.success) {
    redirect(back(rawBookingId || null, { error: parsed.error.issues[0]?.message ?? "Ogiltigt formulär" }));
  }
  const { body, subject, bookingId } = parsed.data!;

  // Rate-limit per användare (in-memory; OK för en-instans-deployen).
  const rl = rateLimit(`portal-msg:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    redirect(back(bookingId || null, { error: "Du skickar för många meddelanden. Försök igen om en stund." }));
  }

  // Verifiera att bokningen ägs av kunden — annars droppa kopplingen så ingen kan
  // skriva i en främmande tråd.
  let verifiedBookingId: string | null = null;
  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true, reference: true, package: { select: { title: true } } },
    });
    if (!booking || booking.userId !== user.id) {
      redirect(back(null, { error: "Bokningen hittades inte." }));
    }
    verifiedBookingId = booking.id;
  }

  const authorName = user.name || user.email || "Kund";

  try {
    await prisma.message.create({
      data: {
        userId: user.id,
        bookingId: verifiedBookingId,
        direction: "INBOUND", // riktning sett från kontoret: meddelandet kommer in
        isInternal: false,
        authorName,
        subject: subject || null,
        body,
      },
    });
  } catch {
    redirect(back(verifiedBookingId, { error: "Kunde inte spara meddelandet. Försök igen." }));
  }

  // Köa intern notis-mejl till kontoret. Fungerar i degraderat läge utan
  // RESEND_API_KEY — raden ligger kvar som QUEUED tills nyckeln finns.
  const to = env.SITE_EMAIL ?? "info@hajj.karimkhalil.se";
  const refTag = verifiedBookingId ? ` (bokning ${verifiedBookingId.slice(0, 8).toUpperCase()})` : " (allmän fråga)";
  const notisBody =
`Nytt meddelande från ${authorName} <${user.email}>${refTag}:

${subject ? `Ämne: ${subject}\n\n` : ""}${body}

Svara direkt i admin: ${env.APP_URL ?? "https://hajj.karimkhalil.se"}/admin/bokningar${verifiedBookingId ? `/${verifiedBookingId}?tab=meddelanden` : ""}`;
  try {
    await queueEmail({
      to,
      subject: `Nytt meddelande från kund — ${authorName}${subject ? `: ${subject}` : ""}`,
      body: notisBody,
      bookingId: verifiedBookingId,
      kind: EMAIL_KIND.CUSTOMER_MESSAGE,
    });
  } catch {
    // Notis-mejl är best-effort. Meddelandet är redan sparat i DB så kontoret
    // ser det i admin-vyn även om notisen misslyckas.
  }

  revalidatePath("/min-sida/meddelanden");
  revalidatePath("/min-sida");
  if (verifiedBookingId) revalidatePath(`/admin/bokningar/${verifiedBookingId}`);
  redirect(back(verifiedBookingId, { sent: "1" }));
}

/**
 * Markerar alla osedda OUTBOUND-meddelanden (från kontoret, ej interna) som lästa
 * för den inloggade användaren. `bookingId` smalnar av till en tråd; null/undefined
 * = "Allmän" tråden (bokningId is null); "all" = alla trådar.
 *
 * Idempotent — kör bara updateMany med `readAt: null` så befintliga stämplingar
 * lämnas orörda.
 */
export async function markThreadRead(bookingId?: string | null): Promise<void> {
  const user = await requireUser();

  const where: {
    userId: string;
    direction: "OUTBOUND";
    isInternal: false;
    readAt: null;
    bookingId?: string | null;
  } = {
    userId: user.id,
    direction: "OUTBOUND",
    isInternal: false,
    readAt: null,
  };

  if (bookingId === "all" || bookingId === undefined) {
    // alla trådar — lämna bookingId-filter ute
  } else if (bookingId === null || bookingId === "" || bookingId === "general") {
    where.bookingId = null;
  } else {
    // Verifiera ägarskap för säker filter — undvik att stämpla någon annans rader om
    // ett främmande id smyger in.
    const owns = await prisma.booking.findFirst({
      where: { id: bookingId, userId: user.id },
      select: { id: true },
    });
    if (!owns) return;
    where.bookingId = bookingId;
  }

  await prisma.message.updateMany({
    where,
    data: { readAt: new Date() },
  });
}
