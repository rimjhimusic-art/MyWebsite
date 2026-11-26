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
  const ytCreds = getProviderCredentialStatus("YOUTUBE");

  const [channels, requests] = await Promise.all([
    prisma.youtubeChannel.findMany({
      where: isAdmin ? {} : { ownerUserId: auth.user.id },
      include: { artist: { select: { id: true, stageName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.youtubeRequest.findMany({
      where: isAdmin ? {} : { ownerUserId: auth.user.id },
      include: {
        channel: { select: { id: true, channelName: true, channelId: true } },
        release: { select: { id: true, title: true } },
        track: { select: { id: true, title: true, isrc: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    integrationStatus: ytCreds,
    channels,
    requests,
  });
}

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("register_channel"),
    channelId: z.string().trim().min(3),
    channelName: z.string().trim().min(2),
    channelUrl: z.string().trim().url(),
    artistId: z.string().optional().nullable(),
  }),
  z.object({
    action: z.literal("create_request"),
    requestType: z.enum(["OAC", "CONTENT_ID", "MONETIZATION", "CLAIM_DISPUTE"]),
    channelId: z.string().optional().nullable(),
    releaseId: z.string().optional().nullable(),
    trackId: z.string().optional().nullable(),
    externalClaimId: z.string().trim().optional().nullable(),
    notes: z.string().trim().min(3),
  }),
]);

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid YouTube request." },
        { status: 400 }
      );
    }

    const ytCreds = getProviderCredentialStatus("YOUTUBE");
    const initialStatus = ytCreds.configured ? "SUBMITTED" : "PENDING_PARTNER_AUTH";

    if (parsed.data.action === "register_channel") {
      const existing = await prisma.youtubeChannel.findUnique({
        where: { channelId: parsed.data.channelId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "This YouTube Channel ID is already registered." },
          { status: 409 }
        );
      }

      const channel = await prisma.youtubeChannel.create({
        data: {
          ownerUserId: auth.user.id,
          artistId: parsed.data.artistId || null,
          channelId: parsed.data.channelId,
          channelName: parsed.data.channelName,
          channelUrl: parsed.data.channelUrl,
          oacStatus: initialStatus,
          monetizationStatus: initialStatus,
        },
      });
      return NextResponse.json({ ok: true, channel }, { status: 201 });
    }

    const req = await prisma.youtubeRequest.create({
      data: {
        ownerUserId: auth.user.id,
        channelId: parsed.data.channelId || null,
        releaseId: parsed.data.releaseId || null,
        trackId: parsed.data.trackId || null,
        requestType: parsed.data.requestType,
        externalClaimId: parsed.data.externalClaimId || null,
        notes: parsed.data.notes,
        status: initialStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      request: req,
      message: ytCreds.configured
        ? "YouTube rights request submitted."
        : "Saved in Pending Partner Auth queue (authorized YouTube CMS credentials required for live provisioning).",
    }, { status: 201 });
  } catch (err) {
    console.error("YouTube POST error:", err);
    return NextResponse.json({ error: "Failed to save YouTube request." }, { status: 500 });
  }
}
