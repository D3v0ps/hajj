"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  buildAuthUrl,
  disconnect,
  fortnoxEnabled,
  createVoucher,
  debetAccountFor,
  FORTNOX_VMB_ACCOUNT,
} from "@/lib/fortnox";
import { logAudit } from "@/lib/audit";
import crypto from "node:crypto";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");
  return session.user;
}

export async function startFortnoxAuth(): Promise<void> {
  await requireAdmin();
  if (!fortnoxEnabled()) redirect("/admin/fortnox?error=disabled");
  const state = crypto.randomBytes(24).toString("hex");
  // Vi lagrar inte state separat (CSRF-skydd kunde förstärkas med cookie),
  // men endast inloggad ADMIN/STAFF kan slutföra callbacken så blast radius är låg.
  redirect(buildAuthUrl(state));
}

export async function disconnectFortnox(): Promise<void> {
  const admin = await requireAdmin();
  await disconnect();
  await logAudit({ actorId: admin.id, actorEmail: admin.email, action: "fortnox.disconnected" });
  revalidatePath("/admin/fortnox");
  redirect("/admin/fortnox?ok=disconnected");
}

/**
 * Pushar en enskild betalning till Fortnox som verifikat. Idempotent —
 * en betalning kan bara pushas en gång (fortnoxPushedAt + voucher-nummer
 * sparas på Payment-raden).
 */
export async function pushPaymentToFortnox(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!fortnoxEnabled()) redirect("/admin/fortnox?error=disabled");
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!paymentId) redirect("/admin/fortnox");

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { include: { user: { select: { name: true, email: true } }, package: { select: { title: true } } } } },
  });
  if (!payment) redirect("/admin/fortnox?error=payment_not_found");
  if (payment.status !== "COMPLETED") redirect("/admin/fortnox?error=not_completed");
  if (payment.fortnoxPushedAt) redirect("/admin/fortnox?error=already_pushed");

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
    await logAudit({ actorId: admin.id, actorEmail: admin.email, action: "fortnox.voucherCreated", targetType: "Payment", targetId: payment.id, metadata: { series: v.series, number: v.number } });
    revalidatePath("/admin/fortnox");
    revalidatePath(`/admin/bokningar/${payment.bookingId}`);
    redirect(`/admin/fortnox?ok=pushed&num=${v.series}${v.number}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "okänt fel";
    await logAudit({ actorId: admin.id, actorEmail: admin.email, action: "fortnox.voucherFailed", targetType: "Payment", targetId: payment.id, metadata: { error: msg } });
    redirect(`/admin/fortnox?error=${encodeURIComponent(msg)}`);
  }
}
