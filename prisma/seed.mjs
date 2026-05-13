/* eslint-disable @typescript-eslint/no-require-imports */
// Seed för Hadj Omra Resor — körs som ren Node-modul i container,
// inga TypeScript-beroenden eller tsx behövs runtime.

import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

async function main() {
  console.log("Seeding...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Admin",
          role: "ADMIN",
          passwordHash: await hashPassword(adminPassword),
        },
      });
      console.log(`  Created admin user ${adminEmail}`);
    } else if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      console.log(`  Promoted ${adminEmail} to ADMIN`);
    } else {
      console.log(`  Admin user already exists.`);
    }
  } else {
    console.log("  Skipping admin (set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD to create one).");
  }

  const packages = [
    {
      slug: "omra-pasklov-2026",
      type: "OMRA",
      title: "Omra Påsklov 2026",
      subtitle: "Familjevänlig vårresa under påsklovet",
      summary: "Tio dagar i Mecka och Medina med svensk reseledare. Perfekt för familjer som vill resa under skollovet.",
      description:
        "Vår klassiska Omra-resa under påsklovet. Direktflyg från Stockholm-Arlanda, hotell inom 500 m från Haram i Mecka och 200 m från Nabawi i Medina. Resan har varit fullbokad varje år sedan 2018.",
      departCity: "Stockholm",
      city: "Mecka + Medina",
      startDate: new Date("2026-04-02"),
      endDate: new Date("2026-04-12"),
      durationDays: 11,
      groupSize: 40,
      status: "PUBLISHED",
      hotelMakkah: "Anjum Hotel Makkah",
      hotelMadinah: "Dar Al Eiman Royal",
      distHaramM: 350,
      distNabawiM: 180,
      inclusions: [
        "Omra-visum",
        "Direktflyg Stockholm-Jeddah-Stockholm",
        "9 nätters hotellboende (Mecka + Medina)",
        "Buss-transfers mellan hotell, flygplats och städer",
        "Frukost och middag dagligen",
        "Svensk reseledare på plats",
        "Religiös vägledning",
        "Förresemöte i Stockholm",
        "Zamzam-vatten (5 L hem)",
      ],
      excludeNotes: ["Reseförsäkring", "Lunch", "Personliga utflykter"],
      tiers: [
        { name: "4-bädd", roomType: "QUAD", pricePerPerson: 19900, available: 16 },
        { name: "3-bädd", roomType: "TRIPLE", pricePerPerson: 20900, available: 12 },
        { name: "2-bädd", roomType: "DOUBLE", pricePerPerson: 21900, available: 12 },
      ],
    },
    {
      slug: "omra-sommarlov-2026",
      type: "OMRA",
      title: "Omra Sommarlov 2026",
      subtitle: "Tio dagar i samband med skolornas sommarlov",
      summary: "Sommarens Omra-resa. Boka tidigt — platserna går snabbt.",
      description: "Vår mest populära Omra-resa, anpassad för familjer som vill resa under sommarlovet.",
      departCity: "Stockholm",
      city: "Mecka + Medina",
      startDate: new Date("2026-07-31"),
      endDate: new Date("2026-08-10"),
      durationDays: 11,
      groupSize: 50,
      status: "PUBLISHED",
      hotelMakkah: "Pullman ZamZam Makkah",
      hotelMadinah: "Madinah Hilton",
      distHaramM: 250,
      distNabawiM: 220,
      inclusions: [
        "Omra-visum",
        "Direktflyg Stockholm-Jeddah-Stockholm",
        "9 nätters hotellboende",
        "Buss-transfers",
        "Frukost och middag",
        "Svensk reseledare",
        "Religiös vägledning",
        "Förresemöte",
        "Zamzam-vatten (5 L)",
      ],
      excludeNotes: ["Reseförsäkring", "Lunch", "Personliga utflykter"],
      tiers: [
        { name: "4-bädd", roomType: "QUAD", pricePerPerson: 19900, available: 20 },
        { name: "3-bädd", roomType: "TRIPLE", pricePerPerson: 20900, available: 18 },
        { name: "2-bädd", roomType: "DOUBLE", pricePerPerson: 21900, available: 12 },
      ],
    },
    {
      slug: "hajj-2027",
      type: "HAJJ",
      title: "Hajj 2027 — Dhul Hijja 1449",
      subtitle: "Komplett Hajj-resa med saudisk partner",
      summary: "Vår årliga Hajj-resa. Begränsade platser via Saudiarabiens kvotsystem. Anmäl intresse tidigt.",
      description:
        "Komplett Hajj-paket via vår etablerade saudiska partner. Visum, flyg, hotell, tält i Mina och Arafat enligt Nusuk-standard, buss, måltider, och svensk reseledare hela vägen.",
      departCity: "Stockholm",
      city: "Mecka + Medina",
      startDate: new Date("2027-05-25"),
      endDate: new Date("2027-06-15"),
      durationDays: 22,
      groupSize: 25,
      status: "PUBLISHED",
      hotelMakkah: "Swissôtel Al Maqam",
      hotelMadinah: "Anwar Al Madinah Movenpick",
      distHaramM: 200,
      distNabawiM: 150,
      inclusions: [
        "Saudiskt Hajj-visum",
        "Direktflyg",
        "Hotell i Mecka och Medina",
        "Tält i Mina och Arafat (Nusuk)",
        "Bussar och alla transfers",
        "Måltider efter program",
        "Svensk reseledare",
        "Religiös guide",
        "Förresemöte",
        "Akut-stöd dygnet runt under resan",
      ],
      excludeNotes: ["Reseförsäkring", "Personliga utflykter", "Tilläggsoffer"],
      tiers: [
        { name: "4-bädd", roomType: "QUAD", pricePerPerson: 89000, available: 8 },
        { name: "3-bädd", roomType: "TRIPLE", pricePerPerson: 99000, available: 6 },
        { name: "2-bädd", roomType: "DOUBLE", pricePerPerson: 119000, available: 4 },
      ],
    },
  ];

  for (const p of packages) {
    const { tiers, ...rest } = p;
    const existing = await prisma.package.findUnique({ where: { slug: rest.slug } });
    if (existing) {
      console.log(`  Package ${rest.slug} exists, skipping.`);
      continue;
    }
    const created = await prisma.package.create({ data: rest });
    for (const t of tiers) {
      await prisma.packageTier.create({ data: { ...t, packageId: created.id } });
    }
    console.log(`  Created package ${rest.slug}`);
  }

  console.log("Seeding done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
