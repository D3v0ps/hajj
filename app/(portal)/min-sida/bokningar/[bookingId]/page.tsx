import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = Promise<{ bookingId: string }>;

export default async function BokningDetailPage({ params }: { params: Params }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: true, tier: true, travelers: true, payments: true, messages: true },
  });
  if (!booking || booking.userId !== session.user.id) notFound();

  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : "—");

  return (
    <div className="container narrow">
      <Link href="/min-sida" className="dim" style={{ fontSize: 13 }}>← Översikt</Link>

      <span className="eyebrow gold" style={{ marginTop: 24, display: "block" }}>
        Ref {booking.reference.slice(0, 12).toUpperCase()}
      </span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 8 }}>{booking.package.title}</h1>
      <p className="dim">{booking.package.subtitle}</p>

      <div className="kv-grid">
        <div><span className="eyebrow">Status</span><p className="serif">{booking.status}</p></div>
        <div><span className="eyebrow">Avresa</span><p className="serif">{fmtDate(booking.package.startDate)}</p></div>
        <div><span className="eyebrow">Hemkomst</span><p className="serif">{fmtDate(booking.package.endDate)}</p></div>
        <div><span className="eyebrow">Rumstyp</span><p className="serif">{booking.tier?.name ?? "—"}</p></div>
        <div><span className="eyebrow">Resenärer</span><p className="serif">{booking.travelers.length}</p></div>
        <div><span className="eyebrow">Totalpris</span><p className="serif tnum">{booking.totalAmount.toLocaleString("sv-SE")} kr</p></div>
      </div>

      <h2 style={{ fontSize: 24, marginTop: 40, marginBottom: 16 }}>Resenärer</h2>
      <ul className="trv-grid">
        {booking.travelers.map((t) => (
          <li key={t.id}>
            <strong>{t.firstName} {t.lastName}</strong>
            <span className="dim">
              {t.personnummer ?? "—"}
              {t.passportNo && ` · pass ${t.passportNo}`}
              {t.isMahram && " · mahram"}
              {t.needsAssist && " · assistans"}
            </span>
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 24, marginTop: 40, marginBottom: 16 }}>Betalningar</h2>
      {booking.payments.length === 0 ? (
        <p className="dim">Inga betalningar registrerade.</p>
      ) : (
        <table className="table">
          <thead><tr><th>Datum</th><th>Belopp</th><th>Metod</th><th>Status</th><th>Ref</th></tr></thead>
          <tbody>
            {booking.payments.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.createdAt).toLocaleDateString("sv-SE")}</td>
                <td className="tnum">{p.amount.toLocaleString("sv-SE")} kr</td>
                <td>{p.method}</td>
                <td>{p.status}</td>
                <td className="serif">{p.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style>{`
        .kv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 24px; background: var(--c-cream); margin-top: 32px; }
        .kv-grid p { font-size: 18px; color: var(--c-ink); margin: 6px 0 0; }
        .trv-grid { list-style: none; padding: 0; display: grid; gap: 8px; }
        .trv-grid li { padding: 14px 18px; background: #fff; border: 1px solid var(--c-line-soft); display: grid; gap: 4px; }
        .trv-grid strong { font-family: var(--f-serif); font-size: 17px; color: var(--c-ink); }
        @media (max-width: 720px) { .kv-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  );
}
