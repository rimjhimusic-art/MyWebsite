import { prisma } from "@/lib/db";
import { GOLDEX_12_SERVICES } from "@/lib/goldex-services";

const globalBoot = globalThis as unknown as {
  __goldexCmsBootstrapPromise?: Promise<void>;
  __goldexCmsBootstrapped?: boolean;
};

/**
 * Ensures baseline CMS records exist on a freshly provisioned database (e.g. initial Vercel Postgres deploy).
 * Strictly non-destructive: only inserts default rows for a collection when its table count is 0,
 * never overwriting or deleting any existing records added or customized via Admin Panel.
 */
export async function ensureCmsBaselineIfEmpty(): Promise<void> {
  if (globalBoot.__goldexCmsBootstrapped) return;
  if (globalBoot.__goldexCmsBootstrapPromise) {
    return globalBoot.__goldexCmsBootstrapPromise;
  }

  globalBoot.__goldexCmsBootstrapPromise = (async () => {
    try {
      const [
        settingsCount,
        navCount,
        artistsCount,
        storesCount,
        servicesCount,
        teamCount,
        creatorsCount,
        plansCount,
        controlsCount,
        sectionsCount,
        seoCount,
      ] = await Promise.all([
        prisma.websiteSettings.count(),
        prisma.navigationItem.count(),
        prisma.featuredArtist.count(),
        prisma.digitalStore.count(),
        prisma.cmsService.count(),
        prisma.teamMember.count(),
        prisma.brandCreator.count(),
        prisma.distributionPlan.count(),
        prisma.controlFeature.count(),
        prisma.pageSection.count(),
        prisma.seoSetting.count(),
      ]);

      if (settingsCount === 0) {
        await prisma.websiteSettings.upsert({
          where: { id: "default" },
          update: {},
          create: {
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
            lastPublishedAt: new Date(),
          },
        });
      }

      if (navCount === 0) {
        const navItems = [
          { location: "HEADER", label: "Home", href: "/", isButton: false, sortOrder: 1 },
          { location: "HEADER", label: "About", href: "/about", isButton: false, sortOrder: 2 },
          { location: "HEADER", label: "Brand Solutions", href: "/brand", isButton: false, sortOrder: 3 },
          { location: "HEADER", label: "Services", href: "/services", isButton: false, sortOrder: 4 },
          { location: "HEADER", label: "Plan", href: "/plan", isButton: false, sortOrder: 5 },
          { location: "HEADER", label: "Control", href: "/control", isButton: false, sortOrder: 6 },
          { location: "HEADER", label: "Login / Sign Up", href: "/login", isButton: true, sortOrder: 7 },
          { location: "FOOTER_QUICK", label: "Home", href: "/", isButton: false, sortOrder: 1 },
          { location: "FOOTER_QUICK", label: "About", href: "/about", isButton: false, sortOrder: 2 },
          { location: "FOOTER_QUICK", label: "Brand Solutions", href: "/brand", isButton: false, sortOrder: 3 },
          { location: "FOOTER_QUICK", label: "Services", href: "/services", isButton: false, sortOrder: 4 },
          { location: "FOOTER_QUICK", label: "Plan", href: "/plan", isButton: false, sortOrder: 5 },
          { location: "FOOTER_QUICK", label: "Control", href: "/control", isButton: false, sortOrder: 6 },
          { location: "FOOTER_QUICK", label: "FAQ", href: "/faq", isButton: false, sortOrder: 7 },
          { location: "FOOTER_QUICK", label: "Terms & Conditions", href: "/terms", isButton: false, sortOrder: 8 },
          { location: "FOOTER_QUICK", label: "Privacy Policy", href: "/privacy", isButton: false, sortOrder: 9 },
        ];
        await prisma.navigationItem.createMany({ data: navItems });
      }

      if (artistsCount === 0) {
        const artists = [
          {
            slug: "abir-biswas",
            name: "Abir Biswas",
            roleBadge: "Independent Artist",
            bio: 'A soulful independent artist and dynamic performer, Abir has carved a distinct identity with his band "Abir Biswas Life". Known for hits like "Aay Na Phire Aay" and "O Jibon Re", he blends modern musicality with deep emotion.',
            imageUrl: "/ref/abir.jpg",
            verified: true,
            facebookUrl: "https://www.facebook.com/abirbiswaslife/",
            instagramUrl: "https://www.instagram.com/abirbiswaslife/",
            youtubeUrl: "https://www.youtube.com/@AbirBiswasLife",
            sortOrder: 1,
          },
          {
            slug: "keshab-dey",
            name: "Keshab Dey",
            roleBadge: "Playback Singer",
            bio: 'Classically trained maestro with a Master\'s in Classical Music from Rabindra Bharati University and voice behind viral hits like "Hay Re Boka Mon".',
            imageUrl: "/ref/keshab.jpg",
            verified: true,
            facebookUrl: "https://www.facebook.com/keshabdeyofficial/",
            instagramUrl: "https://www.instagram.com/keshabdeyofficial/",
            youtubeUrl: "https://www.youtube.com/@KeshabDeyOfficial",
            sortOrder: 2,
          },
          {
            slug: "raj-barman",
            name: "Raj Barman",
            roleBadge: "YouTube Sensation",
            bio: "A digital sensation with a Golden Voice and millions of loyal subscribers worldwide across independent originals and playback.",
            imageUrl: "/ref/raj.jpg",
            verified: true,
            facebookUrl: "https://www.facebook.com/RajBarmanOfficial/",
            instagramUrl: "https://www.instagram.com/iamrajbarman/",
            youtubeUrl: "https://www.youtube.com/@RajBarman",
            sortOrder: 3,
          },
        ];
        for (const a of artists) {
          await prisma.featuredArtist.upsert({ where: { slug: a.slug }, update: {}, create: a });
        }
      }

      if (teamCount === 0) {
        const team = [
          { name: "Anupam Bhowmick", role: "Director", bio: "Architecting the future of music monetization and global strategy.", imageUrl: "/ref/team/sujoy.png", sortOrder: 1 },
          { name: "Pampa Bhowmick", role: "Head of Operations", bio: "Orchestrating daily workflows and strategic planning for seamless operations.", imageUrl: "/ref/team/pampa.jpg", sortOrder: 2 },
          { name: "Subho Saha", role: "Head of CMS", bio: "Leading rights management and maximizing asset monetization strategies.", imageUrl: "/ref/team/subho.png", sortOrder: 3 },
          { name: "Sayantani Saha", role: "Label Manager", bio: "Managing artist relationships and distribution catalogs globally.", imageUrl: "/ref/team/sayantani.png", sortOrder: 4 },
          { name: "Priyanka Saha", role: "Head of Influencer Mkt.", bio: "Connecting brands with top-tier creators for high-impact campaigns.", imageUrl: "/ref/team/priyanka.jpg", sortOrder: 5 },
          { name: "Akash Chattaraj", role: "Brand Manager", bio: "Helping brands grow through strategic influencer collaborations.", imageUrl: "/ref/team/akash.jpeg", sortOrder: 6 },
          { name: "Rajkumar", role: "Executive", bio: "Supporting teams and ensuring efficient client communications.", imageUrl: "/ref/team/rajkumar.jpg", sortOrder: 7 },
        ];
        await prisma.teamMember.createMany({ data: team });
      }

      if (storesCount === 0) {
        const stores = [
          { name: "Spotify", slug: "spotify", logoUrl: "/ref/stores/spotify.png", altText: "Spotify", showInMarquee: true, showOnSignup: true, sortOrder: 1 },
          { name: "Apple Music", slug: "apple-music", logoUrl: "/ref/stores/apple.png", altText: "Apple Music", showInMarquee: true, showOnSignup: true, sortOrder: 2 },
          { name: "Amazon Music", slug: "amazon-music", logoUrl: "/ref/stores/amazon.png", altText: "Amazon Music", showInMarquee: true, showOnSignup: true, sortOrder: 3 },
          { name: "YouTube Music", slug: "youtube-music", logoUrl: "/ref/stores/ytmusic.svg", altText: "YouTube Music", showInMarquee: true, showOnSignup: true, sortOrder: 4 },
          { name: "TikTok", slug: "tiktok", logoUrl: "/ref/stores/tiktok.svg", altText: "TikTok", showInMarquee: true, showOnSignup: true, sortOrder: 5 },
          { name: "SoundCloud", slug: "soundcloud", logoUrl: "/ref/stores/soundcloud.webp", altText: "SoundCloud", showInMarquee: true, showOnSignup: true, sortOrder: 6 },
          { name: "Wynk Music", slug: "wynk-music", logoUrl: "/ref/stores/wynk.png", altText: "Wynk Music", showInMarquee: true, showOnSignup: false, sortOrder: 7 },
          { name: "JioSaavn", slug: "jiosaavn", logoUrl: "/ref/stores/jiosaavn.png", altText: "JioSaavn", showInMarquee: true, showOnSignup: false, sortOrder: 8 },
          { name: "Gaana", slug: "gaana", logoUrl: "/ref/stores/gaana.png", altText: "Gaana", showInMarquee: true, showOnSignup: false, sortOrder: 9 },
          { name: "Deezer", slug: "deezer", logoUrl: "/ref/stores/deezer.svg", altText: "Deezer", showInMarquee: true, showOnSignup: false, sortOrder: 10 },
        ];
        for (const s of stores) {
          await prisma.digitalStore.upsert({ where: { slug: s.slug }, update: {}, create: s });
        }
      }

      if (servicesCount === 0) {
        await prisma.cmsService.createMany({
          data: GOLDEX_12_SERVICES.map((s) => ({
            title: s.title,
            shortDesc: s.shortDesc,
            iconKey: s.iconKey,
            accentTheme: s.accentTheme,
            ctaLabel: s.ctaLabel,
            ctaHref: s.ctaHref,
            sortOrder: s.sortOrder,
            detailsJson: JSON.stringify(s.details),
          })),
        });
      }

      if (creatorsCount === 0) {
        const creators = [
          { name: "Shreya Roy", handle: "@shreyaroy_official_", category: "Music & Lifestyle", imageUrl: "/ref/influencers/1770471884_img.jpg", videoUrl: "/ref/influencers/1770471884_vid.mp4", sortOrder: 1 },
          { name: "Manazir", handle: "@manazir__official", category: "Creator", imageUrl: "/ref/influencers/1770471626_img.jpg", videoUrl: "/ref/influencers/1770471626_vid.mp4", sortOrder: 2 },
          { name: "Liz Mallick", handle: "@liz_mallick_", category: "Fashion & Music", imageUrl: "/ref/influencers/1770471516_img.jpg", videoUrl: "/ref/influencers/1770471516_vid.mp4", sortOrder: 3 },
          { name: "SD Mandal", handle: "@sdmandal005", category: "Digital Creator", imageUrl: "/ref/influencers/1770471172_img.jpg", videoUrl: "/ref/influencers/1770471172_vid.mp4", sortOrder: 4 },
        ];
        await prisma.brandCreator.createMany({ data: creators });
      }

      if (plansCount === 0) {
        const plans = [
          { slug: "independent-artist", name: "Independent Artist", priceLabel: "₹0*", billingCycle: "/year", badgeText: "Best for Solo Creators", description: "Unlimited releases across 150+ digital stores with 90% artist revenue share.", featuresJson: JSON.stringify(["Unlimited releases & tracks", "150+ global DSP stores", "90% net royalty payout", "Free ISRC & UPC codes", "Monthly analytics & statements"]), ctaLabel: "Start Free", ctaHref: "/signup", highlighted: false, sortOrder: 1 },
          { slug: "goldex-pro-label", name: "Goldex Pro Label", priceLabel: "₹1,499", billingCycle: "/year", badgeText: "Most Popular", description: "Multi-artist & sub-label workspace with automated revenue splits and Content ID.", featuresJson: JSON.stringify(["Up to 25 artists & labels", "Automated contributor splits", "YouTube Content ID & OAC priority", "VEVO channel onboarding", "Priority QC within 24h"]), ctaLabel: "Get Pro Label", ctaHref: "/signup", highlighted: true, sortOrder: 2 },
          { slug: "enterprise-network", name: "Enterprise Network", priceLabel: "Custom", billingCycle: "", badgeText: "95% Revenue Share", description: "Dedicated CMS rights team and custom catalog migration for established record labels.", featuresJson: JSON.stringify(["Unlimited sub-labels & artists", "Dedicated account manager", "Custom royalty terms up to 95%", "Full copyright dispute resolution", "API & bulk catalog ingest"]), ctaLabel: "Contact Sales", ctaHref: "/contact", highlighted: false, sortOrder: 3 },
        ];
        for (const p of plans) {
          await prisma.distributionPlan.upsert({ where: { slug: p.slug }, update: {}, create: p });
        }
      }

      if (controlsCount === 0) {
        const controls = [
          { title: "100% Master Ownership", description: "Retain full copyright and creative authority over every track and album you distribute.", iconKey: "shield", ctaLabel: "Read Rights Policy", ctaHref: "/terms", sortOrder: 1 },
          { title: "Automated Royalty Splits", description: "Configure percentage splits for producers, vocalists, and label partners automatically.", iconKey: "dollar", ctaLabel: "Manage Royalties", ctaHref: "/dashboard/royalties", sortOrder: 2 },
          { title: "Content ID & Fingerprint Defense", description: "Protect your catalog against unauthorized re-uploads on YouTube and social platforms.", iconKey: "tv", ctaLabel: "YouTube Tools", ctaHref: "/dashboard/youtube", sortOrder: 3 },
        ];
        await prisma.controlFeature.createMany({ data: controls });
      }

      if (sectionsCount === 0) {
        const sections = [
          { pageSlug: "home", sectionKey: "hero", badgeText: "Featured Talent", title: "Sell Your Music Worldwide.", subtitle: "Upload your tracks to Spotify, Apple Music, TikTok, and 150+ digital stores. Keep 100% of your rights and receive monthly payouts.", ctaLabel: "Distribute Now", ctaHref: "/signup", cta2Label: "View Plans", cta2Href: "#plans", sortOrder: 1 },
          { pageSlug: "home", sectionKey: "revolution", title: "Join the #GoldexRevolution", subtitle: "Why join any label if you can be your own boss! Kick start your journey in the entertainment industry with Goldex Media Network's all-in-one distribution solution.", sortOrder: 4 },
          { pageSlug: "home", sectionKey: "what_is_onetab", title: "What is Goldex Media Network?", subtitle: "Your Independent Music & Media Partner", bodyHtml: "Goldex Media Network is a next-generation ecosystem empowering independent artists and creators to build sustainable careers. Powered by Vydia, we provide elite access to global music distribution, advanced content protection, and rights management technology usually reserved for major labels.\nAs a pioneer in the creator economy, Goldex offers a transparent 90% Revenue Share model with Zero Upfront Fees. We are dedicated to making music distribution accessible, allowing you to keep 100% ownership of your masters while maximizing your reach across 150+ streaming platforms worldwide.", ctaLabel: "See Our Distribution Plans", ctaHref: "/plan", sortOrder: 6 },
          { pageSlug: "about", sectionKey: "hero", title: "About Goldex Media Network", subtitle: "Goldex Media Network Private Limited is a dynamic digital media and music distribution company dedicated to empowering creators, artists, and record labels.", badgeText: "Our Mission: To empower independent creators with a transparent, technology-driven ecosystem for global reach and monetization.", sortOrder: 1 },
          { pageSlug: "about", sectionKey: "story", title: "Exclusive licensing & royalty agreement with Vydia Inc.", subtitle: "This strategic partnership empowers Goldex Media Network with elite-level tools—advanced analytics, rights management, and direct supply chain access to major DSPs.", ctaLabel: "Join Goldex Network", sortOrder: 2 },
        ];
        for (const s of sections) {
          await prisma.pageSection.upsert({
            where: { pageSlug_sectionKey: { pageSlug: s.pageSlug, sectionKey: s.sectionKey } },
            update: {},
            create: s,
          });
        }
      }

      if (seoCount === 0) {
        const seoList = [
          { pageSlug: "home", metaTitle: "Goldex Media Network | Music Distribution Services", metaDescription: "Upload your tracks to Spotify, Apple Music, TikTok, and 150+ digital stores with Goldex Media Network. Keep 100% of your rights and receive monthly payouts.", ogImageUrl: "/ref/goldex-og.svg" },
          { pageSlug: "about", metaTitle: "About - Goldex Media Network", metaDescription: "Learn about Goldex Media Network Private Limited, our partnership with Vydia Inc., and our leadership team.", ogImageUrl: "/ref/goldex-og.svg" },
          { pageSlug: "brand", metaTitle: "Brand Solutions - Goldex Media Network", metaDescription: "Partner with top digital creators and artists through Goldex Media Network Brand Solutions." },
          { pageSlug: "services", metaTitle: "Services - Goldex Media Network", metaDescription: "Digital music distribution, VEVO & YouTube services, rights management, royalty splits, and publishing administration." },
          { pageSlug: "plan", metaTitle: "Distribution Plans - Goldex Media Network", metaDescription: "Unlimited music distribution plans starting at ₹0*/year with up to 95% revenue share." },
          { pageSlug: "control", metaTitle: "Rights & Distribution Control - Goldex Media Network", metaDescription: "Complete catalog ownership, revenue split automation, and content protection." },
          { pageSlug: "signup", metaTitle: "Sign Up - Goldex Media Network", metaDescription: "Create your Goldex Media Network artist or label distribution account today." },
          { pageSlug: "login", metaTitle: "Login - Goldex Media Network", metaDescription: "Sign in to your Goldex Media Network artist, label, or admin dashboard." },
        ];
        for (const seo of seoList) {
          await prisma.seoSetting.upsert({ where: { pageSlug: seo.pageSlug }, update: {}, create: seo });
        }
      }

      globalBoot.__goldexCmsBootstrapped = true;
    } catch (err) {
      console.warn("CMS non-destructive bootstrap skipped:", err);
    } finally {
      globalBoot.__goldexCmsBootstrapPromise = undefined;
    }
  })();

  return globalBoot.__goldexCmsBootstrapPromise;
}
