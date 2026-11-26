import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { countPendingCmsDrafts, getCmsSiteData, requireCmsApiAuth } from "@/lib/cms";
import { revalidatePublicCmsPaths } from "@/lib/cms-crud";

const COLLECTIONS = [
  "navigationItem",
  "pageSection",
  "featuredArtist",
  "digitalStore",
  "cmsService",
  "teamMember",
  "brandCreator",
  "distributionPlan",
  "controlFeature",
  "seoSetting",
] as const;

export async function POST(request: Request) {
  const rawBody = await request.clone().json().catch(() => ({}));
  const action = rawBody?.action === "discard" ? "discard" : "publish";
  const auth = await requireCmsApiAuth(request, {
    resource: "cms",
    action: action === "publish" ? "publish" : "edit",
  });
  if (!auth.ok) return auth.response;

  const body = rawBody;

  if (action === "publish") {
    await prisma.$transaction(async (tx) => {
      const ws = await tx.websiteSettings.findUnique({ where: { id: "default" } });
      if (ws && (ws.draftStatus !== "PUBLISHED" || ws.draftJson)) {
        const overlay = ws.draftJson ? JSON.parse(ws.draftJson) : {};
        await tx.websiteSettings.update({
          where: { id: "default" },
          data: {
            ...overlay,
            draftStatus: "PUBLISHED",
            draftJson: null,
            lastPublishedAt: new Date(),
            lastPublishedById: auth.user.id,
          },
        });
      }

      for (const table of COLLECTIONS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = tx[table] as any;
        await model.deleteMany({ where: { draftStatus: "PENDING_DELETE" } });
        const pendingRows = await model.findMany({
          where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] },
        });
        for (const row of pendingRows) {
          const overlay = row.draftJson ? JSON.parse(row.draftJson) : {};
          delete overlay.id;
          delete overlay.createdAt;
          delete overlay.updatedAt;
          await model.update({
            where: { id: row.id },
            data: {
              ...overlay,
              draftStatus: "PUBLISHED",
              draftJson: null,
            },
          });
        }
      }
    });

    const snapshot = await getCmsSiteData({ preview: false });
    await prisma.cmsRevision.create({
      data: {
        summary: `Published CMS changes by ${auth.user.email}`,
        actorUserId: auth.user.id,
        snapshotJson: JSON.stringify(snapshot),
      },
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CMS_PUBLISH_ALL",
      entityType: "CMS",
      metadata: { publishedBy: auth.user.email },
    });

    revalidatePublicCmsPaths();
    return NextResponse.json({ ok: true, action: "publish", pendingDrafts: 0 });
  }

  // Discard drafts
  await prisma.$transaction(async (tx) => {
    await tx.websiteSettings.updateMany({
      where: { id: "default" },
      data: { draftStatus: "PUBLISHED", draftJson: null },
    });

    for (const table of COLLECTIONS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = tx[table] as any;
      // Newly created un-published drafts have draftStatus === "DRAFT" and draftJson === null
      await model.deleteMany({
        where: { draftStatus: "DRAFT", draftJson: null },
      });
      await model.updateMany({
        where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] },
        data: { draftStatus: "PUBLISHED", draftJson: null },
      });
    }
  });

  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CMS_DISCARD_DRAFTS",
    entityType: "CMS",
  });

  const pendingDrafts = await countPendingCmsDrafts();
  return NextResponse.json({ ok: true, action: "discard", pendingDrafts });
}
