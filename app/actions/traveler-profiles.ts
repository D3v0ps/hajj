"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  return session.user;
}

const optStr = z.string().max(200).optional().or(z.literal(""));
const optDate = z.string().optional().or(z.literal(""));

const profileSchema = z.object({
  firstName: z.string().min(1, "Förnamn krävs").max(80),
  lastName: z.string().min(1, "Efternamn krävs").max(80),
  relationship: optStr,
  ageCategory: z.enum(["ADULT", "CHILD", "INFANT"]).default("ADULT"),
  isSelf: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: optStr,
  address: optStr,
  personnummer: optStr,
  passportNo: optStr,
  passportExp: optDate,
  passIssueDate: optDate,
  passIssuePlace: optStr,
  birthDate: optDate,
  gender: optStr,
  nationality: optStr,
  civilStatus: optStr,
  occupation: optStr,
  birthCountry: optStr,
  birthCity: optStr,
  notes: optStr,
});

function toDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function payloadFrom(d: z.infer<typeof profileSchema>) {
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    relationship: d.relationship || null,
    ageCategory: d.ageCategory,
    isSelf: d.isSelf === "on",
    email: d.email || null,
    phone: d.phone || null,
    address: d.address || null,
    personnummer: d.personnummer || null,
    passportNo: d.passportNo || null,
    passportExp: toDate(d.passportExp),
    passIssueDate: toDate(d.passIssueDate),
    passIssuePlace: d.passIssuePlace || null,
    birthDate: toDate(d.birthDate),
    gender: d.gender || null,
    nationality: d.nationality || null,
    civilStatus: d.civilStatus || null,
    occupation: d.occupation || null,
    birthCountry: d.birthCountry || null,
    birthCity: d.birthCity || null,
    notes: d.notes || null,
  };
}

function pickFormData(fd: FormData) {
  return {
    firstName: String(fd.get("firstName") ?? ""),
    lastName: String(fd.get("lastName") ?? ""),
    relationship: String(fd.get("relationship") ?? ""),
    ageCategory: (["ADULT", "CHILD", "INFANT"].includes(String(fd.get("ageCategory"))) ? String(fd.get("ageCategory")) : "ADULT") as "ADULT" | "CHILD" | "INFANT",
    isSelf: String(fd.get("isSelf") ?? ""),
    email: String(fd.get("email") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    address: String(fd.get("address") ?? ""),
    personnummer: String(fd.get("personnummer") ?? ""),
    passportNo: String(fd.get("passportNo") ?? ""),
    passportExp: String(fd.get("passportExp") ?? ""),
    passIssueDate: String(fd.get("passIssueDate") ?? ""),
    passIssuePlace: String(fd.get("passIssuePlace") ?? ""),
    birthDate: String(fd.get("birthDate") ?? ""),
    gender: String(fd.get("gender") ?? ""),
    nationality: String(fd.get("nationality") ?? ""),
    civilStatus: String(fd.get("civilStatus") ?? ""),
    occupation: String(fd.get("occupation") ?? ""),
    birthCountry: String(fd.get("birthCountry") ?? ""),
    birthCity: String(fd.get("birthCity") ?? ""),
    notes: String(fd.get("notes") ?? ""),
  };
}

export async function createTravelerProfile(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(pickFormData(formData));
  if (!parsed.success) {
    redirect(`/min-sida/resenarer?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Ogiltigt formulär")}`);
  }
  const created = await prisma.travelerProfile.create({
    data: { userId: user.id, ...payloadFrom(parsed.data!) },
  });
  await logAudit({ actorId: user.id, actorEmail: user.email, action: "profile.travelerCreated", targetType: "TravelerProfile", targetId: created.id });
  revalidatePath("/min-sida/resenarer");
  redirect("/min-sida/resenarer?ok=created");
}

export async function updateTravelerProfile(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/min-sida/resenarer");
  const existing = await prisma.travelerProfile.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) redirect("/min-sida/resenarer");
  const parsed = profileSchema.safeParse(pickFormData(formData));
  if (!parsed.success) {
    redirect(`/min-sida/resenarer/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Ogiltigt formulär")}`);
  }
  await prisma.travelerProfile.update({ where: { id }, data: payloadFrom(parsed.data!) });
  revalidatePath("/min-sida/resenarer");
  revalidatePath(`/min-sida/resenarer/${id}`);
  redirect(`/min-sida/resenarer/${id}?ok=updated`);
}

export async function deleteTravelerProfile(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/min-sida/resenarer");
  await prisma.travelerProfile.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/min-sida/resenarer");
  redirect("/min-sida/resenarer?ok=deleted");
}
