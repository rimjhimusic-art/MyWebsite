import { NextResponse } from "next/server";
import { createCmsCollectionHandlers, normalizeUrlInput } from "@/lib/cms-crud";

const brandHandlers = createCmsCollectionHandlers({
  table: "brandCreator",
  entityType: "BrandCreator",
  sanitizeCreate: (b) => ({
    name: String(b.name || "").trim(),
    handle: typeof b.handle === "string" ? b.handle.trim() : null,
    category: typeof b.category === "string" ? b.category.trim() : null,
    imageUrl: String(b.imageUrl || "").trim(),
    videoUrl: normalizeUrlInput(b.videoUrl),
    published: b.published !== false,
  }),
  sanitizeUpdate: (b) => {
    const out: Record<string, unknown> = {};
    if (typeof b.name === "string") out.name = b.name.trim();
    if (typeof b.handle === "string") out.handle = b.handle.trim();
    if (typeof b.category === "string") out.category = b.category.trim();
    if (typeof b.imageUrl === "string") out.imageUrl = b.imageUrl.trim();
    if ("videoUrl" in b) out.videoUrl = normalizeUrlInput(b.videoUrl);
    if (typeof b.published === "boolean") out.published = b.published;
    if (typeof b.sortOrder === "number") out.sortOrder = b.sortOrder;
    return out;
  },
});

const planHandlers = createCmsCollectionHandlers({
  table: "distributionPlan",
  entityType: "DistributionPlan",
  sanitizeCreate: (b) => {
    const name = String(b.name || "").trim();
    return {
      slug: String(b.slug || `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`),
      name,
      priceLabel: String(b.priceLabel || "₹0*"),
      billingCycle: String(b.billingCycle || "/year"),
      badgeText: typeof b.badgeText === "string" ? b.badgeText : null,
      description: String(b.description || ""),
      featuresJson: Array.isArray(b.features) ? JSON.stringify(b.features) : String(b.featuresJson || "[]"),
      ctaLabel: String(b.ctaLabel || "Get Started"),
      ctaHref: String(b.ctaHref || "/signup"),
      highlighted: Boolean(b.highlighted),
      published: b.published !== false,
    };
  },
  sanitizeUpdate: (b) => {
    const out: Record<string, unknown> = {};
    for (const f of ["name", "priceLabel", "billingCycle", "badgeText", "description", "ctaLabel", "ctaHref"]) {
      if (typeof b[f] === "string") out[f] = b[f];
    }
    if (Array.isArray(b.features)) out.featuresJson = JSON.stringify(b.features);
    else if (typeof b.featuresJson === "string") out.featuresJson = b.featuresJson;
    if (typeof b.highlighted === "boolean") out.highlighted = b.highlighted;
    if (typeof b.published === "boolean") out.published = b.published;
    if (typeof b.sortOrder === "number") out.sortOrder = b.sortOrder;
    return out;
  },
});

const controlHandlers = createCmsCollectionHandlers({
  table: "controlFeature",
  entityType: "ControlFeature",
  sanitizeCreate: (b) => ({
    title: String(b.title || "").trim(),
    description: String(b.description || "").trim(),
    iconKey: String(b.iconKey || "shield-check"),
    ctaLabel: typeof b.ctaLabel === "string" ? b.ctaLabel : null,
    ctaHref: normalizeUrlInput(b.ctaHref),
    published: b.published !== false,
  }),
  sanitizeUpdate: (b) => {
    const out: Record<string, unknown> = {};
    for (const f of ["title", "description", "iconKey", "ctaLabel"]) {
      if (typeof b[f] === "string") out[f] = b[f];
    }
    if ("ctaHref" in b) out.ctaHref = normalizeUrlInput(b.ctaHref);
    if (typeof b.published === "boolean") out.published = b.published;
    if (typeof b.sortOrder === "number") out.sortOrder = b.sortOrder;
    return out;
  },
});

const seoHandlers = createCmsCollectionHandlers({
  table: "seoSetting",
  entityType: "SeoSetting",
  hasSortOrder: false,
  sanitizeCreate: (b) => ({
    pageSlug: String(b.pageSlug || "").trim().toLowerCase(),
    metaTitle: String(b.metaTitle || "").trim(),
    metaDescription: String(b.metaDescription || "").trim(),
    ogTitle: typeof b.ogTitle === "string" ? b.ogTitle : null,
    ogDescription: typeof b.ogDescription === "string" ? b.ogDescription : null,
    ogImageUrl: normalizeUrlInput(b.ogImageUrl),
    canonicalUrl: normalizeUrlInput(b.canonicalUrl),
    noIndex: Boolean(b.noIndex),
  }),
  sanitizeUpdate: (b) => {
    const out: Record<string, unknown> = {};
    for (const f of ["metaTitle", "metaDescription", "ogTitle", "ogDescription"]) {
      if (typeof b[f] === "string") out[f] = b[f];
    }
    if ("ogImageUrl" in b) out.ogImageUrl = normalizeUrlInput(b.ogImageUrl);
    if ("canonicalUrl" in b) out.canonicalUrl = normalizeUrlInput(b.canonicalUrl);
    if (typeof b.noIndex === "boolean") out.noIndex = b.noIndex;
    return out;
  },
});

function pickHandler(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  if (type === "brand") return brandHandlers;
  if (type === "plans") return planHandlers;
  if (type === "controls") return controlHandlers;
  if (type === "seo") return seoHandlers;
  return null;
}

export async function GET(request: Request) {
  const h = pickHandler(request);
  if (!h) return NextResponse.json({ error: "Invalid collection type" }, { status: 400 });
  return h.GET(request);
}

export async function POST(request: Request) {
  const h = pickHandler(request);
  if (!h) return NextResponse.json({ error: "Invalid collection type" }, { status: 400 });
  return h.POST(request);
}

export async function PATCH(request: Request) {
  const h = pickHandler(request);
  if (!h) return NextResponse.json({ error: "Invalid collection type" }, { status: 400 });
  return h.PATCH(request);
}

export async function DELETE(request: Request) {
  const h = pickHandler(request);
  if (!h) return NextResponse.json({ error: "Invalid collection type" }, { status: 400 });
  return h.DELETE(request);
}
