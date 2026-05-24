"use client";

import { useState, useRef, useCallback } from "react";

type PassportData = {
  firstName: string;
  lastName: string;
  passportNo: string;
  nationality: string;
  birthDate: string;
  gender: string;
  expiryDate: string;
  personnummer: string;
};

type Props = {
  onResult: (data: Partial<PassportData>) => void;
};

// MRZ line patterns (TD3 passport - 2 lines of 44 chars)
const MRZ_LINE1 = /^P[<A-Z]([A-Z<]{3})([A-Z<]+)<<([A-Z<]+)/;
const MRZ_LINE2 = /^([A-Z0-9<]{9})\d([A-Z<]{3})(\d{6})\d([MF<])(\d{6})\d/;

function parseMRZ(text: string): Partial<PassportData> | null {
  const lines = text.split("\n").map((l) => l.replace(/\s/g, "").toUpperCase());
  const mrzLines = lines.filter((l) => l.length >= 42 && /^[A-Z0-9<]{42,}$/.test(l));

  if (mrzLines.length < 2) return null;

  const line1 = mrzLines[mrzLines.length - 2];
  const line2 = mrzLines[mrzLines.length - 1];

  const m1 = line1.match(MRZ_LINE1);
  const m2 = line2.match(MRZ_LINE2);

  if (!m1 || !m2) return null;

  const clean = (s: string) => s.replace(/<+/g, " ").trim();
  const fmtDate = (yymmdd: string) => {
    const yy = parseInt(yymmdd.slice(0, 2));
    const year = yy > 50 ? 1900 + yy : 2000 + yy;
    return `${year}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
  };

  return {
    nationality: clean(m1[1]),
    lastName: clean(m1[2]),
    firstName: clean(m1[3]),
    passportNo: clean(m2[1]),
    birthDate: fmtDate(m2[3]),
    gender: m2[4] === "M" ? "M" : m2[4] === "F" ? "F" : "",
    expiryDate: fmtDate(m2[5]),
  };
}

export function PassportScanner({ onResult }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "scanning" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Partial<PassportData> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStatus("loading");
    setParsed(null);

    try {
      const Tesseract = await import("tesseract.js");
      setStatus("scanning");

      const result = await Tesseract.recognize(file, "eng+osd", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      const mrzData = parseMRZ(text);

      if (mrzData && (mrzData.passportNo || mrzData.lastName)) {
        setParsed(mrzData);
        setStatus("done");
        onResult(mrzData);
      } else {
        // Fallback: try to extract any useful data from OCR text
        const lines = text.split("\n").filter((l: string) => l.trim().length > 2);
        setParsed(null);
        setStatus("done");
        // Still pass raw text for manual review
        onResult({ notes: `OCR-resultat (manuell granskning):\n${lines.slice(0, 10).join("\n")}` } as Partial<PassportData>);
      }
    } catch (err) {
      console.error("OCR error:", err);
      setStatus("error");
    }
  }, [onResult]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="passport-scanner">
      <div className="ps-upload">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          style={{ display: "none" }}
          id="passport-file"
        />

        {!preview ? (
          <label htmlFor="passport-file" className="ps-dropzone">
            <span className="ps-icon">🛂</span>
            <strong>Ladda upp passbild</strong>
            <span className="dim" style={{ fontSize: 13 }}>
              Fotografera passets infosida eller ladda upp en bild.
              Uppgifter fylls i automatiskt via OCR.
            </span>
            <span className="ps-hint">
              Kamera · Bildbibliotek · Dra & släpp
            </span>
          </label>
        ) : (
          <div className="ps-preview">
            <img src={preview} alt="Passförhandsvisning" className="ps-img" />
            <button
              type="button"
              className="ps-retake"
              onClick={() => {
                setPreview(null);
                setStatus("idle");
                setParsed(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Ta ny bild
            </button>
          </div>
        )}
      </div>

      {status === "loading" && (
        <div className="ps-status">
          <div className="loader" /> Laddar OCR-motor...
        </div>
      )}

      {status === "scanning" && (
        <div className="ps-status">
          <div className="loader" /> Skannar pass... {progress}%
          <div className="ps-progress">
            <div className="ps-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === "done" && parsed && (
        <div className="ps-result">
          <span className="eyebrow gold" style={{ marginBottom: 8, display: "block" }}>
            Hittade passdata (MRZ)
          </span>
          <div className="ps-fields">
            {parsed.firstName && <div><span className="ps-label">Förnamn</span><span className="ps-value">{parsed.firstName}</span></div>}
            {parsed.lastName && <div><span className="ps-label">Efternamn</span><span className="ps-value">{parsed.lastName}</span></div>}
            {parsed.passportNo && <div><span className="ps-label">Passnummer</span><span className="ps-value">{parsed.passportNo}</span></div>}
            {parsed.birthDate && <div><span className="ps-label">Födelsedatum</span><span className="ps-value">{parsed.birthDate}</span></div>}
            {parsed.gender && <div><span className="ps-label">Kön</span><span className="ps-value">{parsed.gender === "M" ? "Man" : "Kvinna"}</span></div>}
            {parsed.nationality && <div><span className="ps-label">Nationalitet</span><span className="ps-value">{parsed.nationality}</span></div>}
            {parsed.expiryDate && <div><span className="ps-label">Giltig t.o.m.</span><span className="ps-value">{parsed.expiryDate}</span></div>}
          </div>
          <p className="dim" style={{ fontSize: 12, marginTop: 12 }}>
            Kontrollera att uppgifterna stämmer. Du kan redigera fälten nedan.
          </p>
        </div>
      )}

      {status === "done" && !parsed && (
        <div className="ps-result ps-result-warn">
          <span className="eyebrow" style={{ marginBottom: 6, display: "block", color: "var(--c-warn)" }}>
            Kunde inte läsa MRZ automatiskt
          </span>
          <p className="dim" style={{ fontSize: 13 }}>
            Bildens kvalitet eller vinkel gjorde att MRZ-zonen inte kunde parsas.
            Fyll i uppgifterna manuellt nedan, eller försök med en tydligare bild.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="ps-result ps-result-warn">
          <strong style={{ color: "var(--c-warn)" }}>OCR-fel</strong>
          <p className="dim" style={{ fontSize: 13 }}>Något gick fel vid skanning. Försök igen eller fyll i manuellt.</p>
        </div>
      )}

      <style>{`
        .passport-scanner { margin-bottom: 24px; }
        .ps-dropzone {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 32px 24px; border: 2px dashed var(--c-line);
          background: #fff; cursor: pointer; text-align: center;
          transition: all 160ms;
        }
        .ps-dropzone:hover { border-color: var(--c-gold); background: #FFFAEC; }
        .ps-icon { font-size: 40px; }
        .ps-dropzone strong { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); }
        .ps-hint {
          font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--c-gold); font-weight: 700; margin-top: 8px;
        }
        .ps-preview { position: relative; }
        .ps-img {
          width: 100%; max-height: 300px; object-fit: contain;
          border: 1px solid var(--c-line); background: var(--c-cream);
        }
        .ps-retake {
          position: absolute; top: 8px; right: 8px;
          background: var(--c-ink); color: #fff;
          border: 0; padding: 6px 12px; font-size: 12px; cursor: pointer;
          font-family: var(--f-sans);
        }
        .ps-status {
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
          padding: 14px 18px; background: var(--c-cream); border: 1px solid var(--c-line-soft);
          margin-top: 12px; font-size: 13px;
        }
        .ps-progress { flex: 1; min-width: 120px; height: 6px; background: var(--c-line); border-radius: 3px; overflow: hidden; }
        .ps-progress-fill { height: 100%; background: var(--c-gold); transition: width 200ms; border-radius: 3px; }
        .ps-result {
          margin-top: 12px; padding: 18px 20px;
          background: #E6F1EA; border: 1px solid var(--c-green-soft);
        }
        .ps-result-warn { background: #FBE9E2; border-color: var(--c-warn); }
        .ps-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
        .ps-label { display: block; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 700; }
        .ps-value { font-family: var(--f-serif); font-size: 16px; color: var(--c-ink); }
        .loader { width: 20px; height: 20px; border: 2px solid var(--c-line); border-top-color: var(--c-gold); border-radius: 50%; animation: spin 800ms linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .ps-dropzone { padding: 24px 16px; }
          .ps-fields { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
