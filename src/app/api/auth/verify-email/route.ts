import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRawToken, getCurrentUser, hashToken } from "@/lib/auth";
import { sendPlatformEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action || "verify";

    if (action === "resend") {
      const user = await getCurrentUser();
      const targetEmail = user?.email || body?.email;
      if (!targetEmail) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
      }
      const dbUser = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (!dbUser) {
        return NextResponse.json({ ok: true, message: "Verification email dispatched if account exists." });
      }
      const rawToken = generateRawToken();
      await prisma.verificationToken.create({
        data: {
          userId: dbUser.id,
          email: dbUser.email,
          tokenHash: hashToken(rawToken),
          type: "EMAIL_VERIFY",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;
      await sendPlatformEmail({
        toEmail: dbUser.email,
        subject: "Verify your OneTab Media Network email",
        bodyPreview: `Verify your email: ${verifyUrl}`,
        template: "email_verification",
      });
      return NextResponse.json({
        ok: true,
        message: "Verification link sent!",
        verifyUrl: process.env.SMTP_HOST ? undefined : verifyUrl,
      });
    }

    const token = String(body?.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
    }

    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (
      !record ||
      record.type !== "EMAIL_VERIFY" ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      !record.userId
    ) {
      return NextResponse.json(
        { error: "Verification token is invalid or expired." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Email address verified successfully!",
    });
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json(
      { error: "Failed to verify email." },
      { status: 500 }
    );
  }
}
