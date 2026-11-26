import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { getAccessibleLabelIds } from "@/lib/labels";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = (searchParams.get("search") || "").trim();

  const labelIds = await getAccessibleLabelIds(auth.user.id);
  const isAdmin = isAdminRole(auth.user.role);

  const where: Record<string, unknown> = {};
  if (!isAdmin) {
    where.OR = [
      { ownerUserId: auth.user.id },
      ...(labelIds.length > 0 ? [{ labelId: { in: labelIds } }] : []),
    ];
  }

  if (type && ["SINGLE", "EP", "ALBUM", "COMPILATION"].includes(type)) {
    where.releaseType = type;
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where.AND = [
      {
        OR: [
          { title: { contains: search } },
          { primaryArtist: { contains: search } },
          { upc: { contains: search } },
        ],
      },
    ];
  }

  const releases = await prisma.release.findMany({
    where,
    include: {
      artist: { select: { id: true, stageName: true } },
      label: { select: { id: true, name: true } },
      artworkAsset: { select: { id: true, originalName: true, width: true, height: true } },
      _count: { select: { tracks: true, stores: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ releases });
}

const CreateReleaseSchema = z.object({
  releaseType: z.enum(["SINGLE", "EP", "ALBUM", "COMPILATION"]).default("SINGLE"),
  title: z.string().trim().min(1, "Release title is required"),
  version: z.string().trim().optional().nullable(),
  artistId: z.string().optional(),
  labelId: z.string().optional().nullable(),
  primaryArtist: z.string().trim().min(1, "Primary artist is required"),
  featuringArtists: z.string().trim().optional().nullable(),
  remixer: z.string().trim().optional().nullable(),
  composer: z.string().trim().optional().nullable(),
  lyricist: z.string().trim().optional().nullable(),
  producer: z.string().trim().optional().nullable(),
  arranger: z.string().trim().optional().nullable(),
  musicDirector: z.string().trim().optional().nullable(),
  recordLabelName: z.string().trim().min(1).default("Independent"),
  genre: z.string().trim().min(1).default("Pop"),
  subgenre: z.string().trim().optional().nullable(),
  language: z.string().trim().default("English"),
  releaseDate: z.string().optional().nullable(),
  originalReleaseDate: z.string().optional().nullable(),
  copyrightYear: z.number().int().optional().nullable(),
  copyrightOwner: z.string().trim().optional().nullable(),
  phonographicCopyright: z.string().trim().optional().nullable(),
  explicitContent: z.boolean().optional().default(false),
  upc: z.string().trim().optional().nullable(),
  cLine: z.string().trim().optional().nullable(),
  pLine: z.string().trim().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateReleaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid release metadata." },
        { status: 400 }
      );
    }

    const d = parsed.data;
    let artistId = d.artistId;
    if (!artistId) {
      const existingArtist = await prisma.artist.findFirst({
        where: { userId: auth.user.id },
      });
      if (existingArtist) {
        artistId = existingArtist.id;
      } else {
        const createdArtist = await prisma.artist.create({
          data: {
            userId: auth.user.id,
            stageName: d.primaryArtist,
            legalName: auth.user.name,
            country: auth.user.country,
          },
        });
        artistId = createdArtist.id;
      }
    }

    let labelId = d.labelId || null;
    if (!labelId) {
      const ownedLabel = await prisma.label.findFirst({
        where: {
          OR: [
            { ownerId: auth.user.id },
            { members: { some: { userId: auth.user.id } } },
          ],
        },
      });
      labelId = ownedLabel?.id ?? null;
    }

    const slugBase = d.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const smartLinkSlug = `${slugBase || "release"}-${Date.now().toString(36).slice(-5)}`;

    const allStores = await prisma.dspStore.findMany({ where: { active: true } });

    const release = await prisma.release.create({
      data: {
        ownerUserId: auth.user.id,
        artistId,
        labelId,
        releaseType: d.releaseType,
        title: d.title,
        version: d.version || null,
        primaryArtist: d.primaryArtist,
        featuringArtists: d.featuringArtists || null,
        remixer: d.remixer || null,
        composer: d.composer || null,
        lyricist: d.lyricist || null,
        producer: d.producer || null,
        arranger: d.arranger || null,
        musicDirector: d.musicDirector || null,
        recordLabelName: d.recordLabelName,
        genre: d.genre,
        subgenre: d.subgenre || null,
        language: d.language,
        releaseDate: d.releaseDate ? new Date(d.releaseDate) : null,
        originalReleaseDate: d.originalReleaseDate
          ? new Date(d.originalReleaseDate)
          : null,
        copyrightYear: d.copyrightYear ?? new Date().getFullYear(),
        copyrightOwner: d.copyrightOwner || d.primaryArtist,
        phonographicCopyright: d.phonographicCopyright || d.recordLabelName,
        explicitContent: d.explicitContent,
        upc: d.upc || null,
        cLine: d.cLine || `${new Date().getFullYear()} ${d.copyrightOwner || d.primaryArtist}`,
        pLine: d.pLine || `${new Date().getFullYear()} ${d.recordLabelName}`,
        smartLinkSlug,
        status: "DRAFT",
        currentWizardStep: 2,
        stores: {
          create: allStores.map((s) => ({
            storeId: s.id,
            selected: true,
            deliveryStatus: "NOT_SUBMITTED",
          })),
        },
        activities: {
          create: {
            actorUserId: auth.user.id,
            action: "DRAFT_CREATED",
            toStatus: "DRAFT",
            details: `Created draft release "${d.title}"`,
          },
        },
      },
      include: {
        tracks: true,
        stores: { include: { store: true } },
        artworkAsset: true,
      },
    });

    return NextResponse.json({ ok: true, release }, { status: 201 });
  } catch (err) {
    console.error("Create release error:", err);
    return NextResponse.json(
      { error: "Failed to create release draft." },
      { status: 500 }
    );
  }
}
