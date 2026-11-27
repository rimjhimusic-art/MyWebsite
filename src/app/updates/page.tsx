import React from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { getUpdatesFeed } from "@/lib/updates";
import { UpdatesClient } from "@/components/UpdatesClient";

export const dynamic = "force-dynamic";

function safeParseObj(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsSiteData();
  const seo = cms.seoMap["updates"];
  return {
    title: seo?.metaTitle || `New Updates & Releases - ${cms.settings.siteName}`,
    description:
      seo?.metaDescription ||
      "Discover latest releases, Spotify embeds, trending music, and official YouTube music videos.",
  };
}

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const preview = sp.preview === "1";

  const [user, cms, feed] = await Promise.all([
    getCurrentUser(),
    getCmsSiteData({ preview }),
    getUpdatesFeed({ includeUnpublished: false }),
  ]);

  const uMap = cms.sectionMap["updates"] || {};
  const heroSec = uMap["hero"];
  const releasesSec = uMap["releases"];
  const spotifySec = uMap["spotify"];
  const trendingSec = uMap["trending"];
  const videosSec = uMap["videos"];
  const featuredSec = uMap["featured"];

  const heroExtra = safeParseObj(heroSec?.extraJson);
  const spotifyExtra = safeParseObj(spotifySec?.extraJson);

  return (
    <UpdatesClient
      user={user}
      releases={feed.releases}
      spotifyMusic={feed.spotifyMusic}
      trendingSpotify={feed.trendingSpotify}
      youtubeVideos={feed.youtubeVideos}
      settings={cms.settings}
      headerNav={cms.headerNav}
      footerNav={cms.footerNav}
      previewActive={cms.previewActive}
      heroConfig={{
        enabled: heroSec ? heroSec.enabled !== false : true,
        title: heroSec?.title || "NEW UPDATES",
        subtitle:
          heroSec?.subtitle ||
          "Latest Releases, Curated Spotify Picks & Official Music Videos",
        description:
          heroSec?.bodyHtml ??
          "Explore fresh drops, streaming releases, trending highlights, and official visuals across the network.",
        badgeText: heroSec?.badgeText || "",
        additionalText:
          typeof heroExtra.additionalText === "string" ? heroExtra.additionalText : "",
        bgImageUrl: heroSec?.mediaUrl || "",
        bgColor: heroSec?.bgColor || "rgba(255,255,255,0.04)",
        headingColor: heroSec?.textColor || "#ef4444",
        glowColor:
          typeof heroExtra.glowColor === "string" ? heroExtra.glowColor : "#ef4444",
        subtitleColor:
          typeof heroExtra.subtitleColor === "string"
            ? heroExtra.subtitleColor
            : "#e2e8f0",
        animationEnabled: heroExtra.animationEnabled !== false,
        spacing:
          heroExtra.spacing === "compact" || heroExtra.spacing === "spacious"
            ? heroExtra.spacing
            : "normal",
        showFilterPills: heroExtra.showFilterPills !== false,
      }}
      sectionsConfig={{
        releases: {
          enabled: releasesSec ? releasesSec.enabled !== false : true,
          eyebrow: releasesSec?.badgeText || "Catalog Drop",
          title: releasesSec?.title || "LATEST RELEASES",
          subtitle: releasesSec?.subtitle || "",
        },
        spotify: {
          enabled: spotifySec ? spotifySec.enabled !== false : true,
          eyebrow: spotifySec?.badgeText || "Official Streaming",
          title: spotifySec?.title || "SPOTIFY MUSIC",
          subtitle: spotifySec?.subtitle || "",
          autoScroll: spotifyExtra.autoScroll !== false,
          scrollSpeed: Number(spotifyExtra.scrollSpeed || 32),
          pauseOnHover: spotifyExtra.pauseOnHover !== false,
        },
        trending: {
          enabled: trendingSec ? trendingSec.enabled !== false : true,
          eyebrow: trendingSec?.badgeText || "Hot Picks",
          title: trendingSec?.title || "TRENDING ON SPOTIFY",
          subtitle: trendingSec?.subtitle || "",
        },
        videos: {
          enabled: videosSec ? videosSec.enabled !== false : true,
          eyebrow: videosSec?.badgeText || "Official Premieres",
          title: videosSec?.title || "LATEST MUSIC VIDEOS",
          subtitle: videosSec?.subtitle || "",
        },
        featured: {
          enabled: featuredSec ? featuredSec.enabled !== false : true,
          eyebrow: featuredSec?.badgeText || "Spotlight",
          title: featuredSec?.title || "FEATURED UPDATES",
          subtitle: featuredSec?.subtitle || "",
        },
      }}
    />
  );
}
