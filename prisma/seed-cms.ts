import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { GOLDEX_12_SERVICES } from "../src/lib/goldex-services";

const prisma = new PrismaClient();

export async function seedCmsData() {
  console.log("Seeding OneTab CMS tables...");

  // 0. Ensure EDITOR user exists
  const defaultPasswordHash = await bcrypt.hash("OneTab@2026!", 12);
  await prisma.user.upsert({
    where: { email: "editor@onetabmedia.in" },
    update: { name: "CMS Content Editor", role: "EDITOR", status: "APPROVED" },
    create: {
      email: "editor@onetabmedia.in",
      name: "CMS Content Editor",
      passwordHash: defaultPasswordHash,
      role: "EDITOR",
      status: "APPROVED",
      emailVerifiedAt: new Date(),
      country: "India",
      bio: "Website Content & Visual Editor",
    },
  });

  // 1. WebsiteSettings singleton
  await prisma.websiteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      siteName: "Goldex Media Network",
      tagline:
        "India's leading digital music distribution partner empowering independent artists and labels globally with enterprise-grade technology.",
      headerLogoUrl: "/ref/goldex-logo.svg",
      headerLogoWidth: 186,
      headerLogoHeight: 42,
      footerLogoUrl: "/ref/goldex-logo.svg",
      footerLogoWidth: 186,
      footerLogoHeight: 42,
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
      socialOrderJson: '["instagram","facebook","whatsapp","youtube"]',
      whatsappUsePhone: true,
      copyrightCompanyName: "Goldex Media Network Private Limited",
      copyrightYear: 2026,
      copyrightText: "© 2026 Goldex Media Network Private Limited All Right Reserved",
      lastPublishedAt: new Date(),
    },
  });

  // 2. NavigationItem
  const existingNavCount = await prisma.navigationItem.count();
  if (existingNavCount === 0) {
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
    for (const item of navItems) {
      await prisma.navigationItem.create({ data: item });
    }
  }

  // 3. FeaturedArtist (with actual social URLs so social icons link properly)
  const artists = [
    {
      slug: "abir-biswas",
      name: "Abir Biswas",
      roleBadge: "Independent Artist",
      bio: 'A soulful independent artist and dynamic performer from Kolkata, Abir has carved a niche in the Bengali music industry with his self-titled band "Abir Biswas Life". Known for viral hits like "Aay Na Phire Aay" and "O Jibon Re", he blends modern musicality with deep emotion, earning him a dedicated fanbase across Bengal.',
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
      bio: 'A classically trained maestro holding a Master\'s in Classical Music from Rabindra Bharati University, Keshab is the voice behind mega-hits like "Hay Re Boka Mon". With viral romantic hits and soulful versatility, he continues to captivate millions in Bengali Pop & Playback.',
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
      bio: 'A digital sensation with a "Golden Voice", Raj Barman has won millions of hearts globally with his soulful renditions and Bollywood mashups. Spanning a massive fanbase of over 3.7M YouTube subscribers, he is a prominent voice in modern Indian film & pop music.',
      imageUrl: "/ref/raj.jpg",
      verified: true,
      facebookUrl: "https://www.facebook.com/RajBarmanOfficial/",
      instagramUrl: "https://www.instagram.com/iamrajbarman/",
      youtubeUrl: "https://www.youtube.com/@RajBarman",
      sortOrder: 3,
    },
  ];
  for (const a of artists) {
    await prisma.featuredArtist.upsert({
      where: { slug: a.slug },
      update: {},
      create: a,
    });
  }

  // 4. DigitalStore (Marquee + 6 Official Signup Logos)
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
    await prisma.digitalStore.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    });
  }

  // 5. CmsService (Exact 12 Services & alternating blue -> red -> green -> yellow icon themes)
  const existingServicesCount = await prisma.cmsService.count();
  if (existingServicesCount === 0) {
    for (const s of GOLDEX_12_SERVICES) {
      await prisma.cmsService.create({
        data: {
          title: s.title,
          shortDesc: s.shortDesc,
          iconKey: s.iconKey,
          accentTheme: s.accentTheme,
          ctaLabel: s.ctaLabel,
          ctaHref: s.ctaHref,
          sortOrder: s.sortOrder,
          detailsJson: JSON.stringify(s.details),
        },
      });
    }
  }

  // 6. TeamMember
  const existingTeamCount = await prisma.teamMember.count();
  if (existingTeamCount === 0) {
    const team = [
      {
        name: "Sujoy Debnath",
        role: "Director",
        bio: "Architecting the future of music monetization and global strategy.",
        imageUrl: "/ref/team/sujoy.png",
        sortOrder: 1,
      },
      {
        name: "Pampa Bhowmick",
        role: "Head of Operations",
        bio: "Orchestrating daily workflows and strategic planning for seamless operations.",
        imageUrl: "/ref/team/pampa.jpg",
        sortOrder: 2,
      },
      {
        name: "Subho Saha",
        role: "Head of CMS",
        bio: "Leading rights management and maximizing asset monetization strategies.",
        imageUrl: "/ref/team/subho.png",
        sortOrder: 3,
      },
      {
        name: "Sayantani Saha",
        role: "Label Manager",
        bio: "Managing artist relationships and distribution catalogs globally.",
        imageUrl: "/ref/team/sayantani.png",
        sortOrder: 4,
      },
      {
        name: "Priyanka Saha",
        role: "Head of Influencer Mkt.",
        bio: "Connecting brands with top-tier creators for high-impact campaigns.",
        imageUrl: "/ref/team/priyanka.jpg",
        sortOrder: 5,
      },
      {
        name: "Akash Chattaraj",
        role: "Brand Manager",
        bio: "Helping brands grow through strategic influencer collaborations.",
        imageUrl: "/ref/team/akash.jpeg",
        sortOrder: 6,
      },
      {
        name: "Rajkumar",
        role: "Executive",
        bio: "Supporting teams and ensuring efficient client communications.",
        imageUrl: "/ref/team/rajkumar.jpg",
        sortOrder: 7,
      },
    ];
    for (const m of team) {
      await prisma.teamMember.create({ data: m });
    }
  }

  // 7. BrandCreator
  const existingBrandCount = await prisma.brandCreator.count();
  if (existingBrandCount === 0) {
    const creators = [
      { name: "Shreya Roy", handle: "@shreyaroy_official_", category: "Music & Lifestyle", imageUrl: "/ref/influencers/1770471884_img.jpg", videoUrl: "/ref/influencers/1770471884_vid.mp4", sortOrder: 1 },
      { name: "Manazir", handle: "@manazir__official", category: "Creator", imageUrl: "/ref/influencers/1770471626_img.jpg", videoUrl: "/ref/influencers/1770471626_vid.mp4", sortOrder: 2 },
      { name: "Liz Mallick", handle: "@liz_mallick_", category: "Fashion & Music", imageUrl: "/ref/influencers/1770471516_img.jpg", videoUrl: "/ref/influencers/1770471516_vid.mp4", sortOrder: 3 },
      { name: "SD Mandal", handle: "@sdmandal005", category: "Digital Creator", imageUrl: "/ref/influencers/1770471172_img.jpg", videoUrl: "/ref/influencers/1770471172_vid.mp4", sortOrder: 4 },
      { name: "Snehaa", handle: "@snehaa6943", category: "Performer", imageUrl: "/ref/influencers/1770471054_img.jpg", videoUrl: "/ref/influencers/1770471054_vid.mp4", sortOrder: 5 },
      { name: "Jeet", handle: "@jeet.18", category: "Content Creator", imageUrl: "/ref/influencers/1770470948_img.jpg", videoUrl: "/ref/influencers/1770470948_vid.mp4", sortOrder: 6 },
      { name: "Arbaz Mallick", handle: "@arbaz_mallick_official", category: "Artist & Influencer", imageUrl: "/ref/influencers/1770470866_img.jpg", videoUrl: "/ref/influencers/1770470866_vid.mp4", sortOrder: 7 },
    ];
    for (const c of creators) {
      await prisma.brandCreator.create({ data: c });
    }
  }

  // 8. DistributionPlan
  const plans = [
    {
      slug: "free-artist",
      name: "Independent Artist (Free Plan)",
      priceLabel: "₹0*",
      billingCycle: "/year",
      badgeText: "90% Revenue Share • Zero Upfront Fees",
      description: "Start distributing singles, EPs, and albums globally with zero upfront cost.",
      ctaLabel: "Distribute Now",
      ctaHref: "/signup",
      highlighted: false,
      sortOrder: 1,
      featuresJson: JSON.stringify([
        "Unlimited Single, EP & Album submissions",
        "Delivery to Spotify, Apple Music, JioSaavn, Wynk & 150+ stores",
        "Keep 100% ownership of your masters & rights",
        "Automatic ISRC & UPC assignment",
        "Monthly payouts & transparent royalty reporting",
      ]),
    },
    {
      slug: "pro-vevo",
      name: "Pro Artist & VEVO",
      priceLabel: "₹1,999",
      billingCycle: "/year",
      badgeText: "95% Revenue Share • Priority Review",
      description: "Scale your releases with Official VEVO video channels, YouTube OAC, and smart links.",
      ctaLabel: "Start VEVO & Pro",
      ctaHref: "/signup?plan=pro",
      highlighted: true,
      sortOrder: 2,
      featuresJson: JSON.stringify([
        "Everything in the Free Artist Plan",
        "Official VEVO Channel & music video distribution",
        "YouTube Official Artist Channel (OAC) & Content ID requests",
        "Scheduled release dates & custom pre-save Smart Links",
        "Multi-contributor 100% Revenue Split Engine",
      ]),
    },
    {
      slug: "record-label-suite",
      name: "Record Label Suite",
      priceLabel: "₹7,999",
      billingCycle: "/year",
      badgeText: "Custom Label Splits • Multi-Artist CMS",
      description: "Full multi-artist label console with sub-labels, RBAC roles, and bulk royalty exports.",
      ctaLabel: "Register Record Label",
      ctaHref: "/register/label",
      highlighted: false,
      sortOrder: 3,
      featuresJson: JSON.stringify([
        "Manage unlimited artists & sub-labels from one dashboard",
        "Invite artists, approve rosters & assign team RBAC roles",
        "Automated Label/Artist/Producer royalty splitting",
        "Bulk analytics exports (CSV & printable PDF statements)",
        "Dedicated CMS, Rights Management & Content Protection desk",
      ]),
    },
  ];
  for (const plan of plans) {
    await prisma.distributionPlan.upsert({
      where: { slug: plan.slug },
      update: {},
      create: plan,
    });
  }

  // 9. ControlFeature
  const existingControls = await prisma.controlFeature.count();
  if (existingControls === 0) {
    const controls = [
      {
        title: "Release & Catalog Control",
        description:
          "Upload Singles, EPs, Albums, and Compilations through our 8-step wizard. Edit drafts, schedule release dates, preview audio, or trigger takedown requests anytime.",
        iconKey: "disc",
        ctaLabel: "Manage Releases",
        ctaHref: "/dashboard/releases",
        sortOrder: 1,
      },
      {
        title: "Rights & Duplicate Protection",
        description:
          "Keep 100% ownership of your masters. Automatic SHA-256 audio & ISRC duplicate detection, copyright claims, and territory restriction controls.",
        iconKey: "shield-check",
        ctaLabel: "Open Rights Desk",
        ctaHref: "/dashboard/rights",
        sortOrder: 2,
      },
      {
        title: "Revenue Split Automation",
        description:
          "Configure exact Label, Artist, Producer, and Contributor percentages enforced to total 100%, alongside verified monthly statements and payouts.",
        iconKey: "dollar",
        ctaLabel: "Configure Splits",
        ctaHref: "/dashboard/royalties",
        sortOrder: 3,
      },
      {
        title: "Label & Sub-Label RBAC",
        description:
          "Manage multiple artists, create sub-label imprints, invite talent, approve transfers, and assign granular team roles from one control center.",
        iconKey: "sliders",
        ctaLabel: "Label Console",
        ctaHref: "/dashboard/labels",
        sortOrder: 4,
      },
      {
        title: "YouTube CMS & VEVO Control",
        description:
          "Register YouTube channels, request Official Artist Channel (OAC) merges, Content ID claims, and submit music videos for VEVO channel delivery.",
        iconKey: "tv",
        ctaLabel: "YouTube & VEVO",
        ctaHref: "/dashboard/youtube",
        sortOrder: 5,
      },
      {
        title: "DSP Store & Territory Routing",
        description:
          "Select target stores across 150+ DSPs including Spotify, Apple Music, JioSaavn, Wynk, Gaana, TikTok, and generate shareable Smart Links.",
        iconKey: "globe",
        ctaLabel: "Smart Links",
        ctaHref: "/dashboard/smart-links",
        sortOrder: 6,
      },
    ];
    for (const c of controls) {
      await prisma.controlFeature.create({ data: c });
    }
  }

  // 10. PageSection across public pages
  const pageSections = [
    // HOME
    {
      pageSlug: "home",
      sectionKey: "hero",
      title: "Sell Your Music Worldwide.",
      subtitle:
        "Upload your tracks to Spotify, Apple Music, TikTok, and 150+ digital stores. Keep 100% of your rights and receive monthly payouts.",
      badgeText: "FEATURED TALENT",
      ctaLabel: "Distribute Now",
      ctaHref: "/signup",
      cta2Label: "View Plans",
      cta2Href: "#plans",
      mediaUrl: "/ref/video/hero-studio-perform.mp4",
      mediaType: "video",
      bgColor: "#0f0f0f",
      textColor: "#ffffff",
      sortOrder: 1,
    },
    {
      pageSlug: "home",
      sectionKey: "pricing_banner",
      title: "Unlimited Distribution Starting at ₹0*/year",
      subtitle:
        "Increase the reach of your music across the most popular stores & platforms like Spotify, Apple Music, YouTube and many more.",
      bodyHtml:
        "Empower yourself with unlimited distribution opportunities, and get your music heard by a global audience.\nKeep 100% ownership of your music, maintaining creative control and authority in your music career.",
      bgColor: "#121212",
      textColor: "#ffffff",
      sortOrder: 2,
    },
    {
      pageSlug: "home",
      sectionKey: "stores",
      title: "150+ Digital Stores Available",
      subtitle: "and 150+ Digital Stores Available",
      bgColor: "#0f0f0f",
      sortOrder: 3,
    },
    {
      pageSlug: "home",
      sectionKey: "revolution",
      title: "Join the #GoldexRevolution",
      subtitle:
        "Why join any label if you can be your own boss! Kick start your journey in the entertainment industry with Goldex Media Network's reliable all-in-one distribution solution to manage and sell your content to digital platforms directly. Just Upload, and we'll do the rest for you at no extra cost. Join #GoldexRevolution and spread the sound of independent music with Goldex Media Network now.",
      mediaUrl: "/ref/in.svg",
      mediaType: "image",
      bgColor: "#0f0f0f",
      textColor: "#ffffff",
      sortOrder: 4,
    },
    {
      pageSlug: "home",
      sectionKey: "vevo",
      badgeText: "VEVO Distribution",
      title: "Official VEVO Channel",
      subtitle:
        "Distribute your music videos on VEVO and reach a global audience. Join the world's leading premium music video network.",
      ctaLabel: "Start VEVO Distribution",
      ctaHref: "/signup",
      mediaUrl: "/ref/vevo-logo.png",
      mediaType: "image",
      bgColor: "#141414",
      textColor: "#ffffff",
      extraJson: JSON.stringify({ viewsStat: "2B+", videosStat: "500K+" }),
      sortOrder: 5,
    },
    {
      pageSlug: "home",
      sectionKey: "what_is_onetab",
      title: "What is Goldex Media Network?",
      subtitle: "Your Independent Music & Media Partner",
      bodyHtml:
        "Goldex Media Network is a next-generation ecosystem empowering independent artists and creators to build sustainable careers. Powered by Vydia, we provide elite access to global music distribution, advanced content protection, and rights management technology usually reserved for major labels.\nAs a pioneer in the creator economy, Goldex Media Network offers a transparent 90% Revenue Share model with Zero Upfront Fees. We are dedicated to making music distribution accessible, allowing you to keep 100% ownership of your masters while maximizing your reach across 150+ streaming platforms worldwide.",
      ctaLabel: "See Our Distribution Plans",
      ctaHref: "/plan",
      bgColor: "#0f0f0f",
      textColor: "#ffffff",
      sortOrder: 6,
    },
    {
      pageSlug: "home",
      sectionKey: "seo_article",
      title: "Music Distribution: How Can You Distribute Music With Goldex Media Network?",
      subtitle: "#MusicDistributionService #FreeMusicDistribution #GoldexMediaNetwork #SellMusicOnline",
      bgColor: "#0d0d0d",
      textColor: "#b0b0b8",
      sortOrder: 7,
    },
    {
      pageSlug: "home",
      sectionKey: "contact",
      title: "Get In Touch",
      subtitle: "We would be delighted to hear from you regarding our distribution services! We are committed to bringing customer satisfaction by providing quality services.",
      bgColor: "#0f172a",
      textColor: "#ffffff",
      sortOrder: 8,
    },
    // ABOUT
    {
      pageSlug: "about",
      sectionKey: "hero",
      title: "About Goldex Media Network",
      subtitle:
        "Goldex Media Network Private Limited is a dynamic digital media and music distribution company dedicated to empowering creators, artists, and record labels. We specialize in comprehensive CMS management, licensing operations, and DRM.",
      badgeText:
        "Our Mission: To empower independent creators with a transparent, technology-driven ecosystem for global reach and monetization. 🚀",
      mediaUrl: "/ref/video/about-bg.mp4",
      mediaType: "video",
      bgColor: "#050505",
      sortOrder: 1,
    },
    {
      pageSlug: "about",
      sectionKey: "story",
      title: "Exclusive licensing & royalty agreement with Vydia Inc.",
      subtitle:
        "This strategic partnership empowers Goldex Media Network with elite-level tools—advanced analytics, rights management, and direct supply chain access to major DSPs.",
      ctaLabel: "Join Goldex Network",
      ctaHref: "/signup",
      mediaUrl: "/ref/vydia-logo.png",
      mediaType: "image",
      extraJson: JSON.stringify({
        artistImageUrl: "/ref/about-artist.jpg",
        badgePill: "Your Dream, Our Technology",
        headingRight: "Why Choose Goldex Media Network?",
        bodyRight:
          "Founded in 2026 in Guwahati, Assam, India, Goldex Media Network serves as the bridge between local raw talent and global streaming giants. From YouTube Content ID & OAC management to direct distribution to 150+ international stores, we put control back into the artist's hands.",
      }),
      sortOrder: 2,
    },
    // BRAND
    {
      pageSlug: "brand",
      sectionKey: "brand_form",
      title: "Let's Talk!",
      subtitle: "Leave your details below and a member of our team will get back to you within 24 hours.",
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
      }),
      sortOrder: 1,
    },
    // SERVICES
    {
      pageSlug: "services",
      sectionKey: "hero",
      title: "Premium Global Network",
      subtitle: "A powerhouse infrastructure connecting independent artists and labels to the world's biggest digital platforms.",
      bgColor: "#1a73e8",
      textColor: "#ffffff",
      sortOrder: 1,
    },
    {
      pageSlug: "services",
      sectionKey: "cta",
      title: "Ready to Amplify Your Reach?",
      subtitle: "Join the fastest-growing distribution network and get your music heard globally.",
      ctaLabel: "Start Distributing Now",
      ctaHref: "/signup",
      bgColor: "#1a73e8",
      textColor: "#ffffff",
      sortOrder: 2,
    },
    // PLAN
    {
      pageSlug: "plan",
      sectionKey: "hero",
      title: "Unlimited Distribution Starting at ₹0*/year",
      subtitle:
        "Increase the reach of your music across the most popular stores & platforms like Spotify, Apple Music, YouTube and many more. Keep 100% ownership of your music, maintaining creative control and authority in your music career.",
      bgColor: "#121212",
      textColor: "#ffffff",
      sortOrder: 1,
    },
    // CONTROL
    {
      pageSlug: "control",
      sectionKey: "hero",
      badgeText: "100% Creative & Rights Authority",
      title: "Total Distribution Control",
      subtitle:
        "Keep 100% ownership of your music, maintaining creative control and authority across catalog releases, DSP territories, revenue splits, and copyright protection.",
      ctaLabel: "Open Control Dashboard",
      ctaHref: "/dashboard",
      cta2Label: "Create Account",
      cta2Href: "/signup",
      bgColor: "#0f0f0f",
      textColor: "#ffffff",
      sortOrder: 1,
    },
    // SIGNUP
    {
      pageSlug: "signup",
      sectionKey: "hero",
      title: "Music Distribution Simplified.",
      subtitle: "Upload your music, keep 100% of your earnings, and get heard across all major platforms globally.",
      ctaLabel: "Sign Up",
      bgColor: "#0052cc",
      textColor: "#ffffff",
      sortOrder: 1,
    },
  ];
  for (const s of pageSections) {
    await prisma.pageSection.upsert({
      where: {
        pageSlug_sectionKey: {
          pageSlug: s.pageSlug,
          sectionKey: s.sectionKey,
        },
      },
      update: {},
      create: s,
    });
  }

  // 11. SeoSetting
  const seoList = [
    {
      pageSlug: "home",
      metaTitle: "Goldex Media Network | Music Distribution Services",
      metaDescription: "Upload your tracks to Spotify, Apple Music, TikTok, and 150+ digital stores with Goldex Media Network. Keep 100% of your rights and receive monthly payouts.",
    },
    {
      pageSlug: "about",
      metaTitle: "About - Goldex Media Network",
      metaDescription: "Learn about Goldex Media Network Private Limited, our partnership with Vydia Inc., and our leadership team.",
    },
    {
      pageSlug: "brand",
      metaTitle: "Brand Solutions - Goldex Media Network",
      metaDescription: "Partner with top digital creators and artists through Goldex Media Network Brand Solutions.",
    },
    {
      pageSlug: "services",
      metaTitle: "Services - Goldex Media Network",
      metaDescription: "Digital music distribution, VEVO & YouTube services, rights management, royalty splits, and publishing administration.",
    },
    {
      pageSlug: "plan",
      metaTitle: "Distribution Plans - Goldex Media Network",
      metaDescription: "Unlimited music distribution plans starting at ₹0*/year with up to 95% revenue share.",
    },
    {
      pageSlug: "control",
      metaTitle: "Rights & Distribution Control - Goldex Media Network",
      metaDescription: "Complete catalog ownership, revenue split automation, and content protection.",
    },
    {
      pageSlug: "signup",
      metaTitle: "Sign Up - Goldex Media Network",
      metaDescription: "Create your Goldex Media Network artist or label distribution account today.",
    },
    {
      pageSlug: "login",
      metaTitle: "Login - Goldex Media Network",
      metaDescription: "Sign in to your Goldex Media Network artist, label, or admin dashboard.",
    },
  ];
  for (const seo of seoList) {
    await prisma.seoSetting.upsert({
      where: { pageSlug: seo.pageSlug },
      update: {},
      create: seo,
    });
  }

  // Ensure EDITOR RolePermissions are synced in DB
  const editorPerms = ["dashboard:view", "cms:manage", "tickets:manage_all"];
  for (const permission of editorPerms) {
    await prisma.rolePermission.upsert({
      where: {
        role_permission: {
          role: "EDITOR" as UserRole,
          permission,
        },
      },
      update: {},
      create: {
        role: "EDITOR" as UserRole,
        permission,
        description: `Allows ${permission} for EDITOR`,
      },
    });
  }

  console.log("Goldex CMS seeding completed!");
}

if (require.main === module) {
  seedCmsData()
    .catch((err) => {
      console.error("CMS seed error:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
