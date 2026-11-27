import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { getAccessibleLabelIds } from "@/lib/labels";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format");

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
    select: { id: true },
  });

  const releaseIds = releases.map((r) => r.id);

  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const entries = await prisma.royaltyEntry.findMany({
    where: {
      ...(isAdmin
        ? {}
        : releaseIds.length > 0
        ? { releaseId: { in: releaseIds } }
        : { releaseId: "__none__" }),
      ...(Object.keys(dateFilter).length > 0 ? { reportDate: dateFilter } : {}),
    },
    include: {
      release: { select: { id: true, title: true } },
      track: { select: { id: true, title: true, isrc: true } },
      store: { select: { id: true, name: true } },
    },
    orderBy: { reportDate: "asc" },
  });

  if (format === "csv") {
    const header =
      "Period,ReportDate,Release,Track,ISRC,Platform,Country,Streams,GrossUSD,NetUSD\n";
    const rows = entries
      .map((e) =>
        [
          e.periodMonth,
          e.reportDate.toISOString().slice(0, 10),
          `"${(e.release?.title || "").replace(/"/g, '""')}"`,
          `"${(e.track?.title || "").replace(/"/g, '""')}"`,
          e.track?.isrc || "",
          `"${e.store?.name || "Other"}"`,
          `"${e.countryName}"`,
          e.streams,
          e.grossRevenue.toFixed(2),
          e.netRevenue.toFixed(2),
        ].join(",")
      )
      .join("\n");

    return new NextResponse(header + rows, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="goldex-analytics.csv"',
      },
    });
  }

  const byTrack: Record<string, { title: string; streams: number; revenue: number }> = {};
  const byPlatform: Record<string, { name: string; streams: number; revenue: number }> = {};
  const byCountry: Record<string, { country: string; streams: number; revenue: number }> = {};
  const byDate: Record<string, { date: string; streams: number; revenue: number }> = {};

  let totalStreams = 0;
  let totalRevenue = 0;

  for (const e of entries) {
    totalStreams += e.streams;
    totalRevenue += e.netRevenue;

    const tName = e.track?.title || e.release?.title || "Track";
    byTrack[tName] ??= { title: tName, streams: 0, revenue: 0 };
    byTrack[tName].streams += e.streams;
    byTrack[tName].revenue += e.netRevenue;

    const pName = e.store?.name || "Other";
    byPlatform[pName] ??= { name: pName, streams: 0, revenue: 0 };
    byPlatform[pName].streams += e.streams;
    byPlatform[pName].revenue += e.netRevenue;

    const cName = e.countryName || e.countryCode;
    byCountry[cName] ??= { country: cName, streams: 0, revenue: 0 };
    byCountry[cName].streams += e.streams;
    byCountry[cName].revenue += e.netRevenue;

    const dKey = e.reportDate.toISOString().slice(0, 10);
    byDate[dKey] ??= { date: dKey, streams: 0, revenue: 0 };
    byDate[dKey].streams += e.streams;
    byDate[dKey].revenue += e.netRevenue;
  }

  return NextResponse.json({
    totalStreams,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    topTracks: Object.values(byTrack).sort((a, b) => b.streams - a.streams),
    platforms: Object.values(byPlatform).sort((a, b) => b.streams - a.streams),
    countries: Object.values(byCountry).sort((a, b) => b.streams - a.streams),
    timeline: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
  });
}
