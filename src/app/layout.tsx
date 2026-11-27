import type { Metadata } from "next";
import { Orbitron, Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { ChatWidget } from "@/components/ChatWidget";
import { CookieBanner } from "@/components/CookieBanner";
import { GlobalBubbleBackground } from "@/components/GlobalBubbleBackground";
import { getCmsSiteData } from "@/lib/cms";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-orbitron",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const cms = await getCmsSiteData();
    const homeSeo = cms.seoMap["home"];
    const favicon = cms.settings.faviconUrl || "/ref/goldex-favicon.svg";
    const title = homeSeo?.metaTitle || `${cms.settings.siteName} | Music Distribution Services`;
    const description =
      homeSeo?.metaDescription ||
      "Distribute your music globally with Goldex Media Network to Spotify, Apple Music, JioSaavn, TikTok, and 150+ stores. Keep 100% of your rights and manage releases, labels, royalties, VEVO, and YouTube Content ID.";
    const ogTitle = homeSeo?.ogTitle || title;
    const ogDescription = homeSeo?.ogDescription || description;
    const ogImage = homeSeo?.ogImageUrl || "/ref/goldex-og.svg";
    return {
      title,
      description,
      icons: {
        icon: favicon,
        shortcut: favicon,
        apple: favicon,
      },
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        siteName: cms.settings.siteName || "Goldex Media Network",
        images: [{ url: ogImage, width: 1200, height: 630, alt: cms.settings.siteName || "Goldex Media Network" }],
      },
      twitter: {
        card: "summary_large_image",
        title: ogTitle,
        description: ogDescription,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: "Goldex Media Network | Music Distribution & Label Management",
      description:
        "Distribute your music globally with Goldex Media Network to Spotify, Apple Music, JioSaavn, TikTok, and 150+ stores. Keep 100% of your rights and manage releases, labels, royalties, VEVO, and YouTube Content ID.",
      icons: {
        icon: "/ref/goldex-favicon.svg",
        shortcut: "/ref/goldex-favicon.svg",
        apple: "/ref/goldex-favicon.svg",
      },
      openGraph: {
        title: "Goldex Media Network | Music Distribution & Label Management",
        description:
          "Distribute your music globally with Goldex Media Network to 150+ stores. Keep 100% ownership and 90% revenue share.",
        siteName: "Goldex Media Network",
        images: [{ url: "/ref/goldex-og.svg", width: 1200, height: 630, alt: "Goldex Media Network" }],
      },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${orbitron.variable}`}>
      <body className="antialiased bg-[#0f0f0f] text-white min-h-screen relative">
        <GlobalBubbleBackground />
        <ToastProvider>
          {children}
          <CookieBanner />
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
