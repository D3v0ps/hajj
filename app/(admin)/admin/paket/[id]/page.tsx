import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PackageForm } from "@/components/admin/PackageForm";
import { updatePackage, deletePackage, addTier, deleteTier } from "@/app/actions/admin-packages";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function EditPackagePage({ params }: { params: Params }) {
  const { id } = await params;
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

      <PackageForm pkg={pkg} action={updatePackage.bind(null, pkg.id)} submitLabel="Spara ändringar" />

      <div style={{ marginTop: 56 }}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Rumstyper (tiers)</h2>

        {pkg.tiers.length > 0 && (
          <table className="table" style={{ marginBottom: 24 }}>
            <thead><tr><th>Namn</th><th>Rumstyp</th><th>Pris/person</th><th>Tillgängliga</th><th>Anteckning</th><th></th></tr></thead>
            <tbody>
              {pkg.tiers.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.roomType}</td>
                  <td className="tnum">{t.pricePerPerson.toLocaleString("sv-SE")} kr</td>
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
        )}

        <details className="add-tier-card">
          <summary>+ Lägg till rumstyp</summary>
          <form action={async (fd: FormData) => { "use server"; await addTier(pkg.id, fd); }} style={{ marginTop: 16 }}>
            <div className="tier-grid">
              <div className="field"><label>Namn</label><input name="name" placeholder="4-bädd" required /></div>
              <div className="field">
                <label>Rumstyp</label>
                <select name="roomType" defaultValue="QUAD">
                  <option value="DOUBLE">Dubbel</option>
                  <option value="TRIPLE">Trebädd</option>
                  <option value="QUAD">Fyrbädd</option>
                  <option value="QUINTUPLE">Femsbädd</option>
                  <option value="FAMILY">Familjerum</option>
                </select>
              </div>
              <div className="field"><label>Pris (kr/person)</label><input name="pricePerPerson" type="number" min="0" required /></div>
              <div className="field"><label>Tillgängliga</label><input name="available" type="number" min="0" defaultValue="0" /></div>
              <div className="field" style={{ gridColumn: "1 / -1" }}><label>Anteckning</label><input name="notes" /></div>
            </div>
            <button type="submit" className="btn btn-ghost" style={{ marginTop: 14 }}>Lägg till tier</button>
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
