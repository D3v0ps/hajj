import type { PackageTier } from "@prisma/client";

/**
 * Returnerar det pris som ska visas som "Från X kr" på paket-listor och
 * detaljsidor. Per kundens spec: visa fyrbäddspriset för vuxen som primärt
 * (inte det absolut lägsta, som ofta blir barn/spädbarn-pris och därför är
 * vilseledande för den typiske besökaren).
 *
 * Fallback-ordning:
 *  1. Lägsta QUAD-rum + ADULT-ålderskategori
 *  2. Lägsta ADULT-tier (oavsett rumstyp)
 *  3. Lägsta tier-pris (sista fallback om paketet bara har barn-/spädbarns-priser)
 *  4. 0 (paket utan tiers)
 */
export function primaryDisplayPrice(tiers: PackageTier[]): number {
  if (tiers.length === 0) return 0;

  const quadAdult = tiers
    .filter((t) => t.roomType === "QUAD" && t.ageCategory === "ADULT")
    .sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0];
  if (quadAdult) return quadAdult.pricePerPerson;

  const anyAdult = tiers
    .filter((t) => t.ageCategory === "ADULT")
    .sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0];
  if (anyAdult) return anyAdult.pricePerPerson;

  return Math.min(...tiers.map((t) => t.pricePerPerson));
}

/** Mänsklig etikett för vad "Från X kr" syftar på — använd intill priset. */
export function primaryDisplayPriceLabel(tiers: PackageTier[]): string {
  const quadAdult = tiers.find((t) => t.roomType === "QUAD" && t.ageCategory === "ADULT");
  if (quadAdult) return "Fyrbäddsrum, vuxen";
  const anyAdult = tiers.find((t) => t.ageCategory === "ADULT");
  if (anyAdult) return "Vuxen, lägsta";
  return "Lägsta pris";
}
