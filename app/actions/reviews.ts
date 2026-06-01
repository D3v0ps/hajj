"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

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

function flashError(bookingId: string, message: string): never {
  const u = new URLSearchParams({ error: message });
  redirect(`/min-sida/bokningar/${bookingId}/recension?${u.toString()}`);
}

/**
 * Kund lämnar omdöme efter resa. Kräver:
 *  - Inloggad användare som äger bokningen.
 *  - Bokningens status är COMPLETED.
 *  - Inget tidigare omdöme finns för (bookingId, userId).
 *  - rating mellan 1 och 5.
 *
 * Använder upsert som extra säkerhet mot dubbla submits (unique-constraint
 * på bookingId+userId säkerställer 1 omdöme per bokning).
 */
export async function submitReview(formData: FormData): Promise<void> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) redirect("/min-sida/bokningar");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true, status: true },
  });
  if (!booking || booking.userId !== user.id) redirect("/min-sida/bokningar");
  if (booking.status !== "COMPLETED") {
    flashError(bookingId, "Du kan lämna omdöme först efter avslutad resa.");
  }

  const rating = parseInt(String(formData.get("rating") ?? "0"), 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    flashError(bookingId, "Välj betyg 1–5 stjärnor.");
  }

  const bodyRaw = String(formData.get("body") ?? "").trim();
  const body = bodyRaw ? bodyRaw.slice(0, 2000) : null;
  const isPublic = formData.get("isPublic") === "on";

  // Förhindra överskrivning: om omdöme redan finns, gör inget.
  const existing = await prisma.review.findUnique({
    where: { bookingId_userId: { bookingId: booking.id, userId: user.id } },
    select: { id: true },
  });
  if (existing) {
    redirect(`/min-sida/bokningar/${booking.id}/recension`);
  }

  try {
    await prisma.review.upsert({
      where: { bookingId_userId: { bookingId: booking.id, userId: user.id } },
      create: {
        bookingId: booking.id,
        userId: user.id,
        rating,
        body,
        isPublic,
      },
      update: {}, // aldrig uppdatera via denna action — 1 omdöme/bokning
    });
  } catch {
    flashError(bookingId, "Kunde inte spara omdömet, försök igen.");
  }

  revalidatePath(`/min-sida/bokningar/${booking.id}`);
  revalidatePath(`/min-sida/bokningar/${booking.id}/recension`);
  redirect(`/min-sida/bokningar/${booking.id}/recension`);
}

/**
 * Admin/staff sätter isPublic-flaggan för moderering. Används för att gömma
 * olämpliga omdömen eller publicera bra.
 */
export async function setReviewPublic(reviewId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!reviewId) redirect("/admin/recensioner");

  // Vi tar checkbox-värdet från formuläret. Om bocken är på får vi "on";
  // annars är fältet helt borta.
  const isPublic = formData.get("isPublic") === "on";

  const before = await prisma.review.findUnique({ where: { id: reviewId }, select: { isPublic: true, rating: true, bookingId: true } });
  await prisma.review.update({
    where: { id: reviewId },
    data: { isPublic },
  });

  // Audit-logg: viktigt eftersom staff annars kan tysta negativa omdömen utan spår.
  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "review.publicityChanged",
    targetType: "Review",
    targetId: reviewId,
    metadata: { from: before?.isPublic ?? null, to: isPublic, rating: before?.rating ?? null, bookingId: before?.bookingId ?? null },
  });

  revalidatePath("/admin/recensioner");
  redirect("/admin/recensioner");
}
