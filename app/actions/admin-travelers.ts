"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");
  return session.user;
}

const PAYMENT_METHODS = ["Kontant", "Swish", "Bankgiro", "Klarna", "Kort", "Faktura", "Annat"] as const;

// Strängfält — alla optional/tomma OK eftersom admin importerar gammal data
// där delar saknas. Längdgränser för att skydda mot enorma input.
const optStr = (max = 200) => z.string().max(max).optional().or(z.literal(""));
const optDate = z.string().optional().or(z.literal(""));

const travelerEditSchema = z.object({
  firstName: z.string().min(1, "Förnamn krävs").max(80),
  lastName: z.string().min(1, "Efternamn krävs").max(80),
  ageCategory: z.enum(["ADULT", "CHILD", "INFANT"]).default("ADULT"),
  email: z.string().email().optional().or(z.literal("")),
  phone: optStr(40),
  address: optStr(),
  personnummer: optStr(13),
  passportNo: optStr(20),
  passportExp: optDate,
  passIssueDate: optDate,
  passIssuePlace: optStr(120),
  birthDate: optDate,
  gender: optStr(8),
  nationality: optStr(80),
  civilStatus: optStr(40),
  occupation: optStr(80),
  birthCountry: optStr(80),
  birthCity: optStr(80),
  roomAssignment: optStr(80),
  flightOut: optStr(120),
  flightReturn: optStr(120),
  notes: optStr(2000),
});

function toDate(s: string | undefined): Date | null {
  if (!s || !s.trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickFormData(fd: FormData) {
  return {
    firstName: String(fd.get("firstName") ?? ""),
    lastName: String(fd.get("lastName") ?? ""),
    ageCategory: (["ADULT", "CHILD", "INFANT"].includes(String(fd.get("ageCategory")))
      ? String(fd.get("ageCategory"))
      : "ADULT") as "ADULT" | "CHILD" | "INFANT",
    email: String(fd.get("email") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    address: String(fd.get("address") ?? ""),
    personnummer: String(fd.get("personnummer") ?? ""),
    passportNo: String(fd.get("passportNo") ?? ""),
    passportExp: String(fd.get("passportExp") ?? ""),
    passIssueDate: String(fd.get("passIssueDate") ?? ""),
    passIssuePlace: String(fd.get("passIssuePlace") ?? ""),
    birthDate: String(fd.get("birthDate") ?? ""),
    gender: String(fd.get("gender") ?? ""),
    nationality: String(fd.get("nationality") ?? ""),
    civilStatus: String(fd.get("civilStatus") ?? ""),
    occupation: String(fd.get("occupation") ?? ""),
    birthCountry: String(fd.get("birthCountry") ?? ""),
    birthCity: String(fd.get("birthCity") ?? ""),
    roomAssignment: String(fd.get("roomAssignment") ?? ""),
    flightOut: String(fd.get("flightOut") ?? ""),
    flightReturn: String(fd.get("flightReturn") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  };
}

/** Sparar ändringar på en resenär. */
export async function editTravelerAdmin(travelerId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!travelerId) redirect("/admin/resenarer");

  const existing = await prisma.traveler.findUnique({
    where: { id: travelerId },
    select: { id: true, bookingId: true, amountPaid: true },
  });
  if (!existing) redirect("/admin/resenarer?error=" + encodeURIComponent("Resenären hittades inte"));

  const parsed = travelerEditSchema.safeParse(pickFormData(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Ogiltigt formulär";
    redirect(`/admin/resenarer/${travelerId}/redigera?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data!;

  await prisma.traveler.update({
    where: { id: travelerId },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      ageCategory: d.ageCategory,
      email: d.email || null,
      phone: d.phone || null,
      address: d.address || null,
      personnummer: d.personnummer || null,
      passportNo: d.passportNo || null,
      passportExp: toDate(d.passportExp),
      passIssueDate: toDate(d.passIssueDate),
      passIssuePlace: d.passIssuePlace || null,
      birthDate: toDate(d.birthDate),
      gender: d.gender || null,
      nationality: d.nationality || null,
      civilStatus: d.civilStatus || null,
      occupation: d.occupation || null,
      birthCountry: d.birthCountry || null,
      birthCity: d.birthCity || null,
      roomAssignment: d.roomAssignment || null,
      flightOut: d.flightOut || null,
      flightReturn: d.flightReturn || null,
      notes: d.notes || null,
    },
  });

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "traveler.edited",
    targetType: "Traveler",
    targetId: travelerId,
    metadata: { bookingId: existing.bookingId },
  });

  revalidatePath("/admin/resenarer");
  if (existing.bookingId) revalidatePath(`/admin/bokningar/${existing.bookingId}`);
  revalidatePath(`/admin/resenarer/${travelerId}/redigera`);
  redirect(`/admin/resenarer/${travelerId}/redigera?ok=sparat`);
}

/** Räknar om Traveler.amountPaid-cachen = SUM av alla betalnings-rader. */
async function recomputeAmountPaid(tx: Prisma.TransactionClient, travelerId: string): Promise<number> {
  const agg = await tx.travelerPayment.aggregate({ where: { travelerId }, _sum: { amount: true } });
  const total = agg._sum.amount ?? 0;
  await tx.traveler.update({ where: { id: travelerId }, data: { amountPaid: total } });
  return total;
}

/** Lägger till EN betalning i resenärens historik (t.ex. en kontant delbetalning).
 *  Uppdaterar amountPaid-cachen transaktionellt. */
export async function addTravelerPayment(travelerId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!travelerId) redirect("/admin/resenarer");

  const amountRaw = String(formData.get("amount") ?? "");
  const method = String(formData.get("method") ?? "").trim();
  const dateRaw = String(formData.get("paidAt") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const returnTo = String(formData.get("returnTo") ?? `/admin/resenarer/${travelerId}/redigera`);

  // Belopp får vara negativt (för korrigering/återbetalning) men inom rimliga gränser.
  const amount = parseInt(amountRaw.replace(/[\s,]/g, ""), 10);
  if (Number.isNaN(amount) || Math.abs(amount) > 10_000_000 || amount === 0) {
    redirect(`${returnTo}?error=${encodeURIComponent("Ange ett belopp (≠ 0)")}`);
  }
  if (method && !PAYMENT_METHODS.includes(method as (typeof PAYMENT_METHODS)[number])) {
    redirect(`${returnTo}?error=${encodeURIComponent("Okänt betalsätt")}`);
  }

  const traveler = await prisma.traveler.findUnique({
    where: { id: travelerId },
    select: { bookingId: true },
  });
  if (!traveler) redirect(`${returnTo}?error=${encodeURIComponent("Resenären hittades inte")}`);

  const total = await prisma.$transaction(async (tx) => {
    await tx.travelerPayment.create({
      data: {
        travelerId,
        amount,
        method: method || null,
        paidAt: toDate(dateRaw) ?? new Date(),
        note: note || null,
        recordedById: admin.id,
      },
    });
    return recomputeAmountPaid(tx, travelerId);
  });

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "traveler.paymentAdded",
    targetType: "Traveler",
    targetId: travelerId,
    metadata: { bookingId: traveler!.bookingId, amount, method, newTotal: total },
  });

  revalidatePath("/admin/resenarer");
  revalidatePath("/admin/resegrupper");
  if (traveler!.bookingId) revalidatePath(`/admin/bokningar/${traveler!.bookingId}`);
  redirect(`${returnTo}?ok=betalning-tillagd`);
}

/** Tar bort en enskild betalnings-rad ur historiken + räknar om cachen. */
export async function deleteTravelerPayment(paymentId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!paymentId) redirect("/admin/resenarer");

  const payment = await prisma.travelerPayment.findUnique({
    where: { id: paymentId },
    select: { travelerId: true, amount: true, traveler: { select: { bookingId: true } } },
  });
  if (!payment) redirect("/admin/resenarer");

  const returnTo = String(formData.get("returnTo") ?? `/admin/resenarer/${payment.travelerId}/redigera`);

  await prisma.$transaction(async (tx) => {
    await tx.travelerPayment.delete({ where: { id: paymentId } });
    await recomputeAmountPaid(tx, payment.travelerId);
  });

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "traveler.paymentDeleted",
    targetType: "Traveler",
    targetId: payment.travelerId,
    metadata: { amount: payment.amount },
  });

  revalidatePath("/admin/resenarer");
  revalidatePath("/admin/resegrupper");
  if (payment.traveler.bookingId) revalidatePath(`/admin/bokningar/${payment.traveler.bookingId}`);
  redirect(`${returnTo}?ok=betalning-borttagen`);
}

/** Radera resenär. Booking.travelerCount uppdateras inte automatiskt — admin
 *  kan justera antal i bokningsvyn om de vill spegla det nya antalet. */
export async function deleteTravelerAdmin(travelerId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!travelerId) redirect("/admin/resenarer");

  const existing = await prisma.traveler.findUnique({
    where: { id: travelerId },
    select: { bookingId: true, firstName: true, lastName: true },
  });
  if (!existing) redirect("/admin/resenarer");

  const returnTo = String(formData.get("returnTo") ?? "/admin/resenarer");

  await prisma.traveler.delete({ where: { id: travelerId } });

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "traveler.deletedByAdmin",
    targetType: "Traveler",
    targetId: travelerId,
    metadata: { bookingId: existing.bookingId, name: `${existing.firstName} ${existing.lastName}` },
  });

  revalidatePath("/admin/resenarer");
  revalidatePath("/admin/resegrupper");
  if (existing.bookingId) revalidatePath(`/admin/bokningar/${existing.bookingId}`);
  redirect(`${returnTo}?ok=resenar-raderad`);
}

