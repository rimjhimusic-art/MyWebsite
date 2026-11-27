import { createCmsCollectionHandlers } from "@/lib/cms-crud";

const handlers = createCmsCollectionHandlers({
  table: "brandVideo",
  entityType: "BrandVideo",
  sanitizeCreate: (body) => {
    const title = String(body.title || "").trim();
    const videoUrl = String(body.videoUrl || "").trim();
    const thumbnailUrl = String(body.thumbnailUrl || "").trim();
    if (!title || !videoUrl || !thumbnailUrl) {
      throw new Error("Video title, video URL, and thumbnail image are required.");
    }
    return {
      title,
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null,
      videoUrl,
      thumbnailUrl,
      creatorName:
        typeof body.creatorName === "string" && body.creatorName.trim()
          ? body.creatorName.trim()
          : null,
      featured: Boolean(body.featured),
      published: body.published !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    };
  },
  sanitizeUpdate: (body) => {
    const out: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) out.title = body.title.trim();
    if ("description" in body) {
      out.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }
    if (typeof body.videoUrl === "string" && body.videoUrl.trim()) {
      out.videoUrl = body.videoUrl.trim();
    }
    if (typeof body.thumbnailUrl === "string" && body.thumbnailUrl.trim()) {
      out.thumbnailUrl = body.thumbnailUrl.trim();
    }
    if ("creatorName" in body) {
      out.creatorName =
        typeof body.creatorName === "string" && body.creatorName.trim()
          ? body.creatorName.trim()
          : null;
    }
    if (typeof body.featured === "boolean") out.featured = body.featured;
    if (typeof body.published === "boolean") out.published = body.published;
    if (typeof body.sortOrder === "number") out.sortOrder = body.sortOrder;
    return out;
  },
});

export const { GET, POST, PATCH, DELETE } = handlers;
