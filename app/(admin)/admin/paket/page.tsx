import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  const packages = await prisma.package.findMany({
    include: { tiers: true, _count: { select: { bookings: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <span className="eyebrow gold">Paket</span>
          <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 0 }}>Paket-CMS</h1>
        </div>
        <Link href="/admin/paket/ny" className="btn btn-primary">+ Nytt paket</Link>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Titel</th><th>Slug</th><th>Typ</th><th>Status</th><th>Avresa</th><th>Tiers</th><th>Bokningar</th><th>—</th>
          </tr>
        </thead>
        <tbody>
          {packages.map((p) => (
            <tr key={p.id}>
              <td className="serif">{p.title}</td>
              <td><code style={{ fontSize: 12 }}>{p.slug}</code></td>
              <td>{p.type}</td>
              <td>{p.status}</td>
              <td>{p.startDate ? new Date(p.startDate).toLocaleDateString("sv-SE") : "—"}</td>
              <td>{p.tiers.length}</td>
              <td>{p._count.bookings}</td>
              <td>
                <Link href={`/admin/paket/${p.id}`} className="btn-link">Redigera →</Link>
              </td>
            </tr>
          ))}
          {packages.length === 0 && (
            <tr><td colSpan={8} className="dim center" style={{ padding: 32 }}>Inga paket ännu. <Link href="/admin/paket/ny" className="btn-link">Skapa det första →</Link></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
