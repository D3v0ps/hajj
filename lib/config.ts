// Centraliserade sajt-konstanter. Sätt riktiga värden här (eller via env)
// så slipper vi placeholders spridda i UI och juridik-sidor.

export const SITE = {
  name: "Hadj Omra Resor",
  legalName: "Hadj Omra Resor AB",
  orgNr: process.env.SITE_ORG_NR ?? "TBD — verifiera org.nr",
  phone: process.env.SITE_PHONE ?? "+46 8 000 00 00",
  phoneDisplay: process.env.SITE_PHONE_DISPLAY ?? "08-000 00 00",
  email: process.env.SITE_EMAIL ?? "info@hajj.karimkhalil.se",
  domain: process.env.SITE_DOMAIN ?? "hajj.karimkhalil.se",
  offices: {
    stockholm: {
      label: "Stockholm — huvudkontor",
      address: "Kapellgränd 10",
      postal: "116 25 Stockholm",
      note: "I Stockholms moské. Drop-in fungerar inte — boka tid via telefon eller e-post.",
    },
    goteborg: {
      label: "Göteborg",
      address: "Efter bokad tid",
      postal: "Boka via telefon",
      note: "Vi tar emot i Göteborg efter överenskommelse.",
    },
  },
  // Affärs-konstanter
  depositPerPersonSEK: 5000,
  finalPaymentDaysBeforeDeparture: 30,
} as const;
