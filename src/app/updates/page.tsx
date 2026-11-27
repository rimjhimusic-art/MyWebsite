import React from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { getUpdatesFeed } from "@/lib/updates";
import { UpdatesClient } from "@/components/UpdatesClient";

export const dynamic = "force-dynamic";

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

  const heroSec = cms.sectionMap["updates"]?.["hero"];

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
      heroTitle={heroSec?.title || "New Updates"}
      heroSubtitle={
        heroSec?.subtitle ||
        "Fresh official releases, curated Spotify listening embeds, trending tracks across the network, and official YouTube music videos."
      }
    />
  );
}
