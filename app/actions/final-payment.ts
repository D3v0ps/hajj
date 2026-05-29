"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { stripe, stripeEnabled, getAppUrl } from "@/lib/stripe";

/**
 * Skapar en Stripe Checkout-session för slutbetalningen på en bokning.
 *
 * Slutbeloppet = `booking.totalAmount - sum(COMPLETED Payments)`.
 *
 * Tillåts endast när bokningens anmälningsavgift är betald (status =
 * `PAID_DEPOSIT` eller `CONFIRMED`) och det inte redan finns en aktiv
 * (PENDING/COMPLETED) "final"-Payment.
 *
 * Vid lyckad start: skapas en Payment (PENDING, method=CARD,
 * providerRef = session.id, metadata.kind = "final") och kunden redirectas
 * till Stripes Checkout-URL. Webhooken (`/api/stripe/webhook`) markerar
 * sedan posten som COMPLETED och uppdaterar booking.status till PAID_FULL
 * när summan når totalAmount.
 *
 * Saknas Stripe-konfig → redirect tillbaka med informativt felmeddelande.
 */
export async function createFinalPaymentCheckout(bookingId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const back = `/min-sida/bokningar/${bookingId}/slutbetalning`;
  const flash = (msg: string): never => {
    const u = new URLSearchParams({ error: msg });
    redirect(`${back}?${u.toString()}`);
  };

  if (!stripeEnabled || !stripe) {
    flash("Kortbetalning ej aktiverad — kontakta kontoret för slutbetalning.");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: true, user: { select: { email: true } }, payments: true },
  });
  if (!booking || booking.userId !== session.user.id) {
    redirect("/min-sida");
  }

  // Endast tillåtet efter att anmälningsavgiften är betald, ej redan slutbetald.
  if (booking.status !== "PAID_DEPOSIT" && booking.status !== "CONFIRMED") {
    flash("Slutbetalning är inte tillgänglig för bokningen ännu.");
  }

  // Beräkna återstående utifrån summan av genomförda betalningar.
  const paidSum = booking.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);
  const remaining = booking.totalAmount - paidSum;
  if (remaining <= 0) {
    flash("Bokningen är redan slutbetald.");
  }

  // Dubbelbetalningsskydd: blockera om aktiv "final"-Payment finns
  // (PENDING/COMPLETED) — antingen redan klar eller en öppen session pågår.
  const existingFinal = booking.payments.find(
    (p) =>
      (p.status === "PENDING" || p.status === "COMPLETED") &&
      (p.metadata as { kind?: string } | null)?.kind === "final",
  );
  if (existingFinal) {
    flash("En slutbetalning är redan registrerad eller pågår.");
  }

  const appUrl = getAppUrl();

  // Skapa Stripe Checkout-sessionen. Felfångst sker här — redirect efter try
  // ligger utanför catch så NEXT_REDIRECT-kastet propagerar korrekt.
  let checkoutId: string;
  let checkoutUrl: string;
  try {
    const checkout = await stripe!.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "sek",
            unit_amount: remaining * 100, // ören
            product_data: {
              name: `Slutbetalning — ${booking.package.title}`,
              description: `Bokningsref ${booking.reference.slice(0, 8).toUpperCase()}`,
            },
          },
        },
      ],
      metadata: { bookingId: booking.id, kind: "final" },
      success_url: `${appUrl}/min-sida/bokningar/${booking.id}?paid=final`,
      cancel_url: `${appUrl}/min-sida/bokningar/${booking.id}/slutbetalning`,
    });
    if (!checkout.url) {
      flash("Stripe-svar saknar URL. Försök igen.");
    }
    checkoutId = checkout.id;
    checkoutUrl = checkout.url!;
  } catch (err) {
    // Släpp igenom Next-redirects (NEXT_REDIRECT-fel kastas av redirect()).
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: string }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    flash("Kunde inte starta betalning. Försök igen.");
  }

  try {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: remaining,
        method: "CARD",
        status: "PENDING",
        reference: `FIN-${booking.reference.slice(0, 8).toUpperCase()}`,
        providerRef: checkoutId!,
        metadata: { kind: "final" },
      },
    });
  } catch {
    flash("Kunde inte registrera betalningen. Försök igen.");
  }

  redirect(checkoutUrl!);
}
