import Stripe from "stripe";

// Stripe aktiveras endast när STRIPE_SECRET_KEY finns i miljön. Saknas nyckeln
// faller betalningsflödet tillbaka till manuell hantering (kontoret skickar
// betalningsuppgifter), utan att appen kraschar.
const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key ? new Stripe(key) : null;

export const stripeEnabled = !!key;

export function getAppUrl(): string {
  return process.env.APP_URL ?? "https://hajj.karimkhalil.se";
}
