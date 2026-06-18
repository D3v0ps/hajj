"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
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
  amountPaid: z.coerce.number().int().min(0).max(10_000_000).default(0),
  paymentMethod: optStr(40),
  paymentDate: optDate,
  paymentNote: optStr(500),
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
    amountPaid: String(fd.get("amountPaid") ?? "0"),
    paymentMethod: String(fd.get("paymentMethod") ?? ""),
    paymentDate: String(fd.get("paymentDate") ?? ""),
    paymentNote: String(fd.get("paymentNote") ?? ""),
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
      amountPaid: d.amountPaid,
      paymentMethod: d.paymentMethod || null,
      paymentDate: toDate(d.paymentDate),
      paymentNote: d.paymentNote || null,
      notes: d.notes || null,
    },
  });

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "traveler.edited",
    targetType: "Traveler",
    targetId: travelerId,
    metadata: {
      bookingId: existing.bookingId,
      amountPaidBefore: existing.amountPaid,
      amountPaidAfter: d.amountPaid,
    },
  });

  revalidatePath("/admin/resenarer");
  if (existing.bookingId) revalidatePath(`/admin/bokningar/${existing.bookingId}`);
  revalidatePath(`/admin/resenarer/${travelerId}/redigera`);
  redirect(`/admin/resenarer/${travelerId}/redigera?ok=sparat`);
}

/** Snabb-uppdaterar bara betalningsbeloppet — för registrering av t.ex.
 *  en kontantbetalning utan att öppna hela formuläret. Skickar in summerat
 *  belopp (inte delbetalning) — admin lägger ihop själv. */
export async function recordTravelerPayment(travelerId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!travelerId) redirect("/admin/resenarer");

  const amountRaw = String(formData.get("amountPaid") ?? "");
  const method = String(formData.get("paymentMethod") ?? "").trim();
  const dateRaw = String(formData.get("paymentDate") ?? "").trim();
  const note = String(formData.get("paymentNote") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/admin/resenarer");

  const amount = parseInt(amountRaw.replace(/[\s,]/g, ""), 10);
  if (Number.isNaN(amount) || amount < 0 || amount > 10_000_000) {
    redirect(`${returnTo}?error=${encodeURIComponent("Ogiltigt belopp")}`);
  }
  if (method && !PAYMENT_METHODS.includes(method as (typeof PAYMENT_METHODS)[number])) {
    redirect(`${returnTo}?error=${encodeURIComponent("Okänt betalsätt")}`);
  }

  const existing = await prisma.traveler.findUnique({
    where: { id: travelerId },
    select: { bookingId: true, amountPaid: true },
  });
  if (!existing) redirect(`${returnTo}?error=${encodeURIComponent("Resenären hittades inte")}`);

  await prisma.traveler.update({
    where: { id: travelerId },
    data: {
      amountPaid: amount,
      paymentMethod: method || null,
      paymentDate: toDate(dateRaw),
      paymentNote: note || null,
    },
  });

  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "traveler.paymentRecorded",
    targetType: "Traveler",
    targetId: travelerId,
    metadata: { bookingId: existing!.bookingId, before: existing!.amountPaid, after: amount, method },
  });

  revalidatePath("/admin/resenarer");
  revalidatePath("/admin/resegrupper");
  if (existing!.bookingId) revalidatePath(`/admin/bokningar/${existing!.bookingId}`);
  redirect(`${returnTo}?ok=betalning-sparad`);
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

