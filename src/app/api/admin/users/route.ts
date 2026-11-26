import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, requirePermission, sanitizeUser } from "@/lib/auth";
import { recordAuditLog, createNotification } from "@/lib/audit";
import {
  ALL_PERMISSIONS,
  resolveUserPermissions,
  parseAllowedSections,
  type Permission,
} from "@/lib/permissions";

const ALL_PERM_SET = new Set<string>(ALL_PERMISSIONS);

function formatAdminUserRow<
  T extends {
    id: string;
    role: string;
    passwordHash?: unknown;
    adminPreset?: string | null;
    customPermissionsJson?: string | null;
    allowedSectionsJson?: string | null;
  }
>(u: T) {
  return {
    ...sanitizeUser(u),
    adminPreset: u.adminPreset ?? null,
    permissions: resolveUserPermissions(u as never),
    allowedSections: parseAllowedSections(u.allowedSectionsJson),
  };
}

export async function GET() {
  const auth = await requirePermission(["users:view", "users:manage"]);
  if (auth.error) return auth.error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          releases: true,
          ownedLabels: true,
          artists: true,
          activities: true,
          royaltyBatches: true,
          mediaAssets: true,
        },
      },
    },
  });

  return NextResponse.json({ users: users.map(formatAdminUserRow) });
}

const CreateAdminSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
  role: z.enum(["ADMIN", "EDITOR", "CONTENT_MANAGER", "FINANCE_MANAGER"]).default("EDITOR"),
  adminPreset: z.string().trim().max(50).optional().nullable(),
  permissions: z.array(z.string()).optional(),
  allowedSections: z.array(z.string()).optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requirePermission(["users:add", "users:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = CreateAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid admin account input." },
        { status: 400 }
      );
    }

    const { name, email, password, role, adminPreset, permissions, allowedSections } = parsed.data;

    // Non-Super Admins cannot create FULL ADMIN accounts; only Super Admin has unrestricted user privilege grant.
    if (role === "ADMIN" && auth.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only the Super Admin can create General Admin accounts." },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const validPerms: Permission[] | null = permissions
      ? Array.from(new Set(permissions.filter((p): p is Permission => ALL_PERM_SET.has(p))))
      : null;

    const cleanSections =
      allowedSections && allowedSections.length > 0
        ? JSON.stringify(Array.from(new Set(allowedSections.map((s) => s.trim().toLowerCase()))))
        : null;

    const passwordHash = await hashPassword(password);
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        status: "APPROVED",
        emailVerifiedAt: new Date(),
        country: "India",
        adminPreset: adminPreset || "CUSTOM_ADMIN",
        customPermissionsJson: validPerms ? JSON.stringify(validPerms) : null,
        allowedSectionsJson: cleanSections,
      },
      include: {
        _count: {
          select: {
            releases: true,
            ownedLabels: true,
            artists: true,
            activities: true,
            royaltyBatches: true,
            mediaAssets: true,
          },
        },
      },
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "ADMIN_SUBACCOUNT_CREATED",
      entityType: "User",
      entityId: created.id,
      metadata: {
        email: created.email,
        role: created.role,
        adminPreset: created.adminPreset,
        permissions: validPerms,
      },
    });

    return NextResponse.json({ ok: true, user: formatAdminUserRow(created) }, { status: 201 });
  } catch (err) {
    console.error("Create admin user error:", err);
    return NextResponse.json({ error: "Failed to create admin user." }, { status: 500 });
  }
}

const UpdateUserSchema = z.object({
  userId: z.string(),
  role: z
    .enum([
      "SUPER_ADMIN",
      "ADMIN",
      "EDITOR",
      "LABEL_OWNER",
      "LABEL_MANAGER",
      "ARTIST",
      "FINANCE_MANAGER",
      "CONTENT_MANAGER",
    ])
    .optional(),
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
  adminPreset: z.string().trim().max(50).optional().nullable(),
  permissions: z.array(z.string()).optional().nullable(),
  allowedSections: z.array(z.string()).optional().nullable(),
});

export async function PATCH(request: Request) {
  const auth = await requirePermission(["users:edit", "users:manage"]);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    // Strict Super Admin protection: nobody can modify Super Admin's role, status, or permissions
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Protected: Super Admin account role, status, and permissions cannot be altered here." },
        { status: 403 }
      );
    }

    if (parsed.data.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Protected: Only one Primary Super Admin is permitted." },
        { status: 403 }
      );
    }

    if (parsed.data.role === "ADMIN" && auth.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Admin can assign the General Admin role." },
        { status: 403 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.status) data.status = parsed.data.status;
    if ("adminPreset" in parsed.data) data.adminPreset = parsed.data.adminPreset;
    if ("permissions" in parsed.data) {
      if (parsed.data.permissions === null) {
        data.customPermissionsJson = null;
      } else if (Array.isArray(parsed.data.permissions)) {
        const clean = Array.from(
          new Set(parsed.data.permissions.filter((p): p is Permission => ALL_PERM_SET.has(p)))
        );
        data.customPermissionsJson = JSON.stringify(clean);
      }
    }
    if ("allowedSections" in parsed.data) {
      data.allowedSectionsJson =
        parsed.data.allowedSections && parsed.data.allowedSections.length > 0
          ? JSON.stringify(
              Array.from(new Set(parsed.data.allowedSections.map((s) => s.trim().toLowerCase())))
            )
          : null;
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data,
      include: {
        _count: {
          select: {
            releases: true,
            ownedLabels: true,
            artists: true,
            activities: true,
            royaltyBatches: true,
            mediaAssets: true,
          },
        },
      },
    });

    await createNotification({
      userId: updated.id,
      type: "ACCOUNT",
      title: "Account Status / Permissions Updated",
      message: `Your account is now ${updated.status} (${updated.role}).`,
      link: "/dashboard/settings",
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "ADMIN_USER_UPDATED",
      entityType: "User",
      entityId: updated.id,
      metadata: {
        role: updated.role,
        status: updated.status,
        adminPreset: updated.adminPreset,
      },
    });

    return NextResponse.json({ ok: true, user: formatAdminUserRow(updated) });
  } catch (err) {
    console.error("Admin user PATCH error:", err);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePermission(["users:delete", "users:manage"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const migrateToSuperAdmin = searchParams.get("migrate") === "true";

  if (!userId) {
    return NextResponse.json({ error: "userId query param required." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          releases: true,
          ownedLabels: true,
          artists: true,
          activities: true,
          royaltyBatches: true,
          mediaAssets: true,
          tickets: true,
          payments: true,
          submissionsMade: true,
          rightsAssets: true,
        },
      },
    },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Protected: Primary Super Admin cannot be deleted." },
      { status: 403 }
    );
  }
  if (target.id === auth.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own active account." },
      { status: 400 }
    );
  }
  if (target.role === "ADMIN" && auth.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only Super Admin can delete Admin accounts." },
      { status: 403 }
    );
  }

  const c = target._count;
  const blockers =
    c.releases + c.ownedLabels + c.artists + c.activities + c.royaltyBatches + c.mediaAssets + c.tickets + c.payments + c.submissionsMade + c.rightsAssets;

  if (blockers > 0 && !migrateToSuperAdmin) {
    return NextResponse.json(
      {
        error: "User has linked database records. Pass migrate=true (or suspend account) to preserve referential integrity.",
        dependencies: c,
      },
      { status: 409 }
    );
  }

  const primarySuperAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });
  if (!primarySuperAdmin) {
    return NextResponse.json({ error: "No Primary Super Admin found for record migration." }, { status: 500 });
  }

  await prisma.$transaction(async (tx) => {
    if (blockers > 0) {
      await tx.releaseActivity.updateMany({ where: { actorUserId: target.id }, data: { actorUserId: primarySuperAdmin.id } });
      await tx.royaltyImportBatch.updateMany({ where: { importedById: target.id }, data: { importedById: primarySuperAdmin.id } });
      await tx.mediaAsset.updateMany({ where: { ownerUserId: target.id }, data: { ownerUserId: primarySuperAdmin.id } });
      await tx.release.updateMany({ where: { ownerUserId: target.id }, data: { ownerUserId: primarySuperAdmin.id } });
      await tx.label.updateMany({ where: { ownerId: target.id }, data: { ownerId: primarySuperAdmin.id } });
      await tx.submission.updateMany({ where: { submittedById: target.id }, data: { submittedById: primarySuperAdmin.id } });
      await tx.supportTicket.updateMany({ where: { userId: target.id }, data: { userId: primarySuperAdmin.id } });
      await tx.payment.updateMany({ where: { userId: target.id }, data: { userId: primarySuperAdmin.id } });
      await tx.rightsAsset.updateMany({ where: { ownerUserId: target.id }, data: { ownerUserId: primarySuperAdmin.id } });
    }
    await tx.session.deleteMany({ where: { userId: target.id } });
    await tx.notification.deleteMany({ where: { userId: target.id } });
    await tx.user.delete({ where: { id: target.id } });
  });

  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "ADMIN_USER_DELETED",
    entityType: "User",
    entityId: target.id,
    metadata: { deletedEmail: target.email, migratedRecords: blockers },
  });

  return NextResponse.json({ ok: true });
}
