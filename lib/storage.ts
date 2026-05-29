import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Lagringslager för uppladdade filer (resedokument m.m.).
 *
 * Idag: lokal disk under UPLOADS_DIR (Docker named-volym `/app/uploads`).
 * Filer adresseras med en relativ "key" som sparas i `Document.filepath`.
 * När vi flyttar till molnlagring (S3/R2/B2) byts bara implementationen i denna
 * modul ut — anroparna (server actions + serve-route) hanterar keys, inte sökvägar.
 */

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "/app/uploads";

function resolveKey(key: string): string {
  const base = path.resolve(UPLOADS_DIR);
  const full = path.resolve(base, key);
  // Skydd mot path traversal — keyn får aldrig peka utanför UPLOADS_DIR.
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new Error("Ogiltig lagringsnyckel");
  }
  return full;
}

/** Sparar en fil och returnerar dess lagrings-key (att lägga i Document.filepath). */
export async function saveFile(data: Buffer, ext: string): Promise<string> {
  const id = randomBytes(16).toString("hex");
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  const key = path.posix.join("documents", safeExt ? `${id}.${safeExt}` : id);
  const full = resolveKey(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data, { mode: 0o600 });
  return key;
}

/** Läser en fil utifrån dess lagrings-key. */
export async function readStoredFile(key: string): Promise<Buffer> {
  return fs.readFile(resolveKey(key));
}

/** Tar bort en fil (tyst om den redan saknas). */
export async function deleteStoredFile(key: string): Promise<void> {
  await fs.rm(resolveKey(key), { force: true });
}
