"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  return session.user;
}

async function loadOwnedBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: { include: { tiers: true } }, travelers: true, tier: true },
  });
  if (!booking || booking.userId !== userId) redirect("/min-sida");
  return booking;
}

function flashError(bookingId: string, message: string): never {
  const u = new URLSearchParams({ error: message });
  redirect(`/boka/${bookingId}?${u.toString()}`);
}

export async function createBooking(packageId: string, _formData?: FormData): Promise<void> {
  const user = await requireUser();
  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    include: { tiers: { orderBy: { pricePerPerson: "asc" } } },
  });
  if (!pkg) redirect("/");

  const existing = await prisma.booking.findFirst({
    where: { userId: user.id, packageId, status: "DRAFT" },
  });
  if (existing) redirect(`/boka/${existing.id}`);

  const tier = pkg.tiers[0] ?? null;

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      packageId: pkg.id,
      tierId: tier?.id ?? null,
      step: 2,
      travelerCount: 1,
      depositAmount: 5000,
      totalAmount: tier?.pricePerPerson ?? 0,
      contactEmail: user.email ?? undefined,
    },
  });

  redirect(`/boka/${booking.id}`);
}

const roomSchema = z.object({
  tierId: z.string().min(1, "Välj rumstyp"),
  travelerCount: z.coerce.number().int().min(1).max(10),
});

export async function saveRoomChoice(bookingId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);

  const parsed = roomSchema.safeParse({
    tierId: formData.get("tierId"),
    travelerCount: formData.get("travelerCount"),
  });
  if (!parsed.success) flashError(bookingId, parsed.error.issues[0]?.message ?? "Ogiltigt val");

  const tier = booking.package.tiers.find((t) => t.id === parsed.data!.tierId);
  if (!tier) flashError(bookingId, "Ogiltig rumstyp");

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      tierId: tier!.id,
      travelerCount: parsed.data!.travelerCount,
      totalAmount: tier!.pricePerPerson * parsed.data!.travelerCount,
      step: Math.max(booking.step, 3),
    },
  });

  revalidatePath(`/boka/${booking.id}`);
  redirect(`/boka/${booking.id}`);
}

const travelerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  personnummer: z.string().max(13).optional().or(z.literal("")),
  passportNo: z.string().max(20).optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  isMahram: z.string().optional().or(z.literal("")),
  needsAssist: z.string().optional().or(z.literal("")),
});

export async function addTraveler(bookingId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);

  const parsed = travelerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    personnummer: formData.get("personnummer"),
    passportNo: formData.get("passportNo"),
    birthDate: formData.get("birthDate"),
    gender: formData.get("gender"),
    isMahram: formData.get("isMahram"),
    needsAssist: formData.get("needsAssist"),
  });
  if (!parsed.success) flashError(bookingId, parsed.error.issues[0]?.message ?? "Ogiltigt formulär");

  const d = parsed.data!;
  await prisma.traveler.create({
    data: {
      userId: user.id,
      bookingId: booking.id,
      firstName: d.firstName,
      lastName: d.lastName,
      personnummer: d.personnummer || null,
      passportNo: d.passportNo || null,
      birthDate: d.birthDate ? new Date(d.birthDate) : null,
      gender: d.gender || null,
      isMahram: d.isMahram === "on",
      needsAssist: d.needsAssist === "on",
    },
  });

  revalidatePath(`/boka/${booking.id}`);
}

export async function removeTraveler(bookingId: string, travelerId: string): Promise<void> {
  const user = await requireUser();
  await loadOwnedBooking(bookingId, user.id);
  await prisma.traveler.deleteMany({ where: { id: travelerId, userId: user.id, bookingId } });
  revalidatePath(`/boka/${bookingId}`);
}

export async function advanceToReview(bookingId: string): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);
  if (booking.travelers.length < 1) flashError(bookingId, "Lägg till minst en resenär först");
  await prisma.booking.update({
    where: { id: booking.id },
    data: { step: Math.max(booking.step, 4) },
  });
  redirect(`/boka/${booking.id}`);
}

export async function acceptAndAdvance(bookingId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);

  if (formData.get("acceptTerms") !== "on") flashError(bookingId, "Du måste godkänna resevillkoren");
  if (formData.get("acceptPrivacy") !== "on") flashError(bookingId, "Du måste godkänna integritetspolicyn");

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      step: Math.max(booking.step, 5),
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
  redirect(`/boka/${booking.id}`);
}

export async function recordDepositIntent(
  bookingId: string,
  method: "SWISH" | "KLARNA" | "CARD" | "BANKGIRO" | "INVOICE",
): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: booking.depositAmount,
      method,
      status: "PENDING",
      reference: `DEP-${booking.reference.slice(0, 8).toUpperCase()}`,
    },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { step: 6, status: "REVIEW" },
  });

  revalidatePath(`/boka/${booking.id}`);
  redirect(`/boka/${booking.id}`);
}
