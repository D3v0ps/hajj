import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string }>;

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "SUBMITTED", "REVIEW", "CONFIRMED", "PAID_DEPOSIT", "PAID_FULL", "COMPLETED", "CANCELLED"] as const;
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Utkast", SUBMITTED: "Mottagen", REVIEW: "Granskas",
  CONFIRMED: "Bekräftad", PAID_DEPOSIT: "Reserv. betald",
  PAID_FULL: "Slutbetald", COMPLETED: "Genomförd", CANCELLED: "Avbokad",
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");
  return session.user;
}

async function updateStatus(bookingId: string, formData: FormData) {
  "use server";
  await requireAdmin();
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status as typeof STATUSES[number])) return;
  await prisma.booking.update({ where: { id: bookingId }, data: { status: status as typeof STATUSES[number] } });
  revalidatePath(`/admin/bokningar/${bookingId}`);
}

async function verifyPayment(paymentId: string) {
  "use server";
  await requireAdmin();
  await prisma.payment.update({ where: { id: paymentId }, data: { status: "COMPLETED", paidAt: new Date() } });
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { bookingId: true } });
  if (payment) revalidatePath(`/admin/bokningar/${payment.bookingId}`);
}

async function addTravelerAdmin(bookingId: string, formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  await prisma.traveler.create({
    data: {
      userId: booking.userId,
      bookingId,
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      personnummer: String(formData.get("personnummer") ?? "") || null,
      passportNo: String(formData.get("passportNo") ?? "") || null,
      birthDate: formData.get("birthDate") ? new Date(String(formData.get("birthDate"))) : null,
      gender: String(formData.get("gender") ?? "") || null,
      nationality: String(formData.get("nationality") ?? "") || null,
      roomAssignment: String(formData.get("roomAssignment") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      isMahram: formData.get("isMahram") === "on",
      needsAssist: formData.get("needsAssist") === "on",
    },
  });
  revalidatePath(`/admin/bokningar/${bookingId}`);
}

async function removeTravelerAdmin(bookingId: string, travelerId: string) {
  "use server";
  await requireAdmin();
  await prisma.traveler.deleteMany({ where: { id: travelerId, bookingId } });
  revalidatePath(`/admin/bokningar/${bookingId}`);
}

async function sendMessage(bookingId: string, formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  const subject = String(formData.get("subject") ?? "").slice(0, 200);
  const body = String(formData.get("body") ?? "").slice(0, 4000);
  if (!body) return;
  await prisma.message.create({
    data: { userId: booking.userId, bookingId, direction: "OUTBOUND", subject: subject || null, body },
  });
  revalidatePath(`/admin/bokningar/${bookingId}`);
}

export default async function BokningDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? "oversikt";

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      package: { include: { tiers: true } },
      tier: true,
      user: { select: { id: true, email: true, name: true, phone: true } },
      travelers: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!booking) notFound();

  const fmtDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("sv-SE") : "—";
  const fmtKr = (n: number) => n.toLocaleString("sv-SE");
  const paidTotal = booking.payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);
  const pendingTotal = booking.payments.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);
  const currentStatusIdx = STATUSES.indexOf(booking.status as typeof STATUSES[number]);

  return (
    <div className="adm-pageframe">
      {/* Case header */}
      <div className="case-head">
        <div>
          <Link href="/admin/bokningar" className="case-back">← Bokningar</Link>
          <h1 className="case-title">
            {booking.user.name ?? booking.user.email}
            <span className="case-pkg">· {booking.package.title}</span>
          </h1>
          <div className="case-meta">
            <span>Ref <strong>{booking.reference.slice(0, 12).toUpperCase()}</strong></span>
            <span>Skapad {fmtDate(booking.createdAt)}</span>
            <span>{booking.travelers.length} resenärer</span>
            <span className="tnum">{fmtKr(booking.totalAmount)} kr</span>
          </div>
        </div>
        <div className="case-actions">
          <form action={updateStatus.bind(null, booking.id)} className="status-form">
            <select name="status" defaultValue={booking.status} style={{ padding: "8px 12px", border: "1px solid #2A3F62", background: "#0A1830", color: "#fff", fontSize: 12 }}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <button type="submit" className="btn btn-gold" style={{ padding: "8px 14px", fontSize: 12 }}>Uppdatera</button>
          </form>
        </div>
      </div>

      {/* Status pipeline */}
      <div className="status-pipeline">
        {STATUSES.filter((s) => s !== "CANCELLED").map((s, i) => (
          <div key={s} className={`sp ${i < currentStatusIdx ? "done" : i === currentStatusIdx ? "now" : ""}`}>
            <div className="sp-dot">{i < currentStatusIdx ? "✓" : i + 1}</div>
            <div className="sp-label">{STATUS_LABELS[s]}</div>
          </div>
        ))}
      </div>

      {/* Fact row */}
      <div className="fact-row">
        <div><span className="f-l">Paket</span><span className="f-v">{booking.package.title}</span></div>
        <div><span className="f-l">Avresa</span><span className="f-v">{fmtDate(booking.package.startDate)}</span></div>
        <div><span className="f-l">Rumstyp</span><span className="f-v">{booking.tier?.name ?? "—"}</span></div>
        <div><span className="f-l">Betalt</span><span className="f-v tnum" style={{ color: "var(--c-green-soft)" }}>{fmtKr(paidTotal)} kr</span></div>
        <div><span className="f-l">Väntande</span><span className="f-v tnum" style={{ color: pendingTotal > 0 ? "var(--c-warn)" : "var(--c-text-muted)" }}>{fmtKr(pendingTotal)} kr</span></div>
        <div><span className="f-l">Kund</span><span className="f-v">{booking.user.email}</span></div>
      </div>

      {/* Tabs */}
      <div className="adm-tabs">
        {[
          { key: "oversikt", label: "Översikt" },
          { key: "resenarer", label: "Resenärer", count: booking.travelers.length },
          { key: "betalningar", label: "Betalningar", count: booking.payments.length },
          { key: "meddelanden", label: "Meddelanden", count: booking.messages.length },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/admin/bokningar/${booking.id}?tab=${t.key}`}
            className={`adm-tab ${activeTab === t.key ? "active" : ""}`}
          >
            {t.label}
            {t.count != null && <span className="count">{t.count}</span>}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "oversikt" && (
        <div className="tab-grid">
          <div>
            <div className="adm-card">
              <div className="h">Resenärer (senaste)</div>
              <div className="b dense">
                {booking.travelers.slice(0, 5).map((t) => (
                  <div key={t.id} className="mini-traveler">
                    <strong>{t.firstName} {t.lastName}</strong>
                    <span className="dim">{t.passportNo ?? "Pass saknas"} · {t.gender ?? "—"}</span>
                  </div>
                ))}
                {booking.travelers.length === 0 && <div className="dim" style={{ padding: 16 }}>Inga resenärer</div>}
                {booking.travelers.length > 5 && <Link href={`/admin/bokningar/${booking.id}?tab=resenarer`} className="btn-link" style={{ padding: "8px 16px", fontSize: 12 }}>Visa alla →</Link>}
              </div>
            </div>
            <div className="adm-card">
              <div className="h">Senaste betalningar</div>
              <div className="b dense">
                {booking.payments.slice(0, 3).map((p) => (
                  <div key={p.id} className="mini-payment">
                    <div>
                      <strong className="tnum">{fmtKr(p.amount)} kr</strong>
                      <span className="dim">{p.method} · {p.reference ?? "—"}</span>
                    </div>
                    <span className={`adm-pill ${p.status === "COMPLETED" ? "ok" : p.status === "PENDING" ? "gold" : "warn"}`}>{p.status}</span>
                  </div>
                ))}
                {booking.payments.length === 0 && <div className="dim" style={{ padding: 16 }}>Inga betalningar</div>}
              </div>
            </div>
          </div>
          <aside>
            <div className="adm-card">
              <div className="h">Kund</div>
              <div className="b">
                <dl className="compact-list">
                  <dt>Namn</dt><dd>{booking.user.name ?? "—"}</dd>
                  <dt>E-post</dt><dd><a href={`mailto:${booking.user.email}`}>{booking.user.email}</a></dd>
                  <dt>Telefon</dt><dd>{booking.user.phone ?? booking.contactPhone ?? "—"}</dd>
                  <dt>Kontakt-email</dt><dd>{booking.contactEmail ?? booking.user.email}</dd>
                </dl>
              </div>
            </div>
            <div className="adm-card">
              <div className="h">Snabba åtgärder</div>
              <div className="b" style={{ display: "grid", gap: 8 }}>
                <Link href={`/admin/mejl/skicka?bookingId=${booking.id}`} className="btn btn-ghost" style={{ fontSize: 12, padding: "8px 14px", justifyContent: "center" }}>✉ Skicka mejl</Link>
                <Link href={`/admin/bokningar/${booking.id}?tab=resenarer`} className="btn btn-ghost" style={{ fontSize: 12, padding: "8px 14px", justifyContent: "center" }}>+ Lägg till resenär</Link>
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === "resenarer" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--f-serif)", fontSize: 22, margin: 0 }}>
              {booking.travelers.length} resenärer
            </h2>
          </div>

          {/* Profilkort per resenär */}
          <div className="traveler-cards">
            {booking.travelers.map((t, i) => (
              <div key={t.id} className="tv-card">
                <div className="tv-card-head">
                  <div className="tv-card-num">{String(i + 1).padStart(2, "0")}</div>
                  <div className="tv-card-name">
                    <h3>{t.firstName} {t.lastName}</h3>
                    <div className="tv-card-badges">
                      <span className={`adm-pill ${t.gender === "M" ? "info" : t.gender === "F" ? "gold" : "outline"}`}>
                        {t.gender === "M" ? "Man" : t.gender === "F" ? "Kvinna" : "—"}
                      </span>
                      {t.needsAssist && <span className="adm-pill warn">Assistans</span>}
                      {t.isMahram && <span className="adm-pill gold">Mahram</span>}
                    </div>
                  </div>
                  <form action={removeTravelerAdmin.bind(null, booking.id, t.id)}>
                    <button type="submit" className="btn-link" style={{ fontSize: 11, color: "var(--c-warn)" }}>Ta bort</button>
                  </form>
                </div>

                <div className="tv-card-body">
                  <div className="tv-section">
                    <span className="tv-section-label">Kontaktuppgifter</span>
                    <div className="tv-fields">
                      <div><span className="tv-label">E-post</span><span className="tv-value">{t.email ?? booking.contactEmail ?? booking.user.email}</span></div>
                      <div><span className="tv-label">Mobil</span><span className="tv-value">{t.phone ?? booking.user.phone ?? booking.contactPhone ?? "—"}</span></div>
                      <div><span className="tv-label">Bor i</span><span className="tv-value">{t.residenceCity ?? "—"}</span></div>
                    </div>
                  </div>

                  <div className="tv-section">
                    <span className="tv-section-label">Identitet & pass</span>
                    <div className="tv-fields">
                      <div><span className="tv-label">Personnummer</span><span className="tv-value mono">{t.personnummer ?? "—"}</span></div>
                      <div><span className="tv-label">Passnummer</span><span className="tv-value mono">{t.passportNo ?? "—"}</span></div>
                      <div><span className="tv-label">Pass giltig t.o.m.</span><span className="tv-value">{t.passportExp ? fmtDate(t.passportExp) : "—"}</span></div>
                      <div><span className="tv-label">Födelsedatum</span><span className="tv-value">{t.birthDate ? fmtDate(t.birthDate) : "—"}</span></div>
                      <div><span className="tv-label">Nationalitet</span><span className="tv-value">{t.nationality ?? "—"}</span></div>
                      <div><span className="tv-label">Ursprung</span><span className="tv-value">{t.countryOfOrigin ?? "—"}</span></div>
                    </div>
                  </div>

                  <div className="tv-section">
                    <span className="tv-section-label">Resa & logistik</span>
                    <div className="tv-fields">
                      <div><span className="tv-label">Rumsindelning</span><span className="tv-value">{t.roomAssignment ?? "Ej tilldelat"}</span></div>
                      <div><span className="tv-label">Flyg ut</span><span className="tv-value mono">{t.flightOut ?? "—"}</span></div>
                      <div><span className="tv-label">Flyg hem</span><span className="tv-value mono">{t.flightReturn ?? "—"}</span></div>
                      <div><span className="tv-label">Civilstånd</span><span className="tv-value">{t.civilStatus ?? "—"}</span></div>
                      <div><span className="tv-label">Födelsestad</span><span className="tv-value">{t.birthCity ?? "—"}</span></div>
                      <div><span className="tv-label">Betalning</span><span className="tv-value">{t.paymentNote ?? "—"}</span></div>
                    </div>
                  </div>

                  {t.notes && (
                    <div className="tv-section">
                      <span className="tv-section-label">Anteckningar</span>
                      <p className="tv-notes">{t.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {booking.travelers.length === 0 && (
            <div className="adm-card"><div className="b dim" style={{ padding: 32, textAlign: "center" }}>Inga resenärer registrerade ännu.</div></div>
          )}

          {/* Lägg till ny resenär */}
          <div className="adm-card" style={{ marginTop: 20 }}>
            <div className="h">+ Lägg till resenär</div>
            <div className="b">
              <form action={addTravelerAdmin.bind(null, booking.id)} className="add-tv-form">
                <div className="add-tv-grid">
                  <div className="field"><label>Förnamn *</label><input name="firstName" required /></div>
                  <div className="field"><label>Efternamn *</label><input name="lastName" required /></div>
                  <div className="field"><label>E-post</label><input name="email" type="email" /></div>
                  <div className="field"><label>Mobilnummer</label><input name="phone" type="tel" /></div>
                  <div className="field"><label>Personnummer</label><input name="personnummer" inputMode="numeric" placeholder="ÅÅÅÅMMDD-XXXX" /></div>
                  <div className="field"><label>Passnummer</label><input name="passportNo" /></div>
                  <div className="field"><label>Födelsedatum</label><input name="birthDate" type="date" /></div>
                  <div className="field">
                    <label>Kön</label>
                    <select name="gender" defaultValue=""><option value="">—</option><option value="M">Man</option><option value="F">Kvinna</option></select>
                  </div>
                  <div className="field"><label>Nationalitet</label><input name="nationality" defaultValue="SWE" /></div>
                  <div className="field"><label>Rum</label><input name="roomAssignment" /></div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}><label>Anteckning</label><input name="notes" placeholder="Speciella behov, allergier, etc." /></div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 16 }}>
                  <label style={{ display: "flex", gap: 6, fontSize: 13, cursor: "pointer" }}><input type="checkbox" name="isMahram" /> Mahram</label>
                  <label style={{ display: "flex", gap: 6, fontSize: 13, cursor: "pointer" }}><input type="checkbox" name="needsAssist" /> Assistans</label>
                  <button type="submit" className="btn btn-primary" style={{ marginLeft: "auto", padding: "10px 20px", fontSize: 13 }}>Lägg till resenär</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === "betalningar" && (
        <div className="adm-card">
          <div className="h">
            Betalningar
            <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>
              Betalt: {fmtKr(paidTotal)} kr · Väntande: {fmtKr(pendingTotal)} kr
            </span>
          </div>
          <div className="b dense">
            <div className="table-wrap">
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th scope="col">Datum</th>
                  <th scope="col">Belopp</th>
                  <th scope="col">Metod</th>
                  <th scope="col">Referens</th>
                  <th scope="col">Status</th>
                  <th scope="col">Betald</th>
                  <th scope="col">Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {booking.payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>{fmtDate(p.createdAt)}</td>
                    <td className="tnum" style={{ fontWeight: 600 }}>{fmtKr(p.amount)} kr</td>
                    <td>{p.method}</td>
                    <td style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>{p.reference ?? "—"}</td>
                    <td>
                      <span className={`adm-pill ${p.status === "COMPLETED" ? "ok" : p.status === "PENDING" ? "gold" : "warn"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.paidAt ? fmtDate(p.paidAt) : "—"}</td>
                    <td>
                      {p.status === "PENDING" && (
                        <form action={verifyPayment.bind(null, p.id)}>
                          <button type="submit" className="btn btn-primary" style={{ padding: "4px 10px", fontSize: 11 }}>
                            ✓ Markera betald
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {booking.payments.length === 0 && (
                  <tr><td colSpan={7} className="dim" style={{ padding: 24, textAlign: "center" }}>Inga betalningar registrerade</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "meddelanden" && (
        <div className="tab-grid">
          <div className="adm-card">
            <div className="h">Konversation</div>
            <div className="b dense">
              {booking.messages.length === 0 ? (
                <div className="dim" style={{ padding: 24, textAlign: "center" }}>Inga meddelanden</div>
              ) : (
                <div className="msg-list">
                  {booking.messages.map((m) => (
                    <div key={m.id} className={`msg ${m.direction}`}>
                      <div className="msg-head">
                        <span className="msg-dir">{m.direction === "OUTBOUND" ? "Till kund" : "Från kund"}</span>
                        <span className="dim" style={{ fontSize: 11, fontFamily: "var(--f-mono)" }}>{new Date(m.createdAt).toLocaleString("sv-SE")}</span>
                      </div>
                      {m.subject && <strong className="msg-subj">{m.subject}</strong>}
                      <p className="msg-body">{m.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <aside>
            <div className="adm-card">
              <div className="h">Nytt meddelande</div>
              <div className="b">
                <form action={sendMessage.bind(null, booking.id)} style={{ display: "grid", gap: 10 }}>
                  <input name="subject" placeholder="Ämne (valfritt)" style={{ padding: "8px 12px", border: "1px solid var(--c-line)", fontSize: 13 }} />
                  <textarea name="body" rows={6} placeholder="Skriv meddelande till kunden..." required style={{ padding: "10px 12px", border: "1px solid var(--c-line)", fontSize: 13, fontFamily: "var(--f-sans)" }} />
                  <button type="submit" className="btn btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}>Skicka</button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        .case-head {
          background: var(--c-ink); color: #fff;
          padding: 28px 32px; margin: -28px -32px 0;
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 16px; flex-wrap: wrap;
        }
        .case-back { color: #8B9AB8; font-size: 12px; display: block; margin-bottom: 8px; }
        .case-back:hover { color: var(--c-gold); }
        .case-title { font-family: var(--f-serif); font-size: 24px; margin: 0; font-weight: 460; }
        .case-pkg { color: var(--c-gold); font-size: 18px; }
        .case-meta { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; font-size: 13px; color: #8B9AB8; }
        .case-meta strong { color: #fff; }
        .case-actions { display: flex; gap: 8px; }
        .status-form { display: flex; gap: 6px; }

        .status-pipeline {
          display: flex; gap: 0;
          padding: 18px 32px; margin: 0 -32px; background: #fff;
          border-bottom: 1px solid var(--c-line-soft);
          overflow-x: auto;
        }
        .sp { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 100px; opacity: 0.35; }
        .sp.done, .sp.now { opacity: 1; }
        .sp::after { content: "→"; color: var(--c-line); margin: 0 4px; font-size: 12px; }
        .sp:last-child::after { content: ""; }
        .sp-dot {
          width: 24px; height: 24px; display: grid; place-items: center;
          font-family: var(--f-mono); font-size: 10px; border-radius: 50%;
          border: 1px solid var(--c-line); color: var(--c-text-muted);
          flex-shrink: 0;
        }
        .sp.done .sp-dot { background: var(--c-gold); color: #fff; border-color: var(--c-gold); }
        .sp.now .sp-dot { background: var(--c-ink); color: #fff; border-color: var(--c-ink); }
        .sp-label { font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; color: var(--c-text-muted); }
        .sp.now .sp-label { color: var(--c-ink); }

        .fact-row {
          display: grid; grid-template-columns: repeat(6, 1fr);
          gap: 0; padding: 14px 0; margin: 16px 0;
          border-bottom: 1px solid var(--c-line-soft);
        }
        .fact-row > div { padding: 0 16px; border-right: 1px solid var(--c-line-soft); }
        .fact-row > div:last-child { border-right: 0; }
        .f-l { display: block; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 700; }
        .f-v { display: block; font-family: var(--f-serif); font-size: 16px; color: var(--c-ink); margin-top: 4px; }

        .tab-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }
        .tab-grid aside { display: flex; flex-direction: column; gap: 16px; }

        .mini-traveler, .mini-payment {
          padding: 12px 20px; border-bottom: 1px solid var(--c-line-soft);
          display: flex; justify-content: space-between; align-items: center;
        }
        .mini-traveler:last-child, .mini-payment:last-child { border-bottom: 0; }
        .mini-traveler strong, .mini-payment strong { font-family: var(--f-serif); font-size: 14px; color: var(--c-ink); display: block; }
        .mini-traveler .dim, .mini-payment .dim { font-size: 12px; display: block; }

        .compact-list { display: grid; grid-template-columns: 100px 1fr; gap: 8px 12px; margin: 0; font-size: 13px; }
        .compact-list dt { color: var(--c-text-muted); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }
        .compact-list dd { margin: 0; color: var(--c-ink); }
        .compact-list a { color: var(--c-gold); }

        .msg-list { display: flex; flex-direction: column; }
        .msg { padding: 14px 20px; border-bottom: 1px solid var(--c-line-soft); border-left: 3px solid var(--c-line); }
        .msg.OUTBOUND { border-left-color: var(--c-gold); }
        .msg.INBOUND { border-left-color: var(--c-green-soft); }
        .msg-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .msg-dir { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .msg-subj { display: block; font-family: var(--f-serif); font-size: 15px; color: var(--c-ink); margin-bottom: 4px; }
        .msg-body { margin: 0; font-size: 14px; line-height: 1.5; }

        @media (max-width: 1024px) {
          .tab-grid { grid-template-columns: 1fr; }
          .fact-row { grid-template-columns: repeat(3, 1fr); }
          .fact-row > div { padding: 8px 12px; }
          .case-head { padding: 20px; margin: -28px -32px 0; }
          .status-pipeline { padding: 14px 20px; margin: 0 -32px; }
        }
        @media (max-width: 640px) {
          .fact-row { grid-template-columns: 1fr 1fr; }
          .case-head { flex-direction: column; }
          .status-pipeline { gap: 4px; }
          .sp-label { font-size: 9px; }
          .sp::after { margin: 0 2px; }
          .case-title { font-size: 20px; }
          .case-pkg { font-size: 15px; }
        }

        /* Traveler profile cards */
        .traveler-cards { display: grid; gap: 12px; }
        .tv-card { background: #fff; border: 1px solid var(--c-line-soft); }
        .tv-card-head {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 20px;
          background: var(--c-cream);
          border-bottom: 1px solid var(--c-line-soft);
        }
        .tv-card-num {
          font-family: var(--f-mono); font-size: 14px; color: var(--c-gold);
          letter-spacing: 0.12em; flex-shrink: 0;
          width: 32px; height: 32px; display: grid; place-items: center;
          border: 1px solid var(--c-gold); background: #fff;
        }
        .tv-card-name { flex: 1; }
        .tv-card-name h3 { font-size: 18px; margin: 0 0 6px; }
        .tv-card-badges { display: flex; gap: 4px; flex-wrap: wrap; }
        .tv-card-body { padding: 20px; display: grid; gap: 18px; }
        .tv-section { }
        .tv-section-label {
          display: block; font-size: 10px; letter-spacing: 0.16em;
          text-transform: uppercase; color: var(--c-gold); font-weight: 700;
          margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--c-line-soft);
        }
        .tv-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 18px; }
        .tv-label {
          display: block; font-size: 10px; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--c-text-muted); font-weight: 600; margin-bottom: 2px;
        }
        .tv-value { font-family: var(--f-serif); font-size: 15px; color: var(--c-ink); }
        .tv-value.mono { font-family: var(--f-mono); font-size: 13px; letter-spacing: 0.04em; }
        .tv-notes { margin: 0; font-size: 14px; line-height: 1.6; color: var(--c-text); padding: 10px 14px; background: var(--c-paper); border-left: 3px solid var(--c-gold); }

        .add-tv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

        @media (max-width: 900px) {
          .tv-fields { grid-template-columns: 1fr 1fr; }
          .add-tv-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .tv-fields { grid-template-columns: 1fr; }
          .tv-card-body { padding: 16px; }
          .add-tv-grid { grid-template-columns: 1fr; }
          .tv-card-head { flex-wrap: wrap; gap: 10px; }
        }
      `}</style>
    </div>
  );
}
