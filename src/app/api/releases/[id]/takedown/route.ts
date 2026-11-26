import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createNotification } from "@/lib/audit";
import { getAccessibleLabelIds } from "@/lib/labels";

const TakedownSchema = z.object({
  reason: z.string().trim().min(5, "Please provide a takedown reason."),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const release = await prisma.release.findUnique({ where: { id } });
  if (!release) {
    return NextResponse.json({ error: "Release not found." }, { status: 404 });
  }

  const labelIds = await getAccessibleLabelIds(auth.user.id);
  const canRequest =
    release.ownerUserId === auth.user.id ||
    (release.labelId && labelIds.includes(release.labelId));
  if (!canRequest) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = TakedownSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Reason required." },
      { status: 400 }
    );
  }

  const updated = await prisma.release.update({
    where: { id },
    data: {
      status: "TAKEDOWN_REQUESTED",
      activities: {
        create: {
          actorUserId: auth.user.id,
          action: "TAKEDOWN_REQUESTED",
          fromStatus: release.status,
          toStatus: "TAKEDOWN_REQUESTED",
          details: parsed.data.reason,
        },
      },
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"] } },
    select: { id: true },
  });
  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a.id,
        type: "TAKEDOWN",
        title: "Takedown Requested",
        message: `Takedown requested for "${release.title}": ${parsed.data.reason}`,
        link: "/admin/releases",
      })
    )
  );

  return NextResponse.json({ ok: true, release: updated });
}
