import { createCmsCollectionHandlers, normalizeUrlInput } from "@/lib/cms-crud";

const handlers = createCmsCollectionHandlers({
  table: "featuredArtist",
  entityType: "FeaturedArtist",
  sanitizeCreate: (body) => {
    const name = String(body.name || "").trim();
    const roleBadge = String(body.roleBadge || "Independent Artist").trim();
    const bio = String(body.bio || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    if (!name || !bio || !imageUrl) {
      throw new Error("Artist name, bio, and portrait image are required.");
    }
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = String(body.slug || `${baseSlug}-${Date.now().toString(36)}`);
    return {
      slug,
      name,
      roleBadge,
      bio,
      imageUrl,
      verified: body.verified !== false,
      facebookUrl: normalizeUrlInput(body.facebookUrl),
      instagramUrl: normalizeUrlInput(body.instagramUrl),
      youtubeUrl: normalizeUrlInput(body.youtubeUrl),
      spotifyUrl: normalizeUrlInput(body.spotifyUrl),
      websiteUrl: normalizeUrlInput(body.websiteUrl),
      published: body.published !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    };
  },
  sanitizeUpdate: (body) => {
    const out: Record<string, unknown> = {};
    if (typeof body.name === "string") out.name = body.name.trim();
    if (typeof body.roleBadge === "string") out.roleBadge = body.roleBadge.trim();
    if (typeof body.bio === "string") out.bio = body.bio.trim();
    if (typeof body.imageUrl === "string") out.imageUrl = body.imageUrl.trim();
    if (typeof body.verified === "boolean") out.verified = body.verified;
    if (typeof body.published === "boolean") out.published = body.published;
    if (typeof body.sortOrder === "number") out.sortOrder = body.sortOrder;
    for (const f of ["facebookUrl", "instagramUrl", "youtubeUrl", "spotifyUrl", "websiteUrl"]) {
      if (f in body) out[f] = normalizeUrlInput(body[f]);
    }
    return out;
  },
});

export const { GET, POST, PATCH, DELETE } = handlers;
