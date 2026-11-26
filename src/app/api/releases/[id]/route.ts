import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { getAccessibleLabelIds } from "@/lib/labels";

async function canAccessRelease(userId: string, role: string, releaseId: string) {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: {
      artist: true,
      label: true,
      artworkAsset: true,
      tracks: {
        orderBy: { trackNumber: "asc" },
        include: { audioAsset: true, contributors: true },
      },
      contributors: true,
      stores: {
        include: { store: true },
        orderBy: { store: { sortOrder: "asc" } },
      },
      submissions: { orderBy: { createdAt: "desc" } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true, role: true } } },
      },
      revenueSplits: true,
    },
  });

  if (!release) return { release: null, allowed: false };
  if (isAdminRole(role as never)) return { release, allowed: true };
  if (release.ownerUserId === userId) return { release, allowed: true };

  if (release.labelId) {
    const labelIds = await getAccessibleLabelIds(userId);
    if (labelIds.includes(release.labelId)) {
      return { release, allowed: true };
    }
  }
  return { release, allowed: false };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const { release, allowed } = await canAccessRelease(
    auth.user.id,
    auth.user.role,
    id
  );
  if (!release) {
    return NextResponse.json({ error: "Release not found." }, { status: 404 });
  }
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ release });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const { release, allowed } = await canAccessRelease(
    auth.user.id,
    auth.user.role,
    id
  );

  if (!release) {
    return NextResponse.json({ error: "Release not found." }, { status: 404 });
  }
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const editableStatuses = ["DRAFT", "REJECTED"];
  if (!editableStatuses.includes(release.status) && !isAdminRole(auth.user.role)) {
    return NextResponse.json(
      { error: `Cannot edit release in "${release.status}" status.` },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    const stringFields = [
      "releaseType",
      "title",
      "version",
      "primaryArtist",
      "featuringArtists",
      "remixer",
      "composer",
      "lyricist",
      "producer",
      "arranger",
      "musicDirector",
      "recordLabelName",
      "genre",
      "subgenre",
      "language",
      "copyrightOwner",
      "phonographicCopyright",
      "upc",
      "cLine",
      "pLine",
      "artworkAssetId",
    ];

    for (const f of stringFields) {
      if (f in body) updateData[f] = body[f];
    }
    if ("explicitContent" in body) updateData.explicitContent = Boolean(body.explicitContent);
    if ("worldwide" in body) updateData.worldwide = Boolean(body.worldwide);
    if ("copyrightYear" in body) {
      updateData.copyrightYear = body.copyrightYear ? Number(body.copyrightYear) : null;
    }
    if ("currentWizardStep" in body) {
      updateData.currentWizardStep = Math.min(8, Math.max(1, Number(body.currentWizardStep)));
    }
    if ("releaseDate" in body) {
      updateData.releaseDate = body.releaseDate ? new Date(body.releaseDate) : null;
    }
    if ("originalReleaseDate" in body) {
      updateData.originalReleaseDate = body.originalReleaseDate
        ? new Date(body.originalReleaseDate)
        : null;
    }
    if (Array.isArray(body.territories)) {
      updateData.territoriesJson = JSON.stringify(body.territories);
    }

    await prisma.release.update({
      where: { id },
      data: updateData,
    });

    if (Array.isArray(body.selectedStoreIds)) {
      const selectedSet = new Set<string>(body.selectedStoreIds);
      const stores = await prisma.releaseStore.findMany({ where: { releaseId: id } });
      await Promise.all(
        stores.map((rs) =>
          prisma.releaseStore.update({
            where: { id: rs.id },
            data: { selected: selectedSet.has(rs.storeId) },
          })
        )
      );
    }

    if (Array.isArray(body.tracks)) {
      await prisma.track.deleteMany({ where: { releaseId: id } });
      for (let idx = 0; idx < body.tracks.length; idx++) {
        const t = body.tracks[idx];
        await prisma.track.create({
          data: {
            releaseId: id,
            trackNumber: idx + 1,
            title: String(t.title || `Track ${idx + 1}`),
            version: t.version || null,
            primaryArtist: String(t.primaryArtist || release.primaryArtist),
            featuringArtists: t.featuringArtists || null,
            isrc: t.isrc || null,
            durationSeconds: t.durationSeconds ? Number(t.durationSeconds) : null,
            explicitContent: Boolean(t.explicitContent),
            language: String(t.language || release.language || "English"),
            lyrics: t.lyrics || null,
            previewStartSec: Number(t.previewStartSec || 0),
            audioAssetId: t.audioAssetId || null,
          },
        });
      }
    }

    const updated = await prisma.release.findUnique({
      where: { id },
      include: {
        artworkAsset: true,
        tracks: { orderBy: { trackNumber: "asc" }, include: { audioAsset: true } },
        stores: { include: { store: true }, orderBy: { store: { sortOrder: "asc" } } },
        activities: {
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    return NextResponse.json({ ok: true, release: updated });
  } catch (err) {
    console.error("Update release error:", err);
    return NextResponse.json(
      { error: "Failed to save release draft." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const { release, allowed } = await canAccessRelease(
    auth.user.id,
    auth.user.role,
    id
  );
  if (!release) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  if (release.status !== "DRAFT" && !isAdminRole(auth.user.role)) {
    return NextResponse.json(
      { error: "Only draft releases can be deleted. Request a takedown for live releases." },
      { status: 400 }
    );
  }

  await prisma.release.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
