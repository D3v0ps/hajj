import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: {
      package: true,
      user: { select: { id: true, email: true, name: true } },
      travelers: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <span className="eyebrow gold">Bokningar</span>
      <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 24 }}>Alla bokningar</h1>

      <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">Alla bokningar</caption>
        <thead>
          <tr><th scope="col">Ref</th><th scope="col">Paket</th><th scope="col">Kund</th><th scope="col">Resenärer</th><th scope="col">Belopp</th><th scope="col">Status</th><th scope="col">Uppdaterad</th><th scope="col"><span className="sr-only">Åtgärder</span></th></tr>
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
    </div>
  );
}
