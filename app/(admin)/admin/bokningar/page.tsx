import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: { package: true, user: true, travelers: true, payments: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <span className="eyebrow gold">Bokningar</span>
      <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 24 }}>Alla bokningar</h1>

      <table className="table">
        <thead>
          <tr><th>Ref</th><th>Paket</th><th>Kund</th><th>Resenärer</th><th>Belopp</th><th>Status</th><th>Uppdaterad</th><th>—</th></tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td className="serif">{b.reference.slice(0, 12).toUpperCase()}</td>
              <td>{b.package.title}</td>
              <td>{b.user.email}</td>
              <td>{b.travelers.length} / {b.travelerCount}</td>
              <td className="tnum">{b.totalAmount.toLocaleString("sv-SE")} kr</td>
              <td>{b.status}</td>
              <td>{new Date(b.updatedAt).toLocaleString("sv-SE")}</td>
              <td><Link href={`/admin/bokningar/${b.id}`} className="btn-link">Visa →</Link></td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr><td colSpan={8} className="dim center" style={{ padding: 32 }}>Inga bokningar än.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
