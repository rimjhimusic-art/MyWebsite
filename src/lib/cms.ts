import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, type AuthenticatedUser } from "@/lib/auth";
import { ensureCmsBaselineIfEmpty } from "@/lib/cms-bootstrap";
import { userHasAnyPermission, type Permission } from "@/lib/permissions";

export const CMS_PUBLIC_REVALIDATE_PATHS = [
  "/",
  "/about",
  "/brand",
  "/updates",
  "/services",
  "/plan",
  "/control",
  "/signup",
  "/login",
  "/terms",
  "/privacy",
  "/faq",
  "/help",
  "/careers",
  "/contact",
];

export interface DraftCapableRow {
  draftStatus?: string;
  draftJson?: string | null;
}

export function applyDraftOverlay<T extends DraftCapableRow>(
  row: T,
  preview: boolean
): T | null {
  if (!preview) {
    if (row.draftStatus === "DRAFT") {
      return null;
    }
    return row;
  }

  if (row.draftStatus === "PENDING_DELETE") {
    return null;
  }

  if (row.draftJson) {
    try {
      const overlay = JSON.parse(row.draftJson) as Partial<T>;
      return { ...row, ...overlay };
    } catch {
      return row;
    }
  }

  return row;
}

export function mapDraftList<T extends DraftCapableRow & { sortOrder?: number }>(
  rows: T[],
  preview: boolean
): T[] {
  const mapped = rows
    .map((r) => applyDraftOverlay(r, preview))
    .filter((r): r is T => r !== null);

  if (preview) {
    mapped.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  return mapped;
}

export async function canUserPreviewCms(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return userHasAnyPermission(user, [
    "cms:view",
    "cms:edit",
    "cms:publish",
    "cms:manage",
    "media:view",
    "settings:view",
    "settings:edit",
  ]);
}

export function assertSectionScope(user: AuthenticatedUser, pageSlug?: string | null): Response | null {
  if (user.role === "SUPER_ADMIN" || !pageSlug || !user.allowedSections) return null;
  if (!user.allowedSections.includes(pageSlug.toLowerCase())) {
    return NextResponse.json(
      { error: `Forbidden: you only have edit permission for sections [${user.allowedSections.join(", ")}].` },
      { status: 403 }
    );
  }
  return null;
}

export async function requireCmsApiAuth(
  request?: Request,
  options?: {
    resource?: "cms" | "media" | "settings";
    action?: "view" | "add" | "edit" | "delete" | "publish";
    allowOverviewRoles?: boolean;
  }
) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const resource = options?.resource || "cms";
  const methodActionMap: Record<string, "view" | "add" | "edit" | "delete"> = {
    GET: "view",
    POST: "add",
    PATCH: "edit",
    PUT: "edit",
    DELETE: "delete",
  };
  const action = options?.action || (request ? methodActionMap[request.method] || "view" : "edit");

  const required: Permission[] = [`${resource}:${action}` as Permission, `${resource}:manage` as Permission];
  if (resource === "cms") {
    required.push("cms:manage");
  }
  if (options?.allowOverviewRoles) {
    required.push("media:view", "settings:view");
  }

  if (!userHasAnyPermission(user, required)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: `Forbidden: missing permission (${resource}:${action}).` },
        { status: 403 }
      ),
    };
  }
  if (request && request.method !== "GET") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return { ok: false as const, response: NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 }) };
    }
  }
  return { ok: true as const, user };
}

export function buildDynamicCopyrightText(
  companyName?: string | null,
  year?: number | null,
  fallbackText?: string | null
): string {
  const cleanCompany = (companyName || "").trim();
  if (cleanCompany && year) {
    return `© ${year} ${cleanCompany} All Right Reserved`;
  }
  return (
    fallbackText ||
    "© 2026 Goldex Media Network Private Limited All Right Reserved"
  );
}

export function buildWhatsappHref(
  phone?: string | null,
  explicitUrl?: string | null,
  usePhone = true
): string {
  if (usePhone && phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 7) {
      return `https://wa.me/${digits}`;
    }
  }
  return explicitUrl || "https://wa.me/918724804659";
}

export async function getCmsSiteData(options?: { preview?: boolean }) {
  await ensureCmsBaselineIfEmpty();
  const allowPreview = options?.preview ? await canUserPreviewCms() : false;

  const [
    settingsRow,
    navRows,
    sectionRows,
    artistRows,
    storeRows,
    serviceRows,
    teamRows,
    brandCreatorRows,
    planRows,
    controlRows,
    seoRows,
    faqRows,
  ] = await Promise.all([
    prisma.websiteSettings.findUnique({ where: { id: "default" } }),
    prisma.navigationItem.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.pageSection.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.featuredArtist.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.digitalStore.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.cmsService.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.teamMember.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.brandCreator.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.distributionPlan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.controlFeature.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.seoSetting.findMany(),
    prisma.faqItem.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const defaultSettings = {
    id: "default",
    siteName: "Goldex Media Network",
    tagline:
      "India's leading digital music distribution partner empowering independent artists and labels globally with enterprise-grade technology.",
    headerLogoUrl: "/ref/goldex-logo.svg",
    headerLogoWidth: 210,
    headerLogoHeight: 40,
    footerLogoUrl: "/ref/goldex-logo.svg",
    footerLogoWidth: 210,
    footerLogoHeight: 40,
    faviconUrl: "/ref/goldex-favicon.svg",
    contactEmail: "support@goldexmedianetwork.com",
    contactPhone: "+918724804659",
    contactAddress: "Assam, Guwahati, India",
    instagramUrl: "https://www.instagram.com/goldexmedianetwork/",
    facebookUrl: "https://www.facebook.com/goldexmedianetwork/",
    whatsappUrl: "https://wa.me/918724804659",
    youtubeUrl: "https://www.youtube.com/@GoldexMediaNetwork",
    instagramEnabled: true,
    facebookEnabled: true,
    whatsappEnabled: true,
    youtubeEnabled: true,
    socialOrderJson: JSON.stringify(["instagram", "facebook", "whatsapp", "youtube"]),
    whatsappUsePhone: true,
    copyrightCompanyName: "Goldex Media Network Private Limited",
    copyrightYear: 2026,
    copyrightText:
      "© 2026 Goldex Media Network Private Limited All Right Reserved",
    showNewUpdatesBadge: true,
    newUpdatesBadgeText: "NEW",
    newUpdatesBadgePulse: true,
    draftStatus: "PUBLISHED",
    draftJson: null as string | null,
    lastPublishedAt: null as Date | null,
    lastPublishedById: null as string | null,
    updatedAt: new Date(),
  };

  const rawSettings = settingsRow
    ? applyDraftOverlay(settingsRow, allowPreview) || defaultSettings
    : defaultSettings;

  const settings = {
    ...rawSettings,
    whatsappUrl: buildWhatsappHref(
      rawSettings.contactPhone,
      rawSettings.whatsappUrl,
      rawSettings.whatsappUsePhone ?? true
    ),
    copyrightText: buildDynamicCopyrightText(
      rawSettings.copyrightCompanyName,
      rawSettings.copyrightYear,
      rawSettings.copyrightText
    ),
  };

  // CRITICAL FIX: When allowPreview (or Admin CMS Studio) is active, NEVER strip unpublished/draft
  // items from artists, team, services, plans, controls, or stores; otherwise existing records vanish!
  const navigation = allowPreview
    ? mapDraftList(navRows, true)
    : mapDraftList(navRows, false).filter((n) => n.enabled);
  const sections = allowPreview
    ? mapDraftList(sectionRows, true)
    : mapDraftList(sectionRows, false).filter((s) => s.enabled);
  const artists = allowPreview
    ? mapDraftList(artistRows, true)
    : mapDraftList(artistRows, false).filter((a) => a.published);
  const stores = allowPreview
    ? mapDraftList(storeRows, true)
    : mapDraftList(storeRows, false).filter((s) => s.enabled);
  const services = allowPreview
    ? mapDraftList(serviceRows, true)
    : mapDraftList(serviceRows, false).filter((s) => s.published);
  const team = allowPreview
    ? mapDraftList(teamRows, true)
    : mapDraftList(teamRows, false).filter((t) => t.published);
  const brandCreators = allowPreview
    ? mapDraftList(brandCreatorRows, true)
    : mapDraftList(brandCreatorRows, false).filter((b) => b.published);
  const plans = allowPreview
    ? mapDraftList(planRows, true)
    : mapDraftList(planRows, false).filter((p) => p.published);
  const controls = allowPreview
    ? mapDraftList(controlRows, true)
    : mapDraftList(controlRows, false).filter((c) => c.published);
  const seoList = mapDraftList(seoRows, allowPreview);

  const sectionMap: Record<string, Record<string, typeof sections[number]>> = {};
  for (const sec of sections) {
    if (!sectionMap[sec.pageSlug]) sectionMap[sec.pageSlug] = {};
    sectionMap[sec.pageSlug][sec.sectionKey] = sec;
  }

  const seoMap: Record<string, typeof seoList[number]> = {};
  for (const seo of seoList) {
    seoMap[seo.pageSlug] = seo;
  }

  return {
    previewActive: allowPreview,
    settings,
    headerNav: navigation.filter((n) => n.location === "HEADER"),
    footerNav: navigation.filter((n) => n.location === "FOOTER_QUICK"),
    sections,
    sectionMap,
    artists,
    stores,
    services,
    team,
    brandCreators,
    plans,
    controls,
    seoMap,
    faqs: faqRows,
  };
}

export async function countPendingCmsDrafts(): Promise<number> {
  const [
    settingsCount,
    navCount,
    secCount,
    artistCount,
    storeCount,
    serviceCount,
    teamCount,
    brandCount,
    planCount,
    ctrlCount,
    seoCount,
  ] = await Promise.all([
    prisma.websiteSettings.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.navigationItem.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.pageSection.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.featuredArtist.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.digitalStore.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.cmsService.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.teamMember.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.brandCreator.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.distributionPlan.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.controlFeature.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
    prisma.seoSetting.count({ where: { OR: [{ draftStatus: { not: "PUBLISHED" } }, { draftJson: { not: null } }] } }),
  ]);
  return (
    settingsCount +
    navCount +
    secCount +
    artistCount +
    storeCount +
    serviceCount +
    teamCount +
    brandCount +
    planCount +
    ctrlCount +
    seoCount
  );
}

export async function findMediaReferences(fileUrl: string): Promise<string[]> {
  const refs: string[] = [];
  const settings = await prisma.websiteSettings.findUnique({ where: { id: "default" } });
  if (settings) {
    if (settings.headerLogoUrl === fileUrl || settings.draftJson?.includes(fileUrl)) refs.push("WebsiteSettings:headerLogo");
    if (settings.footerLogoUrl === fileUrl) refs.push("WebsiteSettings:footerLogo");
    if (settings.faviconUrl === fileUrl) refs.push("WebsiteSettings:favicon");
  }
  const [sections, artists, stores, services, team, creators, seo] = await Promise.all([
    prisma.pageSection.findMany({ where: { OR: [{ mediaUrl: fileUrl }, { draftJson: { contains: fileUrl } }, { extraJson: { contains: fileUrl } }] }, select: { pageSlug: true, sectionKey: true } }),
    prisma.featuredArtist.findMany({ where: { OR: [{ imageUrl: fileUrl }, { draftJson: { contains: fileUrl } }] }, select: { name: true } }),
    prisma.digitalStore.findMany({ where: { OR: [{ logoUrl: fileUrl }, { draftJson: { contains: fileUrl } }] }, select: { name: true } }),
    prisma.cmsService.findMany({ where: { OR: [{ imageUrl: fileUrl }, { draftJson: { contains: fileUrl } }] }, select: { title: true } }),
    prisma.teamMember.findMany({ where: { OR: [{ imageUrl: fileUrl }, { draftJson: { contains: fileUrl } }] }, select: { name: true } }),
    prisma.brandCreator.findMany({ where: { OR: [{ imageUrl: fileUrl }, { videoUrl: fileUrl }, { draftJson: { contains: fileUrl } }] }, select: { name: true } }),
    prisma.seoSetting.findMany({ where: { OR: [{ ogImageUrl: fileUrl }, { draftJson: { contains: fileUrl } }] }, select: { pageSlug: true } }),
  ]);
  for (const s of sections) refs.push(`PageSection:${s.pageSlug}.${s.sectionKey}`);
  for (const a of artists) refs.push(`FeaturedArtist:${a.name}`);
  for (const st of stores) refs.push(`DigitalStore:${st.name}`);
  for (const sv of services) refs.push(`Service:${sv.title}`);
  for (const tm of team) refs.push(`TeamMember:${tm.name}`);
  for (const cr of creators) refs.push(`BrandCreator:${cr.name}`);
  for (const se of seo) refs.push(`SEO:${se.pageSlug}`);
  return refs;
}
