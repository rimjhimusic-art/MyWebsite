import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { requireCmsApiAuth } from "@/lib/cms";
import { revalidatePublicCmsPaths } from "@/lib/cms-crud";
import {
  fetchSpotifyMetadata,
  fetchYoutubeMetadata,
  parseSpotifyUrl,
  parseYoutubeUrl,
} from "@/lib/media-metadata";
import { getUpdatesFeed } from "@/lib/updates";

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "release"}-${Date.now().toString(36).slice(-4)}`;
}

function cleanStr(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const t = val.trim();
  return t.length > 0 ? t : null;
}

function parseScheduledDate(val: unknown): Date | null {
  if (typeof val !== "string" || !val.trim()) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function revalidateUpdatesRoutes() {
  revalidatePath("/updates");
  revalidatePublicCmsPaths();
}

export async function GET(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "cms", action: "view" });
  if (!auth.ok) return auth.response;

  const [feed, settings] = await Promise.all([
    getUpdatesFeed({ includeUnpublished: true }),
    prisma.websiteSettings.findUnique({
      where: { id: "default" },
      select: {
        showNewUpdatesBadge: true,
        newUpdatesBadgeText: true,
        newUpdatesBadgePulse: true,
      },
    }),
  ]);

  return NextResponse.json({
    ...feed,
    badgeSettings: {
      showNewUpdatesBadge: settings?.showNewUpdatesBadge ?? true,
      newUpdatesBadgeText: settings?.newUpdatesBadgeText || "NEW",
      newUpdatesBadgePulse: settings?.newUpdatesBadgePulse ?? true,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "cms", action: "add" });
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const type = String(body.type || "").toLowerCase();

    if (type === "release") {
      const title = String(body.title || "").trim();
      const artistName = String(body.artistName || "").trim();
      const coverUrl = String(body.coverUrl || "/ref/abir.jpg").trim();
      if (!title || !artistName) {
        return NextResponse.json(
          { error: "Release title and artist name are required." },
          { status: 400 }
        );
      }

      const maxRow = await prisma.updateRelease.aggregate({ _max: { sortOrder: true } });
      const otherLinks = Array.isArray(body.otherLinks)
        ? body.otherLinks.filter((x) => x && typeof (x as { url?: unknown }).url === "string")
        : [];

      const created = await prisma.updateRelease.create({
        data: {
          slug: makeSlug(`${artistName}-${title}`),
          title,
          artistName,
          releaseType: String(body.releaseType || "SINGLE").toUpperCase(),
          releaseDate: cleanStr(body.releaseDate),
          coverUrl,
          description: cleanStr(body.description),
          spotifyUrl: cleanStr(body.spotifyUrl),
          appleMusicUrl: cleanStr(body.appleMusicUrl),
          youtubeMusicUrl: cleanStr(body.youtubeMusicUrl),
          otherLinksJson: JSON.stringify(otherLinks),
          featured: Boolean(body.featured),
          trending: Boolean(body.trending),
          published: body.published !== false,
          scheduledAt: parseScheduledDate(body.scheduledAt),
          sortOrder: (maxRow._max.sortOrder ?? 0) + 1,
        },
      });

      await recordAuditLog({
        actorUserId: auth.user.id,
        action: "UPDATES_RELEASE_CREATE",
        entityType: "UpdateRelease",
        entityId: created.id,
        metadata: { title: created.title, artistName: created.artistName },
      });

      revalidateUpdatesRoutes();
      return NextResponse.json({ item: created });
    }

    if (type === "spotify") {
      const spotifyUrl = String(body.spotifyUrl || "").trim();
      const parsed = parseSpotifyUrl(spotifyUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "Please provide a valid open.spotify.com URL." },
          { status: 400 }
        );
      }

      let title = String(body.title || "").trim();
      let artistName = String(body.artistName || "").trim();
      let coverUrl = cleanStr(body.coverUrl);

      if (!title || !artistName || !coverUrl) {
        try {
          const fetched = await fetchSpotifyMetadata(parsed.canonicalUrl);
          if (!title) title = fetched.title;
          if (!artistName) artistName = fetched.artistName || "Featured Artist";
          if (!coverUrl && fetched.coverUrl) coverUrl = fetched.coverUrl;
        } catch {
          // Keep user-supplied values
        }
      }

      const section =
        String(body.section || "SPOTIFY").toUpperCase() === "TRENDING"
          ? "TRENDING"
          : "SPOTIFY";

      const maxRow = await prisma.updateSpotifyTrack.aggregate({
        where: { section },
        _max: { sortOrder: true },
      });

      const created = await prisma.updateSpotifyTrack.create({
        data: {
          spotifyUrl: parsed.canonicalUrl,
          spotifyUri: parsed.spotifyUri,
          itemType: parsed.itemType,
          section,
          title: title || "Spotify Release",
          artistName: artistName || "Artist",
          coverUrl,
          metricLabel: cleanStr(body.metricLabel),
          featured: Boolean(body.featured),
          published: body.published !== false,
          scheduledAt: parseScheduledDate(body.scheduledAt),
          sortOrder: (maxRow._max.sortOrder ?? 0) + 1,
        },
      });

      await recordAuditLog({
        actorUserId: auth.user.id,
        action: "UPDATES_SPOTIFY_CREATE",
        entityType: "UpdateSpotifyTrack",
        entityId: created.id,
        metadata: { section, title: created.title },
      });

      revalidateUpdatesRoutes();
      return NextResponse.json({ item: created });
    }

    if (type === "youtube") {
      const youtubeUrl = String(body.youtubeUrl || "").trim();
      const parsed = parseYoutubeUrl(youtubeUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "Please provide a valid YouTube URL (youtube.com/watch?v=... or youtu.be/...)." },
          { status: 400 }
        );
      }

      let title = String(body.title || "").trim();
      let channelName = cleanStr(body.channelName);
      let description = cleanStr(body.description);
      let thumbnailUrl = cleanStr(body.thumbnailUrl) || parsed.fallbackThumbnailUrl;

      if (!title || !channelName) {
        try {
          const fetched = await fetchYoutubeMetadata(parsed.canonicalUrl);
          if (!title) title = fetched.title;
          if (!channelName && fetched.channelName) channelName = fetched.channelName;
          if (!description && fetched.description) description = fetched.description;
          if (!cleanStr(body.thumbnailUrl) && fetched.thumbnailUrl) {
            thumbnailUrl = fetched.thumbnailUrl;
          }
        } catch {
          // Keep parsed fallback thumbnail
        }
      }

      const maxRow = await prisma.updateYoutubeVideo.aggregate({ _max: { sortOrder: true } });

      const created = await prisma.updateYoutubeVideo.create({
        data: {
          youtubeUrl: parsed.canonicalUrl,
          videoId: parsed.videoId,
          title: title || `Music Video (${parsed.videoId})`,
          channelName,
          description,
          thumbnailUrl,
          featured: Boolean(body.featured),
          published: body.published !== false,
          scheduledAt: parseScheduledDate(body.scheduledAt),
          sortOrder: (maxRow._max.sortOrder ?? 0) + 1,
        },
      });

      await recordAuditLog({
        actorUserId: auth.user.id,
        action: "UPDATES_YOUTUBE_CREATE",
        entityType: "UpdateYoutubeVideo",
        entityId: created.id,
        metadata: { videoId: created.videoId, title: created.title },
      });

      revalidateUpdatesRoutes();
      return NextResponse.json({ item: created });
    }

    return NextResponse.json({ error: "Invalid update item type." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create update item." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "cms", action: "edit" });
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const type = String(body.type || "").toLowerCase();

    if (type === "badge") {
      const updated = await prisma.websiteSettings.upsert({
        where: { id: "default" },
        update: {
          ...(typeof body.showNewUpdatesBadge === "boolean"
            ? { showNewUpdatesBadge: body.showNewUpdatesBadge }
            : {}),
          ...(typeof body.newUpdatesBadgeText === "string" && body.newUpdatesBadgeText.trim()
            ? { newUpdatesBadgeText: body.newUpdatesBadgeText.trim().slice(0, 20) }
            : {}),
          ...(typeof body.newUpdatesBadgePulse === "boolean"
            ? { newUpdatesBadgePulse: body.newUpdatesBadgePulse }
            : {}),
        },
        create: {
          id: "default",
          showNewUpdatesBadge: body.showNewUpdatesBadge !== false,
          newUpdatesBadgeText:
            typeof body.newUpdatesBadgeText === "string" && body.newUpdatesBadgeText.trim()
              ? body.newUpdatesBadgeText.trim().slice(0, 20)
              : "NEW",
          newUpdatesBadgePulse: body.newUpdatesBadgePulse !== false,
        },
      });
      revalidateUpdatesRoutes();
      return NextResponse.json({
        ok: true,
        badgeSettings: {
          showNewUpdatesBadge: updated.showNewUpdatesBadge,
          newUpdatesBadgeText: updated.newUpdatesBadgeText,
          newUpdatesBadgePulse: updated.newUpdatesBadgePulse,
        },
      });
    }

    if (body.action === "reorder" && Array.isArray(body.ids)) {
      const ids = body.ids.map(String);
      const modelMap = {
        release: prisma.updateRelease,
        spotify: prisma.updateSpotifyTrack,
        youtube: prisma.updateYoutubeVideo,
      } as const;
      const model = modelMap[type as keyof typeof modelMap];
      if (!model) {
        return NextResponse.json({ error: "Invalid reorder type." }, { status: 400 });
      }
      await prisma.$transaction(
        ids.map((id, idx) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (model as any).update({ where: { id }, data: { sortOrder: idx + 1 } })
        )
      );
      revalidateUpdatesRoutes();
      return NextResponse.json({ ok: true });
    }

    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Item id is required." }, { status: 400 });
    }

    if (type === "release") {
      const data: Record<string, unknown> = {};
      if (typeof body.title === "string") data.title = body.title.trim();
      if (typeof body.artistName === "string") data.artistName = body.artistName.trim();
      if (typeof body.releaseType === "string") data.releaseType = body.releaseType.toUpperCase();
      if ("releaseDate" in body) data.releaseDate = cleanStr(body.releaseDate);
      if (typeof body.coverUrl === "string" && body.coverUrl.trim()) data.coverUrl = body.coverUrl.trim();
      if ("description" in body) data.description = cleanStr(body.description);
      if ("spotifyUrl" in body) data.spotifyUrl = cleanStr(body.spotifyUrl);
      if ("appleMusicUrl" in body) data.appleMusicUrl = cleanStr(body.appleMusicUrl);
      if ("youtubeMusicUrl" in body) data.youtubeMusicUrl = cleanStr(body.youtubeMusicUrl);
      if (Array.isArray(body.otherLinks)) {
        data.otherLinksJson = JSON.stringify(
          body.otherLinks.filter((x) => x && typeof (x as { url?: unknown }).url === "string")
        );
      }
      if (typeof body.featured === "boolean") data.featured = body.featured;
      if (typeof body.trending === "boolean") data.trending = body.trending;
      if (typeof body.published === "boolean") data.published = body.published;
      if ("scheduledAt" in body) data.scheduledAt = parseScheduledDate(body.scheduledAt);

      const updated = await prisma.updateRelease.update({ where: { id }, data });
      revalidateUpdatesRoutes();
      return NextResponse.json({ item: updated });
    }

    if (type === "spotify") {
      const data: Record<string, unknown> = {};
      if (typeof body.spotifyUrl === "string" && body.spotifyUrl.trim()) {
        const parsed = parseSpotifyUrl(body.spotifyUrl);
        if (!parsed) {
          return NextResponse.json({ error: "Invalid Spotify URL." }, { status: 400 });
        }
        data.spotifyUrl = parsed.canonicalUrl;
        data.spotifyUri = parsed.spotifyUri;
        data.itemType = parsed.itemType;
      }
      if (typeof body.section === "string") {
        data.section = body.section.toUpperCase() === "TRENDING" ? "TRENDING" : "SPOTIFY";
      }
      if (typeof body.title === "string") data.title = body.title.trim();
      if (typeof body.artistName === "string") data.artistName = body.artistName.trim();
      if ("coverUrl" in body) data.coverUrl = cleanStr(body.coverUrl);
      if ("metricLabel" in body) data.metricLabel = cleanStr(body.metricLabel);
      if (typeof body.featured === "boolean") data.featured = body.featured;
      if (typeof body.published === "boolean") data.published = body.published;
      if ("scheduledAt" in body) data.scheduledAt = parseScheduledDate(body.scheduledAt);

      const updated = await prisma.updateSpotifyTrack.update({ where: { id }, data });
      revalidateUpdatesRoutes();
      return NextResponse.json({ item: updated });
    }

    if (type === "youtube") {
      const data: Record<string, unknown> = {};
      if (typeof body.youtubeUrl === "string" && body.youtubeUrl.trim()) {
        const parsed = parseYoutubeUrl(body.youtubeUrl);
        if (!parsed) {
          return NextResponse.json({ error: "Invalid YouTube URL." }, { status: 400 });
        }
        data.youtubeUrl = parsed.canonicalUrl;
        data.videoId = parsed.videoId;
      }
      if (typeof body.title === "string") data.title = body.title.trim();
      if ("channelName" in body) data.channelName = cleanStr(body.channelName);
      if ("description" in body) data.description = cleanStr(body.description);
      if (typeof body.thumbnailUrl === "string" && body.thumbnailUrl.trim()) {
        data.thumbnailUrl = body.thumbnailUrl.trim();
      }
      if (typeof body.featured === "boolean") data.featured = body.featured;
      if (typeof body.published === "boolean") data.published = body.published;
      if ("scheduledAt" in body) data.scheduledAt = parseScheduledDate(body.scheduledAt);

      const updated = await prisma.updateYoutubeVideo.update({ where: { id }, data });
      revalidateUpdatesRoutes();
      return NextResponse.json({ item: updated });
    }

    return NextResponse.json({ error: "Invalid update item type." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update item." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "cms", action: "delete" });
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const type = String(url.searchParams.get("type") || "").toLowerCase();
  const id = String(url.searchParams.get("id") || "").trim();

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter." }, { status: 400 });
  }

  if (type === "release") {
    await prisma.updateRelease.delete({ where: { id } });
  } else if (type === "spotify") {
    await prisma.updateSpotifyTrack.delete({ where: { id } });
  } else if (type === "youtube") {
    await prisma.updateYoutubeVideo.delete({ where: { id } });
  } else {
    return NextResponse.json({ error: "Invalid update item type." }, { status: 400 });
  }

  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "UPDATES_ITEM_DELETE",
    entityType: type,
    entityId: id,
  });

  revalidateUpdatesRoutes();
  return NextResponse.json({ ok: true });
}
