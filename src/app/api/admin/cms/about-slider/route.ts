import { createCmsCollectionHandlers } from "@/lib/cms-crud";

const handlers = createCmsCollectionHandlers({
  table: "aboutSliderImage",
  entityType: "AboutSliderImage",
  sanitizeCreate: (body) => {
    const imageUrl = String(body.imageUrl || "").trim();
    if (!imageUrl) {
      throw new Error("Slider image URL is required.");
    }
    return {
      imageUrl,
      title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : null,
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null,
      enabled: body.enabled !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    };
  },
  sanitizeUpdate: (body) => {
    const out: Record<string, unknown> = {};
    if (typeof body.imageUrl === "string" && body.imageUrl.trim()) {
      out.imageUrl = body.imageUrl.trim();
    }
    if ("title" in body) {
      out.title =
        typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
    }
    if ("description" in body) {
      out.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }
    if (typeof body.enabled === "boolean") out.enabled = body.enabled;
    if (typeof body.sortOrder === "number") out.sortOrder = body.sortOrder;
    return out;
  },
});

export const { GET, POST, PATCH, DELETE } = handlers;
