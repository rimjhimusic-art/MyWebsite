import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { getAccessibleLabelIds } from "@/lib/labels";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const isAdmin = isAdminRole(auth.user.role);
  const labelIds = await getAccessibleLabelIds(auth.user.id);

  const releaseFilter = isAdmin
    ? {}
    : {
        OR: [
          { ownerUserId: auth.user.id },
          ...(labelIds.length > 0 ? [{ labelId: { in: labelIds } }] : []),
        ],
      };

  const releases = await prisma.release.findMany({
    where: releaseFilter,
    select: { id: true, status: true, releaseType: true },
  });

  const releaseIds = releases.map((r) => r.id);

  const [totalTracks, royaltyAgg, latestActivity, unreadNotifications] =
    await Promise.all([
      prisma.track.count({
        where: releaseIds.length > 0 ? { releaseId: { in: releaseIds } } : { releaseId: "__none__" },
      }),
      prisma.royaltyEntry.findMany({
        where: releaseIds.length > 0 ? { releaseId: { in: releaseIds } } : { releaseId: "__none__" },
        select: { streams: true, netRevenue: true, periodMonth: true },
      }),
      prisma.releaseActivity.findMany({
        where: releaseIds.length > 0 ? { releaseId: { in: releaseIds } } : { releaseId: "__none__" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          release: { select: { id: true, title: true } },
          actor: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.notification.count({
        where: { userId: auth.user.id, isRead: false },
      }),
    ]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Use latest available period if current month has no imported statements yet
  const latestPeriod =
    royaltyAgg.length > 0
      ? royaltyAgg.map((r) => r.periodMonth).sort().reverse()[0]
      : currentMonth;

  const totalStreams = royaltyAgg.reduce((acc, r) => acc + r.streams, 0);
  const totalRevenue = royaltyAgg.reduce((acc, r) => acc + r.netRevenue, 0);
  const monthlyRevenue = royaltyAgg
    .filter((r) => r.periodMonth === (royaltyAgg.some((x) => x.periodMonth === currentMonth) ? currentMonth : latestPeriod))
    .reduce((acc, r) => acc + r.netRevenue, 0);

  const pendingStatuses = new Set(["SUBMITTED", "UNDER_REVIEW", "PROCESSING"]);
  const approvedStatuses = new Set(["APPROVED", "SCHEDULED", "DELIVERED", "LIVE"]);

  return NextResponse.json({
    metrics: {
      totalReleases: releases.length,
      totalTracks,
      totalStreams,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
      monthlyPeriod: royaltyAgg.some((x) => x.periodMonth === currentMonth)
        ? currentMonth
        : latestPeriod,
      pendingReleases: releases.filter((r) => pendingStatuses.has(r.status)).length,
      approvedReleases: releases.filter((r) => approvedStatuses.has(r.status)).length,
      rejectedReleases: releases.filter((r) => r.status === "REJECTED").length,
      draftReleases: releases.filter((r) => r.status === "DRAFT").length,
      unreadNotifications,
    },
    latestActivity,
  });
}
