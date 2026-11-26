import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { getProviderCredentialStatus } from "@/lib/integrations";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const isAdmin = isAdminRole(auth.user.role);
  const partnerStatus = getProviderCredentialStatus("VYDIA");

  const submissions = await prisma.vevoSubmission.findMany({
    where: isAdmin ? {} : { ownerUserId: auth.user.id },
    include: {
      artist: { select: { id: true, stageName: true } },
      release: { select: { id: true, title: true } },
      videoAsset: { select: { id: true, originalName: true, sizeBytes: true } },
      artworkAsset: { select: { id: true, originalName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ partnerStatus, submissions });
}

const VevoSchema = z.object({
  artistId: z.string().min(1, "Artist is required"),
  releaseId: z.string().optional().nullable(),
  videoTitle: z.string().trim().min(2, "Video title is required"),
  videoDescription: z.string().trim().optional().nullable(),
  director: z.string().trim().optional().nullable(),
  genre: z.string().trim().min(2, "Genre is required"),
  language: z.string().trim().default("English"),
  explicitContent: z.boolean().default(false),
  vevoChannelName: z.string().trim().optional().nullable(),
  videoAssetId: z.string().optional().nullable(),
  artworkAssetId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = VevoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid VEVO submission." },
        { status: 400 }
      );
    }

    const partnerStatus = getProviderCredentialStatus("VYDIA");
    const sub = await prisma.vevoSubmission.create({
      data: {
        ownerUserId: auth.user.id,
        artistId: parsed.data.artistId,
        releaseId: parsed.data.releaseId || null,
        videoTitle: parsed.data.videoTitle,
        videoDescription: parsed.data.videoDescription || null,
        director: parsed.data.director || null,
        genre: parsed.data.genre,
        language: parsed.data.language,
        explicitContent: parsed.data.explicitContent,
        vevoChannelName: parsed.data.vevoChannelName || null,
        videoAssetId: parsed.data.videoAssetId || null,
        artworkAssetId: parsed.data.artworkAssetId || null,
        status: partnerStatus.configured ? "SUBMITTED" : "PENDING_PARTNER_AUTH",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        submission: sub,
        message:
          "VEVO submission saved for admin QC review. External VEVO delivery activates once authorized partner credentials are connected.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("VEVO POST error:", err);
    return NextResponse.json(
      { error: "Failed to create VEVO submission." },
      { status: 500 }
    );
  }
}
