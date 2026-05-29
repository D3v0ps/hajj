import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Fortnox-integration: OAuth2-flöde + voucher-push.
 *
 * Flöde:
 *  1. Admin klickar "Anslut Fortnox" → omdirigeras till FORTNOX_AUTH_URL.
 *  2. Fortnox skickar tillbaka till /api/fortnox/callback med ?code.
 *  3. Vi byter code → access+refresh-token, lagrar i FortnoxConnection.
 *  4. Vid voucher-push hämtas connection, refreshas om utgången, sedan
 *     POSTas vouchern till /3/vouchers.
 *
 * Saknas FORTNOX_CLIENT_ID/SECRET → hela integrationen är inaktiv. Adminvyn
 * visar då en instruktion istället.
 */

const AUTH_URL = "https://apps.fortnox.se/oauth-v1/auth";
const TOKEN_URL = "https://apps.fortnox.se/oauth-v1/token";
const API_BASE = "https://api.fortnox.se/3";

const SCOPES = "bookkeeping settings"; // räcker för voucher-push + kontoplan

export function fortnoxEnabled(): boolean {
  return Boolean(env.FORTNOX_CLIENT_ID && env.FORTNOX_CLIENT_SECRET);
}

export function buildAuthUrl(state: string): string {
  if (!fortnoxEnabled()) throw new Error("Fortnox ej konfigurerad");
  const redirectUri = `${env.APP_URL}/api/fortnox/callback`;
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", env.FORTNOX_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("account_type", "service");
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  if (!env.FORTNOX_CLIENT_ID || !env.FORTNOX_CLIENT_SECRET) {
    throw new Error("Fortnox-credentials saknas");
  }
  const basic = Buffer.from(`${env.FORTNOX_CLIENT_ID}:${env.FORTNOX_CLIENT_SECRET}`).toString("base64");
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => `HTTP ${r.status}`);
    throw new Error(`Fortnox token-fel: ${errText.slice(0, 300)}`);
  }
  return (await r.json()) as TokenResponse;
}

/** Byter en authorization code → tokens och lagrar i DB. Anropas i callback. */
export async function exchangeCodeForToken(code: string, connectedById?: string): Promise<void> {
  const redirectUri = `${env.APP_URL}/api/fortnox/callback`;
  const tok = await postToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const expiresAt = new Date(Date.now() + (tok.expires_in - 30) * 1000); // 30s marginal
  // Singleton: radera ev. tidigare koppling så det alltid bara finns en aktiv.
  await prisma.fortnoxConnection.deleteMany({});
  await prisma.fortnoxConnection.create({
    data: {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      tokenExpiresAt: expiresAt,
      scope: tok.scope ?? null,
      connectedById: connectedById ?? null,
    },
  });
}

/** Hämtar aktiv connection och refreshar token om den är på väg att gå ut. */
async function getValidConnection() {
  const conn = await prisma.fortnoxConnection.findFirst({ orderBy: { connectedAt: "desc" } });
  if (!conn) throw new Error("Fortnox är inte ansluten");
  if (conn.tokenExpiresAt.getTime() > Date.now() + 60_000) return conn;
  // Refresha
  const tok = await postToken({
    grant_type: "refresh_token",
    refresh_token: conn.refreshToken,
  });
  const updated = await prisma.fortnoxConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      tokenExpiresAt: new Date(Date.now() + (tok.expires_in - 30) * 1000),
      scope: tok.scope ?? conn.scope,
    },
  });
  return updated;
}

export async function isConnected(): Promise<boolean> {
  const c = await prisma.fortnoxConnection.findFirst({ select: { id: true } });
  return !!c;
}

export async function disconnect(): Promise<void> {
  await prisma.fortnoxConnection.deleteMany({});
}

type VoucherRow = { Account: number; Debit?: number; Credit?: number; TransactionInformation?: string };

type VoucherInput = {
  description: string;        // upp till 60 tecken — texten på verifikatet
  transactionDate: string;    // YYYY-MM-DD
  voucherSeries: string;      // typiskt "A"
  rows: VoucherRow[];
};

type FortnoxVoucherResponse = {
  Voucher: { VoucherSeries: string; VoucherNumber: number };
};

/** Pushar ett verifikat till Fortnox och returnerar serie+nummer. */
export async function createVoucher(input: VoucherInput): Promise<{ series: string; number: number }> {
  const conn = await getValidConnection();
  const r = await fetch(`${API_BASE}/vouchers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      Voucher: {
        Description: input.description.slice(0, 60),
        TransactionDate: input.transactionDate,
        VoucherSeries: input.voucherSeries,
        VoucherRows: input.rows.map((r) => ({
          Account: r.Account,
          Debit: r.Debit ?? 0,
          Credit: r.Credit ?? 0,
          TransactionInformation: r.TransactionInformation?.slice(0, 100),
        })),
      },
    }),
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => `HTTP ${r.status}`);
    throw new Error(`Fortnox voucher-fel: ${errText.slice(0, 300)}`);
  }
  const data = (await r.json()) as FortnoxVoucherResponse;
  return { series: data.Voucher.VoucherSeries, number: data.Voucher.VoucherNumber };
}

/** Kontoplan för en betalningsmetod (matchar /admin/bokforing-CSV). */
export function debetAccountFor(method: string): number {
  switch (method) {
    case "SWISH":
    case "BANKGIRO":
      return 1930; // företagskonto
    case "KLARNA":
    case "CARD":
      return 1580; // fordringar Klarna/kortinlösen
    case "INVOICE":
      return 1510; // kundfordringar
    default:
      return 1930;
  }
}

export const FORTNOX_VMB_ACCOUNT = 3308; // Resebyrå-VMB (BAS-kontoplanen)

/**
 * Autopush:ar en COMPLETED-betalning till Fortnox om integration är ansluten.
 * Idempotent (hoppar över redan pushad). Tysta fel — log:as till audit men
 * blockerar aldrig business-flödet (admin kan retry:a manuellt från /admin/fortnox).
 */
export async function autoPushPayment(paymentId: string): Promise<void> {
  if (!fortnoxEnabled()) return;
  // Dynamisk import för att undvika cirkulär: prisma → audit drar bara denna fil vid behov.
  const { prisma } = await import("@/lib/db");
  const { logAudit } = await import("@/lib/audit");

  const conn = await prisma.fortnoxConnection.findFirst({ select: { id: true } });
  if (!conn) return; // ej ansluten

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: { include: { user: { select: { name: true, email: true } }, package: { select: { title: true } } } },
    },
  });
  if (!payment || payment.status !== "COMPLETED" || payment.fortnoxPushedAt) return;

  const transactionDate = (payment.paidAt ?? payment.createdAt).toISOString().slice(0, 10);
  const description = `${payment.booking.user.name ?? payment.booking.user.email ?? "Kund"} — ${payment.booking.package.title}`;
  const debetAccount = debetAccountFor(payment.method);

  try {
    const v = await createVoucher({
      description,
      transactionDate,
      voucherSeries: "A",
      rows: [
        { Account: debetAccount, Debit: payment.amount, TransactionInformation: `Ref ${payment.booking.reference.slice(0, 12)}` },
        { Account: FORTNOX_VMB_ACCOUNT, Credit: payment.amount, TransactionInformation: "Resebyrå-VMB" },
      ],
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        fortnoxVoucherSeries: v.series,
        fortnoxVoucherNumber: v.number,
        fortnoxPushedAt: new Date(),
      },
    });
    await logAudit({
      action: "fortnox.autoVoucherCreated",
      targetType: "Payment",
      targetId: payment.id,
      metadata: { series: v.series, number: v.number },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "okänt fel";
    await logAudit({
      action: "fortnox.autoVoucherFailed",
      targetType: "Payment",
      targetId: payment.id,
      metadata: { error: msg.slice(0, 400) },
    });
  }
}
