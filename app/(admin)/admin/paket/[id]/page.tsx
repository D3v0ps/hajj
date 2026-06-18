import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PackageForm } from "@/components/admin/PackageForm";
import { updatePackage, deletePackage, addTier, deleteTier } from "@/app/actions/admin-packages";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ created?: string; saved?: string }>;

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Utkast", PUBLISHED: "Publicerad", SOLD_OUT: "Slutsåld", ARCHIVED: "Arkiverad",
};

export default async function EditPackagePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const { created, saved } = await searchParams;
  const pkg = await prisma.package.findUnique({ where: { id }, include: { tiers: { orderBy: { pricePerPerson: "asc" } } } });
  if (!pkg) notFound();

  return (
    <div>
      <Link href="/admin/paket" className="dim" style={{ fontSize: 13 }}>← Paket</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, marginBottom: 24 }}>
        <div>
          <span className="eyebrow gold">Redigera</span>
          <h1 style={{ fontSize: 28, marginTop: 12, marginBottom: 0 }}>{pkg.title}</h1>
          <p className="dim" style={{ fontSize: 13 }}>
            <code>/{pkg.slug}</code> · skapad {new Date(pkg.createdAt).toLocaleDateString("sv-SE")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/paket/${pkg.slug}`} target="_blank" className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>Förhandsgranska</Link>
          <form action={async () => { "use server"; await deletePackage(pkg.id); }}>
            <button type="submit" className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12, color: "var(--c-warn)", borderColor: "var(--c-warn)" }}>Radera</button>
          </form>
        </div>
      </div>

      {(created || saved) && (
        <div style={{ background: "#e9f7ef", border: "1px solid var(--c-green)", padding: "12px 16px", marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
          <strong>{created ? "✓ Resan är skapad." : "✓ Ändringarna är sparade."}</strong>{" "}
          {pkg.status === "PUBLISHED" ? (
            <>Den är <strong>publicerad</strong> och syns på sajten — på startsidan, i listorna och på <code>/paket/{pkg.slug}</code>. <Link href={`/paket/${pkg.slug}`} target="_blank">Visa publikt →</Link></>
          ) : (
            <>Den ligger som <strong>{STATUS_LABELS[pkg.status] ?? pkg.status}</strong> och syns <strong>inte publikt</strong> än (bara här i admin och via direktlänk). Sätt status till “Publicerat” nedan och spara för att visa den för kunder. <Link href={`/paket/${pkg.slug}`} target="_blank">Förhandsvisa →</Link></>
          )}
        </div>
      )}

      <PackageForm pkg={pkg} action={updatePackage.bind(null, pkg.id)} submitLabel="Spara ändringar" />

      <div style={{ marginTop: 56 }}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Rumstyper (tiers)</h2>

        {pkg.tiers.length > 0 && (
          <div className="table-wrap">
          <table className="table" style={{ marginBottom: 24, fontSize: 13 }}>
            <thead><tr><th scope="col">Namn</th><th scope="col">Rumstyp</th><th scope="col">Ålder</th><th scope="col">Pris/person</th><th scope="col">Tillg.</th><th scope="col">Not</th><th scope="col"></th></tr></thead>
            <tbody>
              {pkg.tiers.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td>{t.roomType}</td>
                  <td>
                    <span className={`adm-pill ${t.ageCategory === "ADULT" ? "info" : t.ageCategory === "CHILD" ? "gold" : "outline"}`}>
                      {t.ageCategory === "ADULT" ? `Vuxen (${t.ageMin}+)` : t.ageCategory === "CHILD" ? `Barn (${t.ageMin}–${t.ageMax})` : `Spädbarn (${t.ageMin}–${t.ageMax})`}
                    </span>
                  </td>
                  <td className="tnum" style={{ fontWeight: 600 }}>{t.pricePerPerson.toLocaleString("sv-SE")} kr</td>
                  <td>{t.available}</td>
                  <td className="dim">{t.notes ?? "—"}</td>
                  <td>
                    <form action={async () => { "use server"; await deleteTier(pkg.id, t.id); }}>
                      <button type="submit" className="btn-link" style={{ color: "var(--c-warn)" }}>Ta bort</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        <details className="add-tier-card">
          <summary>+ Lägg till priskombination</summary>
          <form action={async (fd: FormData) => { "use server"; await addTier(pkg.id, fd); }} style={{ marginTop: 16 }}>
            <div className="tier-grid">
              <div className="field">
                <label>Namn</label>
                <input name="name" placeholder="Vuxen: 4-bädd" required />
                <span className="hint">T.ex. &quot;Vuxen: 4-bädd&quot;, &quot;Barn: 3-bädd&quot;, &quot;Spädbarn&quot;</span>
              </div>
              <div className="field">
                <label>Rumstyp</label>
                <select name="roomType" defaultValue="QUAD">
                  <option value="DOUBLE">Dubbel (2-bädd)</option>
                  <option value="TRIPLE">Trebädd (3-bädd)</option>
                  <option value="QUAD">Fyrbädd (4-bädd)</option>
                  <option value="QUINTUPLE">Fembädd</option>
                  <option value="FAMILY">Familjerum</option>
                </select>
              </div>
              <div className="field">
                <label>Ålderskategori</label>
                <select name="ageCategory" defaultValue="ADULT">
                  <option value="ADULT">Vuxen</option>
                  <option value="CHILD">Barn</option>
                  <option value="INFANT">Spädbarn</option>
                </select>
              </div>
              <div className="field">
                <label>Ålder från</label>
                <input name="ageMin" type="number" min="0" max="99" defaultValue="12" />
              </div>
              <div className="field">
                <label>Ålder till</label>
                <input name="ageMax" type="number" min="0" max="99" defaultValue="99" />
              </div>
              <div className="field">
                <label>Pris (kr/person)</label>
                <input name="pricePerPerson" type="number" min="0" required />
              </div>
              <div className="field">
                <label>Tillgängliga platser</label>
                <input name="available" type="number" min="0" defaultValue="0" />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Anteckning</label>
                <input name="notes" placeholder="T.ex. 'Samma kön i rummet', 'Inkl. barnsäng'" />
              </div>
            </div>
            <button type="submit" className="btn btn-ghost" style={{ marginTop: 14 }}>Lägg till priskombination</button>
          </form>
        </details>
      </div>

      <style>{`
        .tier-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .add-tier-card { background: var(--c-cream); border: 1px dashed var(--c-line); padding: 20px; }
        .add-tier-card summary { cursor: pointer; font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); }
        @media (max-width: 720px) { .tier-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  );
}
