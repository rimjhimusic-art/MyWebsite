import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { createNotification, recordAuditLog } from "@/lib/audit";
import { dispatchReleaseToPartner } from "@/lib/integrations";

export async function GET(request: Request) {
  const auth = await requirePermission("release:review");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const releases = await prisma.release.findMany({
    where: status ? { status: status as never } : {},
    include: {
      owner: { select: { id: true, name: true, email: true } },
      artist: { select: { id: true, stageName: true } },
      label: { select: { id: true, name: true } },
      artworkAsset: true,
      tracks: {
        orderBy: { trackNumber: "asc" },
        include: { audioAsset: true },
      },
      stores: { include: { store: true } },
      submissions: { orderBy: { createdAt: "desc" } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, role: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ releases });
}

const ReviewSchema = z.object({
  releaseId: z.string(),
  status: z.enum([
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "SCHEDULED",
    "PROCESSING",
    "DELIVERED",
    "LIVE",
    "TAKEDOWN_REQUESTED",
    "TAKEN_DOWN",
  ]),
  rejectionReason: z.string().optional().nullable(),
  correctionNotes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

export async function PATCH(request: Request) {
  const auth = await requirePermission("release:approve");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid review payload." },
        { status: 400 }
      );
    }

    const existing = await prisma.release.findUnique({
      where: { id: parsed.data.releaseId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Release not found." }, { status: 404 });
    }

    let partnerMessage: string | undefined;
    if (["DELIVERED", "LIVE"].includes(parsed.data.status)) {
      const dispatch = await dispatchReleaseToPartner(existing.id, "VYDIA");
      partnerMessage = dispatch.message;
      await prisma.releaseStore.updateMany({
        where: { releaseId: existing.id, selected: true },
        data: {
          deliveryStatus:
            dispatch.status === "DISPATCHED"
              ? parsed.data.status === "LIVE"
                ? "LIVE"
                : "DELIVERED"
              : "PENDING_PARTNER",
        },
      });
    } else if (parsed.data.status === "TAKEN_DOWN") {
      await prisma.releaseStore.updateMany({
        where: { releaseId: existing.id },
        data: { deliveryStatus: "TAKEN_DOWN" },
      });
    }

    const updated = await prisma.release.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.rejectionReason !== undefined
          ? { rejectionReason: parsed.data.rejectionReason }
          : {}),
        ...(parsed.data.correctionNotes !== undefined
          ? { correctionNotes: parsed.data.correctionNotes }
          : {}),
        ...(parsed.data.internalNotes !== undefined
          ? { internalNotes: parsed.data.internalNotes }
          : {}),
        ...(parsed.data.status === "APPROVED" ? { approvedAt: new Date() } : {}),
        ...(parsed.data.status === "LIVE" ? { publishedAt: new Date() } : {}),
        ...(parsed.data.scheduledAt
          ? { scheduledAt: new Date(parsed.data.scheduledAt) }
          : {}),
        activities: {
          create: {
            actorUserId: auth.user.id,
            action: `STATUS_CHANGED_TO_${parsed.data.status}`,
            fromStatus: existing.status,
            toStatus: parsed.data.status,
            details:
              parsed.data.rejectionReason ||
              parsed.data.correctionNotes ||
              parsed.data.internalNotes ||
              `Administrator updated status to ${parsed.data.status}`,
          },
        },
      },
    });

    await createNotification({
      userId: existing.ownerUserId,
      type: "RELEASE",
      title: `Release "${existing.title}" is now ${parsed.data.status}`,
      message:
        parsed.data.rejectionReason ||
        parsed.data.correctionNotes ||
        `Your release status changed from ${existing.status} to ${parsed.data.status}.`,
      link: `/dashboard/releases`,
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "ADMIN_RELEASE_REVIEWED",
      entityType: "Release",
      entityId: existing.id,
      metadata: { from: existing.status, to: parsed.data.status },
    });

    return NextResponse.json({
      ok: true,
      release: updated,
      partnerMessage,
    });
  } catch (err) {
    console.error("Admin release review error:", err);
    return NextResponse.json({ error: "Failed to review release." }, { status: 500 });
  }
}
