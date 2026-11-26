import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { getAccessibleLabelIds } from "@/lib/labels";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const isAdmin = isAdminRole(auth.user.role);
  const labelIds = await getAccessibleLabelIds(auth.user.id);

  const artists = await prisma.artist.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { userId: auth.user.id },
            ...(labelIds.length > 0 ? [{ labelId: { in: labelIds } }] : []),
          ],
        },
    include: {
      label: { select: { id: true, name: true } },
      _count: { select: { releases: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ artists });
}

const CreateArtistSchema = z.object({
  stageName: z.string().trim().min(1, "Stage name is required"),
  legalName: z.string().trim().optional().nullable(),
  genre: z.string().trim().optional().nullable(),
  country: z.string().trim().default("India"),
  bio: z.string().trim().max(1500).optional().nullable(),
  labelId: z.string().optional().nullable(),
  spotifyUrl: z.string().trim().optional().nullable(),
  appleMusicUrl: z.string().trim().optional().nullable(),
  youtubeChannelUrl: z.string().trim().optional().nullable(),
  instagramUrl: z.string().trim().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateArtistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid artist data." },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const labelIds = await getAccessibleLabelIds(auth.user.id);
    const labelId =
      d.labelId && (isAdminRole(auth.user.role) || labelIds.includes(d.labelId))
        ? d.labelId
        : labelIds[0] ?? null;

    const artist = await prisma.artist.create({
      data: {
        userId: auth.user.id,
        labelId,
        stageName: d.stageName,
        legalName: d.legalName || null,
        genre: d.genre || null,
        country: d.country,
        bio: d.bio || null,
        spotifyUrl: d.spotifyUrl || null,
        appleMusicUrl: d.appleMusicUrl || null,
        youtubeChannelUrl: d.youtubeChannelUrl || null,
        instagramUrl: d.instagramUrl || null,
      },
    });

    return NextResponse.json({ ok: true, artist }, { status: 201 });
  } catch (err) {
    console.error("Create artist error:", err);
    return NextResponse.json({ error: "Failed to create artist." }, { status: 500 });
  }
}
