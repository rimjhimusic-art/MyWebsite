import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createNotification, recordAuditLog } from "@/lib/audit";
import { isAdminRole } from "@/lib/permissions";
import { getAccessibleLabelIds } from "@/lib/labels";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      artworkAsset: true,
      tracks: { include: { audioAsset: true }, orderBy: { trackNumber: "asc" } },
      stores: { where: { selected: true } },
    },
  });

  if (!release) {
    return NextResponse.json({ error: "Release not found." }, { status: 404 });
  }

  const labelIds = await getAccessibleLabelIds(auth.user.id);
  const canSubmit =
    isAdminRole(auth.user.role) ||
    release.ownerUserId === auth.user.id ||
    (release.labelId && labelIds.includes(release.labelId));

  if (!canSubmit) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!["DRAFT", "REJECTED"].includes(release.status)) {
    return NextResponse.json(
      { error: `Release is already in status ${release.status}.` },
      { status: 400 }
    );
  }

  // Server-side validation before submission
  if (!release.title || !release.primaryArtist || !release.genre) {
    return NextResponse.json(
      { error: "Release title, primary artist, and genre are required." },
      { status: 400 }
    );
  }
  if (!release.artworkAssetId) {
    return NextResponse.json(
      { error: "Cover artwork (1:1 JPG/PNG) must be uploaded before submission." },
      { status: 400 }
    );
  }
  if (release.tracks.length === 0) {
    return NextResponse.json(
      { error: "At least one track must be added before submission." },
      { status: 400 }
    );
  }
  for (const t of release.tracks) {
    if (!t.title || !t.audioAssetId) {
      return NextResponse.json(
        { error: `Track #${t.trackNumber} ("${t.title}") requires an uploaded WAV/FLAC/MP3 audio file.` },
        { status: 400 }
      );
    }
  }
  if (release.stores.length === 0) {
    return NextResponse.json(
      { error: "Select at least one digital store (DSP) for distribution." },
      { status: 400 }
    );
  }

  // Assign UPC / ISRCs if blank
  const generatedUpc =
    release.upc ||
    `890${Math.floor(1000000000 + Math.random() * 8999999999)}`.slice(0, 13);

  for (let i = 0; i < release.tracks.length; i++) {
    const trk = release.tracks[i];
    const isrc =
      trk.isrc ||
      `INOTM${new Date().getFullYear().toString().slice(-2)}${Math.floor(
        10000 + Math.random() * 89999
      )}`;
    if (!trk.isrc) {
      await prisma.track.update({ where: { id: trk.id }, data: { isrc } });
    }

    // Register copyright asset & duplicate SHA-256/ISRC check
    const existingDup = await prisma.rightsAsset.findFirst({
      where: {
        OR: [
          ...(trk.audioAsset?.sha256 ? [{ audioSha256: trk.audioAsset.sha256 }] : []),
          { isrc },
        ],
        NOT: { releaseId: release.id },
      },
    });

    const asset = await prisma.rightsAsset.create({
      data: {
        ownerUserId: release.ownerUserId,
        releaseId: release.id,
        trackId: trk.id,
        isrc,
        upc: generatedUpc,
        audioSha256: trk.audioAsset?.sha256 ?? null,
        copyrightOwner: release.copyrightOwner || release.primaryArtist,
        publishingOwner: release.recordLabelName,
        territoryRestrictionsJson: release.territoriesJson,
        status: existingDup ? "DISPUTED" : "ACTIVE",
      },
    });

    if (existingDup) {
      await prisma.rightsClaim.create({
        data: {
          rightsAssetId: asset.id,
          claimantUserId: auth.user.id,
          claimType: "DUPLICATE_ASSET",
          status: "OPEN",
          duplicateMatchId: existingDup.id,
          details: `Automatic duplicate detection flagged matching audio hash or ISRC (${isrc}) with existing catalog asset ${existingDup.id}.`,
        },
      });
    }
  }

  const updated = await prisma.release.update({
    where: { id },
    data: {
      upc: generatedUpc,
      status: "SUBMITTED",
      submittedAt: new Date(),
      currentWizardStep: 8,
      submissions: {
        create: {
          submittedById: auth.user.id,
          partnerAdapter: "internal",
          partnerStatus: "INTERNAL_REVIEW",
          notes: "Submitted via 8-step Release Wizard; awaiting admin QC review.",
        },
      },
      activities: {
        create: {
          actorUserId: auth.user.id,
          action: "RELEASE_SUBMITTED",
          fromStatus: release.status,
          toStatus: "SUBMITTED",
          details: `Submitted "${release.title}" with ${release.tracks.length} track(s) to ${release.stores.length} store(s).`,
        },
      },
    },
  });

  // Notify admins
  const admins = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"] } },
    select: { id: true },
  });
  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a.id,
        type: "SUBMISSION",
        title: "New Release Submitted for Review",
        message: `"${release.title}" by ${release.primaryArtist} is ready for QC inspection.`,
        link: "/admin/submissions",
      })
    )
  );

  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "RELEASE_SUBMITTED",
    entityType: "Release",
    entityId: release.id,
  });

  return NextResponse.json({
    ok: true,
    release: updated,
    message: "Release submitted for quality review!",
  });
}
