import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding OneTab Media Network database...");

  // 1. Seed RolePermissions
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_permission: {
            role: role as UserRole,
            permission,
          },
        },
        update: {},
        create: {
          role: role as UserRole,
          permission,
          description: `Allows ${permission} for ${role}`,
        },
      });
    }
  }

  // 2. Seed Users across all 7 RBAC roles
  const defaultPasswordHash = await bcrypt.hash("OneTab@2026!", 12);

  const usersData: Array<{
    email: string;
    name: string;
    role: UserRole;
    country: string;
    bio: string;
  }> = [
    {
      email: "superadmin@onetabmedia.in",
      name: "OneTab Super Admin",
      role: "SUPER_ADMIN",
      country: "India",
      bio: "Platform Super Administrator",
    },
    {
      email: "admin@onetabmedia.in",
      name: "Operations Admin",
      role: "ADMIN",
      country: "India",
      bio: "Catalog and Account Administrator",
    },
    {
      email: "label@onetabmedia.in",
      name: "Eastern Wave Records",
      role: "LABEL_OWNER",
      country: "India",
      bio: "Independent Record Label Owner",
    },
    {
      email: "labelmanager@onetabmedia.in",
      name: "Arjun Sen",
      role: "LABEL_MANAGER",
      country: "India",
      bio: "Label Operations & A&R Manager",
    },
    {
      email: "artist@onetabmedia.in",
      name: "Abir Biswas",
      role: "ARTIST",
      country: "India",
      bio: "Independent Artist & Performer from Kolkata",
    },
    {
      email: "finance@onetabmedia.in",
      name: "Priya Roy",
      role: "FINANCE_MANAGER",
      country: "India",
      bio: "Royalty Accounting & Payouts Manager",
    },
    {
      email: "content@onetabmedia.in",
      name: "Rohan Das",
      role: "CONTENT_MANAGER",
      country: "India",
      bio: "Audio QC, Rights & CMS Specialist",
    },
  ];

  const userMap: Record<string, string> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, status: "APPROVED" },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: defaultPasswordHash,
        role: u.role,
        status: "APPROVED",
        emailVerifiedAt: new Date(),
        country: u.country,
        bio: u.bio,
        payoutMethod: "BANK_TRANSFER",
        payoutDetails: "Verified Payout Account",
      },
    });
    userMap[u.email] = user.id;
  }

  // 3. Seed Label & Sub-label
  const mainLabel = await prisma.label.upsert({
    where: { slug: "eastern-wave-records" },
    update: {},
    create: {
      name: "Eastern Wave Records",
      slug: "eastern-wave-records",
      ownerId: userMap["label@onetabmedia.in"],
      description: "Independent South Asian & Global Pop Record Label.",
      website: "https://www.onetabmedianetwork.com",
      country: "India",
      defaultRevenueSharePercent: 20,
      status: "APPROVED",
    },
  });

  await prisma.label.upsert({
    where: { slug: "eastern-wave-folk" },
    update: {},
    create: {
      name: "Eastern Wave Folk",
      slug: "eastern-wave-folk",
      ownerId: userMap["label@onetabmedia.in"],
      parentLabelId: mainLabel.id,
      description: "Imprint dedicated to preserving regional Baul & Folk music.",
      country: "India",
      defaultRevenueSharePercent: 15,
      status: "APPROVED",
    },
  });

  await prisma.labelMember.upsert({
    where: {
      labelId_userId: {
        labelId: mainLabel.id,
        userId: userMap["labelmanager@onetabmedia.in"],
      },
    },
    update: {},
    create: {
      labelId: mainLabel.id,
      userId: userMap["labelmanager@onetabmedia.in"],
      role: "LABEL_MANAGER",
      permissionsJson: JSON.stringify(["release:create", "release:submit", "artist:manage_own"]),
    },
  });

  // 4. Seed Featured & Roster Artists
  const abir = await prisma.artist.upsert({
    where: { id: "artist-abir-biswas" },
    update: {},
    create: {
      id: "artist-abir-biswas",
      userId: userMap["artist@onetabmedia.in"],
      labelId: mainLabel.id,
      stageName: "Abir Biswas",
      legalName: "Abir Biswas",
      genre: "Bengali Indie / Pop",
      country: "India",
      bio: 'A soulful independent artist and dynamic performer from Kolkata, Abir has carved a niche in the Bengali music industry with his self-titled band "Abir Biswas Life". Known for hits like "Aay Na Phire Aay" and "O Jibon Re".',
      avatarUrl: "/images/artists/abir.svg",
      verified: true,
      featuredOnHome: true,
    },
  });

  await prisma.artist.upsert({
    where: { id: "artist-keshab-dey" },
    update: {},
    create: {
      id: "artist-keshab-dey",
      labelId: mainLabel.id,
      stageName: "Keshab Dey",
      legalName: "Keshab Dey",
      genre: "Playback Singer",
      country: "India",
      bio: 'A classically trained maestro holding a Master\'s in Classical Music from Rabindra Bharati University, Keshab is the voice behind hits like "Hay Re Boka Mon", captivating millions with heartfelt Bengali pop songs.',
      avatarUrl: "/images/artists/keshab.svg",
      verified: true,
      featuredOnHome: true,
    },
  });

  await prisma.artist.upsert({
    where: { id: "artist-raj-barman" },
    update: {},
    create: {
      id: "artist-raj-barman",
      stageName: "Raj Barman",
      legalName: "Raj Barman",
      genre: "YouTube Sensation",
      country: "India",
      bio: 'A digital sensation with a golden voice, Raj Barman has won millions of hearts globally with soulful renditions and Bollywood mashups, spanning over 3.7 million YouTube subscribers and film playback hits.',
      avatarUrl: "/images/artists/raj.svg",
      verified: true,
      featuredOnHome: true,
    },
  });

  // 5. Seed DSP Stores
  const dspStores = [
    { name: "Spotify", slug: "spotify", category: "Streaming", sortOrder: 1 },
    { name: "Apple Music", slug: "apple-music", category: "Streaming", sortOrder: 2 },
    { name: "YouTube Music", slug: "youtube-music", category: "Streaming", sortOrder: 3 },
    { name: "Amazon Music", slug: "amazon-music", category: "Streaming", sortOrder: 4 },
    { name: "Deezer", slug: "deezer", category: "Streaming", sortOrder: 5 },
    { name: "TikTok", slug: "tiktok", category: "Social", sortOrder: 6 },
    { name: "Instagram", slug: "instagram", category: "Social", sortOrder: 7 },
    { name: "Facebook", slug: "facebook", category: "Social", sortOrder: 8 },
    { name: "JioSaavn", slug: "jiosaavn", category: "Regional", sortOrder: 9 },
    { name: "Wynk Music", slug: "wynk-music", category: "Regional", sortOrder: 10 },
    { name: "Gaana", slug: "gaana", category: "Regional", sortOrder: 11 },
    { name: "SoundCloud", slug: "soundcloud", category: "Streaming", sortOrder: 12 },
    { name: "Tidal", slug: "tidal", category: "HiFi", sortOrder: 13 },
  ];

  const storeMap: Record<string, string> = {};
  for (const s of dspStores) {
    const store = await prisma.dspStore.upsert({
      where: { slug: s.slug },
      update: { name: s.name, category: s.category, sortOrder: s.sortOrder },
      create: s,
    });
    storeMap[s.slug] = store.id;
  }

  // 6. Seed Sample Releases, Tracks, Splits, and Verified Royalty Batch
  const release1 = await prisma.release.upsert({
    where: { id: "rel-aay-na-phire-aay" },
    update: {},
    create: {
      id: "rel-aay-na-phire-aay",
      ownerUserId: userMap["artist@onetabmedia.in"],
      artistId: abir.id,
      labelId: mainLabel.id,
      releaseType: "SINGLE",
      title: "Aay Na Phire Aay",
      primaryArtist: "Abir Biswas",
      composer: "Abir Biswas",
      lyricist: "Abir Biswas",
      producer: "Eastern Wave Studio",
      recordLabelName: "Eastern Wave Records",
      genre: "Pop",
      subgenre: "Indie Pop",
      language: "Bengali",
      releaseDate: new Date("2026-08-15T00:00:00Z"),
      originalReleaseDate: new Date("2026-08-15T00:00:00Z"),
      copyrightYear: 2026,
      copyrightOwner: "Abir Biswas",
      phonographicCopyright: "Eastern Wave Records",
      upc: "8901234567890",
      cLine: "2026 Abir Biswas",
      pLine: "2026 Eastern Wave Records",
      status: "LIVE",
      smartLinkSlug: "aay-na-phire-aay",
      worldwide: true,
      currentWizardStep: 8,
      submittedAt: new Date("2026-08-01T10:00:00Z"),
      approvedAt: new Date("2026-08-03T12:00:00Z"),
      publishedAt: new Date("2026-08-15T00:00:00Z"),
    },
  });

  const track1 = await prisma.track.upsert({
    where: { id: "trk-aay-na-phire-aay-1" },
    update: {},
    create: {
      id: "trk-aay-na-phire-aay-1",
      releaseId: release1.id,
      trackNumber: 1,
      title: "Aay Na Phire Aay",
      primaryArtist: "Abir Biswas",
      isrc: "INOTM2600001",
      durationSeconds: 234,
      language: "Bengali",
      previewStartSec: 45,
    },
  });

  // Revenue Splits totaling 100%
  const existingSplits = await prisma.revenueSplit.count({
    where: { releaseId: release1.id },
  });
  if (existingSplits === 0) {
    await prisma.revenueSplit.createMany({
      data: [
        {
          releaseId: release1.id,
          labelId: mainLabel.id,
          userId: userMap["artist@onetabmedia.in"],
          beneficiaryName: "Abir Biswas",
          beneficiaryEmail: "artist@onetabmedia.in",
          beneficiaryRole: "ARTIST",
          percentage: 80,
        },
        {
          releaseId: release1.id,
          labelId: mainLabel.id,
          userId: userMap["label@onetabmedia.in"],
          beneficiaryName: "Eastern Wave Records",
          beneficiaryEmail: "label@onetabmedia.in",
          beneficiaryRole: "LABEL",
          percentage: 20,
        },
      ],
    });
  }

  // Verified Admin Royalty Import Batch
  const existingBatch = await prisma.royaltyImportBatch.findFirst({
    where: { id: "batch-2026-10" },
  });
  if (!existingBatch) {
    await prisma.royaltyImportBatch.create({
      data: {
        id: "batch-2026-10",
        importedById: userMap["finance@onetabmedia.in"],
        periodMonth: "2026-10",
        sourcePartner: "Authorized DSP Statement CSV",
        fileName: "dsp-royalties-2026-10.csv",
        totalRows: 3,
        totalGrossRevenue: 1420.5,
        totalNetRevenue: 1278.45,
        status: "VERIFIED",
        entries: {
          create: [
            {
              releaseId: release1.id,
              trackId: track1.id,
              artistId: abir.id,
              labelId: mainLabel.id,
              storeId: storeMap["spotify"],
              periodMonth: "2026-10",
              reportDate: new Date("2026-10-31T00:00:00Z"),
              countryCode: "IN",
              countryName: "India",
              streams: 185000,
              grossRevenue: 740.0,
              platformFee: 74.0,
              netRevenue: 666.0,
              currency: "USD",
            },
            {
              releaseId: release1.id,
              trackId: track1.id,
              artistId: abir.id,
              labelId: mainLabel.id,
              storeId: storeMap["apple-music"],
              periodMonth: "2026-10",
              reportDate: new Date("2026-10-31T00:00:00Z"),
              countryCode: "US",
              countryName: "United States",
              streams: 62000,
              grossRevenue: 465.5,
              platformFee: 46.55,
              netRevenue: 418.95,
              currency: "USD",
            },
            {
              releaseId: release1.id,
              trackId: track1.id,
              artistId: abir.id,
              labelId: mainLabel.id,
              storeId: storeMap["jiosaavn"],
              periodMonth: "2026-10",
              reportDate: new Date("2026-10-31T00:00:00Z"),
              countryCode: "IN",
              countryName: "India",
              streams: 120000,
              grossRevenue: 215.0,
              platformFee: 21.5,
              netRevenue: 193.5,
              currency: "USD",
            },
          ],
        },
      },
    });
  }

  // 7. Seed Configurable FAQs (used by /faq and Floating Support Chatbot)
  const faqs = [
    {
      question: "How much does music distribution cost on OneTab?",
      answer: "Our Free Artist plan starts at ₹0/year with 90% revenue share and zero upfront fees. Pro Artist and Record Label plans offer priority review, custom ISRC/UPC pools, sub-labels, and VEVO eligibility.",
      category: "Pricing & Plans",
      keywords: "price pricing cost plan free zero ₹0 fee",
      sortOrder: 1,
    },
    {
      question: "Which digital stores and streaming platforms do you deliver to?",
      answer: "We support 150+ global and regional stores including Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, TikTok, Instagram Reels, Facebook, JioSaavn, Wynk Music, Gaana, and SoundCloud.",
      category: "Distribution",
      keywords: "stores dsp spotify apple jiosaavn tiktok instagram platforms",
      sortOrder: 2,
    },
    {
      question: "Do I keep 100% ownership of my music rights?",
      answer: "Yes. You retain 100% ownership of your master recordings and compositions. OneTab Media Network only receives the non-exclusive distribution license needed to deliver and monetize your music per your instructions.",
      category: "Rights & Ownership",
      keywords: "rights ownership copyright master masters",
      sortOrder: 3,
    },
    {
      question: "What audio and artwork formats are required for upload?",
      answer: "Audio must be stereo WAV, FLAC, or supported high-bitrate MP3 (16-bit/24-bit, 44.1kHz+ recommended). Artwork must be a square 1:1 JPG or PNG image with minimum 1400x1400px (3000x3000px recommended) and no blurry text or URLs.",
      category: "Upload Requirements",
      keywords: "audio wav flac mp3 artwork cover size resolution dimensions",
      sortOrder: 4,
    },
    {
      question: "How do VEVO Distribution and YouTube Official Artist Channels work?",
      answer: "You can submit music videos for VEVO channel creation and request YouTube Official Artist Channel (OAC) or Content ID protection directly from your dashboard. Actual external VEVO/YouTube provisioning executes through authorized partner credentials once reviewed.",
      category: "YouTube & VEVO",
      keywords: "vevo youtube oac official artist channel content id video",
      sortOrder: 5,
    },
    {
      question: "How are royalties calculated and paid out?",
      answer: "Verified DSP statements are imported monthly into the royalty ledger. Revenue splits between Labels, Artists, and Producers are enforced to total 100%, and eligible balances can be withdrawn via Bank Transfer, UPI, PayPal, or Wire.",
      category: "Royalties & Payouts",
      keywords: "royalty royalties payout payment split bank upi paypal",
      sortOrder: 6,
    },
  ];

  const existingFaqs = await prisma.faqItem.count();
  if (existingFaqs === 0) {
    await prisma.faqItem.createMany({ data: faqs });
  }

  // 8. Seed Integration Configs (honest unconfigured state by default)
  const integrations = [
    {
      provider: "VYDIA",
      displayName: "Vydia Supply Chain Partner",
      enabled: false,
      mode: "UNCONFIGURED",
      statusMessage: "Requires authorized Vydia partner API agreement & credentials.",
    },
    {
      provider: "SPOTIFY",
      displayName: "Spotify for Artists / API",
      enabled: false,
      mode: "UNCONFIGURED",
      statusMessage: "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to activate.",
    },
    {
      provider: "APPLE_MUSIC",
      displayName: "Apple Music / iTunes Connect",
      enabled: false,
      mode: "UNCONFIGURED",
      statusMessage: "Set APPLE_MUSIC_KEY_ID and APPLE_MUSIC_TEAM_ID to activate.",
    },
    {
      provider: "YOUTUBE",
      displayName: "YouTube Content ID & OAC",
      enabled: false,
      mode: "UNCONFIGURED",
      statusMessage: "Set YOUTUBE_API_KEY and YOUTUBE_CLIENT_ID to activate automated claims.",
    },
    {
      provider: "STRIPE",
      displayName: "Stripe Payouts & Billing",
      enabled: false,
      mode: "UNCONFIGURED",
      statusMessage: "Set STRIPE_SECRET_KEY to enable automated payouts.",
    },
    {
      provider: "SMTP",
      displayName: "Transactional Email (SMTP)",
      enabled: false,
      mode: "UNCONFIGURED",
      statusMessage: "Emails are currently recorded in EmailLog until SMTP credentials are provided.",
    },
    {
      provider: "S3",
      displayName: "S3-Compatible Object Storage",
      enabled: true,
      mode: "SANDBOX",
      statusMessage: "Local object bucket (./storage) active; configure S3_* env vars for cloud S3/R2.",
    },
  ];

  for (const item of integrations) {
    await prisma.integrationConfig.upsert({
      where: { provider: item.provider },
      update: {},
      create: item,
    });
  }

  // 9. Seed CMS Site Pages
  const pages = [
    {
      slug: "home",
      title: "Sell Your Music Worldwide.",
      subtitle: "Upload your tracks to Spotify, Apple Music, TikTok, and 150+ digital stores. Keep 100% of your rights and receive monthly payouts.",
      contentJson: JSON.stringify({
        pricingHeadline: "Unlimited Distribution Starting at ₹0*/year",
        revenueShare: "90%",
      }),
    },
    {
      slug: "about",
      title: "About OneTab Media Network",
      subtitle: "Empowering independent creators with a transparent, technology-driven ecosystem for global reach and monetization.",
      contentJson: JSON.stringify({
        companyName: "OneTab Media Network Private Limited",
        location: "Nadia, West Bengal, India",
      }),
    },
  ];

  for (const p of pages) {
    await prisma.sitePage.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
