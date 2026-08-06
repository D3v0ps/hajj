import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COUNTRY_OPTIONS, CIVIL_STATUS_OPTIONS } from "@/lib/countries";
import { uploadTravelerDocument, setDocumentStatus, deleteTravelerDocument } from "@/app/actions/documents";
import { updateRefundStatus } from "@/app/actions/refunds";
import { logAudit } from "@/lib/audit";
import { ROOM_TYPES } from "@/lib/rooms";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string; docError?: string; docOk?: string; refundError?: string; refundOk?: string }>;

const REFUND_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "PROCESSED"] as const;
const REFUND_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Mottagen / under granskning",
  APPROVED: "Godkänd",
  REJECTED: "Avslagen",
  PROCESSED: "Återbetald",
};

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "SUBMITTED", "REVIEW", "CONFIRMED", "PAID_DEPOSIT", "PAID_FULL", "COMPLETED", "CANCELLED"] as const;
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Utkast", SUBMITTED: "Mottagen", REVIEW: "Granskas",
  CONFIRMED: "Bekräftad", PAID_DEPOSIT: "Reserv. betald",
  PAID_FULL: "Slutbetald", COMPLETED: "Genomförd", CANCELLED: "Avbokad",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  PASSPORT: "Pass", PASSPORT_PHOTO: "Passfoto", RESIDENCE_PERMIT: "Uppehållstillstånd",
  VACCINATION: "Vaccinationsintyg", OTHER: "Övrigt dokument",
};
const DOC_STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Väntar granskning", cls: "gold" },
  APPROVED: { label: "Godkänd", cls: "ok" },
  REJECTED: { label: "Avvisad", cls: "warn" },
  NEEDS_INFO: { label: "Komplettering", cls: "outline" },
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");
  return session.user;
}

async function updateStatus(bookingId: string, formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status as typeof STATUSES[number])) return;
  const before = await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
  await prisma.booking.update({ where: { id: bookingId }, data: { status: status as typeof STATUSES[number] } });
  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "booking.statusChanged",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { from: before?.status, to: status },
  });
  revalidatePath(`/admin/bokningar/${bookingId}`);
}

async function verifyPayment(paymentId: string) {
  "use server";
  const admin = await requireAdmin();
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { bookingId: true, amount: true, method: true } });
  // Idempotent: bara PENDING → COMPLETED (en redan betald post stämplas inte om).
  const claimed = await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "COMPLETED", paidAt: new Date() },
  });
  if (payment) revalidatePath(`/admin/bokningar/${payment.bookingId}`);
  // Audit-logg endast om CAS-claim faktiskt vann (idempotent vid dubbel-klick).
  if (claimed.count > 0 && payment) {
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "payment.verifiedManually",
      targetType: "Payment",
      targetId: paymentId,
      metadata: { bookingId: payment.bookingId, amount: payment.amount, method: payment.method },
    });
  }
}

async function addTravelerAdmin(bookingId: string, formData: FormData) {
  "use server";
  await requireAdmin();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  await prisma.traveler.create({
    data: {
      userId: booking.userId,
      bookingId,
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      ageCategory: (["ADULT", "CHILD", "INFANT"].includes(String(formData.get("ageCategory"))) ? String(formData.get("ageCategory")) : "ADULT") as "ADULT" | "CHILD" | "INFANT",
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      personnummer: String(formData.get("personnummer") ?? "") || null,
      passportNo: String(formData.get("passportNo") ?? "") || null,
      passportExp: formData.get("passportExp") ? new Date(String(formData.get("passportExp"))) : null,
      passIssueDate: formData.get("passIssueDate") ? new Date(String(formData.get("passIssueDate"))) : null,
      passIssuePlace: String(formData.get("passIssuePlace") ?? "") || null,
      birthDate: formData.get("birthDate") ? new Date(String(formData.get("birthDate"))) : null,
      gender: String(formData.get("gender") ?? "") || null,
      nationality: String(formData.get("nationality") ?? "") || null,
      civilStatus: String(formData.get("civilStatus") ?? "") || null,
      occupation: String(formData.get("occupation") ?? "") || null,
      birthCountry: String(formData.get("birthCountry") ?? "") || null,
      birthCity: String(formData.get("birthCity") ?? "") || null,
      roomAssignment: String(formData.get("roomAssignment") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  revalidatePath(`/admin/bokningar/${bookingId}`);
}

async function removeTravelerAdmin(bookingId: string, travelerId: string) {
  "use server";
  const admin = await requireAdmin();
  const result = await prisma.traveler.deleteMany({ where: { id: travelerId, bookingId } });
  if (result.count > 0) {
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "traveler.removedByAdmin",
      targetType: "Traveler",
      targetId: travelerId,
      metadata: { bookingId },
    });
  }
  revalidatePath(`/admin/bokningar/${bookingId}`);
}

async function sendMessage(bookingId: string, formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  const body = String(formData.get("body") ?? "").slice(0, 4000);
  const subject = String(formData.get("subject") ?? "").slice(0, 200);
  const isInternal = formData.get("isInternal") === "on";
  if (!body) return;
  await prisma.message.create({
    data: {
      userId: booking.userId,
      bookingId,
      // Admin är alltid OUTBOUND. isInternal-flaggan styr om kunden ser meddelandet
      // (intern anteckning vs synligt svar) — direction:INBOUND skulle felaktigt
      // klassa interna anteckningar som kundkommunikation i rapporter.
      direction: "OUTBOUND",
      isInternal,
      authorName: user.name ?? user.email ?? "Admin",
      subject: subject || null,
      body,
    },
  });
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: isInternal ? "booking.internalNote" : "booking.replyToCustomer",
    targetType: "Booking",
    targetId: bookingId,
    metadata: { isInternal },
  });
  revalidatePath(`/admin/bokningar/${bookingId}`);
}

export default async function BokningDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const { tab, docError, docOk, refundError, refundOk } = await searchParams;
  const activeTab = tab ?? "oversikt";

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      package: { include: { tiers: true } },
      tier: true,
      user: { select: { id: true, email: true, name: true, phone: true } },
      travelers: { orderBy: { createdAt: "asc" }, include: { documents: { orderBy: { uploadedAt: "desc" } } } },
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

      {/* Refund / cancellation case (visas bara om kunden begärt avbokning) */}
      {booking.refundStatus !== "NONE" && (
        <section className={`rf-card rf-card-${booking.refundStatus.toLowerCase()}`} aria-label="Avbokningsbegäran">
          <div className="rf-card-head">
            <div>
              <span className="rf-eyebrow">Avbokningsbegäran</span>
              <h2 className="rf-card-title">
                Status: <span className={`rf-pill rf-pill-${booking.refundStatus.toLowerCase()}`}>{REFUND_STATUS_LABELS[booking.refundStatus] ?? booking.refundStatus}</span>
              </h2>
              <p className="rf-card-meta">
                Mottagen {booking.refundRequestedAt
                  ? new Date(booking.refundRequestedAt).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })
                  : "—"}
              </p>
            </div>
          </div>

          {refundError && <div className="rf-flash err" role="alert">{refundError}</div>}
          {refundOk && !refundError && <div className="rf-flash ok" role="status">Statusen uppdaterades.</div>}

          {booking.refundReason && (
            <div className="rf-reason">
              <span className="rf-eyebrow">Kundens anledning</span>
              <p className="rf-reason-text">{booking.refundReason}</p>
            </div>
          )}

          <form action={updateRefundStatus} className="rf-form">
            <input type="hidden" name="bookingId" value={booking.id} />
            <div className="rf-form-row">
              <label htmlFor={`rf-status-${booking.id}`} className="rf-form-label">Ny status</label>
              <select id={`rf-status-${booking.id}`} name="status" defaultValue={booking.refundStatus} className="rf-select">
                {REFUND_STATUSES.map((s) => (
                  <option key={s} value={s}>{REFUND_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="rf-form-row">
              <label htmlFor={`rf-comment-${booking.id}`} className="rf-form-label">Kommentar (valfri)</label>
              <textarea
                id={`rf-comment-${booking.id}`}
                name="comment"
                rows={3}
                maxLength={2000}
                placeholder="Visas alltid som intern anteckning. Vid Godkänd/Avslagen skickas även som meddelande och mejl till kunden."
                className="rf-textarea"
              />
            </div>
            <div className="rf-form-actions">
              <p className="rf-hint dim">
                Bokningens status (DRAFT/SUBMITTED/…) ändras inte automatiskt — sätt CANCELLED manuellt via statusväljaren när beslut är taget.
              </p>
              <button type="submit" className="btn btn-primary" style={{ padding: "8px 18px", fontSize: 12 }}>Spara</button>
            </div>
          </form>
        </section>
      )}

      {/* Tabs */}
      <div className="adm-tabs">
        {[
          { key: "oversikt", label: "Översikt" },
          { key: "resenarer", label: "Resenärer", count: booking.travelers.length },
          { key: "betalningar", label: "Betalningar", count: booking.payments.length },
          { key: "meddelanden", label: "Meddelanden", count: booking.messages.filter((m) => !m.isInternal).length },
        ].map((t) => (
          <a
            key={t.key}
            href={`/admin/bokningar/${booking.id}?tab=${t.key}`}
            className={`adm-tab ${activeTab === t.key ? "active" : ""}`}
          >
            {t.label}
            {t.count != null && <span className="count">{t.count}</span>}
          </a>
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
          <div className="tv-toolbar">
            <h2 style={{ fontFamily: "var(--f-serif)", fontSize: 22, margin: 0 }}>
              {booking.travelers.length} resenärer
            </h2>
            <div className="tv-quick-stats">
              <span className="tv-qs">{booking.travelers.filter((t) => t.passportNo).length}/{booking.travelers.length} pass</span>
              <span className="tv-qs">{booking.travelers.filter((t) => t.roomAssignment).length}/{booking.travelers.length} rum</span>
            </div>
          </div>

          {docError && (
            <div className="tv-doc-banner err" role="alert">{docError}</div>
          )}
          {docOk && !docError && (
            <div className="tv-doc-banner ok" role="status">Dokumentet uppdaterades.</div>
          )}

          <div className="traveler-cards">
            {booking.travelers.map((t, i) => {
              const hasPass = !!t.passportNo;
              const hasRoom = !!t.roomAssignment;
              const missingCount = [!t.passportNo, !t.personnummer, !t.birthDate].filter(Boolean).length;

              return (
                <details key={t.id} className="tv-accordion" open={i === 0}>
                  <summary className="tv-summary">
                    <div className="tv-sum-left">
                      <div className="tv-sum-avatar" data-gender={t.gender ?? ""}>
                        {t.gender === "M" ? "♂" : t.gender === "F" ? "♀" : String(i + 1)}
                      </div>
                      <div className="tv-sum-info">
                        <div className="tv-sum-name">{t.firstName} {t.lastName}</div>
                        <div className="tv-sum-meta">
                          {t.email ?? t.phone ?? booking.user.email}
                          {t.nationality && <> · {t.nationality}</>}
                        </div>
                      </div>
                    </div>
                    <div className="tv-sum-right">
                      <div className="tv-sum-checks">
                        <span className={`tv-check ${hasPass ? "ok" : "missing"}`} title={hasPass ? "Pass registrerat" : "Pass saknas"}>
                          {hasPass ? "✓" : "✗"} Pass
                        </span>
                        <span className={`tv-check ${hasRoom ? "ok" : "missing"}`} title={hasRoom ? `Rum: ${t.roomAssignment}` : "Rum ej tilldelat"}>
                          {hasRoom ? "✓" : "—"} Rum
                        </span>
                      </div>
                      <div className="tv-sum-badges">
                        <span className="adm-pill outline">{t.ageCategory === "ADULT" ? "Vuxen" : t.ageCategory === "CHILD" ? "Barn" : "Spädbarn"}</span>
                        {missingCount > 0 && <span className="adm-pill outline">{missingCount} saknas</span>}
                      </div>
                      <span className="tv-chevron" aria-hidden="true">›</span>
                    </div>
                  </summary>

                  <div className="tv-card-body">
                    <div className="tv-body-grid">
                      <div className="tv-section">
                        <span className="tv-section-label">Kontaktuppgifter</span>
                        <div className="tv-fields">
                          <div><span className="tv-label">E-post</span><span className="tv-value">{t.email ?? booking.contactEmail ?? booking.user.email}</span></div>
                          <div><span className="tv-label">Mobil</span><span className="tv-value">{t.phone ?? booking.user.phone ?? booking.contactPhone ?? "—"}</span></div>
                          <div><span className="tv-label">Adress</span><span className="tv-value">{t.address ?? "—"}</span></div>
                          <div><span className="tv-label">Yrke</span><span className="tv-value">{t.occupation ?? "—"}</span></div>
                          <div><span className="tv-label">Civilstånd</span><span className="tv-value">{t.civilStatus ?? "—"}</span></div>
                        </div>
                      </div>

                      <div className="tv-section">
                        <span className="tv-section-label">Identitet & pass</span>
                        <div className="tv-fields">
                          <div><span className="tv-label">Personnummer</span><span className="tv-value mono">{t.personnummer ?? "—"}</span></div>
                          <div><span className="tv-label">Passnummer</span><span className="tv-value mono">{t.passportNo ?? "—"}</span></div>
                          <div><span className="tv-label">Pass utfärdat</span><span className="tv-value">{t.passIssueDate ? fmtDate(t.passIssueDate) : "—"}</span></div>
                          <div><span className="tv-label">Pass giltig t.o.m.</span><span className="tv-value">{t.passportExp ? fmtDate(t.passportExp) : "—"}</span></div>
                          <div><span className="tv-label">Utfärdandeort</span><span className="tv-value">{t.passIssuePlace ?? "—"}</span></div>
                          <div><span className="tv-label">Nationalitet</span><span className="tv-value">{t.nationality ?? "—"}</span></div>
                        </div>
                      </div>

                      <div className="tv-section">
                        <span className="tv-section-label">Födelse & resa</span>
                        <div className="tv-fields">
                          <div><span className="tv-label">Födelsedatum</span><span className="tv-value">{t.birthDate ? fmtDate(t.birthDate) : "—"}</span></div>
                          <div><span className="tv-label">Födelseland</span><span className="tv-value">{t.birthCountry ?? "—"}</span></div>
                          <div><span className="tv-label">Födelseort</span><span className="tv-value">{t.birthCity ?? "—"}</span></div>
                          <div><span className="tv-label">Rumsindelning</span><span className="tv-value">{t.roomAssignment ?? "Ej tilldelat"}</span></div>
                          <div><span className="tv-label">Flyg ut</span><span className="tv-value mono">{t.flightOut ?? "—"}</span></div>
                          <div><span className="tv-label">Flyg hem</span><span className="tv-value mono">{t.flightReturn ?? "—"}</span></div>
                        </div>
                      </div>
                    </div>

                    {t.notes && (
                      <div className="tv-notes-block">
                        <span className="tv-section-label">Anteckningar</span>
                        <p className="tv-notes">{t.notes}</p>
                      </div>
                    )}

                    <div className="tv-docs">
                      <span className="tv-section-label">Resedokument ({t.documents.length})</span>
                      {t.documents.length > 0 && (
                        <div className="tv-doc-list">
                          {t.documents.map((d) => {
                            const meta = DOC_STATUS_META[d.status] ?? DOC_STATUS_META.PENDING;
                            return (
                              <div key={d.id} className="tv-doc-row">
                                <div className="tv-doc-main">
                                  <span className="tv-doc-type">{DOC_TYPE_LABELS[d.type] ?? d.type}</span>
                                  <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="tv-doc-file">
                                    {d.filename}
                                  </a>
                                  <span className="tv-doc-size">{Math.max(1, Math.round(d.sizeBytes / 1024))} kB</span>
                                </div>
                                <div className="tv-doc-side">
                                  <span className={`adm-pill ${meta.cls}`}>{meta.label}</span>
                                  <form action={setDocumentStatus}>
                                    <input type="hidden" name="documentId" value={d.id} />
                                    <input type="hidden" name="bookingId" value={booking.id} />
                                    <select name="status" defaultValue={d.status} className="tv-doc-status" aria-label="Granskningsstatus">
                                      <option value="PENDING">Väntar</option>
                                      <option value="APPROVED">Godkänn</option>
                                      <option value="REJECTED">Avvisa</option>
                                      <option value="NEEDS_INFO">Komplettering</option>
                                    </select>
                                    <button type="submit" className="tv-doc-btn">Spara</button>
                                  </form>
                                  <form action={deleteTravelerDocument}>
                                    <input type="hidden" name="documentId" value={d.id} />
                                    <input type="hidden" name="bookingId" value={booking.id} />
                                    <button type="submit" className="tv-doc-btn danger" title="Ta bort dokument" aria-label="Ta bort dokument">✕</button>
                                  </form>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <form action={uploadTravelerDocument} className="tv-doc-upload" encType="multipart/form-data">
                        <input type="hidden" name="travelerId" value={t.id} />
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <select name="type" defaultValue="PASSPORT" className="tv-doc-status" aria-label="Dokumenttyp">
                          <option value="PASSPORT">Pass</option>
                          <option value="PASSPORT_PHOTO">Passfoto</option>
                          <option value="RESIDENCE_PERMIT">Uppehållstillstånd</option>
                          <option value="VACCINATION">Vaccinationsintyg</option>
                          <option value="OTHER">Övrigt</option>
                        </select>
                        <input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="tv-doc-file-input" aria-label="Välj fil" />
                        <button type="submit" className="btn btn-ghost tv-doc-upload-btn">Ladda upp</button>
                      </form>
                      <p className="tv-doc-hint dim">PDF, JPG, PNG eller WEBP · max 8 MB · syns endast för kontoret</p>
                    </div>

                    <div className="tv-actions">
                      <form action={removeTravelerAdmin.bind(null, booking.id, t.id)}>
                        <button type="submit" className="tv-action-btn danger">Ta bort resenär</button>
                      </form>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>

          {booking.travelers.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", background: "#fff", border: "1px dashed var(--c-line)" }}>
              <span style={{ fontSize: 32, display: "block", marginBottom: 12, opacity: 0.3 }}>👤</span>
              <p style={{ margin: 0, fontSize: 16 }}>Inga resenärer registrerade ännu.</p>
              <p className="dim" style={{ fontSize: 13, marginTop: 6 }}>Lägg till den första nedan.</p>
            </div>
          )}

          {/* Lägg till resenär — ihopfällbar */}
          <details className="tv-add-accordion" style={{ marginTop: 20 }}>
            <summary className="tv-add-summary">
              <span className="tv-add-icon">+</span>
              <span>Lägg till resenär</span>
            </summary>
            <div className="tv-add-body">
              <form action={addTravelerAdmin.bind(null, booking.id)} className="add-tv-form">
                <div className="add-tv-grid">
                  <div className="field"><label>Förnamn *</label><input name="firstName" required /></div>
                  <div className="field"><label>Efternamn *</label><input name="lastName" required /></div>
                  <div className="field">
                    <label>Ålderskategori</label>
                    <select name="ageCategory" defaultValue="ADULT"><option value="ADULT">Vuxen</option><option value="CHILD">Barn</option><option value="INFANT">Spädbarn</option></select>
                  </div>
                  <div className="field"><label>E-post</label><input name="email" type="email" /></div>
                  <div className="field"><label>Mobilnummer</label><input name="phone" type="tel" /></div>
                  <div className="field">
                    <label>Kön</label>
                    <select name="gender" defaultValue=""><option value="">—</option><option value="M">Man</option><option value="F">Kvinna</option></select>
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}><label>Adress</label><input name="address" placeholder="Gata, postnummer, ort" /></div>
                  <div className="field"><label>Personnummer</label><input name="personnummer" inputMode="numeric" placeholder="ÅÅÅÅMMDD-XXXX" /></div>
                  <div className="field"><label>Födelsedatum</label><input name="birthDate" type="date" /></div>
                  <div className="field">
                    <label>Civilstånd</label>
                    <select name="civilStatus" defaultValue=""><option value="">—</option>{CIVIL_STATUS_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                  </div>
                  <div className="field">
                    <label>Nationalitet</label>
                    <select name="nationality" defaultValue=""><option value="">Välj land...</option>{COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                  <div className="field">
                    <label>Födelseland</label>
                    <select name="birthCountry" defaultValue=""><option value="">Välj land...</option>{COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                  <div className="field"><label>Födelseort</label><input name="birthCity" /></div>
                  <div className="field"><label>Yrke</label><input name="occupation" /></div>
                  <div className="field"><label>Passnummer</label><input name="passportNo" /></div>
                  <div className="field"><label>Pass utfärdat (datum)</label><input name="passIssueDate" type="date" /></div>
                  <div className="field"><label>Pass giltigt t.o.m.</label><input name="passportExp" type="date" /></div>
                  <div className="field"><label>Pass utfärdandeort</label><input name="passIssuePlace" /></div>
                  <div className="field">
                    <label>Rum</label>
                    <select name="roomAssignment" defaultValue="">
                      <option value="">— Ej tilldelat —</option>
                      {ROOM_TYPES.map((r) => (
                        <option key={r.key} value={r.label}>{r.label} ({r.beds} bäddar)</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}><label>Övrig viktig information</label><input name="notes" placeholder="Speciella behov, allergier, etc." /></div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 16 }}>
                  <button type="submit" className="btn btn-primary" style={{ marginLeft: "auto", padding: "10px 20px", fontSize: 13 }}>Lägg till resenär</button>
                </div>
              </form>
            </div>
          </details>

          <style>{`
            .tv-doc-banner { padding: 10px 14px; margin-bottom: 14px; font-size: 13px; border: 1px solid; }
            .tv-doc-banner.err { background: #fbeae8; border-color: #e7c3bf; color: #8a1c13; }
            .tv-doc-banner.ok { background: #e9f5ee; border-color: #bfe0cb; color: #1a5132; }
            .tv-docs { margin-top: 18px; padding-top: 16px; border-top: 1px dashed var(--c-line); }
            .tv-doc-list { display: flex; flex-direction: column; gap: 8px; margin: 10px 0 14px; }
            .tv-doc-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 8px 12px; background: var(--c-cream); border: 1px solid var(--c-line-soft); }
            .tv-doc-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; }
            .tv-doc-type { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
            .tv-doc-file { font-size: 13px; color: var(--c-ink); text-decoration: underline; word-break: break-all; }
            .tv-doc-size { font-size: 11px; color: var(--c-text-faint); font-family: var(--f-mono); }
            .tv-doc-side { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .tv-doc-side form { display: flex; align-items: center; gap: 4px; margin: 0; }
            .tv-doc-status { padding: 5px 8px; border: 1px solid var(--c-line); background: #fff; font-size: 12px; }
            .tv-doc-btn { padding: 5px 10px; border: 1px solid var(--c-line); background: #fff; font-size: 12px; cursor: pointer; }
            .tv-doc-btn:hover { border-color: var(--c-ink); }
            .tv-doc-btn.danger { color: #b3261e; border-color: #e7c3bf; }
            .tv-doc-upload { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0; }
            .tv-doc-file-input { font-size: 12px; max-width: 100%; }
            .tv-doc-upload-btn { padding: 8px 14px; font-size: 12px; }
            .tv-doc-hint { font-size: 11px; margin: 8px 0 0; }
          `}</style>
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

      {activeTab === "meddelanden" && (() => {
        const customerMsgs = booking.messages.filter((m) => !m.isInternal);
        const internalNotes = booking.messages.filter((m) => m.isInternal);
        const sortedMsgs = [...customerMsgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return (
          <div className="chat-layout">
            {/* Chat thread */}
            <div className="chat-main">
              <div className="chat-header">
                <h2 style={{ fontFamily: "var(--f-serif)", fontSize: 20, margin: 0 }}>
                  Konversation med {booking.user.name ?? booking.user.email}
                </h2>
                <span className="dim" style={{ fontSize: 12 }}>{customerMsgs.length} meddelanden</span>
              </div>

              <div className="chat-thread">
                {sortedMsgs.length === 0 ? (
                  <div className="chat-empty">
                    <span className="chat-empty-icon">💬</span>
                    <p>Ingen konversation ännu.</p>
                    <p className="dim" style={{ fontSize: 13 }}>Skriv ett meddelande nedan för att starta.</p>
                  </div>
                ) : (
                  sortedMsgs.map((m) => (
                    <div key={m.id} className={`chat-bubble ${m.direction === "OUTBOUND" ? "outbound" : "inbound"}`}>
                      <div className="chat-bubble-sender">
                        {m.direction === "OUTBOUND" ? (m.authorName ?? "Kontoret") : (booking.user.name ?? "Kund")}
                      </div>
                      {m.subject && <div className="chat-bubble-subject">{m.subject}</div>}
                      <div className="chat-bubble-body">{m.body}</div>
                      <div className="chat-bubble-time">
                        {new Date(m.createdAt).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {m.direction === "OUTBOUND" && <span className="chat-sent">✓</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Composer */}
              <div className="chat-composer">
                <form action={sendMessage.bind(null, booking.id)} className="chat-form">
                  <input name="subject" placeholder="Ämne (valfritt)" className="chat-subject" />
                  <div className="chat-input-row">
                    <textarea name="body" rows={3} placeholder="Skriv meddelande till kunden..." required className="chat-textarea" />
                    <button type="submit" className="chat-send-btn" aria-label="Skicka">
                      <span>➤</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Internal notes sidebar */}
            <aside className="chat-sidebar">
              <div className="notes-card">
                <div className="notes-header">
                  <span className="notes-icon">📌</span>
                  <strong>Interna anteckningar</strong>
                  <span className="dim" style={{ fontSize: 11 }}>Ej synliga för kund</span>
                </div>

                <div className="notes-list">
                  {internalNotes.length === 0 ? (
                    <p className="dim" style={{ padding: "16px", fontSize: 13 }}>Inga interna anteckningar.</p>
                  ) : (
                    internalNotes.map((n) => (
                      <div key={n.id} className="note-item">
                        <div className="note-meta">
                          <span className="note-author">{n.authorName ?? "Admin"}</span>
                          <span className="note-time">
                            {new Date(n.createdAt).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="note-body">{n.body}</p>
                      </div>
                    ))
                  )}
                </div>

                <form action={sendMessage.bind(null, booking.id)} className="note-form">
                  <input type="hidden" name="isInternal" value="on" />
                  <textarea name="body" rows={2} placeholder="Skriv intern anteckning..." required className="note-textarea" />
                  <button type="submit" className="note-submit">+ Anteckning</button>
                </form>
              </div>
            </aside>
          </div>
        );
      })()}

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

        /* Avbokning/återbetalning-kort */
        .rf-card {
          background: #fff; border: 1px solid var(--c-line-soft);
          border-left: 4px solid var(--c-gold);
          padding: 20px 24px; margin-bottom: 20px;
        }
        .rf-card-requested { border-left-color: var(--c-gold); background: #FFFCEF; }
        .rf-card-approved  { border-left-color: var(--c-green-soft); }
        .rf-card-rejected  { border-left-color: var(--c-warn); }
        .rf-card-processed { border-left-color: var(--c-ink); }
        .rf-card-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
        .rf-eyebrow {
          display: block; font-size: 10px; letter-spacing: 0.16em;
          text-transform: uppercase; color: var(--c-gold); font-weight: 700; margin-bottom: 4px;
        }
        .rf-card-title { font-family: var(--f-serif); font-size: 20px; margin: 0 0 4px 0; color: var(--c-ink); font-weight: 500; }
        .rf-card-meta { font-size: 12px; color: var(--c-text-muted); margin: 0; }

        .rf-pill {
          display: inline-flex; align-items: center;
          padding: 3px 10px; font-size: 11px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          border: 1px solid; background: transparent;
          font-family: var(--f-sans); vertical-align: middle;
        }
        .rf-pill-requested { color: var(--c-gold);  border-color: var(--c-gold); background: #FFF7E6; }
        .rf-pill-approved  { color: var(--c-green); border-color: var(--c-green-soft); background: #E6F1EA; }
        .rf-pill-rejected  { color: var(--c-warn);  border-color: var(--c-warn); background: #FBE9E2; }
        .rf-pill-processed { color: var(--c-ink);   border-color: var(--c-ink);  background: #fff; }

        .rf-flash { padding: 8px 12px; font-size: 12px; margin: 10px 0; border: 1px solid; }
        .rf-flash.err { background: #FBE9E2; border-color: var(--c-warn); color: var(--c-warn); }
        .rf-flash.ok  { background: #E6F1EA; border-color: var(--c-green-soft); color: var(--c-green); }

        .rf-reason {
          background: var(--c-paper); border-left: 3px solid var(--c-gold);
          padding: 10px 14px; margin: 12px 0 14px;
        }
        .rf-reason-text { margin: 4px 0 0; white-space: pre-wrap; line-height: 1.55; font-size: 13.5px; }

        .rf-form { display: grid; gap: 10px; margin-top: 6px; padding-top: 12px; border-top: 1px dashed var(--c-line-soft); }
        .rf-form-row { display: grid; gap: 6px; }
        .rf-form-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .rf-select {
          padding: 7px 10px; border: 1px solid var(--c-line); background: #fff;
          font-size: 13px; font-family: var(--f-sans); max-width: 280px;
        }
        .rf-textarea {
          padding: 10px 12px; border: 1px solid var(--c-line); background: var(--c-paper);
          font-size: 13px; font-family: var(--f-sans); resize: vertical; min-height: 70px;
        }
        .rf-textarea:focus { background: #fff; border-color: var(--c-ink); outline: none; }
        .rf-form-actions {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px; flex-wrap: wrap; margin-top: 4px;
        }
        .rf-hint { font-size: 11.5px; margin: 0; max-width: 540px; }

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

        /* Chat layout */
        .chat-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
        .chat-main {
          background: #fff; border: 1px solid var(--c-line-soft);
          display: flex; flex-direction: column; max-height: 700px;
        }
        .chat-header {
          padding: 16px 20px; border-bottom: 1px solid var(--c-line-soft);
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
        }
        .chat-thread {
          flex: 1; overflow-y: auto; padding: 20px;
          display: flex; flex-direction: column; gap: 12px;
          background: linear-gradient(180deg, var(--c-paper) 0%, #fff 100%);
        }
        .chat-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: var(--c-text-muted); gap: 8px;
        }
        .chat-empty-icon { font-size: 40px; opacity: 0.4; }

        .chat-bubble { max-width: 75%; padding: 12px 16px; border-radius: 12px; position: relative; }
        .chat-bubble.outbound {
          align-self: flex-end;
          background: var(--c-ink); color: #fff;
          border-bottom-right-radius: 4px;
        }
        .chat-bubble.inbound {
          align-self: flex-start;
          background: var(--c-cream); color: var(--c-text);
          border-bottom-left-radius: 4px;
        }
        .chat-bubble-sender {
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          font-weight: 700; margin-bottom: 4px;
        }
        .chat-bubble.outbound .chat-bubble-sender { color: var(--c-gold); }
        .chat-bubble.inbound .chat-bubble-sender { color: var(--c-text-muted); }
        .chat-bubble-subject {
          font-family: var(--f-serif); font-size: 15px; font-weight: 500;
          margin-bottom: 4px;
        }
        .chat-bubble.outbound .chat-bubble-subject { color: #fff; }
        .chat-bubble-body { font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
        .chat-bubble-time {
          font-size: 10px; margin-top: 6px;
          display: flex; justify-content: flex-end; gap: 4px; align-items: center;
        }
        .chat-bubble.outbound .chat-bubble-time { color: #8B9AB8; }
        .chat-bubble.inbound .chat-bubble-time { color: var(--c-text-faint); }
        .chat-sent { color: var(--c-gold); }

        .chat-composer {
          padding: 14px 16px; border-top: 1px solid var(--c-line-soft);
          background: #fff; flex-shrink: 0;
        }
        .chat-form { display: flex; flex-direction: column; gap: 8px; }
        .chat-subject {
          padding: 8px 12px; border: 1px solid var(--c-line-soft);
          font-size: 12px; font-family: var(--f-sans); background: var(--c-paper);
        }
        .chat-input-row { display: flex; gap: 8px; }
        .chat-textarea {
          flex: 1; padding: 10px 14px; border: 1px solid var(--c-line);
          font-size: 14px; font-family: var(--f-sans); resize: none;
          min-height: 60px;
        }
        .chat-textarea:focus { border-color: var(--c-ink); outline: none; }
        .chat-send-btn {
          width: 48px; height: auto;
          background: var(--c-ink); color: #fff; border: 0;
          font-size: 20px; cursor: pointer;
          display: grid; place-items: center;
          flex-shrink: 0; transition: background 160ms;
        }
        .chat-send-btn:hover { background: var(--c-gold); }

        /* Internal notes sidebar */
        .chat-sidebar { }
        .notes-card {
          background: #FFFDE6; border: 1px solid #E8DDA0;
          display: flex; flex-direction: column;
          max-height: 700px;
        }
        .notes-header {
          padding: 14px 16px; border-bottom: 1px solid #E8DDA0;
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .notes-icon { font-size: 16px; }
        .notes-header strong { font-size: 13px; color: var(--c-ink); }
        .notes-list { flex: 1; overflow-y: auto; padding: 8px; }
        .note-item {
          padding: 10px 12px; border-bottom: 1px solid #E8DDA0;
        }
        .note-item:last-child { border-bottom: 0; }
        .note-meta { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .note-author { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .note-time { font-size: 10px; font-family: var(--f-mono); color: var(--c-text-faint); }
        .note-body { margin: 0; font-size: 13px; line-height: 1.5; color: var(--c-text); }
        .note-form {
          padding: 10px 12px; border-top: 1px solid #E8DDA0;
          display: flex; flex-direction: column; gap: 6px;
        }
        .note-textarea {
          width: 100%; padding: 8px 10px; border: 1px solid #E8DDA0;
          font-size: 13px; font-family: var(--f-sans); resize: none;
          background: #fff;
        }
        .note-submit {
          align-self: flex-end;
          background: transparent; border: 1px solid var(--c-gold);
          color: var(--c-gold); padding: 5px 12px; font-size: 11px;
          font-weight: 700; cursor: pointer; font-family: var(--f-sans);
        }
        .note-submit:hover { background: var(--c-gold); color: #fff; }

        @media (max-width: 1024px) {
          .tab-grid { grid-template-columns: 1fr; }
          .chat-layout { grid-template-columns: 1fr; }
          .chat-main { max-height: 500px; }
          .notes-card { max-height: 300px; }
          .fact-row { grid-template-columns: repeat(3, 1fr); }
          .fact-row > div { padding: 8px 12px; }
          .case-head { padding: 20px; margin: -20px -16px 0; }
          .status-pipeline { padding: 14px 16px; margin: 0 -16px; }
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

        /* Traveler accordion cards */
        .tv-toolbar {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
        }
        .tv-quick-stats { display: flex; gap: 12px; }
        .tv-qs {
          font-size: 12px; font-family: var(--f-mono); color: var(--c-text-muted);
          padding: 4px 10px; background: var(--c-cream); border: 1px solid var(--c-line-soft);
        }
        .tv-qs.warn { color: var(--c-warn); border-color: var(--c-warn); background: #FBE9E2; }

        .traveler-cards { display: grid; gap: 6px; }

        .tv-accordion {
          background: #fff; border: 1px solid var(--c-line-soft);
          transition: border-color 160ms;
        }
        .tv-accordion[open] { border-color: var(--c-gold); }
        .tv-accordion[open] .tv-chevron { transform: rotate(90deg); }

        .tv-summary {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 20px; cursor: pointer; list-style: none;
          transition: background 120ms; user-select: none;
          gap: 16px;
        }
        .tv-summary::-webkit-details-marker { display: none; }
        .tv-summary::marker { display: none; }
        .tv-summary:hover { background: var(--c-cream); }

        .tv-sum-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
        .tv-sum-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          display: grid; place-items: center;
          font-size: 16px; flex-shrink: 0;
          border: 1px solid var(--c-line);
        }
        .tv-sum-avatar[data-gender="M"] { background: var(--c-ink); color: #fff; border-color: var(--c-ink); }
        .tv-sum-avatar[data-gender="F"] { background: var(--c-gold); color: #fff; border-color: var(--c-gold); }
        .tv-sum-info { min-width: 0; }
        .tv-sum-name {
          font-family: var(--f-serif); font-size: 16px; color: var(--c-ink);
          font-weight: 460; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tv-sum-meta { font-size: 12px; color: var(--c-text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .tv-sum-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .tv-sum-checks { display: flex; gap: 8px; }
        .tv-check {
          font-size: 11px; font-weight: 600; padding: 2px 8px;
          border: 1px solid var(--c-line); background: var(--c-paper);
        }
        .tv-check.ok { color: var(--c-green-soft); border-color: var(--c-green-soft); }
        .tv-check.missing { color: var(--c-text-faint); }
        .tv-sum-badges { display: flex; gap: 4px; }
        .tv-chevron {
          font-size: 20px; color: var(--c-text-muted);
          transition: transform 200ms; flex-shrink: 0;
        }

        .tv-card-body {
          padding: 0 20px 20px;
          border-top: 1px solid var(--c-line-soft);
        }
        .tv-body-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; padding-top: 20px; }
        .tv-section-label {
          display: block; font-size: 10px; letter-spacing: 0.16em;
          text-transform: uppercase; color: var(--c-gold); font-weight: 700;
          margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--c-line-soft);
        }
        .tv-fields { display: grid; gap: 10px; }
        .tv-label {
          display: block; font-size: 9px; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--c-text-faint); font-weight: 600; margin-bottom: 1px;
        }
        .tv-value { font-family: var(--f-serif); font-size: 14px; color: var(--c-ink); }
        .tv-value.mono { font-family: var(--f-mono); font-size: 12px; letter-spacing: 0.04em; }
        .tv-notes-block { padding-top: 16px; }
        .tv-notes {
          margin: 0; font-size: 13px; line-height: 1.6; color: var(--c-text);
          padding: 10px 14px; background: var(--c-paper); border-left: 3px solid var(--c-gold);
        }
        .tv-actions {
          padding-top: 16px; display: flex; justify-content: flex-end;
          border-top: 1px solid var(--c-line-soft); margin-top: 16px;
        }
        .tv-action-btn {
          background: transparent; border: 1px solid var(--c-line);
          padding: 6px 14px; font-size: 12px; cursor: pointer;
          font-family: var(--f-sans); color: var(--c-text-muted);
          transition: all 120ms;
        }
        .tv-action-btn.danger { border-color: var(--c-warn); color: var(--c-warn); }
        .tv-action-btn.danger:hover { background: var(--c-warn); color: #fff; }

        /* Add traveler accordion */
        .tv-add-accordion {
          background: #fff; border: 1px dashed var(--c-line);
        }
        .tv-add-summary {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 20px; cursor: pointer; list-style: none;
          font-family: var(--f-serif); font-size: 17px; color: var(--c-ink);
          transition: all 120ms;
        }
        .tv-add-summary::-webkit-details-marker { display: none; }
        .tv-add-summary::marker { display: none; }
        .tv-add-summary:hover { background: var(--c-cream); }
        .tv-add-icon {
          width: 32px; height: 32px; display: grid; place-items: center;
          border: 1px solid var(--c-gold); color: var(--c-gold);
          font-size: 18px; font-family: var(--f-sans);
        }
        .tv-add-accordion[open] .tv-add-summary { border-bottom: 1px solid var(--c-line-soft); color: var(--c-gold); }
        .tv-add-body { padding: 20px; }
        .add-tv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

        @media (max-width: 1024px) {
          .tv-body-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 900px) {
          .add-tv-grid { grid-template-columns: 1fr 1fr; }
          .tv-sum-checks { display: none; }
        }
        @media (max-width: 640px) {
          .tv-body-grid { grid-template-columns: 1fr; }
          .add-tv-grid { grid-template-columns: 1fr; }
          .tv-sum-badges { display: none; }
          .tv-summary { padding: 12px 14px; gap: 10px; }
          .tv-sum-avatar { width: 36px; height: 36px; font-size: 14px; }
          .tv-sum-name { font-size: 15px; }
          .tv-card-body { padding: 0 14px 14px; }
          .tv-add-body { padding: 16px; }
        }
      `}</style>
    </div>
  );
}
