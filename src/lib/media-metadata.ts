export interface ParsedSpotifyUrl {
  itemType: "track" | "album" | "artist" | "playlist";
  spotifyId: string;
  canonicalUrl: string;
  embedUrl: string;
  spotifyUri: string;
}

export interface ParsedYoutubeUrl {
  videoId: string;
  canonicalUrl: string;
  embedUrl: string;
  fallbackThumbnailUrl: string;
}

export interface SpotifyFetchedMetadata {
  itemType: "track" | "album" | "artist" | "playlist";
  spotifyId: string;
  canonicalUrl: string;
  embedUrl: string;
  spotifyUri: string;
  title: string;
  artistName: string;
  coverUrl: string;
}

export interface YoutubeFetchedMetadata {
  videoId: string;
  canonicalUrl: string;
  embedUrl: string;
  title: string;
  channelName: string;
  description: string;
  thumbnailUrl: string;
}

export function parseSpotifyUrl(rawUrl: string): ParsedSpotifyUrl | null {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("spotify:")) {
      const parts = trimmed.split(":");
      const type = parts[1] as ParsedSpotifyUrl["itemType"];
      const id = parts[2];
      if (id && ["track", "album", "artist", "playlist"].includes(type)) {
        const canonicalUrl = `https://open.spotify.com/${type}/${id}`;
        return {
          itemType: type,
          spotifyId: id,
          canonicalUrl,
          embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
          spotifyUri: `spotify:${type}:${id}`,
        };
      }
      return null;
    }

    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (host !== "open.spotify.com" && host !== "play.spotify.com") {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    // Support locale prefixes like /intl-en/track/<id> or /embed/track/<id>
    const validTypes = new Set(["track", "album", "artist", "playlist"]);
    const typeIdx = segments.findIndex((seg) => validTypes.has(seg));
    if (typeIdx === -1 || !segments[typeIdx + 1]) return null;

    const itemType = segments[typeIdx] as ParsedSpotifyUrl["itemType"];
    const spotifyId = segments[typeIdx + 1].replace(/[^A-Za-z0-9]/g, "");
    if (!spotifyId) return null;

    return {
      itemType,
      spotifyId,
      canonicalUrl: `https://open.spotify.com/${itemType}/${spotifyId}`,
      embedUrl: `https://open.spotify.com/embed/${itemType}/${spotifyId}?utm_source=generator&theme=0`,
      spotifyUri: `spotify:${itemType}:${spotifyId}`,
    };
  } catch {
    return null;
  }
}

export function parseYoutubeUrl(rawUrl: string): ParsedYoutubeUrl | null {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live", "v"].includes(parts[0] || "")) {
          videoId = parts[1] || "";
        }
      }
    }

    videoId = videoId.replace(/[^A-Za-z0-9_-]/g, "");
    if (!videoId || videoId.length < 6) return null;

    return {
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
      fallbackThumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaContent(html: string, property: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return "";
}

async function fetchSpotifyWebApiToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function fetchSpotifyMetadata(rawUrl: string): Promise<SpotifyFetchedMetadata> {
  const parsed = parseSpotifyUrl(rawUrl);
  if (!parsed) {
    throw new Error("Please enter a valid open.spotify.com track, album, artist, or playlist URL.");
  }

  let title = "";
  let artistName = "";
  let coverUrl = "";

  // 1. Optional official Spotify Web API lookup when env credentials exist
  const token = await fetchSpotifyWebApiToken();
  if (token) {
    try {
      const apiEndpoint = `https://api.spotify.com/v1/${parsed.itemType}s/${parsed.spotifyId}`;
      const apiRes = await fetch(apiEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (apiRes.ok) {
        const data = (await apiRes.json()) as {
          name?: string;
          artists?: Array<{ name?: string }>;
          album?: { images?: Array<{ url?: string }> };
          images?: Array<{ url?: string }>;
          owner?: { display_name?: string };
        };
        title = data.name || "";
        artistName =
          data.artists?.map((a) => a.name).filter(Boolean).join(", ") ||
          data.owner?.display_name ||
          (parsed.itemType === "artist" ? data.name || "" : "");
        coverUrl =
          data.images?.[0]?.url || data.album?.images?.[0]?.url || "";
      }
    } catch {
      // Fallback smoothly to oEmbed below
    }
  }

  // 2. Official Spotify oEmbed endpoint (no API key required)
  if (!title || !coverUrl) {
    try {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(parsed.canonicalUrl)}`,
        {
          headers: { "User-Agent": "GoldexMediaCMS/1.0" },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (oembedRes.ok) {
        const oembed = (await oembedRes.json()) as {
          title?: string;
          thumbnail_url?: string;
        };
        if (!title && oembed.title) title = decodeHtmlEntities(oembed.title.trim());
        if (!coverUrl && oembed.thumbnail_url) coverUrl = oembed.thumbnail_url.trim();
      }
    } catch {
      // Continue to OG fallback
    }
  }

  // 3. Parse Spotify OpenGraph metadata to extract artist credits cleanly
  if (!artistName || !title || !coverUrl) {
    try {
      const pageRes = await fetch(parsed.canonicalUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; GoldexMediaBot/1.0)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(6000),
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const ogTitle = extractMetaContent(html, "og:title");
        const ogDesc = extractMetaContent(html, "og:description");
        const ogImage = extractMetaContent(html, "og:image");
        if (!title && ogTitle) title = ogTitle.replace(/\s*\|\s*Spotify$/i, "").trim();
        if (!coverUrl && ogImage) coverUrl = ogImage;
        if (!artistName && ogDesc) {
          // Spotify format: "Artist · Song · 2026" or "Listen to X on Spotify. Artist · Song · 2026"
          const cleaned = ogDesc.replace(/^Listen to .*? on Spotify\.\s*/i, "");
          const parts = cleaned.split("·").map((s) => s.trim()).filter(Boolean);
          if (parts.length > 0 && !/^(Song|Album|Single|Playlist)$/i.test(parts[0])) {
            artistName = parts[0];
          }
        }
      }
    } catch {
      // Safe fallback handled below
    }
  }

  return {
    ...parsed,
    title: title || "Spotify Release",
    artistName: artistName || (parsed.itemType === "artist" ? title || "Featured Artist" : ""),
    coverUrl,
  };
}

export async function fetchYoutubeMetadata(rawUrl: string): Promise<YoutubeFetchedMetadata> {
  const parsed = parseYoutubeUrl(rawUrl);
  if (!parsed) {
    throw new Error("Please enter a valid YouTube video URL (youtube.com/watch?v=... or youtu.be/...).");
  }

  let title = "";
  let channelName = "";
  let description = "";
  let thumbnailUrl = parsed.fallbackThumbnailUrl;

  const ytKey = process.env.YOUTUBE_API_KEY;
  if (ytKey) {
    try {
      const apiRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(parsed.videoId)}&key=${encodeURIComponent(ytKey)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (apiRes.ok) {
        const data = (await apiRes.json()) as {
          items?: Array<{
            snippet?: {
              title?: string;
              channelTitle?: string;
              description?: string;
              thumbnails?: {
                maxres?: { url?: string };
                high?: { url?: string };
                medium?: { url?: string };
              };
            };
          }>;
        };
        const snippet = data.items?.[0]?.snippet;
        if (snippet) {
          title = snippet.title || "";
          channelName = snippet.channelTitle || "";
          description = snippet.description?.slice(0, 420) || "";
          thumbnailUrl =
            snippet.thumbnails?.maxres?.url ||
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            thumbnailUrl;
        }
      }
    } catch {
      // Fallback smoothly to oEmbed
    }
  }

  if (!title || !channelName) {
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(parsed.canonicalUrl)}&format=json`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (oembedRes.ok) {
        const oembed = (await oembedRes.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        if (!title && oembed.title) title = decodeHtmlEntities(oembed.title.trim());
        if (!channelName && oembed.author_name) channelName = decodeHtmlEntities(oembed.author_name.trim());
        if (oembed.thumbnail_url) thumbnailUrl = oembed.thumbnail_url;
      }
    } catch {
      // Keep parsed fallback thumbnail
    }
  }

  return {
    ...parsed,
    title: title || `YouTube Music Video (${parsed.videoId})`,
    channelName,
    description,
    thumbnailUrl,
  };
}
