import { createCmsCollectionHandlers } from "@/lib/cms-crud";

const handlers = createCmsCollectionHandlers({
  table: "navigationItem",
  entityType: "NavigationItem",
  sanitizeCreate: (body) => {
    const label = String(body.label || "").trim();
    const href = String(body.href || "").trim();
    if (!label || !href) throw new Error("Label and URL path are required.");
    return {
      location: body.location === "FOOTER_QUICK" ? "FOOTER_QUICK" : "HEADER",
      label,
      href,
      isButton: Boolean(body.isButton),
      openNewTab: Boolean(body.openNewTab),
      enabled: body.enabled !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    };
  },
  sanitizeUpdate: (body) => {
    const out: Record<string, unknown> = {};
    if (typeof body.location === "string") out.location = body.location;
    if (typeof body.label === "string") out.label = body.label.trim();
    if (typeof body.href === "string") out.href = body.href.trim();
    if (typeof body.isButton === "boolean") out.isButton = body.isButton;
    if (typeof body.openNewTab === "boolean") out.openNewTab = body.openNewTab;
    if (typeof body.enabled === "boolean") out.enabled = body.enabled;
    if (typeof body.sortOrder === "number") out.sortOrder = body.sortOrder;
    return out;
  },
});

export const { GET, POST, PATCH, DELETE } = handlers;
