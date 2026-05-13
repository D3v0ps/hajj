import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const STATIC_PATHS = [
  "",
  "/omra",
  "/hajj-2027",
  "/visum",
  "/hadj-badal",
  "/forbered",
  "/om-oss",
  "/kontakt",
  "/villkor",
  "/integritet",
  "/cookies",
  "/tillganglighet",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_URL ?? "https://hajj.karimkhalil.se";

  const packages = await prisma.package
    .findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } })
    .catch(() => []);

  return [
    ...STATIC_PATHS.map((p) => ({
      url: `${baseUrl}${p}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1.0 : 0.7,
    })),
    ...packages.map((pkg) => ({
      url: `${baseUrl}/paket/${pkg.slug}`,
      lastModified: pkg.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
