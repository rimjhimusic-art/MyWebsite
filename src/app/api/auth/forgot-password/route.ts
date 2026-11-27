import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateRawToken, hashToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPlatformEmail } from "@/lib/email";
import { recordAuditLog } from "@/lib/audit";

const ForgotSchema = z.object({
  email: z.string().trim().email("Valid email is required").toLowerCase(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`forgot:${ip}`, 8, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = ForgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid email." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    let resetUrl: string | undefined;
    if (user) {
      const rawToken = generateRawToken();
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          email: user.email,
          tokenHash: hashToken(rawToken),
          type: "PASSWORD_RESET",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const appUrl = process.env.APP_URL || "http://localhost:3000";
      resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

      await sendPlatformEmail({
        toEmail: user.email,
        subject: "Reset your Goldex Media Network password",
        bodyPreview: `Reset your password within 60 minutes: ${resetUrl}`,
        template: "password_reset",
      });

      await recordAuditLog({
        actorUserId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "User",
        entityId: user.id,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for that email, a password reset link has been generated.",
      resetUrl: process.env.SMTP_HOST ? undefined : resetUrl,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Unable to process password reset request." },
      { status: 500 }
    );
  }
}
