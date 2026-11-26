import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  resolveUserPermissions,
  userHasAnyPermission,
  parseAllowedSections,
  type Permission,
} from "@/lib/permissions";
import type { User, UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "onetab_session";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "onetab-local-dev-secret-change-in-production-32chars-min";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSessionForUser(
  user: Pick<User, "id" | "role" | "email">,
  rememberMe = false
): Promise<{ cookieValue: string; expiresAt: Date }> {
  const rawSessionSecret = generateRawToken();
  const tokenHash = hashToken(rawSessionSecret);
  const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  try {
    const hdrs = await headers();
    ipAddress = hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || null;
    userAgent = hdrs.get("user-agent") || null;
  } catch {
    // Non-request context (e.g., tests)
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      rememberMe,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  const jwt = await new SignJWT({
    sid: session.id,
    uid: user.id,
    role: user.role,
    sec: rawSessionSecret,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  return { cookieValue: jwt, expiresAt };
}

export async function setSessionCookie(
  cookieValue: string,
  expiresAt: Date,
  rememberMe: boolean
) {
  let isHttps = false;
  try {
    const hdrs = await headers();
    const proto = hdrs.get("x-forwarded-proto") || "";
    const origin = hdrs.get("origin") || hdrs.get("referer") || "";
    isHttps = proto === "https" || origin.startsWith("https://");
  } catch {
    isHttps = false;
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.FORCE_SECURE_COOKIE === "true" || isHttps,
    path: "/",
    ...(rememberMe ? { expires: expiresAt } : {}),
  });
}

export async function revokeCurrentSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, getSecretKey());
        if (typeof payload.sid === "string") {
          await prisma.session.updateMany({
            where: { id: payload.sid, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      } catch {
        // Invalid token; still clear cookie
      }
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // ignore outside request
  }
}

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  country: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  adminPreset: string | null;
  customPermissionsJson: string | null;
  allowedSectionsJson: string | null;
  permissions: Permission[];
  allowedSections: string[] | null;
  sessionId: string;
};

export async function verifySessionJwt(
  token: string
): Promise<AuthenticatedUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sid = payload.sid;
    const sec = payload.sec;
    if (typeof sid !== "string" || typeof sec !== "string") return null;

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    if (session.tokenHash !== hashToken(sec)) {
      return null;
    }

    if (session.user.status === "SUSPENDED") {
      return null;
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
      country: session.user.country,
      phone: session.user.phone,
      bio: session.user.bio,
      avatarUrl: session.user.avatarUrl,
      emailVerifiedAt: session.user.emailVerifiedAt,
      adminPreset: session.user.adminPreset ?? null,
      customPermissionsJson: session.user.customPermissionsJson ?? null,
      allowedSectionsJson: session.user.allowedSectionsJson ?? null,
      permissions: resolveUserPermissions(session.user),
      allowedSections: parseAllowedSections(session.user.allowedSectionsJson),
      sessionId: session.id,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionJwt(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<
  | { user: AuthenticatedUser; error?: never }
  | { user?: never; error: Response }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: Response.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      ),
    };
  }
  if (user.status === "PENDING") {
    return {
      error: Response.json(
        { error: "Your account is pending approval by an administrator." },
        { status: 403 }
      ),
    };
  }
  return { user };
}

export async function requirePermission(
  permission: Permission | Permission[]
): Promise<
  | { user: AuthenticatedUser; error?: never }
  | { user?: never; error: Response }
> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  const required = Array.isArray(permission) ? permission : [permission];
  if (!userHasAnyPermission(auth.user, required)) {
    return {
      error: Response.json(
        { error: `Forbidden: missing permission (${required.join(" | ")}).` },
        { status: 403 }
      ),
    };
  }
  return { user: auth.user };
}

export function sanitizeUser<T extends { passwordHash?: unknown }>(
  user: T
): Omit<T, "passwordHash"> {
  const clone = { ...user };
  delete clone.passwordHash;
  return clone;
}
