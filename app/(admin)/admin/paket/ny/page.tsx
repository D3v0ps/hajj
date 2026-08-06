import Link from "next/link";
import { PackageForm } from "@/components/admin/PackageForm";
import { createPackage } from "@/app/actions/admin-packages";

export default function NyttPaketPage() {
  return (
    <div>
      <Link href="/admin/paket" className="dim" style={{ fontSize: 13 }}>← Paket</Link>
      <span className="eyebrow gold" style={{ marginTop: 16, display: "block" }}>Nytt paket</span>
      <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 24 }}>Skapa paket</h1>

      <PackageForm action={createPackage} submitLabel="Skapa paket →" />
    </div>
  );
}
