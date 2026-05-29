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

// Dedupliserad, vanliga först + resten alfabetiskt utan dubletter.
export const COUNTRY_OPTIONS: string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of COMMON_COUNTRIES) {
    if (!seen.has(c)) { seen.add(c); out.push(c); }
  }
  for (const c of [...ALL_COUNTRIES].sort((a, b) => a.localeCompare(b, "sv"))) {
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
