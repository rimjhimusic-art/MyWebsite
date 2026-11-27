import { prisma } from "@/lib/db";
import { parseSpotifyUrl, parseYoutubeUrl } from "@/lib/media-metadata";

export interface UpdateOtherLink {
  label: string;
  url: string;
}

export interface PublicUpcomingRelease {
  id: string;
  slug: string;
  title: string;
  artistName: string | null;
  releaseType: string;
  releaseDate: string | null;
  statusBadge: string;
  description: string | null;
  thumbnailUrl: string;
  heroBgUrl: string | null;
  useAsHeroBg: boolean;
  ctaLabel: string | null;
  ctaHref: string | null;
  preSaveUrl: string | null;
  published: boolean;
  sortOrder: number;
  movedReleaseId: string | null;
}

export interface PublicUpdateRelease {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  releaseType: string;
  releaseDate: string | null;
  coverUrl: string;
  description: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  youtubeMusicUrl: string | null;
  otherLinks: UpdateOtherLink[];
  featured: boolean;
  trending: boolean;
  published: boolean;
  scheduledAt: string | null;
  sortOrder: number;
}

export interface PublicUpdateSpotifyTrack {
  id: string;
  spotifyUrl: string;
  spotifyUri: string | null;
  embedUrl: string;
  itemType: string;
  section: string;
  title: string;
  artistName: string;
  coverUrl: string | null;
  metricLabel: string | null;
  featured: boolean;
  published: boolean;
  scheduledAt: string | null;
  sortOrder: number;
}

export interface PublicUpdateYoutubeVideo {
  id: string;
  youtubeUrl: string;
  videoId: string;
  embedUrl: string;
  title: string;
  channelName: string | null;
  description: string | null;
  thumbnailUrl: string;
  featured: boolean;
  published: boolean;
  scheduledAt: string | null;
  sortOrder: number;
}

export function parseOtherLinksJson(raw?: string | null): UpdateOtherLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.url === "string" && x.url.trim().length > 0)
      .map((x) => ({
        label: String(x.label || "Listen").trim() || "Listen",
        url: String(x.url).trim(),
      }));
  } catch {
    return [];
  }
}

export async function getUpdatesFeed(options?: { includeUnpublished?: boolean }) {
  const now = new Date();
  const wherePublished = options?.includeUnpublished
    ? {}
    : {
        published: true,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      };

  const [releaseRows, upcomingRows, spotifyRows, youtubeRows] = await Promise.all([
    prisma.updateRelease.findMany({
      where: wherePublished,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.upcomingRelease.findMany({
      where: options?.includeUnpublished ? {} : { published: true },
      orderBy: [{ useAsHeroBg: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.updateSpotifyTrack.findMany({
      where: wherePublished,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.updateYoutubeVideo.findMany({
      where: wherePublished,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const upcomingReleases: PublicUpcomingRelease[] = upcomingRows.map((u) => ({
    id: u.id,
    slug: u.slug,
    title: u.title,
    artistName: u.artistName,
    releaseType: u.releaseType,
    releaseDate: u.releaseDate,
    statusBadge: u.statusBadge,
    description: u.description,
    thumbnailUrl: u.thumbnailUrl,
    heroBgUrl: u.heroBgUrl,
    useAsHeroBg: u.useAsHeroBg,
    ctaLabel: u.ctaLabel,
    ctaHref: u.ctaHref,
    preSaveUrl: u.preSaveUrl,
    published: u.published,
    sortOrder: u.sortOrder,
    movedReleaseId: u.movedReleaseId,
  }));

  const releases: PublicUpdateRelease[] = releaseRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    artistName: r.artistName,
    releaseType: r.releaseType,
    releaseDate: r.releaseDate,
    coverUrl: r.coverUrl,
    description: r.description,
    spotifyUrl: r.spotifyUrl,
    appleMusicUrl: r.appleMusicUrl,
    youtubeMusicUrl: r.youtubeMusicUrl,
    otherLinks: parseOtherLinksJson(r.otherLinksJson),
    featured: r.featured,
    trending: r.trending,
    published: r.published,
    scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
    sortOrder: r.sortOrder,
  }));

  const mapSpotify = (s: (typeof spotifyRows)[number]): PublicUpdateSpotifyTrack => {
    const parsed = parseSpotifyUrl(s.spotifyUrl);
    return {
      id: s.id,
      spotifyUrl: s.spotifyUrl,
      spotifyUri: s.spotifyUri || parsed?.spotifyUri || null,
      embedUrl:
        parsed?.embedUrl ||
        "https://open.spotify.com/embed/track/0?utm_source=generator&theme=0",
      itemType: s.itemType || parsed?.itemType || "track",
      section: s.section,
      title: s.title,
      artistName: s.artistName,
      coverUrl: s.coverUrl,
      metricLabel: s.metricLabel,
      featured: s.featured,
      published: s.published,
      scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
      sortOrder: s.sortOrder,
    };
  };

  const spotifyAll = spotifyRows.map(mapSpotify);
  const spotifyMusic = spotifyAll.filter((s) => s.section === "SPOTIFY");
  const trendingSpotify = spotifyAll.filter((s) => s.section === "TRENDING");

  const youtubeVideos: PublicUpdateYoutubeVideo[] = youtubeRows.map((v) => {
    const parsed = parseYoutubeUrl(v.youtubeUrl);
    return {
      id: v.id,
      youtubeUrl: v.youtubeUrl,
      videoId: v.videoId || parsed?.videoId || "",
      embedUrl: `https://www.youtube-nocookie.com/embed/${v.videoId || parsed?.videoId || ""}?autoplay=1&rel=0`,
      title: v.title,
      channelName: v.channelName,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl || parsed?.fallbackThumbnailUrl || "",
      featured: v.featured,
      published: v.published,
      scheduledAt: v.scheduledAt ? v.scheduledAt.toISOString() : null,
      sortOrder: v.sortOrder,
    };
  });

  return {
    releases,
    upcomingReleases,
    spotifyMusic,
    trendingSpotify,
    youtubeVideos,
  };
}
