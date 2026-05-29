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
  "/demo",
  "/villkor",
  "/integritet",
  "/cookies",
  "/tillganglighet",
] as const;

// Alternates per locale så Google serverar rätt språk per marknad.
const LOCALES = ["sv", "en", "ar"] as const;

function alternatesFor(path: string, baseUrl: string): Record<string, string> {
  const out: Record<string, string> = { sv: `${baseUrl}${path || "/"}`, "x-default": `${baseUrl}${path || "/"}` };
  for (const l of LOCALES) {
    if (l === "sv") continue;
    out[l] = `${baseUrl}/${l}${path}`;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_URL ?? "https://hajj.karimkhalil.se";

  const packages = await prisma.package
    .findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } })
    .catch(() => []);

  return [
    ...STATIC_PATHS.map((p) => ({
      url: `${baseUrl}${p || "/"}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1.0 : 0.7,
      alternates: { languages: alternatesFor(p, baseUrl) },
    })),
    ...packages.map((pkg) => ({
      url: `${baseUrl}/paket/${pkg.slug}`,
      lastModified: pkg.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: alternatesFor(`/paket/${pkg.slug}`, baseUrl) },
    })),
  ];
}
