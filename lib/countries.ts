// Länder på svenska för rullistor (nationalitet, födelseland, passutfärdande).
// Sorterade med vanligaste först, sedan alfabetiskt.

export const COMMON_COUNTRIES = [
  "Sverige",
  "Somalia",
  "Eritrea",
  "Syrien",
  "Irak",
  "Iran",
  "Afghanistan",
  "Turkiet",
  "Marocko",
  "Tunisien",
  "Etiopien",
  "Pakistan",
  "Bangladesh",
  "Gambia",
] as const;

export const ALL_COUNTRIES = [
  "Afghanistan", "Albanien", "Algeriet", "Angola", "Argentina", "Armenien",
  "Australien", "Azerbajdzjan", "Bahrain", "Bangladesh", "Belgien", "Benin",
  "Bosnien och Hercegovina", "Brasilien", "Bulgarien", "Burkina Faso", "Burundi",
  "Chad", "Chile", "Colombia", "Comorerna", "Danmark", "Djibouti", "Egypten",
  "Elfenbenskusten", "Eritrea", "Estland", "Etiopien", "Filippinerna", "Finland",
  "Frankrike", "Förenade Arabemiraten", "Gambia", "Georgien", "Ghana", "Grekland",
  "Guinea", "Guinea-Bissau", "Indien", "Indonesien", "Irak", "Iran", "Irland",
  "Island", "Israel", "Italien", "Jemen", "Jordanien", "Kamerun", "Kanada",
  "Kazakstan", "Kenya", "Kina", "Kosovo", "Kroatien", "Kuwait", "Kyrgyzstan",
  "Lettland", "Libanon", "Liberia", "Libyen", "Litauen", "Luxemburg", "Malaysia",
  "Maldiverna", "Mali", "Marocko", "Mauretanien", "Mexiko", "Moldavien",
  "Montenegro", "Mocambique", "Nederländerna", "Niger", "Nigeria", "Nordmakedonien",
  "Norge", "Oman", "Pakistan", "Palestina", "Polen", "Portugal", "Qatar",
  "Rumänien", "Ryssland", "Saudiarabien", "Schweiz", "Senegal", "Serbien",
  "Sierra Leone", "Singapore", "Slovakien", "Slovenien", "Somalia", "Spanien",
  "Storbritannien", "Sudan", "Sverige", "Sydafrika", "Syrien", "Tanzania",
  "Thailand", "Tjeckien", "Togo", "Tunisien", "Turkiet", "Tyskland", "Uganda",
  "Ukraina", "Ungern", "USA", "Uzbekistan", "Österrike",
];

// ISO 3166-1 alpha-3 → svenskt landsnamn, för tolkning av pass-MRZ (gäller även
// utländska pass). Namnen matchar dropdown-värdena så fältet kan förväljas.
const ISO3_TO_SV: Record<string, string> = {
  AFG: "Afghanistan", ALB: "Albanien", DZA: "Algeriet", AND: "Andorra", AGO: "Angola",
  ARG: "Argentina", ARM: "Armenien", AUS: "Australien", AUT: "Österrike", AZE: "Azerbajdzjan",
  BHR: "Bahrain", BGD: "Bangladesh", BLR: "Vitryssland", BEL: "Belgien", BEN: "Benin",
  BTN: "Bhutan", BOL: "Bolivia", BIH: "Bosnien och Hercegovina", BWA: "Botswana", BRA: "Brasilien",
  BRN: "Brunei", BGR: "Bulgarien", BFA: "Burkina Faso", BDI: "Burundi", KHM: "Kambodja",
  CMR: "Kamerun", CAN: "Kanada", CPV: "Kap Verde", CAF: "Centralafrikanska republiken",
  TCD: "Chad", CHL: "Chile", CHN: "Kina", COL: "Colombia", COM: "Comorerna",
  COG: "Kongo-Brazzaville", COD: "Kongo-Kinshasa", CRI: "Costa Rica", CIV: "Elfenbenskusten",
  HRV: "Kroatien", CUB: "Kuba", CYP: "Cypern", CZE: "Tjeckien", DNK: "Danmark",
  DJI: "Djibouti", DMA: "Dominica", DOM: "Dominikanska republiken", ECU: "Ecuador", EGY: "Egypten",
  SLV: "El Salvador", GNQ: "Ekvatorialguinea", ERI: "Eritrea", EST: "Estland", SWZ: "Eswatini",
  ETH: "Etiopien", FJI: "Fiji", FIN: "Finland", FRA: "Frankrike", GAB: "Gabon",
  GMB: "Gambia", GEO: "Georgien", DEU: "Tyskland", GHA: "Ghana", GRC: "Grekland",
  GRD: "Grenada", GTM: "Guatemala", GIN: "Guinea", GNB: "Guinea-Bissau", GUY: "Guyana",
  HTI: "Haiti", HND: "Honduras", HUN: "Ungern", ISL: "Island", IND: "Indien",
  IDN: "Indonesien", IRN: "Iran", IRQ: "Irak", IRL: "Irland", ISR: "Israel",
  ITA: "Italien", JAM: "Jamaica", JPN: "Japan", JOR: "Jordanien", KAZ: "Kazakstan",
  KEN: "Kenya", KIR: "Kiribati", KWT: "Kuwait", KGZ: "Kyrgyzstan", LAO: "Laos",
  LVA: "Lettland", LBN: "Libanon", LSO: "Lesotho", LBR: "Liberia", LBY: "Libyen",
  LIE: "Liechtenstein", LTU: "Litauen", LUX: "Luxemburg", MDG: "Madagaskar", MWI: "Malawi",
  MYS: "Malaysia", MDV: "Maldiverna", MLI: "Mali", MLT: "Malta", MRT: "Mauretanien",
  MUS: "Mauritius", MEX: "Mexiko", MDA: "Moldavien", MCO: "Monaco", MNG: "Mongoliet",
  MNE: "Montenegro", MAR: "Marocko", MOZ: "Mocambique", MMR: "Myanmar", NAM: "Namibia",
  NPL: "Nepal", NLD: "Nederländerna", NZL: "Nya Zeeland", NIC: "Nicaragua", NER: "Niger",
  NGA: "Nigeria", PRK: "Nordkorea", MKD: "Nordmakedonien", NOR: "Norge", OMN: "Oman",
  PAK: "Pakistan", PSE: "Palestina", PAN: "Panama", PNG: "Papua Nya Guinea", PRY: "Paraguay",
  PER: "Peru", PHL: "Filippinerna", POL: "Polen", PRT: "Portugal", QAT: "Qatar",
  ROU: "Rumänien", RUS: "Ryssland", RWA: "Rwanda", KNA: "Saint Kitts och Nevis",
  LCA: "Saint Lucia", WSM: "Samoa", SMR: "San Marino", STP: "São Tomé och Príncipe",
  SAU: "Saudiarabien", SEN: "Senegal", SRB: "Serbien", SYC: "Seychellerna", SLE: "Sierra Leone",
  SGP: "Singapore", SVK: "Slovakien", SVN: "Slovenien", SLB: "Salomonöarna", SOM: "Somalia",
  ZAF: "Sydafrika", KOR: "Sydkorea", SSD: "Sydsudan", ESP: "Spanien", LKA: "Sri Lanka",
  SDN: "Sudan", SUR: "Surinam", SWE: "Sverige", CHE: "Schweiz", SYR: "Syrien",
  TWN: "Taiwan", TJK: "Tadzjikistan", TZA: "Tanzania", THA: "Thailand", TLS: "Östtimor",
  TGO: "Togo", TON: "Tonga", TTO: "Trinidad och Tobago", TUN: "Tunisien", TUR: "Turkiet",
  TKM: "Turkmenistan", TUV: "Tuvalu", UGA: "Uganda", UKR: "Ukraina", ARE: "Förenade Arabemiraten",
  GBR: "Storbritannien", USA: "USA", URY: "Uruguay", UZB: "Uzbekistan", VUT: "Vanuatu",
  VEN: "Venezuela", VNM: "Vietnam", YEM: "Jemen", ZMB: "Zambia", ZWE: "Zimbabwe",
  RKS: "Kosovo", XKX: "Kosovo",
};

/** Översätter en ISO-3-landskod från pass-MRZ till svenskt landsnamn ("" om okänd). */
export function iso3ToSwedish(code?: string | null): string {
  if (!code) return "";
  const c = code.toUpperCase().replace(/[^A-Z]/g, "");
  if (!c) return "";
  if (c.startsWith("GB")) return "Storbritannien"; // GBR/GBN/GBO/GBD/GBP/GBS
  if (c === "D") return "Tyskland"; // äldre tyska pass
  return ISO3_TO_SV[c] ?? "";
}

// Dedupliserad: vanliga först, sedan resten alfabetiskt. Inkluderar alla länder
// som pass-MRZ kan mappa till, så ett inläst utländskt pass alltid kan väljas.
export const COUNTRY_OPTIONS: string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of COMMON_COUNTRIES) {
    if (!seen.has(c)) { seen.add(c); out.push(c); }
  }
  const rest = [...new Set([...ALL_COUNTRIES, ...Object.values(ISO3_TO_SV)])];
  for (const c of rest.sort((a, b) => a.localeCompare(b, "sv"))) {
    if (!seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
})();

export const CIVIL_STATUS_OPTIONS = [
  { value: "single", label: "Ogift" },
  { value: "married", label: "Gift" },
  { value: "divorced", label: "Skild" },
  { value: "widowed", label: "Änka/änkling" },
];
