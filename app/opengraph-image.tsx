import { ImageResponse } from "next/og";

// Globalt Open Graph-bildgenerator. Next 16 plockar upp `app/opengraph-image.tsx`
// per Metadata API och bygger en 1200×630 PNG vid build/request. JSX/CSS only —
// inga externa bilder, satori använder bundled fonts från @vercel/og.
//
// Designton: navy bakgrund, guld separator, serif-rubriker. Speglar designtoken
// från app/globals.css (--c-ink, --c-gold, --c-cream).

export const alt =
  "Hadj Omra Resor — Hajj & Omra från Sverige sedan 1985";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0C1E3E",
          color: "#FBFAF6",
          padding: "72px 80px",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Övre rad: brandmark + ackrediteringsetikett */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 72,
                height: 72,
                border: "1px solid #B5894B",
                color: "#B5894B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 42,
                fontFamily: "serif",
              }}
            >
              ح
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 18,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#B5894B",
                  fontFamily: "sans-serif",
                }}
              >
                Sedan 1985
              </span>
              <span
                style={{
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#C3CCD8",
                  fontFamily: "sans-serif",
                  marginTop: 4,
                }}
              >
                Hajj · Omra · Hadj Badal
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 18px",
              border: "1px solid #B5894B",
              color: "#B5894B",
              fontSize: 16,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            Resegaranti hos Kammarkollegiet
          </div>
        </div>

        {/* Huvudtypografi */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.05,
              color: "#FBFAF6",
              fontFamily: "serif",
              letterSpacing: "-0.01em",
            }}
          >
            Hadj Omra Resor
          </div>

          {/* Guld-separator */}
          <div
            style={{
              width: 120,
              height: 2,
              background: "#B5894B",
              marginTop: 32,
              marginBottom: 32,
            }}
          />

          <div
            style={{
              fontSize: 38,
              lineHeight: 1.25,
              color: "#EFE9DD",
              fontFamily: "serif",
              fontStyle: "italic",
              maxWidth: 980,
            }}
          >
            Hajj &amp; Omra från Sverige sedan 1985
          </div>
        </div>

        {/* Nedre rad: byline + trust */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#C3CCD8",
              fontFamily: "sans-serif",
            }}
          >
            hajj.karimkhalil.se
          </div>
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.10em",
              color: "#C3CCD8",
              fontFamily: "sans-serif",
            }}
          >
            Stockholm · Göteborg
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
