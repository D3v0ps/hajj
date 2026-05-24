import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.SETUP_MODE !== "1") {
    return Response.json(
      { error: "Setup mode disabled. Set SETUP_MODE=1 in environment to enable." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return Response.json({ error: "email and password required" }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  const password = String(body.password);

  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: "ADMIN", name: body.name || "Admin" },
      create: { email, passwordHash, role: "ADMIN", name: body.name || "Admin" },
    });

    return Response.json({
      ok: true,
      message: `Admin ${user.email} ready. Go to /logga-in.`,
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
