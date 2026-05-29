"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const DEPOSIT_PER_PERSON = 5000;

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

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      packageId: pkg.id,
      step: 2,
      travelerCount: 0,
      adultCount: 0,
      childCount: 0,
      infantCount: 0,
      depositAmount: DEPOSIT_PER_PERSON,
      totalAmount: 0,
      contactEmail: user.email ?? undefined,
    },
  });

  redirect(`/boka/${booking.id}`);
}

/**
 * Steg 2: spara antal per priskombination (rumstyp × ålderskategori) + avreseort.
 * Räknar ut totalt antal resenärer, ålderskategorifördelning och totalpris.
 */
export async function saveTierQuantities(bookingId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);

  const quantities: Record<string, number> = {};
  let total = 0;
  let adults = 0;
  let children = 0;
  let infants = 0;
  let totalAmount = 0;
  let primaryTierId: string | null = null;
  let firstSelectedTierId: string | null = null;

  for (const tier of booking.package.tiers) {
    const raw = formData.get(`qty_${tier.id}`);
    const qty = Math.max(0, Math.min(20, parseInt(String(raw ?? "0"), 10) || 0));
    if (qty > 0) {
      quantities[tier.id] = qty;
      total += qty;
      totalAmount += qty * tier.pricePerPerson;
      if (tier.ageCategory === "CHILD") children += qty;
      else if (tier.ageCategory === "INFANT") infants += qty;
      else adults += qty;
      if (!firstSelectedTierId) firstSelectedTierId = tier.id;
      if (!primaryTierId && tier.ageCategory === "ADULT") primaryTierId = tier.id;
    }
  }

  if (total === 0) flashError(bookingId, "Välj minst en resenär (ange antal).");

  const departureCity = String(formData.get("departureCity") ?? "").trim() || null;

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      // Föredra en vuxen-tier som "primär"; annars första valda (aldrig en orelaterad tier[0]).
      tierId: primaryTierId ?? firstSelectedTierId,
      tierQuantities: quantities,
      departureCity,
      travelerCount: total,
      adultCount: adults,
      childCount: children,
      infantCount: infants,
      // Spädbarn betalar oftast ingen anmälningsavgift — räkna depositen på vuxna + barn.
      depositAmount: DEPOSIT_PER_PERSON,
      totalAmount,
      step: Math.max(booking.step, 3),
    },
  });

  revalidatePath(`/boka/${booking.id}`);
  redirect(`/boka/${booking.id}`);
}

const travelerSchema = z.object({
  firstName: z.string().min(1, "Förnamn krävs").max(80),
  lastName: z.string().min(1, "Efternamn krävs").max(80),
  ageCategory: z.enum(["ADULT", "CHILD", "INFANT"]).default("ADULT"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  personnummer: z.string().max(13).optional().or(z.literal("")),
  passportNo: z.string().max(20).optional().or(z.literal("")),
  passportExp: z.string().optional().or(z.literal("")),
  passIssueDate: z.string().optional().or(z.literal("")),
  passIssuePlace: z.string().max(120).optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  nationality: z.string().max(80).optional().or(z.literal("")),
  civilStatus: z.string().max(40).optional().or(z.literal("")),
  occupation: z.string().max(80).optional().or(z.literal("")),
  birthCountry: z.string().max(80).optional().or(z.literal("")),
  birthCity: z.string().max(80).optional().or(z.literal("")),
});

export async function addTraveler(bookingId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);

  // Får ej registrera resenärer förrän rum/antal valts, eller efter granskning.
  if (booking.step < 3) flashError(bookingId, "Välj antal resenärer först.");
  if (booking.step >= 4) flashError(bookingId, "Bokningen är redan granskad — gå tillbaka för att ändra resenärer.");

  // Totalt antal får ej överskridas.
  if (booking.travelers.length >= booking.travelerCount) {
    flashError(bookingId, `Alla ${booking.travelerCount} resenärer är redan registrerade.`);
  }

  const parsed = travelerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    ageCategory: formData.get("ageCategory") || "ADULT",
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    personnummer: formData.get("personnummer"),
    passportNo: formData.get("passportNo"),
    passportExp: formData.get("passportExp"),
    passIssueDate: formData.get("passIssueDate"),
    passIssuePlace: formData.get("passIssuePlace"),
    birthDate: formData.get("birthDate"),
    gender: formData.get("gender"),
    nationality: formData.get("nationality"),
    civilStatus: formData.get("civilStatus"),
    occupation: formData.get("occupation"),
    birthCountry: formData.get("birthCountry"),
    birthCity: formData.get("birthCity"),
  });
  if (!parsed.success) flashError(bookingId, parsed.error.issues[0]?.message ?? "Ogiltigt formulär");

  const d = parsed.data!;

  // Får ej registrera fler i en ålderskategori än vad som betalats för i steg 2.
  const expected = { ADULT: booking.adultCount, CHILD: booking.childCount, INFANT: booking.infantCount };
  const already = booking.travelers.filter((t) => t.ageCategory === d.ageCategory).length;
  if (already >= expected[d.ageCategory]) {
    const label = d.ageCategory === "ADULT" ? "vuxna" : d.ageCategory === "CHILD" ? "barn" : "spädbarn";
    flashError(bookingId, `Du har valt ${expected[d.ageCategory]} ${label} i steg 2 — alla är redan registrerade. Byt ålderskategori.`);
  }

  try {
    await prisma.traveler.create({
      data: {
        userId: user.id,
        bookingId: booking.id,
        firstName: d.firstName,
        lastName: d.lastName,
        ageCategory: d.ageCategory,
        email: d.email || null,
        phone: d.phone || null,
        address: d.address || null,
        personnummer: d.personnummer || null,
        passportNo: d.passportNo || null,
        passportExp: d.passportExp ? new Date(d.passportExp) : null,
        passIssueDate: d.passIssueDate ? new Date(d.passIssueDate) : null,
        passIssuePlace: d.passIssuePlace || null,
        birthDate: d.birthDate ? new Date(d.birthDate) : null,
        gender: d.gender || null,
        nationality: d.nationality || null,
        civilStatus: d.civilStatus || null,
        occupation: d.occupation || null,
        birthCountry: d.birthCountry || null,
        birthCity: d.birthCity || null,
      },
    });
  } catch {
    flashError(bookingId, "Kunde inte spara resenären. Försök igen.");
  }

  revalidatePath(`/boka/${booking.id}`);
  redirect(`/boka/${booking.id}`);
}

export async function removeTraveler(bookingId: string, travelerId: string): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);
  // Resenärer får inte tas bort efter att bokningen granskats/skickats in.
  if (booking.step >= 4) flashError(bookingId, "Bokningen är låst för ändringar.");
  await prisma.traveler.deleteMany({ where: { id: travelerId, userId: user.id, bookingId } });
  revalidatePath(`/boka/${bookingId}`);
  redirect(`/boka/${bookingId}`);
}

export async function advanceToReview(bookingId: string): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);
  if (booking.travelers.length < booking.travelerCount) {
    flashError(
      bookingId,
      `Registrera alla ${booking.travelerCount} resenärer först (${booking.travelers.length} klara, ${booking.travelerCount - booking.travelers.length} kvar).`,
    );
  }
  await prisma.booking.update({
    where: { id: booking.id },
    data: { step: Math.max(booking.step, 4) },
  });
  redirect(`/boka/${booking.id}`);
}

export async function acceptAndAdvance(bookingId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);

  // Måste ha registrerat alla resenärer (nått granskningssteget) först.
  if (booking.step < 4) flashError(bookingId, "Registrera alla resenärer och granska bokningen först.");
  if (booking.travelers.length < booking.travelerCount) {
    flashError(bookingId, "Alla resenärer är inte registrerade.");
  }
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

const PAYMENT_METHODS = ["SWISH", "KLARNA", "CARD", "BANKGIRO", "INVOICE"] as const;

export async function recordDepositIntent(
  bookingId: string,
  method: "SWISH" | "KLARNA" | "CARD" | "BANKGIRO" | "INVOICE",
): Promise<void> {
  const user = await requireUser();
  const booking = await loadOwnedBooking(bookingId, user.id);

  // Validera betalsätt + steg.
  if (!PAYMENT_METHODS.includes(method)) flashError(bookingId, "Ogiltigt betalsätt.");
  if (booking.step < 5) flashError(bookingId, "Granska och godkänn bokningen innan betalning.");

  // Dubbelbetalningsskydd: tillåt bara om ingen aktiv (icke-misslyckad) betalning finns.
  const existing = await prisma.payment.findFirst({
    where: { bookingId: booking.id, status: { in: ["PENDING", "COMPLETED"] } },
  });
  if (existing) {
    // Idempotent: hoppa vidare utan att skapa en till betalningspost.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { step: 6, status: booking.status === "SUBMITTED" ? "REVIEW" : booking.status },
    });
    revalidatePath(`/boka/${booking.id}`);
    redirect(`/boka/${booking.id}`);
  }

  const payable = booking.adultCount + booking.childCount;
  const depositTotal = booking.depositAmount * Math.max(1, payable);

  try {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: depositTotal,
        method,
        status: "PENDING",
        reference: `DEP-${booking.reference.slice(0, 8).toUpperCase()}`,
      },
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { step: 6, status: "REVIEW" },
    });
  } catch {
    flashError(bookingId, "Kunde inte registrera betalningen. Försök igen.");
  }

  revalidatePath(`/boka/${booking.id}`);
  redirect(`/boka/${booking.id}`);
}
