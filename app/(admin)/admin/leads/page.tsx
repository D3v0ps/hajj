import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED"] as const;

async function setLeadStatus(leadId: string, formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status as typeof STATUSES[number])) return;
  await prisma.lead.update({ where: { id: leadId }, data: { status: status as typeof STATUSES[number] } });
  revalidatePath("/admin/leads");
}

export default async function AdminLeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <span className="eyebrow gold">Hajj intresseanmälan</span>
      <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 24 }}>Hajj intresseanmälningar</h1>

      <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">Inkomna leads</caption>
        <thead><tr><th scope="col">Datum</th><th scope="col">Namn</th><th scope="col">Kontakt</th><th scope="col">Typ</th><th scope="col">Meddelande</th><th scope="col">Källa</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Åtgärder</span></th></tr></thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.createdAt).toLocaleString("sv-SE")}</td>
              <td className="serif">{l.name}</td>
              <td className="dim" style={{ fontSize: 13 }}>{l.email}{l.phone ? ` · ${l.phone}` : ""}</td>
              <td>{l.travelType ?? "—"}</td>
              <td className="dim" style={{ fontSize: 13, maxWidth: 320 }}>{l.message ?? "—"}</td>
              <td className="dim" style={{ fontSize: 11 }}>{l.source ?? "—"}</td>
              <td>
                <form action={setLeadStatus.bind(null, l.id)} style={{ display: "flex", gap: 6 }}>
                  <select name="status" defaultValue={l.status} style={{ padding: "6px 10px", fontSize: 12, border: "1px solid var(--c-line)" }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="submit" className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }}>Spara</button>
                </form>
              </td>
              <td>
                <a href={`mailto:${l.email}`} className="btn-link">Svara →</a>
              </td>
            </tr>
          ))}
          {leads.length === 0 && <tr><td colSpan={8} className="center dim" style={{ padding: 32 }}>Inga leads ännu.</td></tr>}
        </tbody>
      </table>
      </div>
    </div>
  );
}
