"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { queueEmail, EMAIL_KIND } from "@/lib/email";
import { SITE } from "@/lib/config";
import { logAudit } from "@/lib/audit";
import type { RefundStatus, BookingStatus } from "@prisma/client";

const MAX_REASON_LEN = 2000;
const MAX_COMMENT_LEN = 2000;

/**
 * Bokningsstatusar där kunden ej längre kan begära avbokning (resan är slutförd
 * eller redan avbokad). Notera: vi sätter INTE booking.status till CANCELLED
 * automatiskt — det är admins beslut efter granskning av begäran.
 */
const BLOCKED_FOR_REFUND_REQUEST: BookingStatus[] = ["COMPLETED", "CANCELLED"];

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  return session.user;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");
  return session.user;
}

function customerBackTo(bookingId: string, q?: Record<string, string>): string {
  const params = q ? new URLSearchParams(q) : null;
  const qs = params ? `?${params.toString()}` : "";
  return `/min-sida/bokningar/${bookingId}/avboka${qs}`;
}

function adminBackTo(bookingId: string, q?: Record<string, string>): string {
  const params = new URLSearchParams(q ?? {});
  return `/admin/bokningar/${bookingId}${params.toString() ? `?${params.toString()}` : ""}`;
}

const requestSchema = z.object({
  reason: z.string().min(1, "Anledning krävs").max(MAX_REASON_LEN, `Anledning får vara max ${MAX_REASON_LEN} tecken`),
});

/**
 * Kunden begär avbokning för sin egen bokning. Sätter refundStatus=REQUESTED,
 * köar mejl till kontoret och loggar anledningen som ett INBOUND-meddelande
 * (icke-internt, så det syns för både kund och kontoret).
 *
 * Booking.status ändras INTE här — det är admins beslut efter granskning.
 */
export async function requestRefund(formData: FormData): Promise<void> {
  const user = await requireUser();

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  if (!bookingId) redirect("/min-sida/bokningar");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      status: true,
      refundStatus: true,
      reference: true,
      package: { select: { title: true } },
      user: { select: { email: true, name: true } },
    },
  });
  if (!booking || booking.userId !== user.id) redirect("/min-sida/bokningar");

  // Får ej begära avbokning om resan redan är genomförd eller redan avbokad.
  if (BLOCKED_FOR_REFUND_REQUEST.includes(booking.status)) {
    redirect(customerBackTo(bookingId, { error: "Bokningen kan inte avbokas i sitt nuvarande tillstånd." }));
  }

  // Idempotent: redan begärt → visa befintlig status istället för att skapa dubbel.
  if (booking.refundStatus !== "NONE") {
    redirect(customerBackTo(bookingId));
  }

  const parsed = requestSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    redirect(customerBackTo(bookingId, { error: parsed.error.issues[0]?.message ?? "Ogiltigt formulär" }));
  }
  const reason = parsed.data!.reason.slice(0, MAX_REASON_LEN);
  const now = new Date();
  const ref = booking.reference.slice(0, 12).toUpperCase();

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        refundStatus: "REQUESTED",
        refundRequestedAt: now,
        refundReason: reason,
      },
    });
    await tx.message.create({
      data: {
        userId: booking.userId,
        bookingId: booking.id,
        direction: "INBOUND",
        isInternal: false,
        authorName: booking.user.name ?? booking.user.email,
        subject: "Avbokningsbegäran",
        body: reason,
      },
    });
  });

  // Köa mejl till kontoret. Faller tyst om SITE.email saknas.
  const officeEmail = SITE.email;
  if (officeEmail) {
    const subject = `Avbokningsbegäran — ${ref} (${booking.package.title})`;
    const body =
      `En kund har begärt avbokning för bokning ${ref}.\n\n` +
      `Paket: ${booking.package.title}\n` +
      `Kund: ${booking.user.name ?? "—"} (${booking.user.email})\n` +
      `Mottagen: ${now.toLocaleString("sv-SE")}\n\n` +
      `Anledning från kunden:\n${reason}\n\n` +
      `Hantera ärendet i admin: /admin/bokningar/${booking.id}`;
    await queueEmail({
      to: officeEmail,
      recipientName: SITE.legalName,
      subject,
      body,
      bookingId: booking.id,
      kind: EMAIL_KIND.REFUND_REQUEST,
    });
  }

  await logAudit({
    actorId: user.id,
    actorEmail: user.email ?? null,
    action: "booking.refundRequested",
    targetType: "Booking",
    targetId: booking.id,
    metadata: { reference: ref, reasonLen: reason.length },
  });

  revalidatePath(`/min-sida/bokningar/${booking.id}`);
  revalidatePath(`/admin/bokningar/${booking.id}`);
  redirect(customerBackTo(bookingId));
}

const ADMIN_STATUSES: RefundStatus[] = ["REQUESTED", "APPROVED", "REJECTED", "PROCESSED"];

const updateSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "PROCESSED"]),
  comment: z.string().max(MAX_COMMENT_LEN).optional(),
});

/**
 * Admin/STAFF uppdaterar refundStatus och lägger eventuell kommentar.
 * Kommentaren lagras alltid som intern Message; vid APPROVED/REJECTED skickas
 * dessutom en kopia som OUTBOUND-meddelande + mejl till kunden.
 *
 * Booking.status ändras INTE automatiskt — admin sätter manuellt
 * t.ex. CANCELLED via det vanliga status-formuläret efter beslut.
 */
export async function updateRefundStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const parsed = updateSchema.safeParse({
    bookingId: formData.get("bookingId"),
    status: formData.get("status"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) {
    const bid = String(formData.get("bookingId") ?? "");
    if (bid) redirect(adminBackTo(bid, { refundError: parsed.error.issues[0]?.message ?? "Ogiltigt formulär" }));
    redirect("/admin/bokningar");
  }
  const { bookingId, status, comment } = parsed.data!;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      refundStatus: true,
      reference: true,
      user: { select: { id: true, email: true, name: true } },
      package: { select: { title: true } },
    },
  });
  if (!booking) redirect("/admin/bokningar");

  // Kräv att en begäran finns — admin ska ej kunna "uppdatera" status på en
  // bokning där kunden ej begärt något (skulle skapa spöksvar till kund).
  if (booking.refundStatus === "NONE") {
    redirect(adminBackTo(bookingId, { refundError: "Ingen avbokningsbegäran att uppdatera." }));
  }
  if (!ADMIN_STATUSES.includes(status)) {
    redirect(adminBackTo(bookingId, { refundError: "Ogiltig status." }));
  }

  const trimmedComment = (comment ?? "").trim().slice(0, MAX_COMMENT_LEN);
  const ref = booking.reference.slice(0, 12).toUpperCase();
  const authorName = admin.name ?? admin.email ?? "Admin";

  // Spara alltid en intern anteckning om vad som hände (även om kommentar saknas).
  const internalBody = trimmedComment
    ? `Status: ${status}\n\n${trimmedComment}`
    : `Status uppdaterad till ${status}.`;

  // Vid APPROVED/REJECTED: skicka även kund-synligt meddelande + mejl.
  const notifyCustomer = status === "APPROVED" || status === "REJECTED";
  const headline =
    status === "APPROVED"
      ? "Din avbokningsbegäran är godkänd."
      : "Din avbokningsbegäran kan tyvärr inte godkännas.";
  const customerBodyText = trimmedComment ? `${headline}\n\n${trimmedComment}` : headline;

  // Kör allt i en transaktion så vi inte får halvfärdigt tillstånd vid fel.
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: { refundStatus: status },
    });
    await tx.message.create({
      data: {
        userId: booking.user.id,
        bookingId: booking.id,
        direction: "OUTBOUND",
        isInternal: true,
        authorName,
        subject: `Avbokning: ${status}`,
        body: internalBody,
      },
    });
    if (notifyCustomer) {
      await tx.message.create({
        data: {
          userId: booking.user.id,
          bookingId: booking.id,
          direction: "OUTBOUND",
          isInternal: false,
          authorName,
          subject: status === "APPROVED" ? "Avbokning godkänd" : "Avbokning avslagen",
          body: customerBodyText,
        },
      });
    }
  });

  if (notifyCustomer && booking.user.email) {
    const subject =
      status === "APPROVED"
        ? `Din avbokning är godkänd — ${ref}`
        : `Beslut om din avbokningsbegäran — ${ref}`;
    const body =
      `Hej ${booking.user.name ?? ""},\n\n` +
      `${customerBodyText}\n\n` +
      `Paket: ${booking.package.title}\n` +
      `Referens: ${ref}\n\n` +
      `Vänliga hälsningar,\n${SITE.name}`;
    await queueEmail({
      to: booking.user.email,
      recipientName: booking.user.name ?? null,
      subject,
      body,
      bookingId: booking.id,
      kind: EMAIL_KIND.REFUND_REQUEST,
    });
  }

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email ?? null,
    action: "booking.refundStatusUpdated",
    targetType: "Booking",
    targetId: booking.id,
    metadata: { reference: ref, status, hasComment: Boolean(trimmedComment) },
  });

  revalidatePath(`/admin/bokningar/${booking.id}`);
  revalidatePath(`/min-sida/bokningar/${booking.id}`);
  revalidatePath(`/min-sida/bokningar/${booking.id}/avboka`);
  redirect(adminBackTo(bookingId, { refundOk: "1" }));
}
