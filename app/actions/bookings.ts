"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { queueEmail, EMAIL_KIND, renderTemplate } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { guestOwnsBooking, rememberGuestBooking } from "@/lib/guest";

const TERMS_VERSION = "2026-05-01";

const DEPOSIT_PER_PERSON = 5000;

function flashError(bookingId: string, message: string): never {
  const u = new URLSearchParams({ error: message });
  redirect(`/boka/${bookingId}?${u.toString()}`);
}

/**
 * Laddar en bokning och säkerställer att den som anropar äger den — antingen som
 * inloggad kund (booking.userId === session.user.id) eller som gäst (boknings-id
 * finns i den signerade gäst-cookien). Annars redirect.
 * Returnerar bokningen + ägarens userId (gästens auto-skapade konto eller kontot).
 */
async function loadActorBooking(bookingId: string) {
  const session = await auth();
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: { include: { tiers: true } }, travelers: true, tier: true },
  });
  if (!booking) redirect("/");

  const isOwner = !!session?.user?.id && booking.userId === session.user.id;
  const isGuest = !isOwner && (await guestOwnsBooking(bookingId));
  if (!isOwner && !isGuest) {
    redirect(session?.user?.id ? "/min-sida" : `/boka/start/${booking.packageId}`);
  }
  return { booking, userId: booking.userId };
}

export async function createBooking(packageId: string, _formData?: FormData): Promise<void> {
  const session = await auth();
  // Gäst: skicka till kontaktsteget först. Där fångar vi e-posten (lead) och
  // skapar bokningen — kunden behöver inte skapa ett konto.
  if (!session?.user?.id) {
    redirect(`/boka/start/${packageId}`);
  }
  const user = session.user;

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

const guestContactSchema = z.object({
  name: z.string().min(1, "Ange ditt namn").max(120),
  email: z.string().email("Ange en giltig e-postadress").max(200),
  phone: z.string().max(40).optional().or(z.literal("")),
});

/**
 * Gäst-start: kunden anger namn + e-post + telefon (inget konto/lösenord).
 * Vi hittar-eller-skapar en kundpost på e-posten och skapar bokningsutkastet
 * direkt — så e-posten är fångad även om kunden aldrig slutför. Gäst-cookien
 * sätts så att kunden kan fortsätta/återuppta sin bokning.
 */
export async function createGuestBooking(packageId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (session?.user?.id) {
    // Redan inloggad → använd kontoflödet.
    return createBooking(packageId);
  }

  const parsed = guestContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Fyll i namn och e-post";
    redirect(`/boka/start/${packageId}?error=${encodeURIComponent(msg)}`);
  }
  const { name, phone } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) redirect("/");

  // Hitta-eller-skapa kund (gäst = utan lösenord). Befintlig e-post återanvänds
  // så samma kund inte dupliceras.
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name, phone: phone || null, role: "CUSTOMER" },
    });
  }

  // Återuppta befintligt utkast på samma paket om det finns.
  const existing = await prisma.booking.findFirst({
    where: { userId: user.id, packageId, status: "DRAFT" },
  });
  if (existing) {
    await rememberGuestBooking(existing.id, email);
    redirect(`/boka/${existing.id}`);
  }

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
      contactEmail: email,
      contactPhone: phone || null,
    },
  });

  await rememberGuestBooking(booking.id, email);
  await logAudit({
    actorId: user.id,
    actorEmail: email,
    action: "booking.startedGuest",
    targetType: "Booking",
    targetId: booking.id,
  });

  redirect(`/boka/${booking.id}`);
}

/**
 * Gå tillbaka till ett tidigare steg. Bara bakåt och bara medan bokningen är ett
 * utkast (ej inskickad). Steget kan alltid gå framåt igen via stegens egna actions.
 */
export async function goToBookingStep(bookingId: string, target: number): Promise<void> {
  const { booking } = await loadActorBooking(bookingId);
  if (booking.status !== "DRAFT") flashError(bookingId, "Bokningen är redan inskickad och kan inte ändras här.");
  const t = Math.max(2, Math.min(Math.floor(target), booking.step));
  if (t !== booking.step) {
    await prisma.booking.update({ where: { id: booking.id }, data: { step: t } });
  }
  revalidatePath(`/boka/${booking.id}`);
  redirect(`/boka/${booking.id}`);
}

/**
 * Steg 2: spara antal per priskombination (rumstyp × ålderskategori) + avreseort.
 * Räknar ut totalt antal resenärer, ålderskategorifördelning och totalpris.
 */
export async function saveTierQuantities(bookingId: string, formData: FormData): Promise<void> {
  const { booking } = await loadActorBooking(bookingId);

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

  // Skydd när kunden gått tillbaka från steg 3: antalet får inte sänkas under
  // vad som redan är registrerat per ålderskategori — då skulle priset räknas
  // på färre personer än de som faktiskt ligger i bokningen. Ta bort resenärer
  // i steg 3 först, sedan går det att sänka antalet.
  const reg = { ADULT: 0, CHILD: 0, INFANT: 0 };
  for (const t of booking.travelers) reg[t.ageCategory] += 1;
  if (adults < reg.ADULT || children < reg.CHILD || infants < reg.INFANT) {
    flashError(
      bookingId,
      `Du har redan registrerat ${reg.ADULT} vuxna, ${reg.CHILD} barn och ${reg.INFANT} spädbarn — antalet kan inte vara lägre. Gå till resenärssteget och ta bort resenärer först.`,
    );
  }

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
  const { booking, userId } = await loadActorBooking(bookingId);

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

  // Saudi-arabiska visumkravet: passet måste gälla minst 6 månader efter resans slut.
  // Vi varnar om resedatum finns på paketet och passet löper ut för tidigt.
  if (d.passportExp) {
    const expDate = new Date(d.passportExp);
    const refDate = booking.package.endDate ?? booking.package.startDate;
    if (refDate) {
      const sixMonthsAfter = new Date(refDate);
      sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6);
      if (expDate < sixMonthsAfter) {
        flashError(bookingId, `Passet måste gälla minst 6 månader efter resans slut (${sixMonthsAfter.toLocaleDateString("sv-SE")}). Detta pass går ut ${expDate.toLocaleDateString("sv-SE")}.`);
      }
    }
  }

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
        userId,
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

/**
 * Skapar en Traveler-rad i en bokning genom att kopiera fält från en sparad
 * TravelerProfile. Kunden slipper fylla i samma uppgifter varje gång.
 * (Profiler finns bara för inloggade konton; för gäster är listan tom.)
 */
export async function addTravelerFromProfile(bookingId: string, formData: FormData): Promise<void> {
  const { booking, userId } = await loadActorBooking(bookingId);
  if (booking.step < 3) flashError(bookingId, "Välj antal resenärer först.");
  if (booking.step >= 4) flashError(bookingId, "Bokningen är låst för ändringar.");
  if (booking.travelers.length >= booking.travelerCount) {
    flashError(bookingId, `Alla ${booking.travelerCount} resenärer är redan registrerade.`);
  }

  const profileId = String(formData.get("profileId") ?? "");
  const profile = await prisma.travelerProfile.findFirst({ where: { id: profileId, userId } });
  if (!profile) flashError(bookingId, "Profilen hittades inte.");

  // Säkerställ att profilen inte redan är knuten till en resenär i denna bokning.
  const dupe = booking.travelers.some((t) => t.profileId === profile!.id);
  if (dupe) flashError(bookingId, "Den här profilen är redan tillagd i bokningen.");

  // Ålderskategori-kontroll: får ej överskrida valda antal.
  const cat = profile!.ageCategory;
  const expected = { ADULT: booking.adultCount, CHILD: booking.childCount, INFANT: booking.infantCount };
  const already = booking.travelers.filter((t) => t.ageCategory === cat).length;
  if (already >= expected[cat]) {
    const label = cat === "ADULT" ? "vuxna" : cat === "CHILD" ? "barn" : "spädbarn";
    flashError(bookingId, `Alla ${expected[cat]} ${label} är redan registrerade. Välj en annan profil.`);
  }

  // Pass-utgångsvalidering (samma 6-mån-regel som i addTraveler).
  if (profile!.passportExp) {
    const refDate = booking.package.endDate ?? booking.package.startDate;
    if (refDate) {
      const sixMonthsAfter = new Date(refDate);
      sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6);
      if (profile!.passportExp < sixMonthsAfter) {
        flashError(bookingId, `Passet i profilen löper ut ${new Date(profile!.passportExp).toLocaleDateString("sv-SE")} — uppdatera profilen, det måste gälla minst 6 mån efter resans slut.`);
      }
    }
  }

  await prisma.traveler.create({
    data: {
      userId,
      bookingId: booking.id,
      profileId: profile!.id,
      firstName: profile!.firstName,
      lastName: profile!.lastName,
      ageCategory: profile!.ageCategory,
      email: profile!.email,
      phone: profile!.phone,
      address: profile!.address,
      personnummer: profile!.personnummer,
      passportNo: profile!.passportNo,
      passportExp: profile!.passportExp,
      passIssueDate: profile!.passIssueDate,
      passIssuePlace: profile!.passIssuePlace,
      birthDate: profile!.birthDate,
      gender: profile!.gender,
      nationality: profile!.nationality,
      civilStatus: profile!.civilStatus,
      occupation: profile!.occupation,
      birthCountry: profile!.birthCountry,
      birthCity: profile!.birthCity,
      notes: profile!.notes,
    },
  });

  revalidatePath(`/boka/${booking.id}`);
  redirect(`/boka/${booking.id}`);
}

export async function removeTraveler(bookingId: string, travelerId: string): Promise<void> {
  const { booking, userId } = await loadActorBooking(bookingId);
  // Resenärer får inte tas bort efter att bokningen granskats/skickats in.
  if (booking.step >= 4) flashError(bookingId, "Bokningen är låst för ändringar.");
  await prisma.traveler.deleteMany({ where: { id: travelerId, userId, bookingId } });
  revalidatePath(`/boka/${bookingId}`);
  redirect(`/boka/${bookingId}`);
}

export async function advanceToReview(bookingId: string): Promise<void> {
  const { booking } = await loadActorBooking(bookingId);
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
  const { booking, userId } = await loadActorBooking(bookingId);

  // Måste ha registrerat alla resenärer (nått granskningssteget) först.
  if (booking.step < 4) flashError(bookingId, "Registrera alla resenärer och granska bokningen först.");
  if (booking.travelers.length < booking.travelerCount) {
    flashError(bookingId, "Alla resenärer är inte registrerade.");
  }
  if (formData.get("acceptTerms") !== "on") flashError(bookingId, "Du måste godkänna resevillkoren");
  if (formData.get("acceptPrivacy") !== "on") flashError(bookingId, "Du måste godkänna integritetspolicyn");

  // Race-skydd mot dubbel-klick: bara DRAFT-bokningar får gå till SUBMITTED.
  // Andra anropet får claim.count === 0 → hoppar över mejl + audit nedan
  // (vi förlitar oss på `await prisma.booking.findUnique` efteråt för att
  // återhämta bokningen, så funktionen är idempotent).
  const claim = await prisma.booking.updateMany({
    where: { id: booking.id, status: "DRAFT" },
    data: {
      step: Math.max(booking.step, 5),
      status: "SUBMITTED",
      submittedAt: new Date(),
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
    },
  });
  if (claim.count !== 1) {
    // Idempotent: andra POST:en hoppar tyst — kunden ser samma framgångssida.
    redirect(`/boka/${booking.id}`);
  }
  const updated = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: { user: { select: { email: true, name: true } }, package: { select: { title: true, startDate: true } } },
  });

  // Bekräftelsemejl till kunden (köas — skickas av worker var 60:e sek).
  if (updated.user.email && updated.user.email !== "import@system.local") {
    const namn = updated.user.name || "Resenär";
    const paket = updated.package.title;
    const ref = updated.reference.slice(0, 12).toUpperCase();
    const datum = updated.package.startDate ? new Date(updated.package.startDate).toLocaleDateString("sv-SE") : "ej fastställt";
    await queueEmail({
      to: updated.user.email,
      recipientName: updated.user.name,
      subject: `Vi har mottagit din bokning — ${paket}`,
      body: renderTemplate(
        "Hej {{namn}},\n\n" +
        "Tack för din bokning på {{paket}} (referens {{ref}}).\n\n" +
        "Avresedatum: {{datum}}.\n" +
        "Anmälningsavgift: {{deposit}} kr — vi reserverar din plats i 7 dagar i väntan på betalning.\n\n" +
        "Vi hör av oss inom 24 timmar med nästa steg.\n\n" +
        "Med vänliga hälsningar,\nHadj Omra Resor",
        { namn, paket, ref, datum, deposit: (updated.depositAmount * Math.max(1, updated.adultCount + updated.childCount)).toLocaleString("sv-SE") }
      ),
      bookingId: updated.id,
      kind: EMAIL_KIND.BOOKING_SUBMITTED,
    });
  }
  // Intern notis till kontoret.
  if (env.SITE_EMAIL) {
    await queueEmail({
      to: env.SITE_EMAIL,
      subject: `[Ny bokning] ${updated.package.title} — ${updated.user.name ?? updated.user.email ?? "okänd kund"}`,
      body: `Ny bokning inkommen.\n\nRef: ${updated.reference.slice(0, 12).toUpperCase()}\nKund: ${updated.user.name ?? "—"} (${updated.user.email})\nPaket: ${updated.package.title}\nResenärer: ${updated.travelerCount}\nBelopp: ${updated.totalAmount.toLocaleString("sv-SE")} kr\n\nAdmin: ${env.APP_URL}/admin/bokningar/${updated.id}`,
      bookingId: updated.id,
      kind: EMAIL_KIND.BOOKING_SUBMITTED,
    });
  }
  await logAudit({ actorId: userId, actorEmail: updated.user.email, action: "booking.submitted", targetType: "Booking", targetId: updated.id });

  redirect(`/boka/${booking.id}`);
}

const PAYMENT_METHODS = ["SWISH", "KLARNA", "CARD", "BANKGIRO", "INVOICE"] as const;

export async function recordDepositIntent(
  bookingId: string,
  method: "SWISH" | "KLARNA" | "CARD" | "BANKGIRO" | "INVOICE",
): Promise<void> {
  const { booking } = await loadActorBooking(bookingId);

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
