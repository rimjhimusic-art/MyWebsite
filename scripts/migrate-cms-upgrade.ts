import { prisma } from "../src/lib/db";
import { DEFAULT_UPDATES_HERO_EXTENDED } from "../src/lib/updates-hero-config";

const DEFAULT_ABOUT_GALLERY = Array.from(
  { length: 8 },
  (_, i) => `/ref/flag/about-${i + 1}.png`
);

const DEFAULT_STORY_EXTRA = {
  partnerCompanyName: "Vydia Inc.",
  partnerLogos: [
    {
      name: "Vydia Inc.",
      logoUrl: "/ref/vydia-logo.png",
      websiteUrl: "https://vydia.com",
    },
  ],
  artistImageUrl: "/ref/about-artist.jpg",
  artistImagePosition: "center top",
  pillars: [
    {
      title: "Artist-First Economy",
      description:
        "Leading 90% revenue share model, ensuring earnings stay with the artist.",
    },
    {
      title: "Cultural Preservation",
      description:
        "Digitizing regional genres like Baul and Folk music for a global platform.",
    },
    {
      title: "Transparency & Trust",
      description:
        "No hidden fees. Crystal clear reporting and consistent monthly payouts.",
    },
  ],
};

async function main() {
  console.log("Running non-destructive CMS upgrade migration...");

  // 8b. Update existing updates.releases eyebrow "Catalog Drop" -> "UPCOMING RELEASES" & upgrade Hero defaults
  const existingUpdatesHeroSec = await prisma.pageSection.findUnique({
    where: { pageSlug_sectionKey: { pageSlug: "updates", sectionKey: "hero" } },
  });
  if (existingUpdatesHeroSec) {
    let heroExt: Record<string, unknown> = {};
    try {
      heroExt = JSON.parse(existingUpdatesHeroSec.extraJson || "{}");
    } catch {
      heroExt = {};
    }
    const nextSupporting =
      Array.isArray(heroExt.supportingLabels) && heroExt.supportingLabels.length > 0
        ? heroExt.supportingLabels
        : ["UPCOMING", "LATEST RELEASE", "SPOTIFY", "TRENDING", "MUSIC"];
    const nextHeroTitle =
      existingUpdatesHeroSec.title === "NEW UPDATES" ? "UPCOMING" : existingUpdatesHeroSec.title;
    await prisma.pageSection.update({
      where: { id: existingUpdatesHeroSec.id },
      data: {
        title: nextHeroTitle,
        bgColor: "#050505",
        extraJson: JSON.stringify({
          ...heroExt,
          supportingLabels: nextSupporting,
          additionalText:
            typeof heroExt.additionalText === "string" && heroExt.additionalText.trim()
              ? heroExt.additionalText
              : "EXPLORE FRESH DROPS",
          heroStudio: heroExt.heroStudio || DEFAULT_UPDATES_HERO_EXTENDED,
        }),
      },
    });
  }

  const existingUpdatesRelSec = await prisma.pageSection.findUnique({
    where: { pageSlug_sectionKey: { pageSlug: "updates", sectionKey: "releases" } },
  });
  if (existingUpdatesRelSec && existingUpdatesRelSec.badgeText === "Catalog Drop") {
    await prisma.pageSection.update({
      where: { id: existingUpdatesRelSec.id },
      data: {
        badgeText: "UPCOMING RELEASES",
        ctaHref: existingUpdatesRelSec.ctaHref || "#upcoming-releases",
      },
    });
  }

  await prisma.pageSection.upsert({
    where: { pageSlug_sectionKey: { pageSlug: "updates", sectionKey: "upcoming" } },
    update: {},
    create: {
      pageSlug: "updates",
      sectionKey: "upcoming",
      title: "UPCOMING RELEASES",
      subtitle: "Exclusive upcoming releases, singles, and music videos coming soon.",
      badgeText: "Coming Soon",
      enabled: true,
      sortOrder: 3,
      draftStatus: "PUBLISHED",
    },
  });

  // Seed one initial UpcomingRelease ONLY if table is empty (non-destructive)
  const existingUpcomingCount = await prisma.upcomingRelease.count();
  if (existingUpcomingCount === 0) {
    await prisma.upcomingRelease.create({
      data: {
        slug: "upcoming-featured-premiere",
        title: "Next Wave Independent Premiere",
        artistName: "Goldex Roster",
        releaseType: "SINGLE",
        releaseDate: "2026-12-15",
        statusBadge: "Coming Soon",
        description:
          "Upcoming official single and visual release distributed worldwide on Spotify, Apple Music, and YouTube.",
        thumbnailUrl: "/ref/abir.jpg",
        heroBgUrl: "/ref/abir.jpg",
        useAsHeroBg: true,
        ctaLabel: "View Upcoming Drops",
        ctaHref: "#upcoming-releases",
        published: true,
        sortOrder: 1,
      },
    });
    console.log("Seeded starter UpcomingRelease item for futuristic Hero showcase.");
  }

  // 1. Ensure WebsiteSettings badge defaults exist without altering customized branding
  const settings = await prisma.websiteSettings.findUnique({ where: { id: "default" } });
  if (settings) {
    await prisma.websiteSettings.update({
      where: { id: "default" },
      data: {
        newUpdatesBadgeText: settings.newUpdatesBadgeText || "NEW",
      },
    });
  }

  // 2. Non-destructively insert "New Updates" into HEADER navigation if missing
  const existingHeaderUpdates = await prisma.navigationItem.findFirst({
    where: { location: "HEADER", href: "/updates" },
  });
  if (!existingHeaderUpdates) {
    const headerItems = await prisma.navigationItem.findMany({
      where: { location: "HEADER" },
      orderBy: { sortOrder: "asc" },
    });
    // Place right after About (or index 2) while preserving user order cleanly
    let nextOrder = 1;
    let inserted = false;
    for (const item of headerItems) {
      await prisma.navigationItem.update({
        where: { id: item.id },
        data: { sortOrder: nextOrder++ },
      });
      if (!inserted && (item.href === "/about" || nextOrder > 2)) {
        await prisma.navigationItem.create({
          data: {
            location: "HEADER",
            label: "New Updates",
            href: "/updates",
            isButton: false,
            openNewTab: false,
            enabled: true,
            sortOrder: nextOrder++,
            draftStatus: "PUBLISHED",
          },
        });
        inserted = true;
      }
    }
    if (!inserted) {
      await prisma.navigationItem.create({
        data: {
          location: "HEADER",
          label: "New Updates",
          href: "/updates",
          isButton: false,
          openNewTab: false,
          enabled: true,
          sortOrder: nextOrder,
          draftStatus: "PUBLISHED",
        },
      });
    }
    console.log("Added 'New Updates' (/updates) to HEADER navigation.");
  }

  // Also add to FOOTER_QUICK if missing
  const existingFooterUpdates = await prisma.navigationItem.findFirst({
    where: { location: "FOOTER_QUICK", href: "/updates" },
  });
  if (!existingFooterUpdates) {
    const maxFooter = await prisma.navigationItem.aggregate({
      where: { location: "FOOTER_QUICK" },
      _max: { sortOrder: true },
    });
    await prisma.navigationItem.create({
      data: {
        location: "FOOTER_QUICK",
        label: "New Updates",
        href: "/updates",
        isButton: false,
        enabled: true,
        sortOrder: (maxFooter._max.sortOrder ?? 2) + 1,
        draftStatus: "PUBLISHED",
      },
    });
  }

  // 3. Enrich About PageSections (about.hero & about.story) non-destructively
  const aboutHero = await prisma.pageSection.findUnique({
    where: { pageSlug_sectionKey: { pageSlug: "about", sectionKey: "hero" } },
  });
  if (!aboutHero) {
    await prisma.pageSection.create({
      data: {
        pageSlug: "about",
        sectionKey: "hero",
        title: "About Goldex Media Network",
        subtitle:
          "Goldex Media Network Private Limited is a dynamic digital media and music distribution company dedicated to empowering creators, artists, and record labels. We specialize in comprehensive CMS management, licensing operations, and DRM.",
        badgeText:
          "Our Mission: To empower independent creators with a transparent, technology-driven ecosystem for global reach and monetization.",
        mediaUrl: "/ref/video/about-bg.mp4",
        mediaType: "video",
        extraJson: JSON.stringify({ galleryImages: DEFAULT_ABOUT_GALLERY }),
        enabled: true,
        sortOrder: 1,
        draftStatus: "PUBLISHED",
      },
    });
  } else {
    let parsedHero: Record<string, unknown> = {};
    try {
      parsedHero = JSON.parse(aboutHero.extraJson || "{}");
    } catch {
      parsedHero = {};
    }
    if (!Array.isArray(parsedHero.galleryImages) || parsedHero.galleryImages.length === 0) {
      await prisma.pageSection.update({
        where: { id: aboutHero.id },
        data: {
          mediaUrl: aboutHero.mediaUrl || "/ref/video/about-bg.mp4",
          mediaType: aboutHero.mediaType || "video",
          extraJson: JSON.stringify({
            ...parsedHero,
            galleryImages: DEFAULT_ABOUT_GALLERY,
          }),
        },
      });
    }
  }

  const aboutStory = await prisma.pageSection.findUnique({
    where: { pageSlug_sectionKey: { pageSlug: "about", sectionKey: "story" } },
  });
  if (!aboutStory) {
    await prisma.pageSection.create({
      data: {
        pageSlug: "about",
        sectionKey: "story",
        title: "Exclusive licensing & royalty agreement with Vydia Inc.",
        subtitle:
          "This strategic partnership empowers Goldex Media Network with elite-level tools—advanced analytics, rights management, and direct supply chain access to major DSPs.",
        bodyHtml:
          "Direct global licensing, priority catalog delivery, and rights protection built for independent artists and record labels.",
        mediaUrl: "/ref/vydia-logo.png",
        ctaLabel: "Join & Distribute",
        ctaHref: "/signup",
        extraJson: JSON.stringify(DEFAULT_STORY_EXTRA),
        enabled: true,
        sortOrder: 2,
        draftStatus: "PUBLISHED",
      },
    });
  } else {
    let parsedStory: Record<string, unknown> = {};
    try {
      parsedStory = JSON.parse(aboutStory.extraJson || "{}");
    } catch {
      parsedStory = {};
    }
    const mergedStory = {
      ...DEFAULT_STORY_EXTRA,
      ...parsedStory,
      partnerLogos:
        Array.isArray(parsedStory.partnerLogos) && parsedStory.partnerLogos.length > 0
          ? parsedStory.partnerLogos
          : [
              {
                name: String(parsedStory.partnerCompanyName || "Vydia Inc."),
                logoUrl: aboutStory.mediaUrl || "/ref/vydia-logo.png",
                websiteUrl: "https://vydia.com",
              },
            ],
      pillars:
        Array.isArray(parsedStory.pillars) && parsedStory.pillars.length > 0
          ? parsedStory.pillars
          : DEFAULT_STORY_EXTRA.pillars,
    };
    await prisma.pageSection.update({
      where: { id: aboutStory.id },
      data: {
        mediaUrl: aboutStory.mediaUrl || "/ref/vydia-logo.png",
        ctaLabel: aboutStory.ctaLabel || "Join & Distribute",
        ctaHref: aboutStory.ctaHref || "/signup",
        extraJson: JSON.stringify(mergedStory),
      },
    });
  }

  // 4. Ensure SEO record for /updates
  await prisma.seoSetting.upsert({
    where: { pageSlug: "updates" },
    update: {},
    create: {
      pageSlug: "updates",
      metaTitle: "New Updates & Releases - Goldex Media Network",
      metaDescription:
        "Discover latest releases, Spotify embeds, trending songs, and official YouTube music videos from Goldex Media Network artists.",
      ogImageUrl: "/ref/goldex-og.svg",
      draftStatus: "PUBLISHED",
    },
  });

  // 5. Ensure at least starter Updates items ONLY when all 3 tables are empty (never overwriting existing entries)
  const [relCount, spCount, ytCount] = await Promise.all([
    prisma.updateRelease.count(),
    prisma.updateSpotifyTrack.count(),
    prisma.updateYoutubeVideo.count(),
  ]);

  if (relCount === 0 && spCount === 0 && ytCount === 0) {
    await prisma.updateRelease.createMany({
      data: [
        {
          slug: "abir-biswas-aay-na-phire-aay",
          title: "Aay Na Phire Aay",
          artistName: "Abir Biswas",
          releaseType: "SINGLE",
          releaseDate: "2026-03-15",
          coverUrl: "/ref/abir.jpg",
          description:
            "Soulful independent single distributed globally via Goldex Media Network across Spotify, Apple Music, and YouTube Music.",
          spotifyUrl: "https://open.spotify.com",
          appleMusicUrl: "https://music.apple.com",
          youtubeMusicUrl: "https://music.youtube.com",
          otherLinksJson: JSON.stringify([
            { label: "JioSaavn", url: "https://www.jiosaavn.com" },
          ]),
          featured: true,
          trending: true,
          published: true,
          sortOrder: 1,
        },
        {
          slug: "keshab-dey-hay-re-boka-mon",
          title: "Hay Re Boka Mon",
          artistName: "Keshab Dey",
          releaseType: "SINGLE",
          releaseDate: "2026-02-28",
          coverUrl: "/ref/keshab.jpg",
          description:
            "Classically rooted contemporary folk crossover capturing listeners across digital streaming platforms.",
          spotifyUrl: "https://open.spotify.com",
          youtubeMusicUrl: "https://music.youtube.com",
          otherLinksJson: "[]",
          featured: true,
          trending: false,
          published: true,
          sortOrder: 2,
        },
      ],
    });
    console.log("Seeded starter UpdateRelease entries (no existing Updates found).");
  }

  // 6. Migrate ALL existing About Top Slider Images into AboutSliderImage cleanly
  const existingAboutSlides = await prisma.aboutSliderImage.count();
  if (existingAboutSlides === 0) {
    let sourceUrls = DEFAULT_ABOUT_GALLERY;
    if (aboutHero?.extraJson) {
      try {
        const parsed = JSON.parse(aboutHero.extraJson) as { galleryImages?: unknown[] };
        if (Array.isArray(parsed.galleryImages) && parsed.galleryImages.length > 0) {
          sourceUrls = parsed.galleryImages.map(String).filter(Boolean);
        }
      } catch {
        // use defaults
      }
    }
    await prisma.aboutSliderImage.createMany({
      data: sourceUrls.map((url, idx) => ({
        imageUrl: url,
        title: `Goldex Showcase ${idx + 1}`,
        description: null,
        enabled: true,
        sortOrder: idx + 1,
        draftStatus: "PUBLISHED",
      })),
    });
    console.log(`Migrated ${sourceUrls.length} About top slider image(s) into AboutSliderImage.`);
  }

  // Ensure slider display settings exist in about.hero extraJson
  if (aboutHero) {
    let parsedHero: Record<string, unknown> = {};
    try {
      parsedHero = JSON.parse(aboutHero.extraJson || "{}");
    } catch {
      parsedHero = {};
    }
    const nextHeroExtra = {
      sliderEnabled: true,
      sliderAutoplay: true,
      sliderSpeedSeconds: 45,
      sliderPauseOnHover: true,
      sliderShowCaptions: true,
      ...parsedHero,
    };
    await prisma.pageSection.update({
      where: { id: aboutHero.id },
      data: { extraJson: JSON.stringify(nextHeroExtra) },
    });
  }

  // 7. Non-destructively enrich BrandCreator bio/description where empty & migrate existing videos into BrandVideo
  const creators = await prisma.brandCreator.findMany({ orderBy: { sortOrder: "asc" } });
  for (const cr of creators) {
    if (!cr.bio && !cr.description) {
      await prisma.brandCreator.update({
        where: { id: cr.id },
        data: {
          bio: `${cr.name} (${cr.handle || "Creator"}) collaborates with brands through Goldex Media Network's creator campaigns.`,
        },
      });
    }
  }

  const existingBrandVideos = await prisma.brandVideo.count();
  if (existingBrandVideos === 0) {
    const creatorsWithVideos = creators.filter((c) => Boolean(c.videoUrl));
    if (creatorsWithVideos.length > 0) {
      await prisma.brandVideo.createMany({
        data: creatorsWithVideos.map((c, idx) => ({
          title: `${c.name} — Creator Campaign Reel`,
          description:
            c.description ||
            c.bio ||
            `Official brand campaign video showcase featuring ${c.name} (${c.handle || c.category || "Creator"}).`,
          videoUrl: c.videoUrl!,
          thumbnailUrl: c.imageUrl,
          creatorName: c.name,
          featured: idx < 2,
          published: c.published,
          sortOrder: idx + 1,
          draftStatus: "PUBLISHED",
        })),
      });
      console.log(`Migrated ${creatorsWithVideos.length} existing Brand Solutions videos into BrandVideo.`);
    }
  }

  // 8. Ensure brand.hero & brand.brand_form PageSections exist with complete editable CMS keys
  await prisma.pageSection.upsert({
    where: { pageSlug_sectionKey: { pageSlug: "brand", sectionKey: "hero" } },
    update: {},
    create: {
      pageSlug: "brand",
      sectionKey: "hero",
      title: "Boost your brand by our Creators!",
      subtitle: "India's top artists, musicians, and digital storytellers.",
      badgeText: "Brand Campaign Videos",
      bodyHtml: "Watch our creators in action across real brand collaborations.",
      enabled: true,
      sortOrder: 1,
      draftStatus: "PUBLISHED",
    },
  });

  const existingBrandForm = await prisma.pageSection.findUnique({
    where: { pageSlug_sectionKey: { pageSlug: "brand", sectionKey: "brand_form" } },
  });
  if (!existingBrandForm) {
    await prisma.pageSection.create({
      data: {
        pageSlug: "brand",
        sectionKey: "brand_form",
        title: "Let's Talk!",
        subtitle:
          "Leave your details below and a member of our team will get back to you within 24 hours.",
        ctaLabel: "Submit",
        bgColor: "#fff0e5",
        textColor: "#d93025",
        extraJson: JSON.stringify({
          rightTitle: "Brand Managers",
          rightSubtitle: "Our expert team is here to help.",
          rightImages: [
            "/ref/brand/bm1.jpeg",
            "/ref/brand/bm2.jpeg",
            "/ref/brand/bm3.jpeg",
            "/ref/brand/bm4.jpeg",
          ],
          formSuccessMessage: "Thank you! A Brand Manager will reach out within 24 hours.",
        }),
        enabled: true,
        sortOrder: 2,
        draftStatus: "PUBLISHED",
      },
    });
  }

  console.log("CMS upgrade migration complete.");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
