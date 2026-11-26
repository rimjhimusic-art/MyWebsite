import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const isAdmin = isAdminRole(auth.user.role);

  const [assets, claims] = await Promise.all([
    prisma.rightsAsset.findMany({
      where: isAdmin ? {} : { ownerUserId: auth.user.id },
      include: {
        release: { select: { id: true, title: true, primaryArtist: true, status: true } },
        track: { select: { id: true, title: true, isrc: true } },
        claims: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rightsClaim.findMany({
      where: isAdmin
        ? {}
        : {
            OR: [
              { claimantUserId: auth.user.id },
              { rightsAsset: { ownerUserId: auth.user.id } },
            ],
          },
      include: {
        rightsAsset: {
          include: {
            release: { select: { id: true, title: true } },
            track: { select: { id: true, title: true, isrc: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ assets, claims });
}

const ClaimSchema = z.object({
  rightsAssetId: z.string(),
  claimType: z.enum([
    "COPYRIGHT_CLAIM",
    "DUPLICATE_ASSET",
    "TAKEDOWN_REQUEST",
    "TERRITORY_BLOCK",
  ]),
  details: z.string().trim().min(5),
  territoryRestrictions: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = ClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid claim payload." },
        { status: 400 }
      );
    }

    const asset = await prisma.rightsAsset.findUnique({
      where: { id: parsed.data.rightsAssetId },
    });
    if (!asset) {
      return NextResponse.json({ error: "Rights asset not found." }, { status: 404 });
    }
    if (asset.ownerUserId !== auth.user.id && !isAdminRole(auth.user.role)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (parsed.data.territoryRestrictions) {
      await prisma.rightsAsset.update({
        where: { id: asset.id },
        data: {
          territoryRestrictionsJson: JSON.stringify(parsed.data.territoryRestrictions),
        },
      });
    }

    const claim = await prisma.rightsClaim.create({
      data: {
        rightsAssetId: asset.id,
        claimantUserId: auth.user.id,
        claimType: parsed.data.claimType,
        details: parsed.data.details,
      },
    });

    return NextResponse.json({ ok: true, claim }, { status: 201 });
  } catch (err) {
    console.error("Rights POST error:", err);
    return NextResponse.json({ error: "Failed to submit rights claim." }, { status: 500 });
  }
}
