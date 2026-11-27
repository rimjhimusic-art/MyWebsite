import React from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { getUpdatesFeed } from "@/lib/updates";
import { normalizeUpdatesHeroExtended } from "@/lib/updates-hero-config";
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
      "Discover upcoming releases, latest drops, Spotify embeds, trending music, and official YouTube music videos.",
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
  const upcomingSec = uMap["upcoming"];
  const spotifySec = uMap["spotify"];
  const trendingSec = uMap["trending"];
  const videosSec = uMap["videos"];
  const featuredSec = uMap["featured"];

  const heroExtra = safeParseObj(heroSec?.extraJson);
  const spotifyExtra = safeParseObj(spotifySec?.extraJson);

  // Use upcoming release marked `useAsHeroBg` (or first upcoming release) seamlessly in Hero unless Hero explicitly overrides
  const heroUpcoming =
    feed.upcomingReleases.find((u) => u.useAsHeroBg) || feed.upcomingReleases[0] || null;

  const effectiveBgUrl =
    (heroSec?.mediaUrl && heroSec.mediaUrl.trim()) ||
    heroUpcoming?.heroBgUrl ||
    heroUpcoming?.thumbnailUrl ||
    "/ref/abir.jpg";

  return (
    <UpdatesClient
      user={user}
      releases={feed.releases}
      upcomingReleases={feed.upcomingReleases}
      spotifyMusic={feed.spotifyMusic}
      trendingSpotify={feed.trendingSpotify}
      youtubeVideos={feed.youtubeVideos}
      settings={cms.settings}
      headerNav={cms.headerNav}
      footerNav={cms.footerNav}
      previewActive={cms.previewActive}
      heroConfig={{
        enabled: heroSec ? heroSec.enabled !== false : true,
        title:
          heroSec?.title && heroSec.title !== "NEW UPDATES"
            ? heroSec.title
            : "UPCOMING",
        subtitle:
          (typeof heroExtra.upcomingTitle === "string" && heroExtra.upcomingTitle.trim()) ||
          heroUpcoming?.title ||
          heroSec?.subtitle ||
          "Next Wave Independent Premiere",
        description:
          (heroSec?.bodyHtml && heroSec.bodyHtml.trim()) ||
          heroUpcoming?.description ||
          "Stay tuned with upcoming singles, official visuals, and streaming premieres across the network.",
        statusBadge:
          (typeof heroExtra.statusBadge === "string" && heroExtra.statusBadge.trim()) ||
          heroUpcoming?.statusBadge ||
          "Coming Soon",
        releaseDate:
          (typeof heroExtra.releaseDate === "string" && heroExtra.releaseDate.trim()) ||
          heroUpcoming?.releaseDate ||
          "",
        artistLine: heroUpcoming?.artistName || "",
        additionalText:
          typeof heroExtra.additionalText === "string" ? heroExtra.additionalText : "",
        supportingLabels:
          Array.isArray(heroExtra.supportingLabels) && heroExtra.supportingLabels.length > 0
            ? heroExtra.supportingLabels.map((s) => String(s).trim()).filter(Boolean)
            : ["UPCOMING", "LATEST RELEASE", "SPOTIFY", "TRENDING", "MUSIC"],
        bgImageUrl: effectiveBgUrl,
        bgColor:
          heroSec?.bgColor && heroSec.bgColor !== "rgba(255,255,255,0.04)"
            ? heroSec.bgColor
            : "#050505",
        headingColor: heroSec?.textColor || "#ef4444",
        glowColor:
          typeof heroExtra.glowColor === "string" ? heroExtra.glowColor : "#ef4444",
        subtitleColor:
          typeof heroExtra.subtitleColor === "string"
            ? heroExtra.subtitleColor
            : "#ffffff",
        animationEnabled: heroExtra.animationEnabled !== false,
        spacing:
          heroExtra.spacing === "compact" || heroExtra.spacing === "spacious"
            ? heroExtra.spacing
            : "normal",
        showFilterBar: heroExtra.showFilterPills !== false,
        extended: normalizeUpdatesHeroExtended(heroExtra.heroStudio),
      }}
      sectionsConfig={{
        releases: {
          enabled: releasesSec ? releasesSec.enabled !== false : true,
          eyebrow:
            releasesSec?.badgeText && releasesSec.badgeText !== "Catalog Drop"
              ? releasesSec.badgeText
              : "UPCOMING RELEASES",
          attentionHref: releasesSec?.ctaHref || "#upcoming-releases",
          title: releasesSec?.title || "LATEST RELEASES",
          subtitle: releasesSec?.subtitle || "",
        },
        upcoming: {
          enabled: upcomingSec ? upcomingSec.enabled !== false : true,
          eyebrow: upcomingSec?.badgeText || "Coming Soon",
          title: upcomingSec?.title || "UPCOMING RELEASES",
          subtitle: upcomingSec?.subtitle || "",
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
