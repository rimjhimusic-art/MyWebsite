import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export async function GET() {
  const auth = await requirePermission("dashboard:view");
  if (auth.error) return auth.error;

  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const [
    totalUsers,
    totalArtists,
    totalLabels,
    totalReleases,
    pendingReleases,
    liveReleases,
    openTickets,
    pendingPayouts,
    royaltySum,
    openClaims,
    pendingVevo,
    pendingYoutube,
    recentLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.artist.count(),
    prisma.label.count(),
    prisma.release.count(),
    prisma.release.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.release.count({ where: { status: "LIVE" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.payment.count({ where: { status: { in: ["REQUESTED", "PROCESSING"] } } }),
    prisma.royaltyEntry.aggregate({ _sum: { netRevenue: true, streams: true } }),
    prisma.rightsClaim.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    prisma.vevoSubmission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "PENDING_PARTNER_AUTH"] } } }),
    prisma.youtubeRequest.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "PENDING_PARTNER_AUTH"] } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalUsers,
      totalArtists,
      totalLabels,
      totalReleases,
      pendingReleases,
      liveReleases,
      openTickets,
      pendingPayouts,
      totalStreams: royaltySum._sum.streams || 0,
      totalNetRevenue: Number((royaltySum._sum.netRevenue || 0).toFixed(2)),
      openClaims,
      pendingVevo,
      pendingYoutube,
    },
    recentLogs,
  });
}
