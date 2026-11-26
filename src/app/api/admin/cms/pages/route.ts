import { createCmsCollectionHandlers, normalizeUrlInput } from "@/lib/cms-crud";

const handlers = createCmsCollectionHandlers({
  table: "pageSection",
  entityType: "PageSection",
  sanitizeCreate: (body) => {
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
  },
  sanitizeUpdate: (body) => {
    const out: Record<string, unknown> = {};
    const strFields = ["title", "subtitle", "badgeText", "bodyHtml", "ctaLabel", "ctaHref", "cta2Label", "cta2Href", "mediaUrl", "mediaType", "bgColor", "textColor", "fontSize", "extraJson"] as const;
    for (const f of strFields) {
      if (f in body) out[f] = body[f] === null ? null : String(body[f]);
    }
    if (typeof body.enabled === "boolean") out.enabled = body.enabled;
    if (typeof body.sortOrder === "number") out.sortOrder = body.sortOrder;
    return out;
  },
});

export const { GET, POST, PATCH, DELETE } = handlers;
