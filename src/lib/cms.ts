import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const CMS_PUBLIC_REVALIDATE_PATHS = [
  "/",
  "/about",
  "/brand",
  "/services",
  "/plan",
  "/control",
  "/signup",
  "/login",
  "/terms",
  "/privacy",
  "/faq",
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
  return hasPermission(user.role, "cms:manage");
}

export async function requireCmsApiAuth(request?: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!hasPermission(user.role, "cms:manage")) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden: CMS permission required" }, { status: 403 }) };
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

export async function getCmsSiteData(options?: { preview?: boolean }) {
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
    siteName: "OneTab Media Network",
    tagline:
      "India's leading digital music distribution partner empowering independent artists and labels globally with enterprise-grade technology.",
    headerLogoUrl: "/ref/logo.png",
    headerLogoWidth: 118,
    headerLogoHeight: 40,
    footerLogoUrl: "/ref/logo.png",
    footerLogoWidth: 118,
    footerLogoHeight: 40,
    faviconUrl: "/ref/logo.png",
    contactEmail: "support@onetabmedia.in",
    contactPhone: "+91 70470 13399",
    contactAddress: "West Bengal, India",
    instagramUrl: "https://www.instagram.com/onetab.media/",
    facebookUrl: "https://www.facebook.com/onetabmedia/",
    whatsappUrl: "https://wa.me/917047013399",
    youtubeUrl: "",
    copyrightText: "© 2026 OneTab Media Network Pvt. Ltd. All Rights Reserved.",
    draftStatus: "PUBLISHED",
    draftJson: null as string | null,
    lastPublishedAt: null as Date | null,
    lastPublishedById: null as string | null,
    updatedAt: new Date(),
  };

  const settings = settingsRow
    ? applyDraftOverlay(settingsRow, allowPreview) || defaultSettings
    : defaultSettings;

  const navigation = mapDraftList(navRows, allowPreview).filter((n) => n.enabled);
  const sections = mapDraftList(sectionRows, allowPreview).filter((s) => s.enabled);
  const artists = mapDraftList(artistRows, allowPreview).filter((a) => a.published);
  const stores = mapDraftList(storeRows, allowPreview).filter((s) => s.enabled);
  const services = mapDraftList(serviceRows, allowPreview).filter((s) => s.published);
  const team = mapDraftList(teamRows, allowPreview).filter((t) => t.published);
  const brandCreators = mapDraftList(brandCreatorRows, allowPreview).filter((b) => b.published);
  const plans = mapDraftList(planRows, allowPreview).filter((p) => p.published);
  const controls = mapDraftList(controlRows, allowPreview).filter((c) => c.published);
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
