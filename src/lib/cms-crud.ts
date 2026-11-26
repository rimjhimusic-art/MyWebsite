import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import {
  applyDraftOverlay,
  CMS_PUBLIC_REVALIDATE_PATHS,
  countPendingCmsDrafts,
  requireCmsApiAuth,
} from "@/lib/cms";

export function revalidatePublicCmsPaths() {
  for (const p of CMS_PUBLIC_REVALIDATE_PATHS) {
    revalidatePath(p);
  }
}

export function buildDraftPatch(
  existing: { draftStatus: string; draftJson: string | null },
  updates: Record<string, unknown>,
  mode: "draft" | "publish"
) {
  if (mode === "publish") {
    return {
      ...updates,
      draftStatus: "PUBLISHED",
      draftJson: null,
    };
  }
  let currentOverlay: Record<string, unknown> = {};
  if (existing.draftJson) {
    try {
      currentOverlay = JSON.parse(existing.draftJson) as Record<string, unknown>;
    } catch {
      currentOverlay = {};
    }
  }
  const mergedOverlay = { ...currentOverlay, ...updates };
  if (existing.draftStatus === "DRAFT") {
    return {
      ...updates,
      draftStatus: "DRAFT",
      draftJson: null,
    };
  }
  return {
    draftStatus: "DRAFT",
    draftJson: JSON.stringify(mergedOverlay),
  };
}

export function normalizeUrlInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type CmsTableKey =
  | "navigationItem"
  | "pageSection"
  | "featuredArtist"
  | "digitalStore"
  | "cmsService"
  | "teamMember"
  | "brandCreator"
  | "distributionPlan"
  | "controlFeature"
  | "seoSetting";

export function createCmsCollectionHandlers<
  T extends { id: string; draftStatus: string; draftJson: string | null; sortOrder?: number }
>(params: {
  table: CmsTableKey;
  entityType: string;
  hasSortOrder?: boolean;
  sanitizeCreate: (body: Record<string, unknown>) => Record<string, unknown>;
  sanitizeUpdate: (body: Record<string, unknown>) => Record<string, unknown>;
}) {
  const { table, entityType, hasSortOrder = true, sanitizeCreate, sanitizeUpdate } = params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = prisma[table] as any;

  async function GET(request: Request) {
    const auth = await requireCmsApiAuth(request);
    if (!auth.ok) return auth.response;

    const rows = (await model.findMany(
      hasSortOrder ? { orderBy: { sortOrder: "asc" } } : undefined
    )) as T[];
    const items = rows
      .map((r) => {
        const overlaid = applyDraftOverlay(r, true);
        if (!overlaid) return null;
        return { ...overlaid, _draftStatus: r.draftStatus, _hasDraft: r.draftStatus !== "PUBLISHED" || Boolean(r.draftJson) };
      })
      .filter(Boolean);

    const pendingDrafts = await countPendingCmsDrafts();
    return NextResponse.json({ items, pendingDrafts });
  }

  async function POST(request: Request) {
    const auth = await requireCmsApiAuth(request);
    if (!auth.ok) return auth.response;

    try {
      const body = (await request.json()) as Record<string, unknown>;
      const mode: "draft" | "publish" = body.mode === "publish" ? "publish" : "draft";
      const data = sanitizeCreate(body);

      if (hasSortOrder && typeof data.sortOrder !== "number") {
        const count = await model.count();
        data.sortOrder = count + 1;
      }

      const created = await model.create({
        data: {
          ...data,
          draftStatus: mode === "publish" ? "PUBLISHED" : "DRAFT",
          draftJson: null,
        },
      });

      await recordAuditLog({
        actorUserId: auth.user.id,
        action: `CMS_${entityType.toUpperCase()}_CREATE`,
        entityType,
        entityId: created.id,
        metadata: { mode },
      });

      if (mode === "publish") revalidatePublicCmsPaths();
      const pendingDrafts = await countPendingCmsDrafts();
      return NextResponse.json({ item: created, pendingDrafts }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create CMS item.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  async function PATCH(request: Request) {
    const auth = await requireCmsApiAuth(request);
    if (!auth.ok) return auth.response;

    try {
      const body = (await request.json()) as Record<string, unknown>;
      const mode: "draft" | "publish" = body.mode === "publish" ? "publish" : "draft";

      if (body.action === "reorder" && Array.isArray(body.ids) && hasSortOrder) {
        const ids = body.ids.filter((x): x is string => typeof x === "string");
        for (let i = 0; i < ids.length; i++) {
          const existing = (await model.findUnique({ where: { id: ids[i] } })) as T | null;
          if (!existing) continue;
          const patch = buildDraftPatch(existing, { sortOrder: i + 1 }, mode);
          await model.update({ where: { id: ids[i] }, data: patch });
        }
        await recordAuditLog({
          actorUserId: auth.user.id,
          action: `CMS_${entityType.toUpperCase()}_REORDER`,
          entityType,
          metadata: { ids, mode },
        });
        if (mode === "publish") revalidatePublicCmsPaths();
        const pendingDrafts = await countPendingCmsDrafts();
        return NextResponse.json({ ok: true, pendingDrafts });
      }

      const id = typeof body.id === "string" ? body.id : "";
      if (!id) {
        return NextResponse.json({ error: "Item id is required." }, { status: 400 });
      }

      const existing = (await model.findUnique({ where: { id } })) as T | null;
      if (!existing) {
        return NextResponse.json({ error: `${entityType} not found.` }, { status: 404 });
      }

      const updates = sanitizeUpdate(body);
      const patch = buildDraftPatch(existing, updates, mode);
      const updated = await model.update({ where: { id }, data: patch });

      await recordAuditLog({
        actorUserId: auth.user.id,
        action: `CMS_${entityType.toUpperCase()}_UPDATE`,
        entityType,
        entityId: id,
        metadata: { mode, fields: Object.keys(updates) },
      });

      if (mode === "publish") revalidatePublicCmsPaths();
      const pendingDrafts = await countPendingCmsDrafts();
      return NextResponse.json({
        item: applyDraftOverlay(updated, true),
        pendingDrafts,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update CMS item.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  async function DELETE(request: Request) {
    const auth = await requireCmsApiAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const mode = searchParams.get("mode") === "publish" ? "publish" : "draft";
    if (!id) {
      return NextResponse.json({ error: "Item id is required." }, { status: 400 });
    }

    const existing = (await model.findUnique({ where: { id } })) as T | null;
    if (!existing) {
      return NextResponse.json({ error: `${entityType} not found.` }, { status: 404 });
    }

    if (mode === "publish" || existing.draftStatus === "DRAFT") {
      await model.delete({ where: { id } });
      if (mode === "publish") revalidatePublicCmsPaths();
    } else {
      await model.update({
        where: { id },
        data: { draftStatus: "PENDING_DELETE" },
      });
    }

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: `CMS_${entityType.toUpperCase()}_DELETE`,
      entityType,
      entityId: id,
      metadata: { mode },
    });

    const pendingDrafts = await countPendingCmsDrafts();
    return NextResponse.json({ ok: true, pendingDrafts });
  }

  return { GET, POST, PATCH, DELETE };
}
