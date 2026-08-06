import { ImportUpload } from "./ImportUpload";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div>
      <span className="eyebrow gold">Import</span>
      <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 8 }}>Importera Excel</h1>
      <p className="dim" style={{ maxWidth: 700, marginBottom: 32 }}>
        Ladda upp HAJJ_LISTAN.xlsx (eller liknande). Varje flik blir en resa med
        resenärer. Kolumner mappas automatiskt baserat på rubriknamn. Du kan
        granska innan import körs.
      </p>

      <ImportUpload />
    </div>
  );
}
