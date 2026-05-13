import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminResenarerPage() {
  const travelers = await prisma.traveler.findMany({
    include: { user: true, booking: { include: { package: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <span className="eyebrow gold">Resenärer</span>
      <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 24 }}>Alla resenärer</h1>

      <table className="table">
        <thead><tr><th>Namn</th><th>Personnummer</th><th>Pass</th><th>Konto</th><th>Bokning</th><th>Tillagd</th></tr></thead>
        <tbody>
          {travelers.map((t) => (
            <tr key={t.id}>
              <td className="serif">{t.firstName} {t.lastName}</td>
              <td>{t.personnummer ?? "—"}</td>
              <td>{t.passportNo ?? "—"}</td>
              <td className="dim" style={{ fontSize: 13 }}>{t.user.email}</td>
              <td className="dim" style={{ fontSize: 13 }}>{t.booking?.package.title ?? "—"}</td>
              <td className="dim" style={{ fontSize: 13 }}>{new Date(t.createdAt).toLocaleDateString("sv-SE")}</td>
            </tr>
          ))}
          {travelers.length === 0 && <tr><td colSpan={6} className="center dim" style={{ padding: 32 }}>Inga resenärer ännu.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
