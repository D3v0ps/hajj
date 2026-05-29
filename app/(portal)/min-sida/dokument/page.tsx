import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { uploadCustomerDocument, deleteCustomerDocument } from "@/app/actions/portal-documents";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; ok?: string }>;

const DOC_TYPE_LABELS: Record<string, string> = {
  PASSPORT: "Pass",
  PASSPORT_PHOTO: "Passfoto",
  RESIDENCE_PERMIT: "Uppehållstillstånd",
  VACCINATION: "Vaccinationsintyg",
  OTHER: "Övrigt dokument",
};

const DOC_STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Väntar granskning", cls: "p-pill-pending" },
  APPROVED: { label: "Godkänd", cls: "p-pill-approved" },
  REJECTED: { label: "Avvisad", cls: "p-pill-rejected" },
  NEEDS_INFO: { label: "Komplettering krävs", cls: "p-pill-needs" },
};

const fmtDate = (d: Date) => new Date(d).toLocaleDateString("sv-SE");

export default async function DokumentPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const { error, ok } = await searchParams;

  // Hämta alla resenärer ägda av kunden (över ALLA bokningar) + deras dokument.
  // En kund kan ha samma person som resenär på flera bokningar — vi grupperar
  // ändå per Traveler-rad för att hålla flödet enkelt och tydligt.
  const travelers = await prisma.traveler.findMany({
    where: { userId: session.user.id },
    include: {
      booking: { include: { package: { select: { title: true } } } },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Frilösa dokument (utan koppling till befintlig traveler — t.ex. om resenären
  // togs bort efter uppladdning). Visa dem i en egen sektion så de inte försvinner.
  const orphanDocs = await prisma.document.findMany({
    where: {
      userId: session.user.id,
      OR: [{ travelerId: null }, { traveler: { is: null } }],
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="container narrow">
      <span className="eyebrow gold">Dokument</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 16 }}>Dina dokument</h1>
      <p className="dim" style={{ maxWidth: 640, marginBottom: 16 }}>
        Ladda upp pass, passfoto och eventuellt uppehållstillstånd för var och en av
        dina resenärer. Kontoret granskar varje fil och meddelar om något behöver
        kompletteras.
      </p>
      <p className="dim" style={{ maxWidth: 640, fontSize: 13, marginBottom: 32 }}>
        Tillåtna filtyper: PDF, JPG, PNG, WEBP · max 8 MB per fil. Du kan ta bort en
        fil så länge den väntar på granskning.
      </p>

      {error && (
        <div className="p-banner p-banner-err" role="alert">{error}</div>
      )}
      {ok && !error && (
        <div className="p-banner p-banner-ok" role="status">Sparat.</div>
      )}

      {travelers.length === 0 ? (
        <div className="empty-card">
          <p>Du har inga resenärer registrerade än.</p>
          <p className="dim" style={{ fontSize: 13, marginTop: 12 }}>
            Starta en bokning eller fyll i resenärsuppgifter via dina bokningar. Då
            kan du ladda upp dokument per resenär här.
          </p>
        </div>
      ) : (
        <div className="p-trv-list">
          {travelers.map((t) => {
            const bookingLabel = t.booking
              ? `${t.booking.package.title} · ref ${t.booking.reference.slice(0, 8).toUpperCase()}`
              : "Ingen bokning kopplad";
            return (
              <section key={t.id} className="p-trv">
                <header className="p-trv-head">
                  <div>
                    <h2 className="p-trv-name">{t.firstName} {t.lastName}</h2>
                    <p className="dim p-trv-sub">{bookingLabel}</p>
                  </div>
                  <span className="p-doc-count">{t.documents.length} dokument</span>
                </header>

                {t.documents.length > 0 && (
                  <ul className="p-doc-list">
                    {t.documents.map((d) => {
                      const meta = DOC_STATUS_META[d.status] ?? DOC_STATUS_META.PENDING;
                      const canDelete = d.status === "PENDING";
                      return (
                        <li key={d.id} className="p-doc-row">
                          <div className="p-doc-main">
                            <span className="p-doc-type">{DOC_TYPE_LABELS[d.type] ?? d.type}</span>
                            <a
                              href={`/api/documents/portal/${d.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-doc-file"
                            >
                              {d.filename}
                            </a>
                            <span className="dim p-doc-meta">
                              {Math.max(1, Math.round(d.sizeBytes / 1024))} kB · uppladdad {fmtDate(d.uploadedAt)}
                            </span>
                            {d.status === "NEEDS_INFO" && d.reviewNote && (
                              <p className="p-doc-note">Kommentar från kontoret: {d.reviewNote}</p>
                            )}
                            {d.status === "REJECTED" && d.reviewNote && (
                              <p className="p-doc-note">Skäl: {d.reviewNote}</p>
                            )}
                          </div>
                          <div className="p-doc-side">
                            <span className={`p-pill ${meta.cls}`}>{meta.label}</span>
                            {canDelete && (
                              <form action={deleteCustomerDocument}>
                                <input type="hidden" name="documentId" value={d.id} />
                                <button
                                  type="submit"
                                  className="p-doc-del"
                                  title="Ta bort dokument"
                                  aria-label={`Ta bort ${d.filename}`}
                                >
                                  Ta bort
                                </button>
                              </form>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <form
                  action={uploadCustomerDocument}
                  className="p-upload"
                  encType="multipart/form-data"
                >
                  <input type="hidden" name="travelerId" value={t.id} />
                  <label className="p-upload-field">
                    <span className="p-upload-label">Dokumenttyp</span>
                    <select name="type" defaultValue="PASSPORT" required>
                      <option value="PASSPORT">Pass</option>
                      <option value="PASSPORT_PHOTO">Passfoto</option>
                      <option value="RESIDENCE_PERMIT">Uppehållstillstånd</option>
                    </select>
                  </label>
                  <label className="p-upload-field">
                    <span className="p-upload-label">Välj fil</span>
                    <input
                      type="file"
                      name="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                    />
                  </label>
                  <button type="submit" className="btn btn-gold p-upload-btn">
                    Ladda upp
                  </button>
                </form>
              </section>
            );
          })}
        </div>
      )}

      {orphanDocs.length > 0 && (
        <section className="p-trv" style={{ marginTop: 28 }}>
          <header className="p-trv-head">
            <div>
              <h2 className="p-trv-name">Övriga dokument</h2>
              <p className="dim p-trv-sub">Filer utan kopplad resenär.</p>
            </div>
            <span className="p-doc-count">{orphanDocs.length} dokument</span>
          </header>
          <ul className="p-doc-list">
            {orphanDocs.map((d) => {
              const meta = DOC_STATUS_META[d.status] ?? DOC_STATUS_META.PENDING;
              const canDelete = d.status === "PENDING";
              return (
                <li key={d.id} className="p-doc-row">
                  <div className="p-doc-main">
                    <span className="p-doc-type">{DOC_TYPE_LABELS[d.type] ?? d.type}</span>
                    <a
                      href={`/api/documents/portal/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-doc-file"
                    >
                      {d.filename}
                    </a>
                    <span className="dim p-doc-meta">
                      {Math.max(1, Math.round(d.sizeBytes / 1024))} kB · uppladdad {fmtDate(d.uploadedAt)}
                    </span>
                    {(d.status === "NEEDS_INFO" || d.status === "REJECTED") && d.reviewNote && (
                      <p className="p-doc-note">Kommentar från kontoret: {d.reviewNote}</p>
                    )}
                  </div>
                  <div className="p-doc-side">
                    <span className={`p-pill ${meta.cls}`}>{meta.label}</span>
                    {canDelete && (
                      <form action={deleteCustomerDocument}>
                        <input type="hidden" name="documentId" value={d.id} />
                        <button
                          type="submit"
                          className="p-doc-del"
                          aria-label={`Ta bort ${d.filename}`}
                        >
                          Ta bort
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <style>{`
        .empty-card { padding: 48px; background: #fff; border: 1px dashed var(--c-line); }
        @media (max-width: 640px) { .empty-card { padding: 32px 20px; } }

        .p-banner {
          padding: 12px 16px; font-size: 14px; margin-bottom: 24px;
          border: 1px solid var(--c-line);
        }
        .p-banner-err { background: #FBE9E2; border-color: var(--c-warn); color: var(--c-warn); }
        .p-banner-ok { background: #E6F1EA; border-color: var(--c-green-soft); color: var(--c-green); }

        .p-trv-list { display: grid; gap: 20px; }
        .p-trv {
          background: #fff; border: 1px solid var(--c-line-soft);
          padding: 24px; display: grid; gap: 18px;
        }
        .p-trv-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--c-line-soft);
        }
        .p-trv-name { font-family: var(--f-serif); font-size: 22px; color: var(--c-ink); margin: 0; }
        .p-trv-sub { font-size: 13px; margin: 4px 0 0; }
        .p-doc-count {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--c-text-muted); white-space: nowrap;
        }

        .p-doc-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
        .p-doc-row {
          display: flex; gap: 16px; align-items: flex-start; justify-content: space-between;
          padding: 14px 16px; background: var(--c-paper); border: 1px solid var(--c-line-soft);
        }
        .p-doc-main { display: grid; gap: 4px; min-width: 0; flex: 1; }
        .p-doc-type {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          font-weight: 700; color: var(--c-text-muted);
        }
        .p-doc-file {
          font-family: var(--f-serif); font-size: 16px; color: var(--c-ink);
          text-decoration: underline; word-break: break-all;
        }
        .p-doc-file:hover { color: var(--c-gold); }
        .p-doc-meta { font-size: 12px; }
        .p-doc-note {
          margin: 6px 0 0; padding: 8px 10px; background: #fff;
          border-left: 3px solid var(--c-gold); font-size: 13px; color: var(--c-ink);
        }
        .p-doc-side { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
        .p-doc-del {
          background: transparent; border: 1px solid var(--c-line);
          padding: 6px 10px; font-size: 12px; color: var(--c-text-muted); cursor: pointer;
        }
        .p-doc-del:hover { color: var(--c-warn); border-color: var(--c-warn); }

        .p-pill {
          display: inline-flex; align-items: center; padding: 4px 10px;
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          font-weight: 700; border-radius: 2px; white-space: nowrap;
        }
        .p-pill-pending { background: #FFF7E6; color: var(--c-gold); }
        .p-pill-approved { background: #E6F1EA; color: var(--c-green); }
        .p-pill-rejected { background: #FBE9E2; color: var(--c-warn); }
        .p-pill-needs { background: #FFEEDD; color: #B45A1E; }

        .p-upload {
          display: grid; grid-template-columns: minmax(180px, 1fr) minmax(220px, 1fr) auto;
          gap: 12px; align-items: end; padding: 16px; background: var(--c-cream);
          border: 1px solid var(--c-line-soft);
        }
        .p-upload-field { display: grid; gap: 6px; min-width: 0; }
        .p-upload-label {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          font-weight: 700; color: var(--c-text-muted);
        }
        .p-upload select, .p-upload input[type="file"] {
          padding: 8px 10px; font-size: 14px; border: 1px solid var(--c-line);
          background: #fff; min-height: 38px;
        }
        .p-upload-btn { padding: 10px 18px; font-size: 13px; }

        @media (max-width: 720px) {
          .p-trv { padding: 18px; }
          .p-trv-head { flex-direction: column; gap: 8px; }
          .p-doc-row { flex-direction: column; align-items: stretch; }
          .p-doc-side { flex-direction: row; align-items: center; justify-content: space-between; }
          .p-upload { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
