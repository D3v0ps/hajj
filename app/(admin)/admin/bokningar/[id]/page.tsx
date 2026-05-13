import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "SUBMITTED", "REVIEW", "CONFIRMED", "PAID_DEPOSIT", "PAID_FULL", "COMPLETED", "CANCELLED"] as const;

async function updateStatus(bookingId: string, formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");

  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status as typeof STATUSES[number])) return;
  await prisma.booking.update({ where: { id: bookingId }, data: { status: status as typeof STATUSES[number] } });
  revalidatePath(`/admin/bokningar/${bookingId}`);
  revalidatePath("/admin/bokningar");
}

async function sendMessage(bookingId: string, formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  const subject = String(formData.get("subject") ?? "").slice(0, 200);
  const body = String(formData.get("body") ?? "").slice(0, 4000);
  if (!body) return;
  await prisma.message.create({
    data: {
      userId: booking.userId,
      bookingId: booking.id,
      direction: "OUTBOUND",
      subject: subject || null,
      body,
    },
  });
  revalidatePath(`/admin/bokningar/${bookingId}`);
}

export default async function AdminBookingDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      package: true,
      tier: true,
      user: { select: { id: true, email: true, name: true, phone: true } },
      travelers: true,
      payments: true,
      messages: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!booking) notFound();

  return (
    <div>
      <Link href="/admin/bokningar" className="dim" style={{ fontSize: 13 }}>← Bokningar</Link>
      <span className="eyebrow gold" style={{ marginTop: 16, display: "block" }}>
        Ref {booking.reference.slice(0, 12).toUpperCase()}
      </span>
      <h1 style={{ fontSize: 28, marginTop: 12, marginBottom: 8 }}>{booking.package.title}</h1>
      <p className="dim" style={{ fontSize: 14 }}>
        {booking.user.email} · {booking.travelers.length} resenärer · {booking.totalAmount.toLocaleString("sv-SE")} kr
      </p>

      <div className="adm-bk-grid">
        <section>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Status</h2>
          <form action={updateStatus.bind(null, booking.id)} className="status-form">
            <select name="status" defaultValue={booking.status}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 13 }}>Uppdatera</button>
          </form>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Resenärer</h2>
          <ul className="trv-grid">
            {booking.travelers.map((t) => (
              <li key={t.id}>
                <strong>{t.firstName} {t.lastName}</strong>
                <span className="dim">
                  {t.personnummer ?? "—"}{t.passportNo && ` · pass ${t.passportNo}`}
                </span>
              </li>
            ))}
          </ul>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Betalningar</h2>
          {booking.payments.length === 0 ? <p className="dim">Inga än.</p> : (
            <table className="table">
              <thead><tr><th>Datum</th><th>Belopp</th><th>Metod</th><th>Status</th><th>Ref</th></tr></thead>
              <tbody>
                {booking.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.createdAt).toLocaleDateString("sv-SE")}</td>
                    <td className="tnum">{p.amount.toLocaleString("sv-SE")} kr</td>
                    <td>{p.method}</td>
                    <td>{p.status}</td>
                    <td>{p.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <aside>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Meddelande till kund</h2>
          <form action={sendMessage.bind(null, booking.id)} style={{ display: "grid", gap: 10 }}>
            <input name="subject" placeholder="Ämne" />
            <textarea name="body" rows={6} placeholder="Skriv ett meddelande till kunden..." required />
            <button type="submit" className="btn btn-primary">Skicka</button>
          </form>

          <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Konversation</h2>
          {booking.messages.length === 0 ? <p className="dim">Inga meddelanden än.</p> : (
            <ol className="msgs">
              {booking.messages.map((m) => (
                <li key={m.id} className={m.direction}>
                  <span className="dir">{m.direction === "OUTBOUND" ? "Till kund" : "Från kund"}</span>
                  <span className="dim" style={{ fontSize: 11 }}>{new Date(m.createdAt).toLocaleString("sv-SE")}</span>
                  {m.subject && <strong>{m.subject}</strong>}
                  <p>{m.body}</p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      <style>{`
        .adm-bk-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px; margin-top: 32px; }
        .status-form { display: flex; gap: 8px; align-items: center; }
        .status-form select { padding: 10px 14px; border: 1px solid var(--c-line); font-family: var(--f-sans); font-size: 14px; flex: 1; }
        .trv-grid { list-style: none; padding: 0; display: grid; gap: 8px; }
        .trv-grid li { padding: 12px 16px; background: #fff; border: 1px solid var(--c-line-soft); display: grid; gap: 4px; }
        .msgs { list-style: none; padding: 0; display: grid; gap: 8px; }
        .msgs li { padding: 12px 16px; background: #fff; border: 1px solid var(--c-line-soft); border-left: 3px solid var(--c-gold); display: grid; gap: 4px; }
        .msgs li.OUTBOUND { border-left-color: var(--c-green-soft); }
        .msgs .dir { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .msgs strong { font-family: var(--f-serif); color: var(--c-ink); font-size: 14px; }
        .msgs p { margin: 0; font-size: 14px; line-height: 1.5; }
        @media (max-width: 980px) { .adm-bk-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
