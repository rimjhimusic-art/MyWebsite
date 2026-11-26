import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { getAccessibleLabelIds } from "@/lib/labels";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const isAdmin = isAdminRole(auth.user.role);
  const labelIds = await getAccessibleLabelIds(auth.user.id);

  const [payments, statements, releases] = await Promise.all([
    prisma.payment.findMany({
      where: isAdmin ? {} : { userId: auth.user.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.statement.findMany({
      where: isAdmin ? {} : { userId: auth.user.id },
      orderBy: { periodMonth: "desc" },
    }),
    prisma.release.findMany({
      where: isAdmin
        ? {}
        : {
            OR: [
              { ownerUserId: auth.user.id },
              ...(labelIds.length > 0 ? [{ labelId: { in: labelIds } }] : []),
            ],
          },
      select: { id: true },
    }),
  ]);

  const releaseIds = releases.map((r) => r.id);
  const royaltySum = await prisma.royaltyEntry.aggregate({
    where: releaseIds.length > 0 ? { releaseId: { in: releaseIds } } : { releaseId: "__none__" },
    _sum: { netRevenue: true },
  });

  const earnedTotal = royaltySum._sum.netRevenue || 0;
  const paidOrRequested = payments
    .filter((p) => p.status !== "REJECTED" && p.status !== "FAILED")
    .reduce((acc, p) => acc + p.amount, 0);

  return NextResponse.json({
    availableBalance: Number(Math.max(0, earnedTotal - paidOrRequested).toFixed(2)),
    earnedTotal: Number(earnedTotal.toFixed(2)),
    payments,
    statements,
  });
}

const PayoutRequestSchema = z.object({
  amount: z.number().positive("Payout amount must be greater than zero"),
  method: z.enum(["BANK_TRANSFER", "UPI", "PAYPAL", "WIRE"]),
  accountSummary: z.string().trim().min(4, "Provide payout account details"),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = PayoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payout request." },
        { status: 400 }
      );
    }

    const labelIds = await getAccessibleLabelIds(auth.user.id);
    const releases = await prisma.release.findMany({
      where: {
        OR: [
          { ownerUserId: auth.user.id },
          ...(labelIds.length > 0 ? [{ labelId: { in: labelIds } }] : []),
        ],
      },
      select: { id: true },
    });

    const releaseIds = releases.map((r) => r.id);
    const [royaltySum, existingPayments] = await Promise.all([
      prisma.royaltyEntry.aggregate({
        where: releaseIds.length > 0 ? { releaseId: { in: releaseIds } } : { releaseId: "__none__" },
        _sum: { netRevenue: true },
      }),
      prisma.payment.findMany({
        where: {
          userId: auth.user.id,
          status: { in: ["REQUESTED", "PROCESSING", "COMPLETED"] },
        },
        select: { amount: true },
      }),
    ]);

    const earned = royaltySum._sum.netRevenue || 0;
    const committed = existingPayments.reduce((a, p) => a + p.amount, 0);
    const available = Math.max(0, earned - committed);

    if (parsed.data.amount > available + 0.01) {
      return NextResponse.json(
        {
          error: `Requested payout ($${parsed.data.amount.toFixed(2)}) exceeds available verified balance ($${available.toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        userId: auth.user.id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        accountSummary: parsed.data.accountSummary,
        status: "REQUESTED",
      },
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "PAYOUT_REQUESTED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { amount: payment.amount, method: payment.method },
    });

    return NextResponse.json({ ok: true, payment }, { status: 201 });
  } catch (err) {
    console.error("Payout request error:", err);
    return NextResponse.json(
      { error: "Failed to request payout." },
      { status: 500 }
    );
  }
}
