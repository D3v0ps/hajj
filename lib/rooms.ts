/**
 * Central mappning av rumstyper → antal sängar. Används för att räkna
 * fysiska rum (X personer i Fyrbäddsrum → ⌈X/4⌉ rum) istället för att
 * räkna distinkta strängar.
 *
 * Lägg till ny rumstyp här ↓ — automatiskt synkat över hela admin
 * (resegrupper-summa, edit-formulärens datalist, kommande filter).
 */

export type RoomType = {
  /** Stabil nyckel (används aldrig som visningstext). */
  key: "SINGLE" | "DOUBLE" | "TRIPLE" | "QUAD" | "QUINTUPLE";
  /** Officiell svensk etikett — det är denna sträng som lagras i Traveler.roomAssignment
   *  när admin väljer från datalist:en. */
  label: string;
  /** Antal sängar = max antal personer per rum. */
  beds: number;
  /** Alternativa stavningar som detekteras vid räkning (case-insensitive, partial match). */
  aliases: string[];
};

export const ROOM_TYPES: RoomType[] = [
  { key: "SINGLE",    label: "Singelrum",     beds: 1, aliases: ["singel", "enkel", "single", "1-bädd", "enkelrum"] },
  { key: "DOUBLE",    label: "Tvåbäddsrum",   beds: 2, aliases: ["tvåbädd", "tvabädd", "tva-bädd", "dubbel", "double", "2-bädd", "2 bädd"] },
  { key: "TRIPLE",    label: "Trebäddsrum",   beds: 3, aliases: ["trebädd", "tre-bädd", "triple", "3-bädd", "3 bädd"] },
  { key: "QUAD",      label: "Fyrbäddsrum",   beds: 4, aliases: ["fyrbädd", "fyra-bädd", "quad", "4-bädd", "4 bädd"] },
  { key: "QUINTUPLE", label: "Femsängsrum",   beds: 5, aliases: ["fembädd", "femsäng", "fem-bädd", "quintuple", "5-bädd", "5 bädd", "femsängsrum"] },
];

/** Letar upp ROOM_TYPES utifrån (case-insensitive) tilldelnings-sträng.
 *  Returnerar null om ingen träff (t.ex. "Hotel Hilton 105"). */
export function detectRoomType(assignment: string | null | undefined): RoomType | null {
  if (!assignment) return null;
  const lower = assignment.toLowerCase().trim();
  if (!lower) return null;
  for (const r of ROOM_TYPES) {
    if (lower === r.label.toLowerCase()) return r;
    if (lower.includes(r.label.toLowerCase())) return r;
    if (r.aliases.some((a) => lower.includes(a))) return r;
  }
  return null;
}

/**
 * Räknar fysiska rum från en lista av resenärer.
 *  - Resenärer i kända rumstyper (Fyrbäddsrum/Trebäddsrum/...) grupperas
 *    per typ; antal rum = ⌈personer / sängar⌉.
 *  - Resenärer med okänd tilldelning men ifylld sträng (t.ex. specifika
 *    rumsnummer som "Hilton 105") räknas som distinkta rum.
 *  - Resenärer utan rumstilldelning räknas inte.
 */
export function computeRoomCount(travelers: Array<{ roomAssignment: string | null }>): number {
  const byBeds = new Map<number, number>(); // beds → personer
  const unknownRooms = new Set<string>();   // okända fritextsträngar = distinkta rum
  for (const t of travelers) {
    const assignment = t.roomAssignment?.trim();
    if (!assignment) continue;
    const type = detectRoomType(assignment);
    if (type) {
      byBeds.set(type.beds, (byBeds.get(type.beds) ?? 0) + 1);
    } else {
      unknownRooms.add(assignment.toLowerCase());
    }
  }
  let rooms = 0;
  for (const [beds, persons] of byBeds) rooms += Math.ceil(persons / beds);
  rooms += unknownRooms.size;
  return rooms;
}

/** Detaljerad uppdelning för UI: per detekterad rumstyp, hur många personer + hur många rum. */
export function roomBreakdown(travelers: Array<{ roomAssignment: string | null }>): Array<{
  type: RoomType | null;
  label: string;
  persons: number;
  rooms: number;
}> {
  const byType = new Map<string, { type: RoomType; persons: number }>();
  const unknownByLabel = new Map<string, number>(); // exakt sträng → persons
  let unassigned = 0;

  for (const t of travelers) {
    const assignment = t.roomAssignment?.trim();
    if (!assignment) { unassigned++; continue; }
    const type = detectRoomType(assignment);
    if (type) {
      const existing = byType.get(type.key);
      if (existing) existing.persons++;
      else byType.set(type.key, { type, persons: 1 });
    } else {
      unknownByLabel.set(assignment, (unknownByLabel.get(assignment) ?? 0) + 1);
    }
  }

  const out: Array<{ type: RoomType | null; label: string; persons: number; rooms: number }> = [];

  // Kända rumstyper, sorterade i bedds-ordning (singel → fem).
  const ordered = [...byType.values()].sort((a, b) => a.type.beds - b.type.beds);
  for (const { type, persons } of ordered) {
    out.push({ type, label: type.label, persons, rooms: Math.ceil(persons / type.beds) });
  }

  // Okända fritextsträngar — varje unik = 1 rum.
  for (const [label, persons] of unknownByLabel) {
    out.push({ type: null, label, persons, rooms: 1 });
  }

  // Ej tilldelade — visa som egen rad om de finns.
  if (unassigned > 0) {
    out.push({ type: null, label: "Ej tilldelat", persons: unassigned, rooms: 0 });
  }

  return out;
}
