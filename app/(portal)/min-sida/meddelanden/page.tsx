import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MeddelandenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const messages = await prisma.message.findMany({
    // isInternal: false — interna anteckningar från kontoret får ALDRIG visas för kund.
    where: { userId: session.user.id, isInternal: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="container narrow">
      <span className="eyebrow gold">Meddelanden</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 24 }}>Meddelanden</h1>

      {messages.length === 0 ? (
        <div className="empty-card">
          <p>Inga meddelanden ännu. När kontoret kontaktar dig om en bokning visas det här.</p>
        </div>
      ) : (
        <ol className="msgs">
          {messages.map((m) => (
            <li key={m.id} className={m.direction}>
              <header>
                <span className="dir">{m.direction === "OUTBOUND" ? "Från kontoret" : "Du skrev"}</span>
                <span className="dim">{new Date(m.createdAt).toLocaleString("sv-SE")}</span>
              </header>
              {m.subject && <strong className="serif">{m.subject}</strong>}
              <p>{m.body}</p>
            </li>
          ))}
        </ol>
      )}

      <style>{`
        .empty-card { padding: 48px; background: #fff; border: 1px dashed var(--c-line); }
        .msgs { list-style: none; padding: 0; display: grid; gap: 12px; }
        .msgs li { padding: 18px 22px; background: #fff; border: 1px solid var(--c-line-soft); border-left: 3px solid var(--c-line); }
        .msgs li.OUTBOUND { border-left-color: var(--c-gold); }
        .msgs li.INBOUND { border-left-color: var(--c-green-soft); }
        .msgs header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
        .msgs .dir { font-weight: 700; color: var(--c-text-muted); }
        .msgs strong { display: block; font-size: 16px; color: var(--c-ink); margin-bottom: 6px; }
        .msgs p { margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}
