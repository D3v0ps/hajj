import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateTravelerProfile, deleteTravelerProfile } from "@/app/actions/traveler-profiles";
import { TravelerProfileForm } from "@/components/portal/TravelerProfileForm";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ ok?: string; error?: string }>;

export default async function EditTravelerProfilePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  const { id } = await params;
  const { ok, error } = await searchParams;

  const profile = await prisma.travelerProfile.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!profile) notFound();

  return (
    <div className="container narrow" style={{ padding: "32px 0 80px" }}>
      <Link href="/min-sida/resenarer" className="dim" style={{ fontSize: 13 }}>← Tillbaka till resenärer</Link>
      <h1 style={{ fontSize: 28, marginTop: 14, marginBottom: 6 }}>
        {profile.firstName} {profile.lastName}
      </h1>
      {profile.isSelf && <span className="eyebrow gold">Din egen profil</span>}

      {ok === "updated" && <div style={{ padding: "10px 14px", background: "#E6F1EA", border: "1px solid var(--c-green-soft)", margin: "16px 0", fontSize: 14 }} role="status">Ändringarna sparade.</div>}
      {error && <div style={{ padding: "10px 14px", background: "#FBE9E2", border: "1px solid var(--c-warn)", margin: "16px 0", fontSize: 14 }} role="alert">{error}</div>}

      <div style={{ marginTop: 24 }}>
        <TravelerProfileForm
          action={updateTravelerProfile}
          profile={{
            id: profile.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            relationship: profile.relationship,
            ageCategory: profile.ageCategory,
            isSelf: profile.isSelf,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            personnummer: profile.personnummer,
            passportNo: profile.passportNo,
            passportExp: profile.passportExp,
            passIssueDate: profile.passIssueDate,
            passIssuePlace: profile.passIssuePlace,
            birthDate: profile.birthDate,
            gender: profile.gender,
            nationality: profile.nationality,
            civilStatus: profile.civilStatus,
            occupation: profile.occupation,
            birthCountry: profile.birthCountry,
            birthCity: profile.birthCity,
            notes: profile.notes,
          }}
          submitLabel="Spara ändringar"
        />
      </div>

      <details style={{ marginTop: 32, padding: 16, background: "var(--c-cream)", border: "1px solid var(--c-line-soft)" }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--c-warn)" }}>Ta bort profil</summary>
        <p className="dim" style={{ fontSize: 13, margin: "12px 0" }}>
          Profilen tas bort men befintliga bokningar med denna resenär påverkas inte.
        </p>
        <form action={deleteTravelerProfile}>
          <input type="hidden" name="id" value={profile.id} />
          <button type="submit" className="btn" style={{ background: "var(--c-warn)", color: "#fff", padding: "8px 14px", fontSize: 13 }}>Ta bort permanent</button>
        </form>
      </details>
    </div>
  );
}
