import type { Metadata, Viewport } from "next";
import { Newsreader, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
// Importera env-validering tidigt så appen kraschar snabbt vid felaktig config.
import "@/lib/env";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBFAF6",
};

const newsreader = Newsreader({
  variable: "--font-serif-actual",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-sans-actual",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-actual",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hadj Omra Resor — Vallfärd från Sverige sedan 1985",
    template: "%s · Hadj Omra Resor",
  },
  description:
    "Sveriges ledande arrangör av Hajj och Omra. Resegaranti hos Kammarkollegiet, 40+ års erfarenhet, svensk service från start till hemkomst.",
  metadataBase: new URL(process.env.APP_URL ?? "https://hajj.karimkhalil.se"),
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "Hadj Omra Resor",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${newsreader.variable} ${manrope.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
