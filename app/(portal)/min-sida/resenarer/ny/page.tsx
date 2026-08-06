import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createTravelerProfile } from "@/app/actions/traveler-profiles";
import { TravelerProfileForm } from "@/components/portal/TravelerProfileForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function NewTravelerProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  const { error } = await searchParams;

  return (
    <div className="container narrow" style={{ padding: "32px 0 80px" }}>
      <Link href="/min-sida/resenarer" className="dim" style={{ fontSize: 13 }}>← Tillbaka till resenärer</Link>
      <h1 style={{ fontSize: 28, marginTop: 14, marginBottom: 24 }}>Ny resenärsprofil</h1>

      {error && <div style={{ padding: "10px 14px", background: "#FBE9E2", border: "1px solid var(--c-warn)", marginBottom: 16, fontSize: 14 }} role="alert">{error}</div>}

      <TravelerProfileForm action={createTravelerProfile} submitLabel="Spara profil" />
    </div>
  );
}
