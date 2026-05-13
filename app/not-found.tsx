import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "80px 24px" }}>
      <div className="container narrow" style={{ textAlign: "center" }}>
        <p className="eyebrow gold">404</p>
        <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", margin: "20px 0 16px" }}>
          Sidan kunde inte hittas
        </h1>
        <p className="dim" style={{ fontSize: 17, maxWidth: 520, margin: "0 auto 32px" }}>
          Den sida du letar efter finns inte eller har flyttats. Kanske letar du efter något av detta?
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-primary">Till hemsidan</Link>
          <Link href="/omra" className="btn btn-ghost">Omra-paket</Link>
          <Link href="/kontakt" className="btn btn-ghost">Kontakt</Link>
        </div>
      </div>
    </div>
  );
}
