import { createCmsCollectionHandlers, normalizeUrlInput } from "@/lib/cms-crud";

const handlers = createCmsCollectionHandlers({
  table: "digitalStore",
  entityType: "DigitalStore",
  sanitizeCreate: (body) => {
    const name = String(body.name || "").trim();
    const logoUrl = String(body.logoUrl || "").trim();
    if (!name || !logoUrl) throw new Error("Store name and logo URL are required.");
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      name,
      slug: String(body.slug || `${baseSlug}-${Date.now().toString(36)}`),
      logoUrl,
      altText: typeof body.altText === "string" && body.altText.trim() ? body.altText.trim() : name,
      websiteUrl: normalizeUrlInput(body.websiteUrl),
      showInMarquee: body.showInMarquee !== false,
      showOnSignup: Boolean(body.showOnSignup),
      enabled: body.enabled !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    };
  },
  sanitizeUpdate: (body) => {
    const out: Record<string, unknown> = {};
    if (typeof body.name === "string") out.name = body.name.trim();
    if (typeof body.logoUrl === "string") out.logoUrl = body.logoUrl.trim();
    if (typeof body.altText === "string") out.altText = body.altText.trim();
    if ("websiteUrl" in body) out.websiteUrl = normalizeUrlInput(body.websiteUrl);
    if (typeof body.showInMarquee === "boolean") out.showInMarquee = body.showInMarquee;
    if (typeof body.showOnSignup === "boolean") out.showOnSignup = body.showOnSignup;
    if (typeof body.enabled === "boolean") out.enabled = body.enabled;
    if (typeof body.sortOrder === "number") out.sortOrder = body.sortOrder;
    return out;
  },
});

export const { GET, POST, PATCH, DELETE } = handlers;
