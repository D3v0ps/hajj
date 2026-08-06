"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, ipKey } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(2, "Ange ditt namn").max(120),
  email: z.string().email("Ogiltig e-postadress"),
  phone: z.string().max(40).optional().or(z.literal("")),
  travelType: z.enum(["HAJJ", "OMRA", "HADJ_BADAL", "VISUM"]).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
});

export async function submitLead(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  // Publikt formulär → IP-baserad spärr mot spam-floder (5 förfrågningar/10 min).
  const rl = rateLimit(await ipKey("lead"), 5, 10 * 60_000);
  if (!rl.ok) {
    return { ok: false, error: "För många förfrågningar — vänta en stund och försök igen." };
  }

  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    travelType: String(formData.get("travelType") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltigt formulär" };
  }

  const { name, email, phone, travelType, message } = parsed.data;

  try {
    await prisma.lead.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        travelType: travelType ? (travelType as "HAJJ" | "OMRA" | "HADJ_BADAL" | "VISUM") : null,
        message: message || null,
        source: "homepage_quote_form",
      },
    });
  } catch {
    return { ok: false, error: "Kunde inte spara förfrågan, försök igen." };
  }

  return { ok: true };
}
