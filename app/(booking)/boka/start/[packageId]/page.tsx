import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createBooking } from "@/app/actions/bookings";

type Params = Promise<{ packageId: string }>;

// Den här sidan visar en bekräftelse-knapp som triggar createBooking via POST
// (Server Action). Att muteringen flyttats från render → action gör att
// prefetch/back-forward-cache inte skapar duplicerade bokningar.
export default async function StartBookingPage({ params }: { params: Params }) {
  const { packageId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/logga-in?next=${encodeURIComponent(`/boka/start/${packageId}`)}`);
  }

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    include: { tiers: { orderBy: { pricePerPerson: "asc" } } },
  });
  if (!pkg) redirect("/");

  const fromPrice = pkg.tiers[0]?.pricePerPerson ?? 0;

  return (
    <div className="container narrow" style={{ maxWidth: 640 }}>
      <span className="eyebrow gold">Påbörja bokning</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>{pkg.title}</h1>
      {pkg.subtitle && <p className="dim" style={{ fontSize: 16 }}>{pkg.subtitle}</p>}

      <div style={{
        margin: "32px 0",
        padding: "24px",
        background: "var(--c-cream)",
        border: "1px solid var(--c-line)",
      }}>
        <p style={{ margin: 0 }}>
          Från <strong className="serif tnum">{fromPrice.toLocaleString("sv-SE")} kr</strong> per person.
          Klicka nedan för att skapa en bokningsdraft. Du kan ändra val och avbryta utan kostnad
          fram till att du betalar anmälningsavgiften i steg 5.
        </p>
      </div>

      <form action={createBooking.bind(null, packageId)} style={{ display: "flex", gap: 12 }}>
        <button type="submit" className="btn btn-primary">Skapa bokning →</button>
        <Link href={`/paket/${pkg.slug}`} className="btn btn-ghost">Tillbaka</Link>
      </form>
    </div>
  );
}
