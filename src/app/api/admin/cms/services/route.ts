import { createCmsCollectionHandlers, normalizeUrlInput } from "@/lib/cms-crud";

const handlers = createCmsCollectionHandlers({
  table: "cmsService",
  entityType: "CmsService",
  sanitizeCreate: (body) => {
    const title = String(body.title || "").trim();
    if (!title) throw new Error("Service title is required.");
    const details = Array.isArray(body.details)
      ? JSON.stringify(body.details)
      : typeof body.detailsJson === "string"
      ? body.detailsJson
      : "[]";
    return {
      title,
      shortDesc: String(body.shortDesc || "").trim(),
      detailsJson: details,
      iconKey: String(body.iconKey || "music").trim(),
      accentTheme: String(body.accentTheme || "blue").trim(),
      imageUrl: normalizeUrlInput(body.imageUrl),
      ctaLabel: typeof body.ctaLabel === "string" ? body.ctaLabel.trim() || null : null,
      ctaHref: normalizeUrlInput(body.ctaHref),
      published: body.published !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    };
  },
  sanitizeUpdate: (body) => {
    const out: Record<string, unknown> = {};
    if (typeof body.title === "string") out.title = body.title.trim();
    if (typeof body.shortDesc === "string") out.shortDesc = body.shortDesc.trim();
    if (Array.isArray(body.details)) out.detailsJson = JSON.stringify(body.details);
    else if (typeof body.detailsJson === "string") out.detailsJson = body.detailsJson;
    if (typeof body.iconKey === "string") out.iconKey = body.iconKey.trim();
    if (typeof body.accentTheme === "string") out.accentTheme = body.accentTheme.trim();
    if ("imageUrl" in body) out.imageUrl = normalizeUrlInput(body.imageUrl);
    if ("ctaLabel" in body) out.ctaLabel = typeof body.ctaLabel === "string" ? body.ctaLabel.trim() || null : null;
    if ("ctaHref" in body) out.ctaHref = normalizeUrlInput(body.ctaHref);
    if (typeof body.published === "boolean") out.published = body.published;
    if (typeof body.sortOrder === "number") out.sortOrder = body.sortOrder;
    return out;
  },
});

export const { GET, POST, PATCH, DELETE } = handlers;
