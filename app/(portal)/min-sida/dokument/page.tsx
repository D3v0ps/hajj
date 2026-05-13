import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DokumentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const docs = await prisma.document.findMany({
    where: { userId: session.user.id },
    include: { traveler: true },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="container narrow">
      <span className="eyebrow gold">Dokument</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 24 }}>Dina dokument</h1>
      <p className="dim" style={{ maxWidth: 640, marginBottom: 32 }}>
        Pass, passfoto, eventuellt uppehållstillstånd. Kontoret granskar och meddelar om något behöver kompletteras.
      </p>

      {docs.length === 0 ? (
        <div className="empty-card">
          <p>Du har inga dokument uppladdade än.</p>
          <p className="dim" style={{ fontSize: 13, marginTop: 12 }}>
            Direktupload i webbläsaren aktiveras i fas 2 (objektslagring + virusscanning).
            Tills dess: e-posta dokumenten till info@hajj.karimkhalil.se så registrerar kontoret dem här.
          </p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Filnamn</th><th>Typ</th><th>Resenär</th><th>Status</th><th>Uppladdad</th></tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td className="serif">{d.filename}</td>
                <td>{d.type}</td>
                <td>{d.traveler ? `${d.traveler.firstName} ${d.traveler.lastName}` : "—"}</td>
                <td>{d.status}</td>
                <td>{new Date(d.uploadedAt).toLocaleDateString("sv-SE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style>{`
        .empty-card { padding: 48px; background: #fff; border: 1px dashed var(--c-line); }
      `}</style>
    </div>
  );
}
