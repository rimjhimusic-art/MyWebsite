export interface GoldexServiceDefinition {
  title: string;
  shortDesc: string;
  iconKey: string;
  accentTheme: "blue" | "red" | "green" | "yellow";
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  details: string[];
}

export const GOLDEX_12_SERVICES: GoldexServiceDefinition[] = [
  {
    title: "Digital Music Distribution",
    shortDesc:
      "Distribute your catalog globally across 150+ streaming platforms and social audio libraries with full metadata control.",
    iconKey: "music",
    accentTheme: "blue",
    ctaLabel: "Distribute Your Music",
    ctaHref: "/signup",
    sortOrder: 1,
    details: [
      "Spotify, Apple Music, YouTube Music",
      "Amazon Music, Deezer",
      "TikTok & Instagram Reels",
      "Facebook Music Library",
      "Worldwide release & scheduling",
      "Metadata management",
    ],
  },
  {
    title: "Video & YouTube Services",
    shortDesc:
      "Maximize YouTube channel growth, Official Artist Channel merging, Content ID claims, and VEVO monetization.",
    iconKey: "youtube",
    accentTheme: "red",
    ctaLabel: "Explore YouTube Tools",
    ctaHref: "/dashboard/youtube",
    sortOrder: 2,
    details: [
      "Official Artist Channel management",
      "Content ID setup",
      "Copyright claim management",
      "Monetization enable",
      "Multi-channel revenue tracking",
    ],
  },
  {
    title: "Rights Management",
    shortDesc:
      "Protect recordings across territories with automated unauthorized upload detection and active revenue claims.",
    iconKey: "shield-halved",
    accentTheme: "green",
    ctaLabel: "Explore Rights Control",
    ctaHref: "/control",
    sortOrder: 3,
    details: [
      "Copyright protection",
      "Unauthorized upload detection",
      "Automated revenue claims",
      "Territory-based rights control",
    ],
  },
  {
    title: "Royalty Collection & Finance",
    shortDesc:
      "Transparent streaming, YouTube, mechanical, and performance royalty reporting with automated split payouts.",
    iconKey: "file-invoice-dollar",
    accentTheme: "yellow",
    ctaLabel: "View Royalty Tools",
    ctaHref: "/dashboard/royalties",
    sortOrder: 4,
    details: [
      "Streaming income tracking",
      "YouTube ad revenue",
      "Mechanical & Performance royalties",
      "Split payments for artists/producers",
      "Real-time analytics dashboard",
    ],
  },
  {
    title: "Artist & Label Services",
    shortDesc:
      "Dedicated creator growth strategy, editorial playlist pitching, marketing campaigns, and audience building.",
    iconKey: "star",
    accentTheme: "blue",
    ctaLabel: "Connect With Our Team",
    ctaHref: "/contact",
    sortOrder: 5,
    details: [
      "Artist growth strategy",
      "Playlist pitching",
      "Digital marketing support",
      "Brand positioning",
      "Audience development",
    ],
  },
  {
    title: "Publishing Administration",
    shortDesc:
      "Global composition registration, PRO royalty collection (IPRS / ASCAP / BMI), and sync licensing.",
    iconKey: "pen-nib",
    accentTheme: "red",
    ctaLabel: "Manage Publishing Rights",
    ctaHref: "/dashboard/rights",
    sortOrder: 6,
    details: [
      "Song registration",
      "PRO collection (IPRS / ASCAP / BMI)",
      "Global publishing royalty collection",
      "Sync licensing (TV / Film / Ads)",
    ],
  },
  {
    title: "Marketing & Promotion Tools",
    shortDesc:
      "Convert listeners before and after release day with customizable smart links, pre-saves, and fan insights.",
    iconKey: "bullhorn",
    accentTheme: "green",
    ctaLabel: "Open Smart Links",
    ctaHref: "/dashboard/smart-links",
    sortOrder: 7,
    details: [
      "Smart links (pre-save / pre-add)",
      "Campaign tracking",
      "Fan data analytics",
    ],
  },
  {
    title: "Analytics & Dashboard",
    shortDesc:
      "Track real-time streams, regional audience breakdowns, and DSP revenue performance from one workspace.",
    iconKey: "chart-line",
    accentTheme: "yellow",
    ctaLabel: "Open Analytics Dashboard",
    ctaHref: "/dashboard/analytics",
    sortOrder: 8,
    details: [
      "Platform-wise analytics",
      "Country-based audience data",
      "Real-time stream tracking",
      "Revenue insights",
    ],
  },
  {
    title: "Physical Distribution",
    shortDesc:
      "Direct vinyl pressing, CD replication, and global retail supply-chain fulfillment powered by Vydia.",
    iconKey: "compact-disc",
    accentTheme: "blue",
    ctaLabel: "See Distribution Plans",
    ctaHref: "/plan",
    sortOrder: 9,
    details: [
      "Vinyl release",
      "CD distribution",
      "Retail delivery",
      "Powered by Vydia",
    ],
  },
  {
    title: "Merch & Ecommerce",
    shortDesc:
      "Launch official artist merchandise storefronts and direct-to-fan commerce campaigns.",
    iconKey: "shirt",
    accentTheme: "red",
    ctaLabel: "Explore Brand Solutions",
    ctaHref: "/brand",
    sortOrder: 10,
    details: [
      "Artist merch store",
      "Direct-to-fan sales",
    ],
  },
  {
    title: "Label Management",
    shortDesc:
      "Manage multi-artist rosters, sub-labels, role-based team permissions, and automated split accounting.",
    iconKey: "sitemap",
    accentTheme: "green",
    ctaLabel: "Manage Your Label",
    ctaHref: "/dashboard/labels",
    sortOrder: 11,
    details: [
      "Multiple artist management",
      "Sub-label setup",
      "Team access roles",
      "Revenue sharing automation",
      "Catalog management",
    ],
  },
  {
    title: "Content Protection",
    shortDesc:
      "Detect duplicate audio uploads early, file unauthorized usage claims, and recover missing royalties.",
    iconKey: "lock",
    accentTheme: "yellow",
    ctaLabel: "Manage Protection & Claims",
    ctaHref: "/dashboard/rights",
    sortOrder: 12,
    details: [
      "Duplicate detection",
      "Unauthorized upload claims",
      "Revenue recovery",
    ],
  },
];
