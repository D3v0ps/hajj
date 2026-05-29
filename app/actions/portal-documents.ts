"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveFile, deleteStoredFile } from "@/lib/storage";
import { DocumentType } from "@prisma/client";

/**
 * Self-betjäning för kund: ladda upp egna pass/passfoto/uppehållstillstånd
 * kopplade till resenärer som kunden själv äger (Traveler.userId === session-user).
 *
 * Säkerhet: vi filtrerar alltid på `userId === session.user.id` så att en kund
 * aldrig kan ladda upp filer åt — eller radera filer från — någon annan.
 */

const PORTAL_PATH = "/min-sida/dokument";

async function requireCustomer() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  return session.user;
}

// Samma filtypsvalidering som admin (`app/actions/documents.ts`):
// PDF/JPG/PNG/WEBP, max 8 MB (speglar serverActions.bodySizeLimit i next.config.ts).
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_BYTES = 8 * 1024 * 1024;

// Kunden får bara välja de tre dokumenttyper som faktiskt efterfrågas av kontoret.
// Övriga typer (VACCINATION/OTHER) är förbehållna admin för att hålla flödet enkelt.
const CUSTOMER_DOC_TYPES: DocumentType[] = ["PASSPORT", "PASSPORT_PHOTO", "RESIDENCE_PERMIT"];

function backTo(q?: Record<string, string>): string {
  if (!q) return PORTAL_PATH;
  const params = new URLSearchParams(q);
  return `${PORTAL_PATH}?${params.toString()}`;
}

/** Kunden laddar upp ett eget resedokument kopplat till en av sina resenärer. */
export async function uploadCustomerDocument(formData: FormData): Promise<void> {
  const user = await requireCustomer();

  const travelerId = String(formData.get("travelerId") ?? "");
  const typeRaw = String(formData.get("type") ?? "") as DocumentType;
  const file = formData.get("file");

  if (!travelerId) redirect(backTo({ error: "Ingen resenär vald" }));
  if (!CUSTOMER_DOC_TYPES.includes(typeRaw)) {
    redirect(backTo({ error: "Ogiltig dokumenttyp" }));
  }

  // Resenären MÅSTE tillhöra kunden — annars kan en angripare som känner till
  // ett travelerId ladda upp dokument åt någon annans resenär.
  const traveler = await prisma.traveler.findFirst({
    where: { id: travelerId, userId: user.id },
    select: { id: true },
  });
  if (!traveler) redirect(backTo({ error: "Resenär hittades ej" }));

  if (!(file instanceof File) || file.size === 0) {
    redirect(backTo({ error: "Ingen fil vald" }));
  }
  const ext = ALLOWED[file.type];
  if (!ext) redirect(backTo({ error: "Filtypen stöds ej (PDF, JPG, PNG, WEBP)" }));
  if (file.size > MAX_BYTES) redirect(backTo({ error: "Filen är för stor (max 8 MB)" }));

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await saveFile(buffer, ext);

  await prisma.document.create({
    data: {
      userId: user.id,
      travelerId: traveler.id,
      type: typeRaw,
      filename: (file.name || `dokument.${ext}`).slice(0, 200),
      filepath: key,
      mimetype: file.type,
      sizeBytes: file.size,
      status: "PENDING",
    },
  });

  revalidatePath(PORTAL_PATH);
  redirect(backTo({ ok: "1" }));
}

/**
 * Kunden tar bort ett eget dokument — men ENDAST om status fortfarande är PENDING.
 * Efter granskning (APPROVED/REJECTED/NEEDS_INFO) ligger filen i kontorets process
 * och får inte raderas av kunden.
 */
export async function deleteCustomerDocument(formData: FormData): Promise<void> {
  const user = await requireCustomer();
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) redirect(backTo({ error: "Ogiltig begäran" }));

  // Hämta dokumentet och kräv att (a) det tillhör kunden och (b) status = PENDING.
  // findFirst med båda villkoren returnerar null om något inte stämmer — då gör vi inget.
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId: user.id, status: "PENDING" },
    select: { id: true, filepath: true },
  });
  if (!doc) redirect(backTo({ error: "Dokumentet kan inte tas bort" }));

  await prisma.document.delete({ where: { id: doc.id } }).catch(() => {});
  await deleteStoredFile(doc.filepath).catch(() => {});

  revalidatePath(PORTAL_PATH);
  redirect(backTo({ ok: "1" }));
}
