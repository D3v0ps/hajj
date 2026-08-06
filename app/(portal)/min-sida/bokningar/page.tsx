import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MinaBokningarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    include: { package: true, tier: true, travelers: true, payments: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="container">
      <span className="eyebrow gold">Bokningar</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 32 }}>Mina bokningar</h1>

      {bookings.length === 0 ? (
        <p className="dim">Du har inga bokningar än.</p>
      ) : (
        <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Mina bokningar</caption>
          <thead>
            <tr>
              <th scope="col">Referens</th>
              <th scope="col">Paket</th>
              <th scope="col">Datum</th>
              <th scope="col">Resenärer</th>
              <th scope="col">Belopp</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="sr-only">Åtgärder</span></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="serif">{b.reference.slice(0, 12).toUpperCase()}</td>
                <td>{b.package.title}</td>
                <td>{b.package.startDate ? new Date(b.package.startDate).toLocaleDateString("sv-SE") : "—"}</td>
                <td>{b.travelers.length} / {b.travelerCount}</td>
                <td className="tnum">{b.totalAmount.toLocaleString("sv-SE")} kr</td>
                <td>{b.status}</td>
                <td>
                  {b.status === "DRAFT" ? (
                    <Link href={`/boka/${b.id}`} className="btn-link">Fortsätt →</Link>
                  ) : (
                    <Link href={`/min-sida/bokningar/${b.id}`} className="btn-link">Visa →</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
