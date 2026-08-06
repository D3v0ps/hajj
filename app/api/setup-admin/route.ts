import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { NextRequest } from "next/server";

// Engångs-bootstrap av första admin-kontot. Säkerhetsmodell:
// 1. Kräver SETUP_MODE=1 i miljön, OCH
// 2. Vägrar så snart minst en ADMIN redan finns (kan ej kapa/skapa fler admins).
// 3. Skapar bara nya konton — uppdaterar ALDRIG ett befintligt konto (ingen
//    privilege-escalation av andras konton via upsert).
// Detta gör endpointen ofarlig även om SETUP_MODE råkar lämnas på i prod.
export async function POST(req: NextRequest) {
  if (process.env.SETUP_MODE !== "1") {
    return Response.json(
      { error: "Setup-läge är avstängt." },
      { status: 403 },
    );
  }

  // Bootstrap-skydd: om en admin redan finns är endpointen stängd.
  const adminExists = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminExists > 0) {
    return Response.json(
      { error: "Ett admin-konto finns redan. Setup är stängt. Logga in på /logga-in." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return Response.json({ error: "E-post och lösenord krävs." }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  const password = String(body.password);

  if (password.length < 8) {
    return Response.json({ error: "Lösenordet måste vara minst 8 tecken." }, { status: 400 });
  }

  // Vägra om e-posten redan tillhör ett konto (skapa endast helt nytt).
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: "E-postadressen är redan registrerad." },
      { status: 409 },
    );
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: "ADMIN", name: body.name || "Admin" },
    });

    return Response.json({
      ok: true,
      message: `Admin ${user.email} skapad. Gå till /logga-in. Stäng nu av setup (SETUP_MODE=0).`,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Okänt fel" },
      { status: 500 },
    );
  }
}
