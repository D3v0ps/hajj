import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { stripe, stripeEnabled } from "@/lib/stripe";
import type Stripe from "stripe";
import { queueEmail, EMAIL_KIND, renderTemplate } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { autoPushPayment } from "@/lib/fortnox";

// Stripe webhook: markerar betalning som genomförd när checkout slutförs.
// Konfigurera STRIPE_WEBHOOK_SECRET + peka Stripe-webhook till /api/stripe/webhook.
export async function POST(req: NextRequest) {
  if (!stripeEnabled || !stripe) {
    return Response.json({ error: "Stripe ej konfigurerat" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET saknas" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return Response.json({ error: "Signatur saknas" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    return Response.json(
      { error: `Webhook-verifiering misslyckades: ${err instanceof Error ? err.message : "okänt"}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;
    const bookingId = cs.metadata?.bookingId;
    // Slutbetalnings-checkout sätter metadata.kind = "final"; deposits saknar kind.
    const paymentKind = cs.metadata?.kind ?? "deposit";

    // Idempotent: bara PENDING → COMPLETED (replay stämplar inte om paidAt).
    const claimed = await prisma.payment.updateMany({
      where: { providerRef: cs.id, status: "PENDING" },
      data: { status: "COMPLETED", paidAt: new Date() },
    });

    if (bookingId && claimed.count > 0) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: { select: { email: true, name: true } },
          package: { select: { title: true, startDate: true } },
          payments: true,
        },
      });
      if (booking) {
        // Räkna om totalt betalt; sätt PAID_FULL om hela beloppet är betalt, annars PAID_DEPOSIT.
        const paid = booking.payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);
        const newStatus = paid >= booking.totalAmount && booking.totalAmount > 0 ? "PAID_FULL" : "PAID_DEPOSIT";
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: newStatus, step: 6 },
        }).catch(() => {});

        // Kvitto-mejl till kunden.
        if (booking.user.email && booking.user.email !== "import@system.local") {
          const amount = (cs.amount_total ?? 0) / 100;
          const isFinal = paymentKind === "final" || newStatus === "PAID_FULL";
          await queueEmail({
            to: booking.user.email,
            recipientName: booking.user.name,
            subject: isFinal
              ? `Slutbetalning mottagen — ${booking.package.title}`
              : `Anmälningsavgift mottagen — ${booking.package.title}`,
            body: renderTemplate(
              "Hej {{namn}},\n\n" +
              "Vi har mottagit din betalning på {{belopp}} kr för {{paket}} (ref {{ref}}).\n\n" +
              (isFinal
                ? "Din plats är nu fullt betald. Vi återkommer med detaljerad reseinformation inför avresan.\n\n"
                : "Anmälningsavgiften är registrerad — din plats är bekräftad. Slutbetalningen ska vara oss tillhanda 30 dagar före avresa.\n\n") +
              "Tack för att du valde oss.\n\nMed vänliga hälsningar,\nHadj Omra Resor",
              {
                namn: booking.user.name || "Resenär",
                paket: booking.package.title,
                ref: booking.reference.slice(0, 12).toUpperCase(),
                belopp: amount.toLocaleString("sv-SE"),
              }
            ),
            bookingId: booking.id,
            kind: isFinal ? EMAIL_KIND.FINAL_PAYMENT_RECEIVED : EMAIL_KIND.DEPOSIT_RECEIVED,
          });
        }
        await logAudit({
          action: newStatus === "PAID_FULL" ? "payment.fullReceived" : "payment.depositReceived",
          targetType: "Booking",
          targetId: booking.id,
          metadata: { amount: cs.amount_total, kind: paymentKind },
        });

        // Autopush till Fortnox om koppling finns. Idempotent + tysta fel.
        const paidPayment = await prisma.payment.findFirst({
          where: { providerRef: cs.id, status: "COMPLETED", fortnoxPushedAt: null },
          select: { id: true },
        });
        if (paidPayment) await autoPushPayment(paidPayment.id);
      }
    }
  } else if (event.type === "checkout.session.expired") {
    // Övergiven/utgången session — markera betalningsförsöket som misslyckat
    // så det inte blockerar en ny betalning.
    const cs = event.data.object as Stripe.Checkout.Session;
    await prisma.payment.updateMany({
      where: { providerRef: cs.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
  }

  return Response.json({ received: true });
}
