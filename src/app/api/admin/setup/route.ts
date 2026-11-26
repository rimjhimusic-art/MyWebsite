import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionForUser, hashPassword, sanitizeUser, setSessionCookie } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

const SetupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
  setupToken: z.string().optional(),
});

export async function GET() {
  const count = await prisma.user.count({
    where: { role: "SUPER_ADMIN" },
  });
  return NextResponse.json({ hasSuperAdmin: count > 0 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const existingSuperAdmins = await prisma.user.count({
      where: { role: "SUPER_ADMIN" },
    });

    if (existingSuperAdmins > 0) {
      const configuredToken = process.env.ADMIN_SETUP_TOKEN;
      if (!configuredToken || parsed.data.setupToken !== configuredToken) {
        return NextResponse.json(
          { error: "Super Admin already initialized. Valid ADMIN_SETUP_TOKEN required." },
          { status: 403 }
        );
      }
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.upsert({
      where: { email: parsed.data.email },
      update: {
        name: parsed.data.name,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "APPROVED",
        emailVerifiedAt: new Date(),
      },
      create: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "APPROVED",
        emailVerifiedAt: new Date(),
        country: "India",
      },
    });

    const { cookieValue, expiresAt } = await createSessionForUser(user, false);
    await setSessionCookie(cookieValue, expiresAt, false);

    await recordAuditLog({
      actorUserId: user.id,
      action: "ADMIN_INITIAL_SETUP",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email },
    });

    return NextResponse.json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Admin setup error:", err);
    return NextResponse.json({ error: "Failed to configure admin account." }, { status: 500 });
  }
}
