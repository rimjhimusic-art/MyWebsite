import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getObject } from "@/lib/storage";
import { isAdminRole } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    include: {
      artworkFor: { select: { id: true, status: true, labelId: true } },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const isPublicLiveArtwork =
    asset.kind === "ARTWORK" &&
    asset.artworkFor.some((r) => r.status === "LIVE");
  const isPublicAsset = Boolean(asset.isPublicCms) || isPublicLiveArtwork;

  if (!isPublicAsset) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const isOwner = asset.ownerUserId === user.id;
    const isAdmin = isAdminRole(user.role);
    let hasLabelAccess = false;
    if (!isOwner && !isAdmin && asset.artworkFor.length > 0) {
      const labelIds = asset.artworkFor
        .map((r) => r.labelId)
        .filter((x): x is string => Boolean(x));
      if (labelIds.length > 0) {
        const count = await prisma.label.count({
          where: {
            id: { in: labelIds },
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } },
            ],
          },
        });
        hasLabelAccess = count > 0;
      }
    }

    if (!isOwner && !isAdmin && !hasLabelAccess) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  let buffer = await getObject(asset.storageKey);
  if (!buffer && asset.inlineData) {
    buffer = Buffer.from(asset.inlineData);
  }
  if (!buffer) {
    return NextResponse.json({ error: "Stored object missing." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": isPublicAsset ? "public, max-age=3600" : "private, max-age=3600",
    },
  });
}
