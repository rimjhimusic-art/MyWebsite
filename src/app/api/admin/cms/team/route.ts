import { createCmsCollectionHandlers, normalizeUrlInput } from "@/lib/cms-crud";

const handlers = createCmsCollectionHandlers({
  table: "teamMember",
  entityType: "TeamMember",
  sanitizeCreate: (body) => {
    const name = String(body.name || "").trim();
    const role = String(body.role || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    if (!name || !role || !imageUrl) throw new Error("Name, role, and portrait photo are required.");
    return {
      name,
      role,
      bio: typeof body.bio === "string" ? body.bio.trim() : "",
      imageUrl,
      linkedinUrl: normalizeUrlInput(body.linkedinUrl),
      published: body.published !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    };
  },
  sanitizeUpdate: (body) => {
    const out: Record<string, unknown> = {};
    if (typeof body.name === "string") out.name = body.name.trim();
    if (typeof body.role === "string") out.role = body.role.trim();
    if (typeof body.bio === "string") out.bio = body.bio.trim();
    if (typeof body.imageUrl === "string") out.imageUrl = body.imageUrl.trim();
    if ("linkedinUrl" in body) out.linkedinUrl = normalizeUrlInput(body.linkedinUrl);
    if (typeof body.published === "boolean") out.published = body.published;
    if (typeof body.sortOrder === "number") out.sortOrder = body.sortOrder;
    return out;
  },
});

export const { GET, POST, PATCH, DELETE } = handlers;
