"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveFile, deleteStoredFile } from "@/lib/storage";
import { DocumentStatus, DocumentType } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");
  return session.user;
}

// Tillåtna filtyper (mime → filändelse). Storleksgränsen speglar
// serverActions.bodySizeLimit (8 MB) i next.config.ts.
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_BYTES = 8 * 1024 * 1024;

const DOC_TYPES: DocumentType[] = ["PASSPORT", "PASSPORT_PHOTO", "RESIDENCE_PERMIT", "VACCINATION", "OTHER"];
const DOC_STATUSES: DocumentStatus[] = ["PENDING", "APPROVED", "REJECTED", "NEEDS_INFO"];

function backTo(bookingId: string, q?: Record<string, string>): string {
  const params = new URLSearchParams({ tab: "resenarer", ...(q ?? {}) });
  return `/admin/bokningar/${bookingId}?${params.toString()}`;
}

/** Kontoret laddar upp ett resedokument kopplat till en specifik resenär. */
export async function uploadTravelerDocument(formData: FormData): Promise<void> {
  await requireAdmin();
  const travelerId = String(formData.get("travelerId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");
  const typeRaw = String(formData.get("type") ?? "OTHER") as DocumentType;
  const type: DocumentType = DOC_TYPES.includes(typeRaw) ? typeRaw : "OTHER";
  const file = formData.get("file");

  if (!travelerId || !bookingId) redirect("/admin/bokningar");

  const traveler = await prisma.traveler.findFirst({
    where: { id: travelerId, bookingId },
    select: { id: true, userId: true },
  });
  if (!traveler) redirect(backTo(bookingId, { docError: "Resenär hittades ej" }));

  if (!(file instanceof File) || file.size === 0) {
    redirect(backTo(bookingId, { docError: "Ingen fil vald" }));
  }
  const ext = ALLOWED[file.type];
  if (!ext) redirect(backTo(bookingId, { docError: "Filtypen stöds ej (PDF, JPG, PNG, WEBP)" }));
  if (file.size > MAX_BYTES) redirect(backTo(bookingId, { docError: "Filen är för stor (max 8 MB)" }));

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = await saveFile(buffer, ext);

  await prisma.document.create({
    data: {
      userId: traveler.userId,
      travelerId: traveler.id,
      type,
      filename: (file.name || `dokument.${ext}`).slice(0, 200),
      filepath: key,
      mimetype: file.type,
      sizeBytes: file.size,
      status: "PENDING",
    },
  });

  revalidatePath(`/admin/bokningar/${bookingId}`);
  redirect(backTo(bookingId, { docOk: "1" }));
}

/** Sätter granskningsstatus (godkänn/avvisa/komplettering) på ett dokument. */
export async function setDocumentStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const documentId = String(formData.get("documentId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");
  const statusRaw = String(formData.get("status") ?? "") as DocumentStatus;
  const reviewNote = String(formData.get("reviewNote") ?? "").slice(0, 500) || null;

  if (!documentId || !bookingId) redirect("/admin/bokningar");
  if (!DOC_STATUSES.includes(statusRaw)) redirect(backTo(bookingId, { docError: "Ogiltig status" }));

  await prisma.document.update({
    where: { id: documentId },
    data: { status: statusRaw, reviewNote, reviewedAt: new Date() },
  });

  revalidatePath(`/admin/bokningar/${bookingId}`);
  redirect(backTo(bookingId, { docOk: "1" }));
}

/** Tar bort ett dokument (DB-rad + lagrad fil). */
export async function deleteTravelerDocument(formData: FormData): Promise<void> {
  await requireAdmin();
  const documentId = String(formData.get("documentId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");

  if (!documentId || !bookingId) redirect("/admin/bokningar");

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { filepath: true },
  });
  await prisma.document.delete({ where: { id: documentId } }).catch(() => {});
  if (doc) await deleteStoredFile(doc.filepath).catch(() => {});

  revalidatePath(`/admin/bokningar/${bookingId}`);
  redirect(backTo(bookingId, { docOk: "1" }));
}
