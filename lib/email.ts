import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

// Sträng-koder för varför mejlet skickades — fri form i DB så vi kan lägga till nya
// transaktionstyper utan migration. Lista de aktuella koderna här som källa-på-sanning.
export const EMAIL_KIND = {
  BOOKING_SUBMITTED: "BOOKING_SUBMITTED",
  DEPOSIT_RECEIVED: "DEPOSIT_RECEIVED",
  FINAL_PAYMENT_RECEIVED: "FINAL_PAYMENT_RECEIVED",
  FINAL_PAYMENT_REMINDER: "FINAL_PAYMENT_REMINDER",
  DOCUMENT_REVIEWED: "DOCUMENT_REVIEWED",
  PRE_DEPARTURE: "PRE_DEPARTURE",
  PASSWORD_RESET: "PASSWORD_RESET",
  EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
  REFUND_REQUEST: "REFUND_REQUEST",
  REVIEW_REQUEST: "REVIEW_REQUEST",
  BULK: "BULK",
} as const;
export type EmailKind = typeof EMAIL_KIND[keyof typeof EMAIL_KIND];

/**
 * Lättviktig e-postmotor: köar via EmailSend-tabellen och skickar via Resend
 * (HTTP API, ingen dependency krävs). Saknas RESEND_API_KEY → mejlen ligger
 * kvar som QUEUED och skickas nästa gång nyckeln finns. Helt OK degraderat läge.
 */

type SendInput = {
  to: string;
  recipientName?: string | null;
  subject: string;
  body: string;          // plain-text / markdown-light
  bookingId?: string | null;
  packageId?: string | null;
  templateId?: string | null;
  sentById?: string | null;
  kind?: EmailKind;
};

/** Köar ett mejl. Skickas asynkront av drainQueue() från worker-routen. */
export async function queueEmail(input: SendInput): Promise<string> {
  const row = await prisma.emailSend.create({
    data: {
      templateId: input.templateId ?? null,
      recipientEmail: input.to,
      recipientName: input.recipientName ?? null,
      subject: input.subject,
      body: input.body,
      status: "QUEUED",
      bookingId: input.bookingId ?? null,
      packageId: input.packageId ?? null,
      sentById: input.sentById ?? null,
      kind: input.kind,
    },
  });
  return row.id;
}

/** Brand-wrappar plain-text body som enkel HTML. Hållet medvetet enkelt
 *  så det renderar väl i alla klienter och inte triggar spam-filter. */
export function renderBrandedHtml(subject: string, bodyText: string): string {
  const escaped = bodyText
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = escaped
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;line-height:1.6;color:#1a1d2e;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const safeSubject = subject.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="sv">
<head><meta charset="utf-8"><title>${safeSubject}</title></head>
<body style="margin:0;padding:0;background:#FBFAF6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1d2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBFAF6;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e6e0d0;">
        <tr><td style="padding:28px 32px;border-bottom:2px solid #B5894B;">
          <div style="font-family:Georgia,serif;font-size:22px;color:#0C1E3E;font-weight:500;letter-spacing:0.01em;">Hadj Omra Resor</div>
          <div style="font-size:11px;color:#8a8470;letter-spacing:0.16em;text-transform:uppercase;margin-top:4px;">Hajj &middot; Omra &middot; Hadj Badal</div>
        </td></tr>
        <tr><td style="padding:32px;">${html}</td></tr>
        <tr><td style="padding:20px 32px;background:#EFE9DD;border-top:1px solid #e6e0d0;font-size:12px;color:#6b6757;line-height:1.6;">
          Hadj Omra Resor &middot; Kapellgränd 10, Stockholm<br>
          <a href="https://hajj.karimkhalil.se" style="color:#B5894B;text-decoration:none;">hajj.karimkhalil.se</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Skickar ett enskilt mejl via Resend. Returnerar { ok } eller { ok:false, error }. */
async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY saknas" };
  const from = env.SITE_EMAIL_FROM || "Hadj Omra Resor <no-reply@hajj.karimkhalil.se>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => `HTTP ${r.status}`);
      return { ok: false, error: errText.slice(0, 500) };
    }
    const data = await r.json().catch(() => ({} as { id?: string }));
    return { ok: true, id: data.id };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Okänt fel" };
  }
}

export type DrainResult = { sent: number; failed: number; skipped: number };

/** Tömmer kön: hämtar upp till `limit` QUEUED mejl och skickar dem. Idempotent —
 *  uppdaterar status så samma rad aldrig skickas två gånger. */
export async function drainQueue(limit = 25): Promise<DrainResult> {
  const result: DrainResult = { sent: 0, failed: 0, skipped: 0 };
  if (!env.RESEND_API_KEY) {
    return { ...result, skipped: limit };
  }
  const batch = await prisma.emailSend.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const row of batch) {
    // Markera SENDING först så parallella körningar inte plockar samma rad.
    const claimed = await prisma.emailSend.updateMany({
      where: { id: row.id, status: "QUEUED" },
      data: { status: "SENDING" },
    });
    if (claimed.count !== 1) continue; // någon annan tog den
    const html = renderBrandedHtml(row.subject, row.body);
    const res = await sendViaResend(row.recipientEmail, row.subject, html, row.body);
    if (res.ok) {
      await prisma.emailSend.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), providerRef: res.id ?? null, errorMessage: null },
      });
      result.sent++;
    } else {
      await prisma.emailSend.update({
        where: { id: row.id },
        data: { status: "FAILED", errorMessage: res.error?.slice(0, 500) ?? "Okänt fel" },
      });
      result.failed++;
    }
  }
  return result;
}

/** Variabelersättning ({{namn}} → "Karim") som matchar mejlmallarnas syntax. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}
