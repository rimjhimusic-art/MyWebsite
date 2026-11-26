import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSessionForUser,
  sanitizeUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { isAdminRole } from "@/lib/permissions";

const LoginSchema = z.object({
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`login:${ip}`, 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid credentials." },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      await recordAuditLog({
        action: "LOGIN_FAILED",
        entityType: "User",
        metadata: { email },
        ipAddress: ip,
      });
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "This account has been suspended. Please contact support." },
        { status: 403 }
      );
    }

    if (user.status === "PENDING") {
      return NextResponse.json(
        { error: "Your account is awaiting administrator approval." },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { cookieValue, expiresAt } = await createSessionForUser(user, rememberMe);
    await setSessionCookie(cookieValue, expiresAt, rememberMe);

    await recordAuditLog({
      actorUserId: user.id,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
      ipAddress: ip,
      metadata: { rememberMe },
    });

    return NextResponse.json({
      ok: true,
      user: sanitizeUser(user),
      redirectTo: isAdminRole(user.role) ? "/admin" : "/dashboard",
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Authentication failed." },
      { status: 500 }
    );
  }
}
