import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, stripeEnabled, getAppUrl } from "@/lib/stripe";

// Skapar en Stripe Checkout-session för anmälningsavgiften på en bokning.
// POST body: { bookingId: string }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!stripeEnabled || !stripe) {
    return Response.json(
      { error: "Stripe är inte konfigurerat. Sätt STRIPE_SECRET_KEY i miljön.", fallback: true },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const bookingId = body?.bookingId;
  if (!bookingId) return Response.json({ error: "bookingId saknas" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: true, user: { select: { email: true } } },
  });
  if (!booking || booking.userId !== session.user.id) {
    return Response.json({ error: "Bokning hittades ej" }, { status: 404 });
  }

  const payable = booking.adultCount + booking.childCount;
  const depositTotal = booking.depositAmount * Math.max(1, payable);

  // Om bokningen redan har en genomförd betalning — skicka till bekräftelse, skapa inte ny.
  const completed = await prisma.payment.findFirst({
    where: { bookingId: booking.id, status: "COMPLETED" },
  });
  if (completed) {
    return Response.json({ url: `${getAppUrl()}/boka/${booking.id}?paid=1` });
  }

  const appUrl = getAppUrl();

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "sek",
            unit_amount: depositTotal * 100, // ören
            product_data: {
              name: `Anmälningsavgift — ${booking.package.title}`,
              description: `Bokningsref ${booking.reference.slice(0, 8).toUpperCase()} · ${payable} resenärer`,
            },
          },
        },
      ],
      metadata: { bookingId: booking.id, kind: "deposit" },
      success_url: `${appUrl}/boka/${booking.id}?paid=1`,
      cancel_url: `${appUrl}/boka/${booking.id}?cancelled=1`,
    });

    // Återanvänd en befintlig öppen CARD-PENDING-post (abandon+retry skapar inte dubbletter),
    // annars skapa ny. providerRef är unikt så varje session kopplas 1:1.
    const openCard = await prisma.payment.findFirst({
      where: { bookingId: booking.id, method: "CARD", status: "PENDING" },
    });
    if (openCard) {
      await prisma.payment.update({
        where: { id: openCard.id },
        data: { amount: depositTotal, providerRef: checkout.id },
      });
    } else {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: depositTotal,
          method: "CARD",
          status: "PENDING",
          reference: `DEP-${booking.reference.slice(0, 8).toUpperCase()}`,
          providerRef: checkout.id,
        },
      });
    }

    return Response.json({ url: checkout.url });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Stripe-fel" },
      { status: 500 },
    );
  }
}
