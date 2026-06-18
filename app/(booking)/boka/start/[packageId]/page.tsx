import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createBooking, createGuestBooking } from "@/app/actions/bookings";
import { primaryDisplayPrice } from "@/lib/pricing";
import { guestEmail } from "@/lib/guest";

type Params = Promise<{ packageId: string }>;
type SearchParams = Promise<{ error?: string }>;

// Att muteringen ligger i en Server Action (inte i render) gör att
// prefetch/back-forward-cache inte skapar duplicerade bokningar.
export default async function StartBookingPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { packageId } = await params;
  const { error } = await searchParams;
  const session = await auth();

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    include: { tiers: { orderBy: { pricePerPerson: "asc" } } },
  });
  if (!pkg) redirect("/");

  const fromPrice = primaryDisplayPrice(pkg.tiers);
  const prefillEmail = session?.user?.email ?? (await guestEmail()) ?? "";

  return (
    <div className="container narrow" style={{ maxWidth: 640 }}>
      <span className="eyebrow gold">Påbörja bokning</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>{pkg.title}</h1>
      {pkg.subtitle && <p className="dim" style={{ fontSize: 16 }}>{pkg.subtitle}</p>}

      <div style={{ margin: "28px 0", padding: "24px", background: "var(--c-cream)", border: "1px solid var(--c-line)" }}>
        <p style={{ margin: 0 }}>
          Från <strong className="serif tnum">{fromPrice.toLocaleString("sv-SE")} kr</strong> per person.
          Du kan ändra val och avbryta utan kostnad fram till att du betalar anmälningsavgiften i steg 5.
        </p>
      </div>

      {error && <div role="alert" className="start-err">{error}</div>}

      {session?.user?.id ? (
        <form action={createBooking.bind(null, packageId)} style={{ display: "flex", gap: 12 }}>
          <button type="submit" className="btn btn-primary">Skapa bokning →</button>
          <Link href={`/paket/${pkg.slug}`} className="btn btn-ghost">Tillbaka</Link>
        </form>
      ) : (
        <form action={createGuestBooking.bind(null, packageId)} className="start-form">
          <p style={{ fontSize: 15, marginBottom: 18 }}>
            <strong>Inget konto behövs.</strong> Fyll i dina kontaktuppgifter så skapar vi din bokning —
            du kan slutföra den nu eller fortsätta senare från samma webbläsare.
          </p>
          <div className="field">
            <label htmlFor="g-name">Namn</label>
            <input id="g-name" name="name" required maxLength={120} autoComplete="name" placeholder="För- och efternamn" />
          </div>
          <div className="field">
            <label htmlFor="g-email">E-post</label>
            <input id="g-email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={prefillEmail} placeholder="namn@exempel.se" />
          </div>
          <div className="field">
            <label htmlFor="g-phone">Telefon <span className="opt">(valfritt)</span></label>
            <input id="g-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" placeholder="07X-XXX XX XX" />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary">Fortsätt till bokning →</button>
            <Link href={`/paket/${pkg.slug}`} className="btn btn-ghost">Tillbaka</Link>
          </div>

          <p className="dim" style={{ fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
            Vi sparar dina uppgifter för att hantera bokningen enligt vår{" "}
            <Link href="/integritet" className="btn-link">integritetspolicy</Link>. Har du redan ett konto?{" "}
            <Link href={`/logga-in?next=${encodeURIComponent(`/boka/start/${packageId}`)}`} className="btn-link">Logga in</Link>{" "}
            för att se alla dina bokningar samlat.
          </p>
        </form>
      )}

      <style>{`
        .start-err { background: #FBE9E2; border: 1px solid var(--c-warn); color: var(--c-warn); padding: 12px 16px; margin-bottom: 18px; font-size: 14px; }
        .start-form .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .start-form label { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .start-form label .opt { text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--c-text-muted); }
        .start-form input { padding: 11px 13px; border: 1px solid var(--c-line); background: #fff; font: inherit; }
        .start-form input:focus { outline: 2px solid var(--c-gold); outline-offset: -1px; }
      `}</style>
    </div>
  );
}
