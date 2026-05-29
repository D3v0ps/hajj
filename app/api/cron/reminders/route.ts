import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { queueEmail, EMAIL_KIND, renderTemplate } from "@/lib/email";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Cron-endpoint: skickar påminnelser. Anropas dagligen av worker-sidecaren.
 *
 *  1. Slutbetalning: bokningar i status PAID_DEPOSIT/CONFIRMED där avresan är
 *     45 dagar bort och vi inte redan skickat FINAL_PAYMENT_REMINDER för just
 *     denna bokning (idempotent via EmailSend.kind+bookingId-lookup).
 *  2. Pre-departure (samlingsinfo): 3 dagar före avresa, status PAID_*. Markerar
 *     samma via PRE_DEPARTURE.
 *
 * Skyddad av WORKER_TOKEN.
 */

async function handle(req: NextRequest) {
  const token = env.WORKER_TOKEN;
  if (!token) return new Response("WORKER_TOKEN ej konfigurerad", { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("token") ?? "";
  if (provided !== token) return new Response("Ej behörig", { status: 401 });

  const now = new Date();
  const result = { finalReminders: 0, preDeparture: 0 };

  // === Slutbetalningspåminnelse: avresa om ~45 dagar ===
  const fortyFiveFrom = new Date(now); fortyFiveFrom.setDate(fortyFiveFrom.getDate() + 44);
  const fortyFiveTo   = new Date(now); fortyFiveTo.setDate(fortyFiveTo.getDate() + 46);
  const candidates = await prisma.booking.findMany({
    where: {
      status: { in: ["PAID_DEPOSIT", "CONFIRMED"] },
      package: { startDate: { gte: fortyFiveFrom, lte: fortyFiveTo } },
    },
    include: {
      user: { select: { email: true, name: true } },
      package: { select: { title: true, startDate: true } },
      payments: true,
      emailSends: { where: { kind: EMAIL_KIND.FINAL_PAYMENT_REMINDER }, select: { id: true } },
    },
  });
  for (const b of candidates) {
    if (b.emailSends.length > 0) continue; // redan skickat
    if (!b.user.email || b.user.email === "import@system.local") continue;
    const paid = b.payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);
    const remaining = b.totalAmount - paid;
    if (remaining <= 0) continue;
    const datum = b.package.startDate ? new Date(b.package.startDate).toLocaleDateString("sv-SE") : "";
    const deadline = b.package.startDate
      ? new Date(new Date(b.package.startDate).getTime() - 30 * 86400000).toLocaleDateString("sv-SE")
      : "30 dagar före avresa";
    await queueEmail({
      to: b.user.email,
      recipientName: b.user.name,
      subject: `Påminnelse: slutbetalning för ${b.package.title}`,
      body: renderTemplate(
        "Hej {{namn}},\n\nDin avresa till {{paket}} ({{datum}}) närmar sig.\n\nKvar att betala: {{kvar}} kr.\nSenast: {{deadline}}.\n\nLogga in på Min sida för att slutbetala online, eller kontakta oss om du behöver delbetalning.\n\nMed vänliga hälsningar,\nHadj Omra Resor",
        { namn: b.user.name || "Resenär", paket: b.package.title, datum, kvar: remaining.toLocaleString("sv-SE"), deadline }
      ),
      bookingId: b.id,
      kind: EMAIL_KIND.FINAL_PAYMENT_REMINDER,
    });
    result.finalReminders++;
  }

  // === Pre-departure: avresa om ~3 dagar ===
  const threeFrom = new Date(now); threeFrom.setDate(threeFrom.getDate() + 2);
  const threeTo   = new Date(now); threeTo.setDate(threeTo.getDate() + 4);
  const preDep = await prisma.booking.findMany({
    where: {
      status: { in: ["PAID_DEPOSIT", "PAID_FULL", "CONFIRMED"] },
      package: { startDate: { gte: threeFrom, lte: threeTo } },
    },
    include: {
      user: { select: { email: true, name: true } },
      package: { select: { title: true, startDate: true } },
      emailSends: { where: { kind: EMAIL_KIND.PRE_DEPARTURE }, select: { id: true } },
    },
  });
  for (const b of preDep) {
    if (b.emailSends.length > 0) continue;
    if (!b.user.email || b.user.email === "import@system.local") continue;
    await queueEmail({
      to: b.user.email,
      recipientName: b.user.name,
      subject: `Strax dags — viktig info inför ${b.package.title}`,
      body: `Hej ${b.user.name || "Resenär"},\n\nDin avresa till ${b.package.title} är om bara några dagar.\n\nDu får inom kort detaljerad info från reseledaren (samlingstid, flygplatsmötespunkt, WhatsApp-gruppinbjudan). Håll utkik!\n\nKontakta oss omedelbart om något inte stämmer.\n\nMed vänliga hälsningar,\nHadj Omra Resor`,
      bookingId: b.id,
      kind: EMAIL_KIND.PRE_DEPARTURE,
    });
    result.preDeparture++;
  }

  return Response.json({ ok: true, ...result, at: now.toISOString() });
}

export const GET = handle;
export const POST = handle;
