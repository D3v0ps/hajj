"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveFile, deleteStoredFile } from "@/lib/storage";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");
  return session.user;
}

const packageSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "Endast a–z, 0–9 och bindestreck"),
  // VISUM behålls i enum för bakåtkompatibilitet med ev. importerade visum-paket,
  // men erbjuds inte längre som val i formuläret.
  type: z.enum(["HAJJ", "OMRA", "HADJ_BADAL", "VISUM"]),
  title: z.string().min(2).max(200),
  subtitle: z.string().max(280).optional().or(z.literal("")),
  summary: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  departCities: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  durationDays: z.coerce.number().int().min(1).max(60).optional().or(z.literal(0)),
  nightsMakkah: z.coerce.number().int().min(0).max(60).optional().or(z.literal(0)),
  nightsMadinah: z.coerce.number().int().min(0).max(60).optional().or(z.literal(0)),
  status: z.enum(["DRAFT", "PUBLISHED", "SOLD_OUT", "ARCHIVED"]).default("DRAFT"),
  depositPerPerson: z.coerce.number().int().min(0).max(100_000).optional().or(z.literal(0)),
  hotelMakkah: z.string().max(120).optional().or(z.literal("")),
  hotelMadinah: z.string().max(120).optional().or(z.literal("")),
  distHaramM: z.coerce.number().int().min(0).max(50000).optional().or(z.literal(0)),
  distNabawiM: z.coerce.number().int().min(0).max(50000).optional().or(z.literal(0)),
  inclusions: z.string().optional().or(z.literal("")),
  excludeNotes: z.string().optional().or(z.literal("")),
});

function fromForm(formData: FormData) {
  return {
    slug: String(formData.get("slug") ?? ""),
    type: String(formData.get("type") ?? "OMRA"),
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    description: String(formData.get("description") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    city: String(formData.get("city") ?? ""),
    // Avreseorter skickas som flera dolda fält med samma namn → slå ihop till rader.
    departCities: (formData.getAll("departCities") as string[]).map((s) => String(s)).join("\n"),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    durationDays: String(formData.get("durationDays") ?? ""),
    nightsMakkah: String(formData.get("nightsMakkah") ?? ""),
    nightsMadinah: String(formData.get("nightsMadinah") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
    depositPerPerson: String(formData.get("depositPerPerson") ?? ""),
    hotelMakkah: String(formData.get("hotelMakkah") ?? ""),
    hotelMadinah: String(formData.get("hotelMadinah") ?? ""),
    distHaramM: String(formData.get("distHaramM") ?? ""),
    distNabawiM: String(formData.get("distNabawiM") ?? ""),
    inclusions: String(formData.get("inclusions") ?? ""),
    excludeNotes: String(formData.get("excludeNotes") ?? ""),
  };
}

function dataFromParsed(p: z.infer<typeof packageSchema>) {
  const departCities = (p.departCities || "").split("\n").map((s) => s.trim()).filter(Boolean);
  return {
    slug: p.slug,
    type: p.type,
    title: p.title,
    subtitle: p.subtitle || null,
    summary: p.summary || null,
    description: p.description || null,
    notes: p.notes || null,
    city: p.city || null,
    departCities,
    departCity: departCities[0] || null,
    startDate: p.startDate ? new Date(p.startDate) : null,
    endDate: p.endDate ? new Date(p.endDate) : null,
    durationDays: p.durationDays || null,
    nightsMakkah: p.nightsMakkah || null,
    nightsMadinah: p.nightsMadinah || null,
    status: p.status,
    depositPerPerson: p.depositPerPerson || null,
    hotelMakkah: p.hotelMakkah || null,
    hotelMadinah: p.hotelMadinah || null,
    distHaramM: p.distHaramM || null,
    distNabawiM: p.distNabawiM || null,
    inclusions: (p.inclusions || "").split("\n").map((s) => s.trim()).filter(Boolean),
    excludeNotes: (p.excludeNotes || "").split("\n").map((s) => s.trim()).filter(Boolean),
  };
}

const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Hanterar bilduppladdning från formuläret.
 *  - returnerar `string`  → ny lagrings-key att spara i imageUrl
 *  - returnerar `null`    → admin bockade i "ta bort bild" → nollställ imageUrl
 *  - returnerar `undefined` → ingen ändring (behåll befintlig bild)
 *  Kastar Error vid ogiltig fil (fångas av anroparen → inline-fel).
 */
async function handleImageUpload(formData: FormData): Promise<string | null | undefined> {
  if (String(formData.get("removeImage") ?? "") === "1") return null;
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (file.size > 6 * 1024 * 1024) throw new Error("Bilden är för stor (max 6 MB).");
  const ext = IMAGE_EXT_BY_TYPE[file.type];
  if (!ext) throw new Error("Bildformat stöds ej — använd JPG, PNG, WebP eller GIF.");
  const buf = Buffer.from(await file.arrayBuffer());
  return saveFile(buf, ext, "packages");
}

export async function createPackage(formData: FormData) {
  await requireAdmin();
  const parsed = packageSchema.safeParse(fromForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltiga fält" };

  const exists = await prisma.package.findUnique({ where: { slug: parsed.data.slug } });
  if (exists) return { ok: false, error: "Slug är redan upptagen" };

  let imageKey: string | null | undefined;
  try {
    imageKey = await handleImageUpload(formData);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kunde inte spara bilden" };
  }

  const created = await prisma.package.create({
    data: { ...dataFromParsed(parsed.data), ...(imageKey !== undefined ? { imageUrl: imageKey } : {}) },
  });
  revalidatePath("/admin/paket");
  revalidatePath("/");
  redirect(`/admin/paket/${created.id}?created=1`);
}

export async function updatePackage(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = packageSchema.safeParse(fromForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltiga fält" };

  let imageKey: string | null | undefined;
  try {
    imageKey = await handleImageUpload(formData);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kunde inte spara bilden" };
  }

  // Vid byte/borttagning: städa bort den gamla lagrade filen (ej externa URL:er).
  if (imageKey !== undefined) {
    const prev = await prisma.package.findUnique({ where: { id }, select: { imageUrl: true } });
    if (prev?.imageUrl && !/^https?:\/\//i.test(prev.imageUrl)) {
      await deleteStoredFile(prev.imageUrl).catch(() => {});
    }
  }

  await prisma.package.update({
    where: { id },
    data: { ...dataFromParsed(parsed.data), ...(imageKey !== undefined ? { imageUrl: imageKey } : {}) },
  });
  revalidatePath("/admin/paket");
  revalidatePath(`/admin/paket/${id}`);
  revalidatePath("/");
  redirect(`/admin/paket/${id}?saved=1`);
}

export async function deletePackage(id: string) {
  await requireAdmin();
  await prisma.package.delete({ where: { id } });
  revalidatePath("/admin/paket");
  redirect("/admin/paket");
}

const tierSchema = z.object({
  name: z.string().min(1).max(80),
  roomType: z.enum(["DOUBLE", "TRIPLE", "QUAD", "QUINTUPLE", "FAMILY"]),
  ageCategory: z.enum(["ADULT", "CHILD", "INFANT"]).default("ADULT"),
  ageMin: z.coerce.number().int().min(0).max(99).default(12),
  ageMax: z.coerce.number().int().min(0).max(99).default(99),
  pricePerPerson: z.coerce.number().int().min(0).max(10_000_000),
  available: z.coerce.number().int().min(0).max(1000).default(0),
  notes: z.string().max(280).optional().or(z.literal("")),
});

export async function addTier(packageId: string, formData: FormData) {
  await requireAdmin();
  const parsed = tierSchema.safeParse({
    name: formData.get("name"),
    roomType: formData.get("roomType"),
    ageCategory: formData.get("ageCategory"),
    ageMin: formData.get("ageMin"),
    ageMax: formData.get("ageMax"),
    pricePerPerson: formData.get("pricePerPerson"),
    available: formData.get("available"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltiga fält" };

  await prisma.packageTier.create({
    data: {
      packageId,
      name: parsed.data.name,
      roomType: parsed.data.roomType,
      ageCategory: parsed.data.ageCategory,
      ageMin: parsed.data.ageMin,
      ageMax: parsed.data.ageMax,
      pricePerPerson: parsed.data.pricePerPerson,
      available: parsed.data.available,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/admin/paket/${packageId}`);
  return { ok: true };
}

export async function deleteTier(packageId: string, tierId: string) {
  await requireAdmin();
  await prisma.packageTier.deleteMany({ where: { id: tierId, packageId } });
  revalidatePath(`/admin/paket/${packageId}`);
}
