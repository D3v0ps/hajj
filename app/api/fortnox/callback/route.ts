import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCodeForToken, fortnoxEnabled } from "@/lib/fortnox";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * OAuth-callback från Fortnox. Tar emot code + state, byter mot tokens,
 * lagrar i FortnoxConnection. Rollskydd: bara inloggad ADMIN/STAFF kan
 * slutföra anslutningen (vägrar annars — code är värdelös utan auth).
 */
export async function GET(req: NextRequest) {
  if (!fortnoxEnabled()) {
    redirect("/admin/fortnox?error=disabled");
  }
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");

  const code = req.nextUrl.searchParams.get("code");
  const err = req.nextUrl.searchParams.get("error");

  if (err) {
    await logAudit({ actorId: session.user.id, actorEmail: session.user.email, action: "fortnox.authError", metadata: { error: err } });
    redirect(`/admin/fortnox?error=${encodeURIComponent(err)}`);
  }
  if (!code) redirect("/admin/fortnox?error=no_code");

  try {
    await exchangeCodeForToken(code, session.user.id);
    await logAudit({ actorId: session.user.id, actorEmail: session.user.email, action: "fortnox.connected" });
    redirect("/admin/fortnox?ok=connected");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "okänt fel";
    await logAudit({ actorId: session.user.id, actorEmail: session.user.email, action: "fortnox.connectFailed", metadata: { error: msg } });
    redirect(`/admin/fortnox?error=${encodeURIComponent(msg)}`);
  }
}
