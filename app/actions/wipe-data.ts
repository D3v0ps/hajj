"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

/**
 * DESTRUKTIV ÅTGÄRD — raderar alla bokningar, paket, resegrupper, kund-konton,
 * mejlmallar, leads, dokument-rader, auditlogg.
 *
 * Behåller endast: ADMIN- och STAFF-konton (med associerade Account/Session-rader).
 *
 * Kräver:
 *  - Inloggad ADMIN (inte STAFF — staff räcker inte för totalrensning)
 *  - Bekräftelse-input "RADERA ALLT" exakt
 *
 * Filuppladdade dokument på disk (under UPLOADS_DIR) lämnas kvar — de
 * referenser dem som Document-raden tappar, men en separat städning av
 * orphan-filer kan göras manuellt på servern om det behövs.
 */
export async function wipeBusinessData(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN") {
    redirect("/admin?error=" + encodeURIComponent("Endast ADMIN får köra rensningen"));
  }

  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== "RADERA ALLT") {
    redirect("/admin/danger-zone?error=" + encodeURIComponent("Felaktig bekräftelse — skriv exakt 'RADERA ALLT'"));
  }

  // 1. Audit-logga raderingen INNAN vi rensar auditloggen, så vi har en rad
  //    som dokumenterar händelsen även efter all data är borta.
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "danger-zone.wipeStarted",
    metadata: { triggeredAt: new Date().toISOString() },
  });

  // 2. Räkna före-tillstånd för rapport till admin.
  const before = await Promise.all([
    prisma.booking.count(),
    prisma.package.count(),
    prisma.traveler.count(),
    prisma.travelerProfile.count(),
    prisma.payment.count(),
    prisma.document.count(),
    prisma.message.count(),
    prisma.emailSend.count(),
    prisma.emailTemplate.count(),
    prisma.lead.count(),
    prisma.review.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.auditLog.count(),
    prisma.passwordResetToken.count(),
    prisma.emailVerificationToken.count(),
  ]);
  const [
    nBookings, nPackages, nTravelers, nProfiles, nPayments, nDocs, nMessages,
    nEmailSends, nTemplates, nLeads, nReviews, nCustomers, nAudit,
    nPwReset, nEmailVerify,
  ] = before;

  // 3. Radera i FK-säker ordning (lövnoder först).
  //    Booking.user är onDelete:Restrict, så bokningar MÅSTE bort innan kunder.
  await prisma.$transaction([
    // Lövnoder
    prisma.emailSend.deleteMany({}),
    prisma.message.deleteMany({}),
    prisma.document.deleteMany({}),
    prisma.payment.deleteMany({}),
    prisma.review.deleteMany({}),
    prisma.passwordResetToken.deleteMany({}),
    prisma.emailVerificationToken.deleteMany({}),
    // Resenärer
    prisma.traveler.deleteMany({}),
    prisma.travelerProfile.deleteMany({}),
    // Bokningar
    prisma.booking.deleteMany({}),
    // Paket
    prisma.packageTier.deleteMany({}),
    prisma.package.deleteMany({}),
    // Övrig kunddata
    prisma.lead.deleteMany({}),
    // Konfiguration som ska rensas enligt admins val
    prisma.emailTemplate.deleteMany({}),
    // Kund-konton (Account + Session kaskaderas via onDelete:Cascade)
    prisma.user.deleteMany({ where: { role: "CUSTOMER" } }),
    // Auditlogg — rensas sist så att start-loggen ovan tas bort också
    prisma.auditLog.deleteMany({}),
  ]);

  // 4. Logga slutförd rensning EFTER auditloggen rensats — detta blir den
  //    enda kvarvarande raden och dokumenterar att rensningen skedde.
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "danger-zone.wipeCompleted",
    metadata: {
      bookings: nBookings,
      packages: nPackages,
      travelers: nTravelers,
      profiles: nProfiles,
      payments: nPayments,
      documents: nDocs,
      messages: nMessages,
      emailSends: nEmailSends,
      emailTemplates: nTemplates,
      leads: nLeads,
      reviews: nReviews,
      customers: nCustomers,
      auditLogsCleared: nAudit,
      passwordResetTokens: nPwReset,
      emailVerificationTokens: nEmailVerify,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/danger-zone");
  redirect("/admin/danger-zone?wiped=1");
}
