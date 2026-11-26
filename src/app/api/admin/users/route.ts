import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, sanitizeUser } from "@/lib/auth";
import { recordAuditLog, createNotification } from "@/lib/audit";

export async function GET() {
  const auth = await requirePermission("users:manage");
  if (auth.error) return auth.error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { releases: true, ownedLabels: true, artists: true } },
    },
  });

  return NextResponse.json({ users: users.map((u) => sanitizeUser(u)) });
}

const UpdateUserSchema = z.object({
  userId: z.string(),
  role: z
    .enum([
      "SUPER_ADMIN",
      "ADMIN",
      "LABEL_OWNER",
      "LABEL_MANAGER",
      "ARTIST",
      "FINANCE_MANAGER",
      "CONTENT_MANAGER",
    ])
    .optional(),
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
});

export async function PATCH(request: Request) {
  const auth = await requirePermission("users:manage");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
    }

    if (
      parsed.data.role === "SUPER_ADMIN" &&
      auth.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Only Super Admin can assign Super Admin role." },
        { status: 403 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        ...(parsed.data.role ? { role: parsed.data.role } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      },
    });

    await createNotification({
      userId: updated.id,
      type: "ACCOUNT",
      title: "Account Status / Role Updated",
      message: `Your account status is now ${updated.status} (${updated.role}).`,
      link: "/dashboard/settings",
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "ADMIN_USER_UPDATED",
      entityType: "User",
      entityId: updated.id,
      metadata: { role: updated.role, status: updated.status },
    });

    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (err) {
    console.error("Admin user PATCH error:", err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
