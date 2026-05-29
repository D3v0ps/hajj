// Typad form av översättningsfilerna. Hjälper TypeScript flagga saknade nycklar
// om sv-fil utökas men en annan locale glömts uppdateras.

import svMessages from "@/messages/sv.json";

export type Messages = typeof svMessages;
