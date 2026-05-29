"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");
  return session.user;
}

const packageSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "Endast a–z, 0–9 och bindestreck"),
  type: z.enum(["HAJJ", "OMRA", "HADJ_BADAL", "VISUM"]),
  title: z.string().min(2).max(200),
  subtitle: z.string().max(280).optional().or(z.literal("")),
  summary: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  departCities: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  durationDays: z.coerce.number().int().min(1).max(60).optional().or(z.literal(0)),
  nightsMakkah: z.coerce.number().int().min(0).max(60).optional().or(z.literal(0)),
  nightsMadinah: z.coerce.number().int().min(0).max(60).optional().or(z.literal(0)),
  status: z.enum(["DRAFT", "PUBLISHED", "SOLD_OUT", "ARCHIVED"]).default("DRAFT"),
  hotelMakkah: z.string().max(120).optional().or(z.literal("")),
  hotelMadinah: z.string().max(120).optional().or(z.literal("")),
  distHaramM: z.coerce.number().int().min(0).max(50000).optional().or(z.literal(0)),
  distNabawiM: z.coerce.number().int().min(0).max(50000).optional().or(z.literal(0)),
  inclusions: z.string().optional().or(z.literal("")),
  excludeNotes: z.string().optional().or(z.literal("")),
  // Travel pack (alla optional, valideras vidare i parseJsonField)
  leaderName: z.string().max(120).optional().or(z.literal("")),
  leaderPhone: z.string().max(40).optional().or(z.literal("")),
  emergencyContact: z.string().max(200).optional().or(z.literal("")),
  gatheringPoint: z.string().max(200).optional().or(z.literal("")),
  gatheringTime: z.string().max(120).optional().or(z.literal("")),
  whatsappLink: z.string().max(500).optional().or(z.literal("")),
  flightOutbound: z.string().optional().or(z.literal("")),
  flightReturn: z.string().optional().or(z.literal("")),
  hotels: z.string().optional().or(z.literal("")),
  transfers: z.string().optional().or(z.literal("")),
  itinerary: z.string().optional().or(z.literal("")),
});

// Tolkar ett textfält som JSON; tomt → null. Ogiltig JSON → null (fel rapporteras inte
// inline här eftersom hela detta är optional admin-data; admin ser kvar texten i editorn).
function parseJsonField(raw: string | undefined | null): unknown {
  if (!raw || !raw.trim()) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function fromForm(formData: FormData) {
  return {
    slug: String(formData.get("slug") ?? ""),
    type: String(formData.get("type") ?? "OMRA"),
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    description: String(formData.get("description") ?? ""),
    city: String(formData.get("city") ?? ""),
    departCities: String(formData.get("departCities") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    durationDays: String(formData.get("durationDays") ?? ""),
    nightsMakkah: String(formData.get("nightsMakkah") ?? ""),
    nightsMadinah: String(formData.get("nightsMadinah") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
    hotelMakkah: String(formData.get("hotelMakkah") ?? ""),
    hotelMadinah: String(formData.get("hotelMadinah") ?? ""),
    distHaramM: String(formData.get("distHaramM") ?? ""),
    distNabawiM: String(formData.get("distNabawiM") ?? ""),
    inclusions: String(formData.get("inclusions") ?? ""),
    excludeNotes: String(formData.get("excludeNotes") ?? ""),
    leaderName: String(formData.get("leaderName") ?? ""),
    leaderPhone: String(formData.get("leaderPhone") ?? ""),
    emergencyContact: String(formData.get("emergencyContact") ?? ""),
    gatheringPoint: String(formData.get("gatheringPoint") ?? ""),
    gatheringTime: String(formData.get("gatheringTime") ?? ""),
    whatsappLink: String(formData.get("whatsappLink") ?? ""),
    flightOutbound: String(formData.get("flightOutbound") ?? ""),
    flightReturn: String(formData.get("flightReturn") ?? ""),
    hotels: String(formData.get("hotels") ?? ""),
    transfers: String(formData.get("transfers") ?? ""),
    itinerary: String(formData.get("itinerary") ?? ""),
  };
}

function dataFromParsed(p: z.infer<typeof packageSchema>) {
  return {
    slug: p.slug,
    type: p.type,
    title: p.title,
    subtitle: p.subtitle || null,
    summary: p.summary || null,
    description: p.description || null,
    city: p.city || null,
    departCities: (p.departCities || "").split("\n").map((s) => s.trim()).filter(Boolean),
    departCity: (p.departCities || "").split("\n").map((s) => s.trim()).filter(Boolean)[0] || null,
    startDate: p.startDate ? new Date(p.startDate) : null,
    endDate: p.endDate ? new Date(p.endDate) : null,
    durationDays: p.durationDays || null,
    nightsMakkah: p.nightsMakkah || null,
    nightsMadinah: p.nightsMadinah || null,
    status: p.status,
    hotelMakkah: p.hotelMakkah || null,
    hotelMadinah: p.hotelMadinah || null,
    distHaramM: p.distHaramM || null,
    distNabawiM: p.distNabawiM || null,
    inclusions: (p.inclusions || "").split("\n").map((s) => s.trim()).filter(Boolean),
    excludeNotes: (p.excludeNotes || "").split("\n").map((s) => s.trim()).filter(Boolean),
    leaderName: p.leaderName || null,
    leaderPhone: p.leaderPhone || null,
    emergencyContact: p.emergencyContact || null,
    gatheringPoint: p.gatheringPoint || null,
    gatheringTime: p.gatheringTime || null,
    whatsappLink: p.whatsappLink || null,
    flightOutbound: (parseJsonField(p.flightOutbound) ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
    flightReturn: (parseJsonField(p.flightReturn) ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
    hotels: (parseJsonField(p.hotels) ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
    transfers: (parseJsonField(p.transfers) ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
    itinerary: (parseJsonField(p.itinerary) ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
  };
}

export async function createPackage(formData: FormData) {
  await requireAdmin();
  const parsed = packageSchema.safeParse(fromForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltiga fält" };

  const exists = await prisma.package.findUnique({ where: { slug: parsed.data.slug } });
  if (exists) return { ok: false, error: "Slug är redan upptagen" };

  const created = await prisma.package.create({ data: dataFromParsed(parsed.data) });
  revalidatePath("/admin/paket");
  redirect(`/admin/paket/${created.id}`);
}

export async function updatePackage(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = packageSchema.safeParse(fromForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltiga fält" };

  await prisma.package.update({ where: { id }, data: dataFromParsed(parsed.data) });
  revalidatePath("/admin/paket");
  revalidatePath(`/admin/paket/${id}`);
  revalidatePath("/");
  return { ok: true };
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
