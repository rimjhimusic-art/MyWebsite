import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertSectionScope, countPendingCmsDrafts, requireCmsApiAuth } from "@/lib/cms";
import { buildDraftPatch, createCmsCollectionHandlers, normalizeUrlInput, revalidatePublicCmsPaths } from "@/lib/cms-crud";

const sanitizeCreate = (body: Record<string, unknown>) => {
  const pageSlug = String(body.pageSlug || "").trim().toLowerCase();
  const sectionKey = String(body.sectionKey || "").trim().toLowerCase();
  if (!pageSlug || !sectionKey) throw new Error("pageSlug and sectionKey are required.");
  return {
    pageSlug,
    sectionKey,
    title: typeof body.title === "string" ? body.title : null,
    subtitle: typeof body.subtitle === "string" ? body.subtitle : null,
    badgeText: typeof body.badgeText === "string" ? body.badgeText : null,
    bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : null,
    ctaLabel: typeof body.ctaLabel === "string" ? body.ctaLabel : null,
    ctaHref: normalizeUrlInput(body.ctaHref),
    cta2Label: typeof body.cta2Label === "string" ? body.cta2Label : null,
    cta2Href: normalizeUrlInput(body.cta2Href),
    mediaUrl: normalizeUrlInput(body.mediaUrl),
    mediaType: typeof body.mediaType === "string" ? body.mediaType : null,
    bgColor: typeof body.bgColor === "string" ? body.bgColor : null,
    textColor: typeof body.textColor === "string" ? body.textColor : null,
    fontSize: typeof body.fontSize === "string" ? body.fontSize : null,
    extraJson: typeof body.extraJson === "string" ? body.extraJson : "{}",
    enabled: body.enabled !== false,
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
  };
};

const sanitizeUpdate = (body: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  const strFields = ["title", "subtitle", "badgeText", "bodyHtml", "ctaLabel", "ctaHref", "cta2Label", "cta2Href", "mediaUrl", "mediaType", "bgColor", "textColor", "fontSize", "extraJson"] as const;
  for (const f of strFields) {
    if (f in body) out[f] = body[f] === null ? null : String(body[f]);
  }
  if (typeof body.enabled === "boolean") out.enabled = body.enabled;
  if (typeof body.sortOrder === "number") out.sortOrder = body.sortOrder;
  return out;
};

const handlers = createCmsCollectionHandlers({
  table: "pageSection",
  entityType: "PageSection",
  sanitizeCreate,
  sanitizeUpdate,
});

export async function PATCH(request: Request) {
  const cloned = request.clone();
  const body = (await cloned.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.id === "string" && body.id.trim()) {
    return handlers.PATCH(request);
  }

  // Upsert by composite (pageSlug, sectionKey) when id is omitted (e.g. brand_form / about story)
  const auth = await requireCmsApiAuth(request);
  if (!auth.ok) return auth.response;

  const pageSlug = String(body.pageSlug || "").trim().toLowerCase();
  const sectionKey = String(body.sectionKey || "").trim().toLowerCase();
  if (!pageSlug || !sectionKey) {
    return NextResponse.json({ error: "Section id or pageSlug + sectionKey required." }, { status: 400 });
  }
  const denied = assertSectionScope(auth.user, pageSlug);
  if (denied) return denied;

  const mode: "draft" | "publish" = body.mode === "publish" ? "publish" : "draft";
  const existing = await prisma.pageSection.findUnique({
    where: { pageSlug_sectionKey: { pageSlug, sectionKey } },
  });

  if (!existing) {
    const createData = sanitizeCreate({ ...body, pageSlug, sectionKey });
    const item = await prisma.pageSection.create({
      data: {
        ...createData,
        draftStatus: mode === "publish" ? "PUBLISHED" : "DRAFT",
      },
    });
    if (mode === "publish") revalidatePublicCmsPaths();
    const pendingDrafts = await countPendingCmsDrafts();
    return NextResponse.json({ item, pendingDrafts });
  }

  const updates = sanitizeUpdate(body);
  const patch = buildDraftPatch(existing, updates, mode);
  const item = await prisma.pageSection.update({
    where: { id: existing.id },
    data: patch,
  });
  if (mode === "publish") revalidatePublicCmsPaths();
  const pendingDrafts = await countPendingCmsDrafts();
  return NextResponse.json({ item, pendingDrafts });
}

export const { GET, POST, DELETE } = handlers;
