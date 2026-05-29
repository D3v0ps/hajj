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
});

// Samlar flight-fält "flightOutbound.airline" osv från FormData → objekt. Tomma fält → null.
function collectFlight(fd: FormData, prefix: "flightOutbound" | "flightReturn"): object | null {
  const fields = ["airline", "flightNo", "from", "to", "departTime", "arriveTime", "terminal", "notes"];
  const obj: Record<string, string> = {};
  let hasAny = false;
  for (const f of fields) {
    const v = String(fd.get(`${prefix}.${f}`) ?? "").trim();
    if (v) { obj[f] = v; hasAny = true; }
  }
  return hasAny ? obj : null;
}

// Samlar array-rader: "hotels.0.name", "hotels.0.city", … "hotels.4.name". Tomma rader sluts.
function collectArray(fd: FormData, prefix: string, fields: string[], indexCap = 30): object[] | null {
  const rows: Record<string, string | number>[] = [];
  for (let i = 0; i < indexCap; i++) {
    const row: Record<string, string | number> = {};
    let hasAny = false;
    for (const f of fields) {
      const v = String(fd.get(`${prefix}.${i}.${f}`) ?? "").trim();
      if (v) {
        // rating → number
        if (f === "rating") {
          const n = parseInt(v);
          if (!Number.isNaN(n)) { row[f] = n; hasAny = true; }
        } else if (f === "highlights") {
          // kommaseparerad → array (lagras direkt här som array sen vid spar-tid)
          row[f] = v;
          hasAny = true;
        } else {
          row[f] = v;
          hasAny = true;
        }
      }
    }
    if (hasAny) rows.push(row);
  }
  return rows.length > 0 ? rows : null;
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
  };
}

function dataFromParsed(p: z.infer<typeof packageSchema>, formData: FormData) {
  const flightOutbound = collectFlight(formData, "flightOutbound");
  const flightReturn = collectFlight(formData, "flightReturn");
  const hotels = collectArray(formData, "hotels", ["city", "name", "rating", "address", "distHaram", "checkIn", "checkOut", "phone", "notes"]);
  const transfers = collectArray(formData, "transfers", ["type", "from", "to", "notes"]);
  const itineraryRaw = collectArray(formData, "itinerary", ["date", "title", "description", "highlights"]);
  // Splittra highlights "a, b, c" → array.
  const itinerary = itineraryRaw?.map((row) => {
    const r = row as Record<string, unknown>;
    if (typeof r.highlights === "string") {
      r.highlights = (r.highlights as string).split(",").map((s) => s.trim()).filter(Boolean);
    }
    return r;
  }) ?? null;
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
    flightOutbound: (flightOutbound ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
    flightReturn: (flightReturn ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
    hotels: (hotels ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
    transfers: (transfers ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
    itinerary: (itinerary ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
  };
}

export async function createPackage(formData: FormData) {
  await requireAdmin();
  const parsed = packageSchema.safeParse(fromForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltiga fält" };

  const exists = await prisma.package.findUnique({ where: { slug: parsed.data.slug } });
  if (exists) return { ok: false, error: "Slug är redan upptagen" };

  const created = await prisma.package.create({ data: dataFromParsed(parsed.data, formData) });
  revalidatePath("/admin/paket");
  redirect(`/admin/paket/${created.id}`);
}

export async function updatePackage(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = packageSchema.safeParse(fromForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltiga fält" };

  await prisma.package.update({ where: { id }, data: dataFromParsed(parsed.data, formData) });
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
