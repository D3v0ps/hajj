import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { stripe, stripeEnabled } from "@/lib/stripe";
import type Stripe from "stripe";

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

    // Idempotent: bara PENDING → COMPLETED (replay stämplar inte om paidAt).
    await prisma.payment.updateMany({
      where: { providerRef: cs.id, status: "PENDING" },
      data: { status: "COMPLETED", paidAt: new Date() },
    });

    if (bookingId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "PAID_DEPOSIT", step: 6 },
      }).catch(() => {});
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
