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

  const releases = await prisma.release.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { ownerUserId: auth.user.id },
            ...(labelIds.length > 0 ? [{ labelId: { in: labelIds } }] : []),
          ],
        },
    select: { id: true, title: true, primaryArtist: true },
  });

  const releaseIds = releases.map((r) => r.id);

  const [entries, splits] = await Promise.all([
    prisma.royaltyEntry.findMany({
      where: isAdmin
        ? {}
        : releaseIds.length > 0
        ? { releaseId: { in: releaseIds } }
        : { releaseId: "__none__" },
      include: {
        release: { select: { id: true, title: true } },
        track: { select: { id: true, title: true, isrc: true } },
        artist: { select: { id: true, stageName: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { reportDate: "desc" },
    }),
    prisma.revenueSplit.findMany({
      where: isAdmin
        ? {}
        : releaseIds.length > 0
        ? { releaseId: { in: releaseIds } }
        : { releaseId: "__none__" },
      include: {
        release: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totals = entries.reduce(
    (acc, e) => {
      acc.totalStreams += e.streams;
      acc.grossRevenue += e.grossRevenue;
      acc.netRevenue += e.netRevenue;
      return acc;
    },
    { totalStreams: 0, grossRevenue: 0, netRevenue: 0 }
  );

  // Groupings
  const byPlatform: Record<string, { name: string; streams: number; revenue: number }> = {};
  const byCountry: Record<string, { name: string; streams: number; revenue: number }> = {};
  const byRelease: Record<string, { title: string; streams: number; revenue: number }> = {};
  const byMonth: Record<string, { month: string; streams: number; revenue: number }> = {};

  for (const e of entries) {
    const storeName = e.store?.name || "Other DSP";
    byPlatform[storeName] ??= { name: storeName, streams: 0, revenue: 0 };
    byPlatform[storeName].streams += e.streams;
    byPlatform[storeName].revenue += e.netRevenue;

    const country = e.countryName || e.countryCode;
    byCountry[country] ??= { name: country, streams: 0, revenue: 0 };
    byCountry[country].streams += e.streams;
    byCountry[country].revenue += e.netRevenue;

    const relTitle = e.release?.title || "Release";
    byRelease[e.releaseId] ??= { title: relTitle, streams: 0, revenue: 0 };
    byRelease[e.releaseId].streams += e.streams;
    byRelease[e.releaseId].revenue += e.netRevenue;

    byMonth[e.periodMonth] ??= { month: e.periodMonth, streams: 0, revenue: 0 };
    byMonth[e.periodMonth].streams += e.streams;
    byMonth[e.periodMonth].revenue += e.netRevenue;
  }

  return NextResponse.json({
    totals: {
      totalStreams: totals.totalStreams,
      grossRevenue: Number(totals.grossRevenue.toFixed(2)),
      netRevenue: Number(totals.netRevenue.toFixed(2)),
    },
    releases,
    entries,
    splits,
    breakdowns: {
      byPlatform: Object.values(byPlatform).sort((a, b) => b.revenue - a.revenue),
      byCountry: Object.values(byCountry).sort((a, b) => b.streams - a.streams),
      byRelease: Object.values(byRelease).sort((a, b) => b.revenue - a.revenue),
      byMonth: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
    },
  });
}

const SaveSplitsSchema = z.object({
  releaseId: z.string(),
  splits: z
    .array(
      z.object({
        beneficiaryName: z.string().trim().min(1),
        beneficiaryEmail: z.string().trim().email().optional().or(z.literal("")),
        beneficiaryRole: z.enum(["LABEL", "ARTIST", "PRODUCER", "CONTRIBUTOR"]),
        percentage: z.number().min(0.01).max(100),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = SaveSplitsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid revenue splits." },
        { status: 400 }
      );
    }

    const totalPercent = parsed.data.splits.reduce((s, x) => s + x.percentage, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      return NextResponse.json(
        {
          error: `Revenue splits must total exactly 100% (currently ${totalPercent.toFixed(2)}%).`,
        },
        { status: 400 }
      );
    }

    const release = await prisma.release.findUnique({
      where: { id: parsed.data.releaseId },
    });
    if (!release) {
      return NextResponse.json({ error: "Release not found." }, { status: 404 });
    }

    const labelIds = await getAccessibleLabelIds(auth.user.id);
    const allowed =
      isAdminRole(auth.user.role) ||
      release.ownerUserId === auth.user.id ||
      (release.labelId && labelIds.includes(release.labelId));
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.revenueSplit.deleteMany({
        where: { releaseId: release.id },
      });
      for (const s of parsed.data.splits) {
        const matchedUser = s.beneficiaryEmail
          ? await tx.user.findUnique({ where: { email: s.beneficiaryEmail.toLowerCase() } })
          : null;
        await tx.revenueSplit.create({
          data: {
            releaseId: release.id,
            labelId: release.labelId,
            userId: matchedUser?.id ?? null,
            beneficiaryName: s.beneficiaryName,
            beneficiaryEmail: s.beneficiaryEmail || null,
            beneficiaryRole: s.beneficiaryRole,
            percentage: s.percentage,
          },
        });
      }
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "REVENUE_SPLITS_UPDATED",
      entityType: "Release",
      entityId: release.id,
      metadata: { count: parsed.data.splits.length },
    });

    return NextResponse.json({ ok: true, message: "Revenue splits saved (100% allocated)." });
  } catch (err) {
    console.error("Save splits error:", err);
    return NextResponse.json({ error: "Failed to save splits." }, { status: 500 });
  }
}
