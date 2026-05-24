import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SITE } from "@/lib/config";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ packageId?: string; bookingId?: string }>;

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

async function sendBulk(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const templateId = String(formData.get("templateId") ?? "");
  const packageId = String(formData.get("packageId") ?? "");
  const customSubject = String(formData.get("customSubject") ?? "");
  const customBody = String(formData.get("customBody") ?? "");

  const template = templateId ? await prisma.emailTemplate.findUnique({ where: { id: templateId } }) : null;
  const subject = template?.subject ?? customSubject;
  const body = template?.body ?? customBody;

  if (!subject || !body) redirect("/admin/mejl/skicka?error=Ämne+och+text+krävs");

  const bookings = await prisma.booking.findMany({
    where: packageId ? { packageId } : {},
    include: {
      user: { select: { email: true, name: true } },
      package: { select: { title: true, startDate: true } },
      travelers: { select: { firstName: true, lastName: true } },
    },
  });

  let sent = 0;
  for (const b of bookings) {
    if (!b.user.email || b.user.email === "import@system.local") continue;

    const vars: Record<string, string> = {
      namn: b.user.name ?? b.travelers[0]?.firstName ?? "Resenär",
      paket: b.package.title,
      ref: b.reference.slice(0, 12).toUpperCase(),
      belopp: b.totalAmount.toLocaleString("sv-SE"),
      datum: b.package.startDate ? new Date(b.package.startDate).toLocaleDateString("sv-SE") : "TBD",
      slutbetalning_datum: b.package.startDate
        ? new Date(new Date(b.package.startDate).getTime() - 30 * 86400000).toLocaleDateString("sv-SE")
        : "30 dagar före avresa",
      email: b.user.email,
      telefon: SITE.phoneDisplay,
    };

    const renderedSubject = renderTemplate(subject, vars);
    const renderedBody = renderTemplate(body, vars);

    await prisma.emailSend.create({
      data: {
        templateId: template?.id ?? null,
        recipientEmail: b.user.email,
        recipientName: vars.namn,
        subject: renderedSubject,
        body: renderedBody,
        status: "QUEUED",
        bookingId: b.id,
        packageId: packageId || null,
        sentById: session.user.id,
      },
    });
    sent++;
  }

  redirect(`/admin/mejl?sent=${sent}`);
}

export default async function SkickaMejlPage({ searchParams }: { searchParams: SearchParams }) {
  const { packageId, bookingId } = await searchParams;

  const [templates, packages] = await Promise.all([
    prisma.emailTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.package.findMany({
      orderBy: { startDate: "desc" },
      include: { _count: { select: { bookings: true } } },
    }),
  ]);

  const preselectedPkg = packageId ? packages.find((p) => p.id === packageId) : null;

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / mejl / skicka</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Nytt utskick
          </h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            Välj mall + målgrupp. Mejl köas och kan hämtas av en e-posttjänst (Resend, SMTP) i nästa steg.
          </p>
        </div>
      </div>

      <form action={sendBulk} className="send-form">
        <div className="adm-card">
          <div className="h">1. Välj målgrupp</div>
          <div className="b">
            <div className="field">
              <label>Resa / paket</label>
              <select name="packageId" defaultValue={preselectedPkg?.id ?? ""}>
                <option value="">Alla bokningar (oberoende av resa)</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p._count.bookings} bokningar)
                  </option>
                ))}
              </select>
              <span className="hint">Mejlet skickas till alla kunder med bokning på vald resa.</span>
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="h">2. Välj mall eller skriv fritt</div>
          <div className="b">
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Mall (valfritt)</label>
              <select name="templateId" defaultValue="">
                <option value="">— Ingen mall (skriv fritt nedan) —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.subject}
                  </option>
                ))}
              </select>
              <span className="hint">Om du väljer mall fylls ämne + text i automatiskt med mallens innehåll. Variabler ({"{{namn}}"} etc.) ersätts per mottagare.</span>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Ämnesrad (om ingen mall)</label>
              <input name="customSubject" placeholder="T.ex. Viktig information om din resa" />
            </div>

            <div className="field">
              <label>Mejltext (om ingen mall)</label>
              <textarea name="customBody" rows={12} placeholder={"Hej {{namn}},\n\nVi vill informera dig om...\n\nMed vänliga hälsningar,\nHadj Omra Resor"} />
              <span className="hint">
                Variabler: {"{{namn}}"}, {"{{paket}}"}, {"{{ref}}"}, {"{{belopp}}"}, {"{{datum}}"}, {"{{slutbetalning_datum}}"}, {"{{email}}"}, {"{{telefon}}"}
              </span>
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="h">3. Förhandsgranska & skicka</div>
          <div className="b">
            <div style={{ padding: "16px 20px", background: "var(--c-cream)", border: "1px solid var(--c-line)", marginBottom: 16 }}>
              <p className="eyebrow gold" style={{ marginBottom: 6 }}>Vad händer när du klickar?</p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
                <li>Mejl köas med status <strong>QUEUED</strong> i utskicksloggen</li>
                <li>Variabler ersätts per mottagare ({"{{namn}}"} → resenärens namn etc.)</li>
                <li>Import-användare (import@system.local) hoppas över</li>
                <li>Faktisk sändning sker när e-posttjänst (Resend/SMTP) kopplas in</li>
              </ul>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Köa utskick →
            </button>
          </div>
        </div>
      </form>

      <style>{`
        .send-form { display: grid; gap: 16px; max-width: 800px; }
        .send-form .field { display: flex; flex-direction: column; gap: 6px; }
        .send-form .field label { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .send-form .field .hint { font-size: 12px; color: var(--c-text-muted); }
      `}</style>
    </div>
  );
}
