import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  hashPassword,
  requireAuth,
  sanitizeUser,
  verifyPassword,
} from "@/lib/auth";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: {
      artists: { select: { id: true, stageName: true, verified: true, labelId: true } },
      ownedLabels: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!fullUser) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: sanitizeUser(fullUser),
    permissions: ROLE_PERMISSIONS[fullUser.role],
  });
}

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  country: z.string().trim().min(2).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  bio: z.string().trim().max(1000).optional().nullable(),
  payoutMethod: z
    .enum(["BANK_TRANSFER", "UPI", "PAYPAL", "WIRE"])
    .optional()
    .nullable(),
  payoutDetails: z.string().trim().max(500).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid profile update." },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updatePayload: Record<string, unknown> = {};

    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.country !== undefined) updatePayload.country = data.country;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.bio !== undefined) updatePayload.bio = data.bio;
    if (data.payoutMethod !== undefined) updatePayload.payoutMethod = data.payoutMethod;
    if (data.payoutDetails !== undefined) updatePayload.payoutDetails = data.payoutDetails;

    if (data.newPassword) {
      if (!data.currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password." },
          { status: 400 }
        );
      }
      const existing = await prisma.user.findUnique({
        where: { id: auth.user.id },
      });
      if (!existing || !(await verifyPassword(data.currentPassword, existing.passwordHash))) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 400 }
        );
      }
      updatePayload.passwordHash = await hashPassword(data.newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: updatePayload,
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "PROFILE_UPDATED",
      entityType: "User",
      entityId: auth.user.id,
    });

    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
