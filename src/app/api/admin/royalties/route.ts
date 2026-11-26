import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { createNotification, recordAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requirePermission("royalties:view_all");
  if (auth.error) return auth.error;

  const [batches, payments, statements] = await Promise.all([
    prisma.royaltyImportBatch.findMany({
      include: { importedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.statement.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { generatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ batches, payments, statements });
}

const ImportRoyaltySchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM format"),
  sourcePartner: z.string().trim().min(2),
  fileName: z.string().trim().min(1).default("manual-verified-import.json"),
  rows: z
    .array(
      z.object({
        releaseId: z.string(),
        trackId: z.string().optional().nullable(),
        storeSlug: z.string().optional().nullable(),
        countryCode: z.string().default("IN"),
        countryName: z.string().default("India"),
        streams: z.number().int().nonnegative(),
        grossRevenue: z.number().nonnegative(),
        platformFee: z.number().nonnegative().default(0),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  const auth = await requirePermission("royalties:import");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = ImportRoyaltySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid royalty import." },
        { status: 400 }
      );
    }

    const stores = await prisma.dspStore.findMany();
    const storeBySlug = new Map(stores.map((s) => [s.slug, s.id]));

    let totalGross = 0;
    let totalNet = 0;

    const preparedRows = [];
    for (const r of parsed.data.rows) {
      const release = await prisma.release.findUnique({
        where: { id: r.releaseId },
        select: { id: true, artistId: true, labelId: true, ownerUserId: true },
      });
      if (!release) {
        return NextResponse.json(
          { error: `Unknown releaseId "${r.releaseId}" in import.` },
          { status: 400 }
        );
      }
      const net = Math.max(0, Number((r.grossRevenue - r.platformFee).toFixed(4)));
      totalGross += r.grossRevenue;
      totalNet += net;
      preparedRows.push({
        releaseId: release.id,
        trackId: r.trackId || null,
        artistId: release.artistId,
        labelId: release.labelId,
        storeId: r.storeSlug ? storeBySlug.get(r.storeSlug) ?? null : null,
        periodMonth: parsed.data.periodMonth,
        reportDate: new Date(`${parsed.data.periodMonth}-28T00:00:00Z`),
        countryCode: r.countryCode,
        countryName: r.countryName,
        streams: r.streams,
        grossRevenue: r.grossRevenue,
        platformFee: r.platformFee,
        netRevenue: net,
        currency: "USD",
        ownerUserId: release.ownerUserId,
      });
    }

    const batch = await prisma.royaltyImportBatch.create({
      data: {
        importedById: auth.user.id,
        periodMonth: parsed.data.periodMonth,
        sourcePartner: parsed.data.sourcePartner,
        fileName: parsed.data.fileName,
        totalRows: preparedRows.length,
        totalGrossRevenue: Number(totalGross.toFixed(2)),
        totalNetRevenue: Number(totalNet.toFixed(2)),
        entries: {
          create: preparedRows.map(({ ownerUserId: _ignore, ...row }) => row),
        },
      },
    });

    // Update or create monthly statement summaries for affected release owners
    const byOwner = new Map<string, { streams: number; gross: number; net: number }>();
    for (const r of preparedRows) {
      const prev = byOwner.get(r.ownerUserId) || { streams: 0, gross: 0, net: 0 };
      prev.streams += r.streams;
      prev.gross += r.grossRevenue;
      prev.net += r.netRevenue;
      byOwner.set(r.ownerUserId, prev);
    }

    for (const [uid, agg] of byOwner.entries()) {
      await prisma.statement.upsert({
        where: { userId_periodMonth: { userId: uid, periodMonth: parsed.data.periodMonth } },
        update: {
          totalStreams: { increment: agg.streams },
          grossAmount: { increment: agg.gross },
          netAmount: { increment: agg.net },
          payableAmount: { increment: agg.net },
          status: "FINALIZED",
        },
        create: {
          userId: uid,
          periodMonth: parsed.data.periodMonth,
          totalStreams: agg.streams,
          grossAmount: Number(agg.gross.toFixed(2)),
          netAmount: Number(agg.net.toFixed(2)),
          payableAmount: Number(agg.net.toFixed(2)),
          status: "FINALIZED",
        },
      });
    }

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "ROYALTY_BATCH_IMPORTED",
      entityType: "RoyaltyImportBatch",
      entityId: batch.id,
      metadata: { periodMonth: batch.periodMonth, rows: batch.totalRows, totalNet },
    });

    return NextResponse.json({ ok: true, batch }, { status: 201 });
  } catch (err) {
    console.error("Import royalty error:", err);
    return NextResponse.json({ error: "Failed to import royalties." }, { status: 500 });
  }
}

const ProcessPaymentSchema = z.object({
  paymentId: z.string(),
  status: z.enum(["PROCESSING", "COMPLETED", "FAILED", "REJECTED"]),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(request: Request) {
  const auth = await requirePermission("payments:process");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = ProcessPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment update." }, { status: 400 });
    }

    const updated = await prisma.payment.update({
      where: { id: parsed.data.paymentId },
      data: {
        status: parsed.data.status,
        referenceNumber: parsed.data.referenceNumber || null,
        notes: parsed.data.notes || null,
        processedById: auth.user.id,
      },
    });

    await createNotification({
      userId: updated.userId,
      type: "PAYMENT",
      title: `Payout ${updated.status} ($${updated.amount.toFixed(2)})`,
      message:
        updated.referenceNumber
          ? `Reference: ${updated.referenceNumber}`
          : `Your payout status is now ${updated.status}.`,
      link: "/dashboard/payments",
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "PAYMENT_PROCESSED",
      entityType: "Payment",
      entityId: updated.id,
      metadata: { status: updated.status },
    });

    return NextResponse.json({ ok: true, payment: updated });
  } catch (err) {
    console.error("Process payment error:", err);
    return NextResponse.json({ error: "Failed to update payment." }, { status: 500 });
  }
}
