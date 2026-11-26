import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { countPendingCmsDrafts, getCmsSiteData, requireCmsApiAuth } from "@/lib/cms";

export async function GET(request: Request) {
  const auth = await requireCmsApiAuth(request);
  if (!auth.ok) return auth.response;

  const [siteData, pendingDrafts, revisions] = await Promise.all([
    getCmsSiteData({ preview: true }),
    countPendingCmsDrafts(),
    prisma.cmsRevision.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, summary: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    ...siteData,
    pendingDrafts,
    revisions,
  });
}
