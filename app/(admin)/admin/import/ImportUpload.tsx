"use client";

import { useState } from "react";

type SheetPreview = {
  name: string;
  tripType: string;
  year: string;
  rowCount: number;
  headers: string[];
  sampleRows: Record<string, string>[];
  selected: boolean;
};

type ParseResult = {
  sheets: SheetPreview[];
  error?: string;
};

type ImportResult = {
  ok: boolean;
  imported: { sheet: string; travelers: number; packageId: string }[];
  errors: string[];
};

export function ImportUpload() {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setParseResult(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (data.sheets) {
        data.sheets = data.sheets.map((s: SheetPreview) => ({ ...s, selected: s.rowCount > 0 }));
      }
      setParseResult(data);
    } catch (err) {
      setParseResult({ sheets: [], error: err instanceof Error ? err.message : "Parse failed" });
    } finally {
      setParsing(false);
    }
  }

  function toggleSheet(idx: number) {
    if (!parseResult) return;
    const sheets = [...parseResult.sheets];
    sheets[idx] = { ...sheets[idx], selected: !sheets[idx].selected };
    setParseResult({ ...parseResult, sheets });
  }

  async function handleImport() {
    if (!parseResult) return;
    setImporting(true);
    setImportResult(null);

    const file = (document.getElementById("excel-file") as HTMLInputElement)?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("selectedSheets", JSON.stringify(
      parseResult.sheets.filter((s) => s.selected).map((s) => s.name)
    ));

    try {
      const res = await fetch("/api/import/execute", { method: "POST", body: formData });
      const data = await res.json();
      setImportResult(data);
    } catch (err) {
      setImportResult({ ok: false, imported: [], errors: [String(err)] });
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = parseResult?.sheets.filter((s) => s.selected).length ?? 0;
  const totalRows = parseResult?.sheets.filter((s) => s.selected).reduce((a, s) => a + s.rowCount, 0) ?? 0;

  return (
    <div>
      <div className="upload-area">
        <label htmlFor="excel-file" className="upload-label">
          <span className="upload-icon">📊</span>
          <span className="upload-text">Välj Excel-fil (.xlsx)</span>
          <span className="dim small">Max 8 MB. Varje flik = en resa.</span>
        </label>
        <input
          id="excel-file"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {parsing && (
        <div className="status-box">
          <div className="loader" /> Läser Excel...
        </div>
      )}

      {parseResult?.error && (
        <div className="error-box" role="alert">{parseResult.error}</div>
      )}

      {parseResult && parseResult.sheets.length > 0 && (
        <div className="preview">
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>
            Hittade {parseResult.sheets.length} flikar — välj vilka som ska importeras
          </h2>

          <div className="sheet-list">
            {parseResult.sheets.map((sheet, idx) => (
              <div key={sheet.name} className={`sheet-card ${sheet.selected ? "selected" : ""}`}>
                <label className="sheet-header">
                  <input
                    type="checkbox"
                    checked={sheet.selected}
                    onChange={() => toggleSheet(idx)}
                  />
                  <div>
                    <strong>{sheet.name}</strong>
                    <span className="tag" style={{ marginLeft: 8 }}>{sheet.tripType}</span>
                    {sheet.year && <span className="dim small" style={{ marginLeft: 8 }}>{sheet.year}</span>}
                  </div>
                  <span className="sheet-count">{sheet.rowCount} rader</span>
                </label>

                {sheet.selected && (
                  <div className="sheet-details">
                    <div className="col-map">
                      <span className="eyebrow" style={{ marginBottom: 6, display: "block" }}>Kolumner hittade</span>
                      <div className="col-tags">
                        {sheet.headers.filter(Boolean).map((h) => (
                          <span key={h} className="tag">{h}</span>
                        ))}
                      </div>
                    </div>

                    {sheet.sampleRows.length > 0 && (
                      <details className="sample">
                        <summary>Visa {Math.min(3, sheet.sampleRows.length)} exempelrader</summary>
                        <div className="table-wrap">
                          <table className="table" style={{ fontSize: 12 }}>
                            <thead>
                              <tr>
                                {sheet.headers.filter(Boolean).map((h) => (
                                  <th key={h} scope="col">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sheet.sampleRows.slice(0, 3).map((row, i) => (
                                <tr key={i}>
                                  {sheet.headers.filter(Boolean).map((h) => (
                                    <td key={h}>{row[h] ?? ""}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="import-footer">
            <p>
              <strong>{selectedCount}</strong> flikar valda · <strong>{totalRows}</strong> resenärer att importera
            </p>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
            >
              {importing ? "Importerar..." : `Importera ${totalRows} resenärer →`}
            </button>
          </div>
        </div>
      )}

      {importResult && (
        <div className={`result-box ${importResult.ok ? "success" : "error"}`} role="alert">
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>
            {importResult.ok ? "Import klar!" : "Import avslutad med fel"}
          </h3>

          {importResult.imported.length > 0 && (
            <ul className="import-summary">
              {importResult.imported.map((r) => (
                <li key={r.sheet}>
                  <strong>{r.sheet}</strong> — {r.travelers} resenärer
                  <a href={`/admin/paket/${r.packageId}`} className="btn-link" style={{ marginLeft: 12 }}>
                    Visa →
                  </a>
                </li>
              ))}
            </ul>
          )}

          {importResult.errors.length > 0 && (
            <details>
              <summary>{importResult.errors.length} varningar</summary>
              <ul style={{ fontSize: 12, maxHeight: 200, overflow: "auto" }}>
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}

          <a href="/admin/resor" className="btn btn-ghost" style={{ marginTop: 16, display: "inline-flex" }}>
            Se alla resor →
          </a>
        </div>
      )}

      <style>{`
        .upload-area { margin-bottom: 24px; }
        .upload-label {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 40px; border: 2px dashed var(--c-line); background: #fff;
          cursor: pointer; transition: all 160ms; text-align: center;
        }
        .upload-label:hover { border-color: var(--c-gold); background: #FFFAEC; }
        .upload-icon { font-size: 36px; }
        .upload-text { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); }
        .status-box { display: flex; align-items: center; gap: 12px; padding: 18px; background: var(--c-cream); font-size: 14px; }
        .error-box { padding: 16px; background: #FBE9E2; border: 1px solid var(--c-warn); color: var(--c-warn); font-size: 14px; margin-bottom: 16px; }
        .sheet-list { display: grid; gap: 10px; margin-bottom: 24px; }
        .sheet-card { background: #fff; border: 1px solid var(--c-line-soft); padding: 0; transition: all 160ms; }
        .sheet-card.selected { border-color: var(--c-gold); }
        .sheet-header { display: flex; align-items: center; gap: 14px; padding: 16px 20px; cursor: pointer; }
        .sheet-header input { flex-shrink: 0; }
        .sheet-header > div { flex: 1; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
        .sheet-count { font-family: var(--f-mono); font-size: 13px; color: var(--c-text-muted); flex-shrink: 0; }
        .sheet-details { padding: 0 20px 16px; border-top: 1px solid var(--c-line-soft); padding-top: 14px; }
        .col-tags { display: flex; flex-wrap: wrap; gap: 4px; }
        .col-tags .tag { font-size: 10px; padding: 3px 6px; }
        .sample { margin-top: 12px; }
        .sample summary { font-size: 12px; color: var(--c-gold); cursor: pointer; font-weight: 600; }
        .import-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 22px; background: var(--c-cream); border: 1px solid var(--c-line);
        }
        .result-box { padding: 24px; margin-top: 20px; }
        .result-box.success { background: #E6F1EA; border: 1px solid var(--c-green-soft); }
        .result-box.error { background: #FBE9E2; border: 1px solid var(--c-warn); }
        .import-summary { list-style: none; padding: 0; display: grid; gap: 8px; }
        .import-summary li { padding: 10px 14px; background: #fff; border: 1px solid var(--c-line-soft); display: flex; align-items: center; }
        .loader { width: 20px; height: 20px; border: 2px solid var(--c-line); border-top-color: var(--c-gold); border-radius: 50%; animation: spin 800ms linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .small { font-size: 12px; }
        @media (max-width: 640px) {
          .upload-label { padding: 28px 20px; }
          .import-footer { flex-direction: column; gap: 12px; align-items: stretch; text-align: center; }
        }
      `}</style>
    </div>
  );
}
