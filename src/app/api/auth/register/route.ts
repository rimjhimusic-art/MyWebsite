import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSessionForUser,
  generateRawToken,
  hashPassword,
  hashToken,
  sanitizeUser,
  setSessionCookie,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog, createNotification } from "@/lib/audit";
import { sendPlatformEmail } from "@/lib/email";

const RegisterSchema = z.object({
  accountType: z.enum(["ARTIST", "LABEL"]).default("ARTIST"),
  name: z.string().trim().min(2, "Full name is required"),
  stageOrLabelName: z.string().trim().min(2).optional(),
  email: z.string().trim().email("Valid email address is required").toLowerCase(),
  country: z.string().trim().min(2).default("India"),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  termsAccepted: z.boolean().refine((v) => v === true, {
    message: "You must accept the Terms of Service and Privacy Policy",
  }),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`register:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid registration fields." },
        { status: 400 }
      );
    }

    const { accountType, name, stageOrLabelName, email, country, phone, website, password } =
      parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const role = accountType === "LABEL" ? "LABEL_OWNER" : "ARTIST";

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role,
          status: "APPROVED",
          country,
          phone: phone || null,
        },
      });

      if (accountType === "LABEL") {
        const labelTitle = stageOrLabelName || `${name} Records`;
        const slugBase = labelTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const slug = `${slugBase || "label"}-${createdUser.id.slice(-5)}`;
        await tx.label.create({
          data: {
            name: labelTitle,
            slug,
            ownerId: createdUser.id,
            website: website || null,
            country,
            status: "APPROVED",
          },
        });
      } else {
        await tx.artist.create({
          data: {
            userId: createdUser.id,
            stageName: stageOrLabelName || name,
            legalName: name,
            country,
            verified: false,
          },
        });
      }

      return createdUser;
    });

    const rawVerifyToken = generateRawToken();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        email: user.email,
        tokenHash: hashToken(rawVerifyToken),
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-email?token=${rawVerifyToken}`;

    await sendPlatformEmail({
      toEmail: user.email,
      subject: "Verify your Goldex Media Network email",
      bodyPreview: `Welcome ${user.name}! Verify your email here: ${verifyUrl}`,
      template: "email_verification",
    });

    const { cookieValue, expiresAt } = await createSessionForUser(user, false);
    await setSessionCookie(cookieValue, expiresAt, false);

    await createNotification({
      userId: user.id,
      type: "ACCOUNT",
      title: "Welcome to Goldex Media Network",
      message:
        "Your creator account is active. Please verify your email address and complete your payout profile.",
      link: "/dashboard/settings",
    });

    await recordAuditLog({
      actorUserId: user.id,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      metadata: { role, accountType },
    });

    return NextResponse.json(
      {
        ok: true,
        user: sanitizeUser(user),
        verifyUrl: process.env.SMTP_HOST ? undefined : verifyUrl,
        message: "Account created successfully!",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 500 }
    );
  }
}
