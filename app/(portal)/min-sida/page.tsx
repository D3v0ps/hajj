import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Utkast",
  SUBMITTED: "Mottagen",
  REVIEW: "Granskas",
  CONFIRMED: "Bekräftad",
  PAID_DEPOSIT: "Anmälningsavg. betald",
  PAID_FULL: "Fullbetald",
  COMPLETED: "Genomförd",
  CANCELLED: "Avbokad",
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "badge-draft",
  SUBMITTED: "badge-submitted",
  REVIEW: "badge-submitted",
  CONFIRMED: "badge-confirmed",
  PAID_DEPOSIT: "badge-confirmed",
  PAID_FULL: "badge-paid",
  COMPLETED: "badge-paid",
  CANCELLED: "badge-cancelled",
};

export default async function MinSidaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const [bookings, travelers, documents, unreadMessages] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: session.user.id },
      include: { package: true, tier: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.traveler.count({ where: { userId: session.user.id } }),
    prisma.document.count({ where: { userId: session.user.id } }),
    prisma.message.count({ where: { userId: session.user.id, readAt: null, direction: "OUTBOUND", isInternal: false } }),
  ]);

  return (
    <div className="container">
      <span className="eyebrow gold">Översikt</span>
      <h1 style={{ fontSize: 40, marginTop: 14, marginBottom: 8 }}>
        Välkommen{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}.
      </h1>
      <p className="dim" style={{ fontSize: 16, maxWidth: 600 }}>
        Dina pågående bokningar, dokument och meddelanden från kontoret.
      </p>

      <div className="dash-stats">
        <div className="stat">
          <div className="stat-v">{bookings.length}</div>
          <div className="stat-l">Bokningar totalt</div>
        </div>
        <div className="stat">
          <div className="stat-v">{travelers}</div>
          <div className="stat-l">Resenärer registrerade</div>
        </div>
        <div className="stat">
          <div className="stat-v">{documents}</div>
          <div className="stat-l">Dokument uppladdade</div>
        </div>
        <div className="stat">
          <div className="stat-v">{unreadMessages}</div>
          <div className="stat-l">Olästa meddelanden</div>
        </div>
      </div>

      <section style={{ marginTop: 56 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 24 }}>Aktiva bokningar</h2>
          <Link href="/omra" className="btn-link">Boka ny resa →</Link>
        </div>

        {bookings.length === 0 ? (
          <div style={{ padding: 48, background: "#fff", border: "1px dashed var(--c-line)", textAlign: "center" }}>
            <p>Du har inga bokningar än.</p>
            <Link href="/omra" className="btn btn-primary" style={{ marginTop: 16 }}>Se Omra-paket</Link>
          </div>
        ) : (
          <div className="bk-list">
            {bookings.map((b) => (
              <Link key={b.id} href={b.status === "DRAFT" ? `/boka/${b.id}` : `/min-sida/bokningar/${b.id}`} className="bk-row">
                <div>
                  <div className="dim" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                    Ref {b.reference.slice(0, 12).toUpperCase()}
                  </div>
                  <strong className="serif" style={{ fontSize: 18, color: "var(--c-ink)" }}>{b.package.title}</strong>
                  <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>
                    {b.tier?.name ?? "—"} · {b.travelerCount} resenärer
                    {b.package.startDate && ` · ${new Date(b.package.startDate).toLocaleDateString("sv-SE")}`}
                  </div>
                </div>
                <div className="bk-amount">
                  <span className="serif tnum" style={{ fontSize: 22 }}>{b.totalAmount.toLocaleString("sv-SE")} kr</span>
                </div>
                <div>
                  <span className={`badge ${STATUS_CLASS[b.status] ?? "badge-draft"}`}>{STATUS_LABEL[b.status]}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 40px; }
        .stat { padding: 24px; background: #fff; border: 1px solid var(--c-line-soft); }
        .stat-v { font-family: var(--f-serif); font-size: 36px; color: var(--c-ink); font-weight: 460; line-height: 1; }
        .stat-l { font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 600; margin-top: 8px; }
        .bk-list { display: grid; gap: 10px; }
        .bk-row { display: grid; grid-template-columns: 1fr 200px 180px; gap: 24px; align-items: center; padding: 20px 24px; background: #fff; border: 1px solid var(--c-line-soft); transition: all 160ms; }
        .bk-row:hover { border-color: var(--c-ink); }
        .bk-amount { text-align: right; }
        @media (max-width: 900px) {
          .dash-stats { grid-template-columns: 1fr 1fr; }
          .bk-row { grid-template-columns: 1fr; gap: 10px; }
          .bk-amount { text-align: left; }
        }
        @media (max-width: 480px) {
          .stat { padding: 18px; }
          .stat-v { font-size: 28px; }
          .bk-row { padding: 16px 18px; }
        }
      `}</style>
    </div>
  );
}
