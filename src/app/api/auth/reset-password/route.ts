import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

const ResetSchema = z.object({
  token: z.string().trim().min(10, "Invalid reset token"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(parsed.data.token);
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.type !== "PASSWORD_RESET" ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      !record.userId
    ) {
      return NextResponse.json(
        { error: "Reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await recordAuditLog({
      actorUserId: record.userId,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: record.userId,
    });

    return NextResponse.json({
      ok: true,
      message: "Password updated successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
