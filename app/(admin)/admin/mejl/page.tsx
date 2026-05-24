import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  BOOKING_CONFIRM: "Bokningsbekräftelse",
  PAYMENT_REQUEST: "Betalningsuppmaning",
  PAYMENT_REMINDER: "Betalningspåminnelse",
  TRIP_INFO: "Reseinformation",
  PRE_DEPARTURE: "Före avresa",
  VISA_STATUS: "Visumstatus",
  GENERAL: "Allmänt",
};

async function createTemplate(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const name = String(formData.get("name") ?? "");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  const category = String(formData.get("category") ?? "GENERAL") as "BOOKING_CONFIRM" | "PAYMENT_REQUEST" | "PAYMENT_REMINDER" | "TRIP_INFO" | "PRE_DEPARTURE" | "VISA_STATUS" | "GENERAL";

  await prisma.emailTemplate.create({
    data: { slug, name, subject, body, category, variables: [] },
  });
  revalidatePath("/admin/mejl");
}

async function deleteTemplate(id: string) {
  "use server";
  await prisma.emailTemplate.delete({ where: { id } });
  revalidatePath("/admin/mejl");
}

export default async function MejlPage() {
  const [templates, recentSends] = await Promise.all([
    prisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.emailSend.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { template: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / mejl</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Mejlmallar & utskick
          </h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            Skapa mallar, skicka till enstaka resenärer eller hela resegrupper.
          </p>
        </div>
        <Link href="/admin/mejl/skicka" className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 13 }}>
          Nytt utskick →
        </Link>
      </div>

      <div className="adm-tabs" style={{ marginBottom: 0 }}>
        <span className="adm-tab active">Mallar <span className="count">{templates.length}</span></span>
        <span className="adm-tab">Utskickslogg <span className="count">{recentSends.length}</span></span>
      </div>

      {/* Mall-lista */}
      <div className="adm-card" style={{ marginTop: 0, borderTop: 0 }}>
        <div className="b dense">
          {templates.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }} className="dim">
              Inga mallar skapade. Lägg till din första nedan.
            </div>
          ) : (
            <div className="table-wrap">
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th scope="col">Namn</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Ämne</th>
                  <th scope="col">Uppdaterad</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td><strong style={{ fontFamily: "var(--f-serif)" }}>{t.name}</strong></td>
                    <td><span className="adm-pill outline">{CATEGORY_LABELS[t.category] ?? t.category}</span></td>
                    <td className="dim">{t.subject}</td>
                    <td className="dim" style={{ fontSize: 11, fontFamily: "var(--f-mono)" }}>
                      {new Date(t.updatedAt).toLocaleDateString("sv-SE")}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link href={`/admin/mejl/${t.id}`} className="btn-link" style={{ fontSize: 11 }}>Redigera</Link>
                        <form action={deleteTemplate.bind(null, t.id)}>
                          <button type="submit" className="btn-link" style={{ fontSize: 11, color: "var(--c-warn)" }}>Ta bort</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* Skapa ny mall */}
      <div className="adm-card" style={{ marginTop: 20 }}>
        <div className="h">Skapa ny mall</div>
        <div className="b">
          <form action={createTemplate} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field">
                <label>Mallnamn</label>
                <input name="name" placeholder="T.ex. Bokningsbekräftelse" required />
              </div>
              <div className="field">
                <label>Kategori</label>
                <select name="category" defaultValue="GENERAL">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Ämnesrad</label>
              <input name="subject" placeholder="T.ex. Bokningsbekräftelse — {{paket}}" required />
              <span className="hint">Använd {"{{namn}}"}, {"{{paket}}"}, {"{{ref}}"}, {"{{belopp}}"} för dynamiska värden.</span>
            </div>
            <div className="field">
              <label>Mejltext</label>
              <textarea name="body" rows={10} placeholder={"Hej {{namn}},\n\nTack för din bokning av {{paket}}.\n\nDin bokningsreferens är {{ref}}.\n\nVänliga hälsningar,\nHadj Omra Resor"} required />
              <span className="hint">
                Variabler: {"{{namn}}"} = resenärens namn, {"{{paket}}"} = paketnamn,
                {"{{ref}}"} = bokningsreferens, {"{{belopp}}"} = totalbelopp,
                {"{{datum}}"} = avresedatum, {"{{slutbetalning_datum}}"} = slutbetalningsdatum
              </span>
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifySelf: "start" }}>
              Spara mall
            </button>
          </form>
        </div>
      </div>

      {/* Utskickslogg */}
      {recentSends.length > 0 && (
        <div className="adm-card" style={{ marginTop: 20 }}>
          <div className="h">
            Senaste utskick
            <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>{recentSends.length} st</span>
          </div>
          <div className="b dense">
            <div className="table-wrap">
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th scope="col">Datum</th>
                  <th scope="col">Mottagare</th>
                  <th scope="col">Ämne</th>
                  <th scope="col">Mall</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSends.map((s) => (
                  <tr key={s.id}>
                    <td className="tnum" style={{ fontFamily: "var(--f-mono)" }}>
                      {new Date(s.createdAt).toLocaleString("sv-SE")}
                    </td>
                    <td>{s.recipientName ? `${s.recipientName} <${s.recipientEmail}>` : s.recipientEmail}</td>
                    <td className="dim">{s.subject}</td>
                    <td>{s.template?.name ?? "—"}</td>
                    <td>
                      <span className={`adm-pill ${s.status === "SENT" ? "ok" : s.status === "QUEUED" ? "gold" : s.status === "FAILED" ? "warn" : "outline"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
