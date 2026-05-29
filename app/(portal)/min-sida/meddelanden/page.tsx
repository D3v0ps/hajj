import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { sendCustomerMessage } from "@/app/actions/portal-messages";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ bookingId?: string; sent?: string; error?: string }>;

// "general" = tråden utan bokning ("Allmän fråga"). Vi använder ett strängvärde
// i URL:en så vi kan skilja på "ingen tråd vald" (undefined) och "Allmän".
const GENERAL_KEY = "general";

export default async function MeddelandenPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  const userId = session.user.id;

  const { bookingId: rawBookingId, sent, error } = await searchParams;

  // Hämta allt på en gång: kundens bokningar (för trådlistan) + alla synliga meddelanden
  // (interna anteckningar filtreras alltid bort — får aldrig läcka till kund).
  const [bookings, messages] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      select: {
        id: true,
        reference: true,
        package: { select: { title: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.message.findMany({
      where: { userId, isInternal: false },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Validera ?bookingId mot kundens bokningar (eller "general"). Om ogiltigt → ingen vald tråd.
  const validBookingIds = new Set(bookings.map((b) => b.id));
  let selected: string | null = null; // null = "Allmän" tråd, string = booking-id
  let hasSelection = false;
  if (rawBookingId === GENERAL_KEY) {
    selected = null;
    hasSelection = true;
  } else if (rawBookingId && validBookingIds.has(rawBookingId)) {
    selected = rawBookingId;
    hasSelection = true;
  }

  // Markera valda trådens olästa OUTBOUND-meddelanden som lästa (server-side effekt
  // vid sidladdning — uppfyller readAt-spårningskravet utan extra klick/JS).
  if (hasSelection) {
    await prisma.message.updateMany({
      where: {
        userId,
        bookingId: selected, // null → matchar "Allmän"-tråden
        direction: "OUTBOUND",
        isInternal: false,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  // Gruppera meddelanden per tråd för listvyn (även orphaned booking-ids hanteras
  // genom att fallback till "Allmän" om något skulle smyga in).
  const byThread = new Map<string, typeof messages>();
  byThread.set(GENERAL_KEY, []);
  for (const b of bookings) byThread.set(b.id, []);
  for (const m of messages) {
    const key = m.bookingId && byThread.has(m.bookingId) ? m.bookingId : GENERAL_KEY;
    byThread.get(key)!.push(m);
  }

  // Trådmeta: senaste meddelandedatum + oläst-räkning (per tråd).
  // Oläst räknas EFTER vår updateMany ovan så vald tråd hamnar på 0.
  // Vi räknar i den lokala arrayen för att slippa en extra DB-tur.
  type ThreadMeta = {
    key: string; // bookingId eller GENERAL_KEY
    title: string;
    subtitle: string | null;
    href: string;
    isGeneral: boolean;
    lastAt: number; // ms, 0 om tom
    unread: number;
    hasMessages: boolean;
  };
  const threads: ThreadMeta[] = [];

  threads.push({
    key: GENERAL_KEY,
    title: "Allmän fråga",
    subtitle: "Frågor utan koppling till bokning",
    href: `/min-sida/meddelanden?bookingId=${GENERAL_KEY}`,
    isGeneral: true,
    lastAt: byThread.get(GENERAL_KEY)!.reduce((max, m) => Math.max(max, new Date(m.createdAt).getTime()), 0),
    unread: selectedKeyUnread(byThread.get(GENERAL_KEY)!, hasSelection && selected === null),
    hasMessages: byThread.get(GENERAL_KEY)!.length > 0,
  });

  for (const b of bookings) {
    const list = byThread.get(b.id)!;
    threads.push({
      key: b.id,
      title: b.package.title,
      subtitle: `Ref ${b.reference.slice(0, 12).toUpperCase()}`,
      href: `/min-sida/meddelanden?bookingId=${b.id}`,
      isGeneral: false,
      lastAt: list.reduce((max, m) => Math.max(max, new Date(m.createdAt).getTime()), 0),
      unread: selectedKeyUnread(list, hasSelection && selected === b.id),
      hasMessages: list.length > 0,
    });
  }

  // Sortera: trådar med olästa först → trådar med meddelanden efter senaste datum →
  // tomma trådar sist (alfabetiskt).
  threads.sort((a, b) => {
    if (a.unread !== b.unread) return b.unread - a.unread;
    if (a.lastAt !== b.lastAt) return b.lastAt - a.lastAt;
    return a.title.localeCompare(b.title, "sv");
  });

  // Vald tråd-data för högerpanelen.
  const selectedKey = hasSelection ? (selected ?? GENERAL_KEY) : null;
  const selectedThread = selectedKey ? threads.find((t) => t.key === selectedKey) : null;
  const selectedMessages = selectedKey ? byThread.get(selectedKey) ?? [] : [];

  // Räkna totalt antal trådar med meddelanden (för tom-state-text).
  const threadsWithMsgs = threads.filter((t) => t.hasMessages).length;

  const fmtTime = (d: Date | number) => {
    const date = new Date(d);
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    return sameDay
      ? date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="container">
      <span className="eyebrow gold">Meddelanden</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 8 }}>Meddelanden</h1>
      <p className="dim" style={{ maxWidth: 640, marginBottom: 24 }}>
        Konversation med kontoret per bokning. Skriv nytt under &quot;Allmän fråga&quot; om det inte gäller en specifik resa.
      </p>

      {error && (
        <div className="msg-banner err" role="alert">{error}</div>
      )}
      {sent && !error && (
        <div className="msg-banner ok" role="status">Meddelandet skickades till kontoret.</div>
      )}

      <div className="msg-layout">
        {/* Trådlista vänster */}
        <aside className="msg-threads">
          <div className="msg-threads-head">
            <strong>Trådar</strong>
            <span className="dim" style={{ fontSize: 11 }}>{threadsWithMsgs} aktiva</span>
          </div>
          <ul className="msg-thread-list">
            {threads.map((t) => {
              const isActive = t.key === selectedKey;
              return (
                <li key={t.key}>
                  <Link
                    href={t.href}
                    className={`msg-thread ${isActive ? "active" : ""} ${t.isGeneral ? "general" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="msg-thread-main">
                      <div className="msg-thread-title">{t.title}</div>
                      {t.subtitle && <div className="msg-thread-sub">{t.subtitle}</div>}
                    </div>
                    <div className="msg-thread-side">
                      {t.unread > 0 && (
                        <span className="msg-unread-badge" aria-label={`${t.unread} olästa meddelanden`}>
                          {t.unread}
                        </span>
                      )}
                      {t.lastAt > 0 && (
                        <span className="msg-thread-time dim">{fmtTime(t.lastAt)}</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Vald tråd höger */}
        <section className="msg-pane">
          {!selectedThread ? (
            <div className="msg-empty">
              <span className="msg-empty-icon" aria-hidden="true">✉</span>
              <p style={{ fontSize: 16, margin: "12px 0 4px" }}>Välj en tråd till vänster för att läsa eller svara.</p>
              <p className="dim" style={{ fontSize: 13 }}>
                Eller starta en allmän fråga om det inte gäller en specifik bokning.
              </p>
            </div>
          ) : (
            <>
              <header className="msg-pane-head">
                <div>
                  <div className="msg-pane-title">{selectedThread.title}</div>
                  {selectedThread.subtitle && (
                    <div className="msg-pane-sub dim">{selectedThread.subtitle}</div>
                  )}
                </div>
                <span className="dim" style={{ fontSize: 12 }}>
                  {selectedMessages.length} {selectedMessages.length === 1 ? "meddelande" : "meddelanden"}
                </span>
              </header>

              <div className="msg-thread-feed">
                {selectedMessages.length === 0 ? (
                  <div className="msg-feed-empty">
                    <p className="dim" style={{ fontSize: 14, margin: 0 }}>
                      Ingen konversation ännu. Skriv ditt första meddelande nedan.
                    </p>
                  </div>
                ) : (
                  selectedMessages.map((m) => (
                    <div key={m.id} className={`msg-bubble ${m.direction === "OUTBOUND" ? "from-office" : "from-me"}`}>
                      <div className="msg-bubble-meta">
                        <span className="msg-bubble-author">
                          {m.direction === "OUTBOUND" ? (m.authorName ?? "Kontoret") : "Du"}
                        </span>
                        <span className="msg-bubble-time">{fmtTime(m.createdAt)}</span>
                      </div>
                      {m.subject && <div className="msg-bubble-subject">{m.subject}</div>}
                      <p className="msg-bubble-body">{m.body}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Skrivfält */}
              <form action={sendCustomerMessage} className="msg-composer">
                <input
                  type="hidden"
                  name="bookingId"
                  value={selectedThread.isGeneral ? "" : selectedThread.key}
                />
                <input
                  name="subject"
                  placeholder="Ämne (valfritt)"
                  maxLength={200}
                  className="msg-input-subject"
                  aria-label="Ämne"
                />
                <div className="msg-input-row">
                  <textarea
                    name="body"
                    rows={3}
                    required
                    maxLength={4000}
                    placeholder="Skriv ett meddelande till kontoret..."
                    className="msg-textarea"
                    aria-label="Meddelande"
                  />
                  <button type="submit" className="msg-send-btn" aria-label="Skicka meddelande">
                    Skicka
                  </button>
                </div>
                <p className="dim" style={{ fontSize: 11, margin: "6px 0 0" }}>
                  Kontoret svarar normalt inom 1–2 arbetsdagar. Vid akut: ring oss.
                </p>
              </form>
            </>
          )}
        </section>
      </div>

      <style>{`
        .msg-banner {
          padding: 10px 14px; margin-bottom: 16px; font-size: 13px; border: 1px solid;
        }
        .msg-banner.err { background: #fbeae8; border-color: #e7c3bf; color: #8a1c13; }
        .msg-banner.ok { background: #e9f5ee; border-color: #bfe0cb; color: #1a5132; }

        .msg-layout {
          display: grid; grid-template-columns: 320px 1fr; gap: 18px;
          align-items: start;
        }

        /* Trådlista */
        .msg-threads {
          background: #fff; border: 1px solid var(--c-line-soft);
          display: flex; flex-direction: column; min-height: 0;
          max-height: 700px;
        }
        .msg-threads-head {
          padding: 14px 16px; border-bottom: 1px solid var(--c-line-soft);
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
        }
        .msg-threads-head strong {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--c-text-muted); font-weight: 700;
        }
        .msg-thread-list {
          list-style: none; padding: 0; margin: 0;
          overflow-y: auto; flex: 1;
        }
        .msg-thread {
          display: flex; gap: 10px; padding: 14px 16px;
          border-bottom: 1px solid var(--c-line-soft);
          align-items: flex-start; transition: background 120ms;
        }
        .msg-thread:hover { background: var(--c-cream); }
        .msg-thread.active {
          background: var(--c-cream); border-left: 3px solid var(--c-gold);
          padding-left: 13px;
        }
        .msg-thread.general .msg-thread-title { font-style: italic; color: var(--c-text-muted); }
        .msg-thread.general.active .msg-thread-title { color: var(--c-ink); font-style: normal; }
        .msg-thread-main { flex: 1; min-width: 0; }
        .msg-thread-title {
          font-family: var(--f-serif); font-size: 15px; color: var(--c-ink);
          font-weight: 460; line-height: 1.3;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .msg-thread-sub {
          font-size: 11px; color: var(--c-text-muted); margin-top: 3px;
          font-family: var(--f-mono); letter-spacing: 0.02em;
        }
        .msg-thread-side {
          display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
          flex-shrink: 0;
        }
        .msg-thread-time { font-size: 10px; font-family: var(--f-mono); }
        .msg-unread-badge {
          background: var(--c-gold); color: #fff;
          font-size: 10px; font-weight: 700; padding: 2px 7px;
          border-radius: 10px; min-width: 18px; text-align: center;
          font-family: var(--f-mono); letter-spacing: 0.02em;
        }

        /* Höger panel */
        .msg-pane {
          background: #fff; border: 1px solid var(--c-line-soft);
          display: flex; flex-direction: column;
          min-height: 480px; max-height: 700px;
        }
        .msg-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px 24px; text-align: center;
          color: var(--c-text-muted);
        }
        .msg-empty-icon {
          font-size: 36px; color: var(--c-line);
          margin-bottom: 8px;
        }

        .msg-pane-head {
          padding: 16px 20px; border-bottom: 1px solid var(--c-line-soft);
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px; flex-wrap: wrap; flex-shrink: 0;
        }
        .msg-pane-title {
          font-family: var(--f-serif); font-size: 18px; color: var(--c-ink);
          font-weight: 460; line-height: 1.3;
        }
        .msg-pane-sub {
          font-size: 11px; font-family: var(--f-mono); margin-top: 3px;
          letter-spacing: 0.02em;
        }

        .msg-thread-feed {
          flex: 1; overflow-y: auto; padding: 20px;
          display: flex; flex-direction: column; gap: 14px;
          background: linear-gradient(180deg, var(--c-paper) 0%, #fff 100%);
        }
        .msg-feed-empty {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }

        .msg-bubble {
          max-width: 78%; padding: 12px 16px;
          border: 1px solid; line-height: 1.5;
        }
        .msg-bubble.from-office {
          align-self: flex-start;
          background: #fff; border-color: var(--c-line-soft);
          border-left: 3px solid var(--c-gold);
        }
        .msg-bubble.from-me {
          align-self: flex-end;
          background: var(--c-ink); color: #fff; border-color: var(--c-ink);
        }
        .msg-bubble-meta {
          display: flex; justify-content: space-between; gap: 12px;
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          margin-bottom: 6px;
        }
        .msg-bubble.from-office .msg-bubble-author { color: var(--c-gold); font-weight: 700; }
        .msg-bubble.from-office .msg-bubble-time { color: var(--c-text-faint); font-family: var(--f-mono); }
        .msg-bubble.from-me .msg-bubble-author { color: var(--c-gold-soft); font-weight: 700; }
        .msg-bubble.from-me .msg-bubble-time { color: #8B9AB8; font-family: var(--f-mono); }
        .msg-bubble-subject {
          font-family: var(--f-serif); font-size: 15px; font-weight: 500;
          margin-bottom: 4px;
        }
        .msg-bubble.from-me .msg-bubble-subject { color: #fff; }
        .msg-bubble-body {
          margin: 0; font-size: 14px;
          white-space: pre-wrap; word-wrap: break-word;
        }

        /* Composer */
        .msg-composer {
          padding: 14px 16px; border-top: 1px solid var(--c-line-soft);
          background: #fff; flex-shrink: 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .msg-input-subject {
          padding: 8px 12px; border: 1px solid var(--c-line-soft);
          font-size: 12px; font-family: var(--f-sans); background: var(--c-paper);
        }
        .msg-input-subject:focus { outline: none; border-color: var(--c-ink); }
        .msg-input-row { display: flex; gap: 8px; align-items: stretch; }
        .msg-textarea {
          flex: 1; padding: 10px 14px; border: 1px solid var(--c-line);
          font-size: 14px; font-family: var(--f-sans); resize: vertical;
          min-height: 64px; background: #fff;
        }
        .msg-textarea:focus { outline: none; border-color: var(--c-ink); }
        .msg-send-btn {
          background: var(--c-ink); color: #fff; border: 0;
          padding: 0 22px; font-size: 13px; font-weight: 700;
          letter-spacing: 0.04em; cursor: pointer;
          font-family: var(--f-sans); transition: background 120ms;
          flex-shrink: 0;
        }
        .msg-send-btn:hover { background: var(--c-gold); }

        @media (max-width: 900px) {
          .msg-layout { grid-template-columns: 1fr; }
          .msg-threads { max-height: 320px; }
          .msg-pane { max-height: none; min-height: 420px; }
          .msg-bubble { max-width: 90%; }
        }
        @media (max-width: 480px) {
          .msg-pane-head { padding: 14px 16px; }
          .msg-thread-feed { padding: 14px; }
          .msg-composer { padding: 12px; }
          .msg-bubble { padding: 10px 13px; }
        }
      `}</style>
    </div>
  );
}

/**
 * Räkna olästa OUTBOUND-meddelanden i tråden. Om tråden är vald just nu har vi
 * redan stämplat dem som lästa (men in-memory-arrayen är inte uppdaterad), så
 * vi returnerar 0 för att inte visa en stale badge i listan.
 */
function selectedKeyUnread<M extends { direction: string; readAt: Date | null }>(
  list: M[],
  isActive: boolean,
): number {
  if (isActive) return 0;
  return list.filter((m) => m.direction === "OUTBOUND" && m.readAt == null).length;
}
