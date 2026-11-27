import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { requireCmsApiAuth } from "@/lib/cms";
import { revalidatePublicCmsPaths } from "@/lib/cms-crud";

export async function GET(request: Request) {
  const auth = await requireCmsApiAuth(request);
  if (!auth.ok) return auth.response;

  const [
    settings,
    navigation,
    sections,
    artists,
    stores,
    services,
    team,
    brandCreators,
    plans,
    controls,
    seoSettings,
    faqs,
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
    prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      settings,
      navigation,
      sections,
      artists,
      stores,
      services,
      team,
      brandCreators,
      plans,
      controls,
      seoSettings,
      faqs,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireCmsApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const payload = await request.json();
    const data = payload?.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid CMS backup JSON payload." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (data.settings) {
        const s = data.settings;
        await tx.websiteSettings.upsert({
          where: { id: "default" },
          update: {
            siteName: s.siteName,
            tagline: s.tagline,
            headerLogoUrl: s.headerLogoUrl,
            headerLogoWidth: s.headerLogoWidth,
            headerLogoHeight: s.headerLogoHeight,
            footerLogoUrl: s.footerLogoUrl,
            footerLogoWidth: s.footerLogoWidth,
            footerLogoHeight: s.footerLogoHeight,
            faviconUrl: s.faviconUrl,
            contactEmail: s.contactEmail,
            contactPhone: s.contactPhone,
            contactAddress: s.contactAddress,
            instagramUrl: s.instagramUrl,
            facebookUrl: s.facebookUrl,
            whatsappUrl: s.whatsappUrl,
            youtubeUrl: s.youtubeUrl || "",
            copyrightText: s.copyrightText,
            copyrightCompanyName:
              s.copyrightCompanyName || "Goldex Media Network Private Limited",
            copyrightYear: Number(s.copyrightYear || 2026),
            instagramEnabled: s.instagramEnabled !== false,
            facebookEnabled: s.facebookEnabled !== false,
            whatsappEnabled: s.whatsappEnabled !== false,
            youtubeEnabled: s.youtubeEnabled === true,
            socialOrderJson: s.socialOrderJson || '["instagram","facebook","whatsapp","youtube"]',
            whatsappUsePhone: s.whatsappUsePhone !== false,
            draftStatus: "PUBLISHED",
            draftJson: null,
          },
          create: {
            id: "default",
            siteName: s.siteName || "Goldex Media Network",
          },
        });
      }

      if (Array.isArray(data.navigation)) {
        await tx.navigationItem.deleteMany();
        for (const item of data.navigation) {
          await tx.navigationItem.create({
            data: {
              location: item.location,
              label: item.label,
              href: item.href,
              isButton: Boolean(item.isButton),
              openNewTab: Boolean(item.openNewTab),
              enabled: item.enabled !== false,
              sortOrder: Number(item.sortOrder || 0),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }

      if (Array.isArray(data.sections)) {
        await tx.pageSection.deleteMany();
        for (const sec of data.sections) {
          await tx.pageSection.create({
            data: {
              pageSlug: sec.pageSlug,
              sectionKey: sec.sectionKey,
              title: sec.title ?? null,
              subtitle: sec.subtitle ?? null,
              badgeText: sec.badgeText ?? null,
              bodyHtml: sec.bodyHtml ?? null,
              ctaLabel: sec.ctaLabel ?? null,
              ctaHref: sec.ctaHref ?? null,
              cta2Label: sec.cta2Label ?? null,
              cta2Href: sec.cta2Href ?? null,
              mediaUrl: sec.mediaUrl ?? null,
              mediaType: sec.mediaType ?? null,
              bgColor: sec.bgColor ?? null,
              textColor: sec.textColor ?? null,
              fontSize: sec.fontSize ?? null,
              extraJson: sec.extraJson || "{}",
              enabled: sec.enabled !== false,
              sortOrder: Number(sec.sortOrder || 0),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }

      if (Array.isArray(data.artists)) {
        await tx.featuredArtist.deleteMany();
        for (const a of data.artists) {
          await tx.featuredArtist.create({
            data: {
              slug: a.slug,
              name: a.name,
              roleBadge: a.roleBadge,
              bio: a.bio,
              imageUrl: a.imageUrl,
              verified: a.verified !== false,
              facebookUrl: a.facebookUrl ?? null,
              instagramUrl: a.instagramUrl ?? null,
              youtubeUrl: a.youtubeUrl ?? null,
              spotifyUrl: a.spotifyUrl ?? null,
              appleMusicUrl: a.appleMusicUrl ?? null,
              websiteUrl: a.websiteUrl ?? null,
              otherSocialsJson: a.otherSocialsJson ?? null,
              published: a.published !== false,
              sortOrder: Number(a.sortOrder || 0),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }

      if (Array.isArray(data.stores)) {
        await tx.digitalStore.deleteMany();
        for (const st of data.stores) {
          await tx.digitalStore.create({
            data: {
              name: st.name,
              slug: st.slug,
              logoUrl: st.logoUrl,
              altText: st.altText ?? st.name,
              websiteUrl: st.websiteUrl ?? null,
              showInMarquee: st.showInMarquee !== false,
              showOnSignup: Boolean(st.showOnSignup),
              enabled: st.enabled !== false,
              sortOrder: Number(st.sortOrder || 0),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }

      if (Array.isArray(data.services)) {
        await tx.cmsService.deleteMany();
        for (const sv of data.services) {
          await tx.cmsService.create({
            data: {
              title: sv.title,
              shortDesc: sv.shortDesc || "",
              detailsJson: sv.detailsJson || "[]",
              iconKey: sv.iconKey || "music",
              accentTheme: sv.accentTheme || "blue",
              imageUrl: sv.imageUrl ?? null,
              ctaLabel: sv.ctaLabel ?? null,
              ctaHref: sv.ctaHref ?? null,
              published: sv.published !== false,
              sortOrder: Number(sv.sortOrder || 0),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }

      if (Array.isArray(data.team)) {
        await tx.teamMember.deleteMany();
        for (const m of data.team) {
          await tx.teamMember.create({
            data: {
              name: m.name,
              role: m.role,
              bio: m.bio ?? null,
              imageUrl: m.imageUrl,
              linkedinUrl: m.linkedinUrl ?? null,
              instagramUrl: m.instagramUrl ?? null,
              facebookUrl: m.facebookUrl ?? null,
              youtubeUrl: m.youtubeUrl ?? null,
              websiteUrl: m.websiteUrl ?? null,
              published: m.published !== false,
              sortOrder: Number(m.sortOrder || 0),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }

      if (Array.isArray(data.brandCreators)) {
        await tx.brandCreator.deleteMany();
        for (const c of data.brandCreators) {
          await tx.brandCreator.create({
            data: {
              name: c.name,
              handle: c.handle ?? null,
              category: c.category ?? null,
              bio: c.bio ?? null,
              description: c.description ?? null,
              imageUrl: c.imageUrl,
              videoUrl: c.videoUrl ?? null,
              instagramUrl: c.instagramUrl ?? null,
              facebookUrl: c.facebookUrl ?? null,
              youtubeUrl: c.youtubeUrl ?? null,
              spotifyUrl: c.spotifyUrl ?? null,
              websiteUrl: c.websiteUrl ?? null,
              published: c.published !== false,
              sortOrder: Number(c.sortOrder || 0),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }

      if (Array.isArray(data.plans)) {
        await tx.distributionPlan.deleteMany();
        for (const p of data.plans) {
          await tx.distributionPlan.create({
            data: {
              slug: p.slug,
              name: p.name,
              priceLabel: p.priceLabel,
              billingCycle: p.billingCycle,
              badgeText: p.badgeText ?? null,
              description: p.description || "",
              featuresJson: p.featuresJson || "[]",
              ctaLabel: p.ctaLabel || "Get Started",
              ctaHref: p.ctaHref || "/signup",
              highlighted: Boolean(p.highlighted),
              published: p.published !== false,
              sortOrder: Number(p.sortOrder || 0),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }

      if (Array.isArray(data.controls)) {
        await tx.controlFeature.deleteMany();
        for (const c of data.controls) {
          await tx.controlFeature.create({
            data: {
              title: c.title,
              description: c.description,
              iconKey: c.iconKey || "shield-check",
              ctaLabel: c.ctaLabel ?? null,
              ctaHref: c.ctaHref ?? null,
              published: c.published !== false,
              sortOrder: Number(c.sortOrder || 0),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }

      if (Array.isArray(data.seoSettings)) {
        await tx.seoSetting.deleteMany();
        for (const seo of data.seoSettings) {
          await tx.seoSetting.create({
            data: {
              pageSlug: seo.pageSlug,
              metaTitle: seo.metaTitle,
              metaDescription: seo.metaDescription,
              ogTitle: seo.ogTitle ?? null,
              ogDescription: seo.ogDescription ?? null,
              ogImageUrl: seo.ogImageUrl ?? null,
              canonicalUrl: seo.canonicalUrl ?? null,
              noIndex: Boolean(seo.noIndex),
              draftStatus: "PUBLISHED",
            },
          });
        }
      }
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CMS_BACKUP_RESTORED",
      entityType: "CMS",
    });

    revalidatePublicCmsPaths();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Backup restore error:", err);
    return NextResponse.json({ error: "Failed to restore CMS backup." }, { status: 400 });
  }
}
