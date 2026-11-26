import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { ALL_PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

function readHiddenStdinPassword(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      process.stdout.write("Enter Super Admin Password (hidden): ");
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      let input = "";
      const onData = (ch: string) => {
        if (ch === "\n" || ch === "\r" || ch === "\u0004") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(input.trim());
        } else if (ch === "\u0003") {
          process.exit(1);
        } else if (ch === "\u007f") {
          input = input.slice(0, -1);
        } else {
          input += ch;
        }
      };
      process.stdin.on("data", onData);
    } else {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        data += chunk;
      });
      process.stdin.on("end", () => {
        const line = data.split(/\r?\n/)[0]?.trim() || "";
        if (!line) reject(new Error("Password required via hidden input or stdin."));
        else resolve(line);
      });
    }
  });
}

async function main() {
  const targetEmail = (process.argv[2] || "").trim().toLowerCase();
  const targetName = (process.argv[3] || "Primary Super Admin").trim();
  if (!targetEmail || !targetEmail.includes("@")) {
    throw new Error("Usage: tsx scripts/reset-superadmin.ts <email> [name]");
  }

  const rawPassword = await readHiddenStdinPassword();
  if (rawPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  // Create timestamped SQLite backup if using file SQLite
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  if (fs.existsSync(dbPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(process.cwd(), "prisma", `dev.db.backup-${stamp}`);
    fs.copyFileSync(dbPath, backupPath);
    console.log("Created DB backup:", path.basename(backupPath));
  }

  const passwordHash = await hashPassword(rawPassword);

  const result = await prisma.$transaction(async (tx) => {
    const oldAdmins = await tx.user.findMany({
      where: {
        role: { in: ["SUPER_ADMIN", "ADMIN"] },
        email: { not: targetEmail },
      },
      select: { id: true, email: true, role: true },
    });

    const primarySuperAdmin = await tx.user.upsert({
      where: { email: targetEmail },
      update: {
        name: targetName,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "APPROVED",
        emailVerifiedAt: new Date(),
        adminPreset: "PRIMARY_SUPER_ADMIN",
        customPermissionsJson: null,
        allowedSectionsJson: null,
      },
      create: {
        email: targetEmail,
        name: targetName,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "APPROVED",
        emailVerifiedAt: new Date(),
        country: "India",
        adminPreset: "PRIMARY_SUPER_ADMIN",
        customPermissionsJson: null,
        allowedSectionsJson: null,
      },
    });

    // Migrate any dependent records safely from old ADMIN/SUPER_ADMIN IDs to primarySuperAdmin
    const migratedSummary: Record<string, number> = {};
    for (const old of oldAdmins) {
      const act = await tx.releaseActivity.updateMany({ where: { actorUserId: old.id }, data: { actorUserId: primarySuperAdmin.id } });
      const bat = await tx.royaltyImportBatch.updateMany({ where: { importedById: old.id }, data: { importedById: primarySuperAdmin.id } });
      const log = await tx.auditLog.updateMany({ where: { actorUserId: old.id }, data: { actorUserId: primarySuperAdmin.id } });
      const med = await tx.mediaAsset.updateMany({ where: { ownerUserId: old.id }, data: { ownerUserId: primarySuperAdmin.id } });
      const rel = await tx.release.updateMany({ where: { ownerUserId: old.id }, data: { ownerUserId: primarySuperAdmin.id } });
      const lbl = await tx.label.updateMany({ where: { ownerId: old.id }, data: { ownerId: primarySuperAdmin.id } });
      const sub = await tx.submission.updateMany({ where: { submittedById: old.id }, data: { submittedById: primarySuperAdmin.id } });
      const rev = await tx.submission.updateMany({ where: { reviewedById: old.id }, data: { reviewedById: primarySuperAdmin.id } });
      const yt = await tx.youtubeRequest.updateMany({ where: { reviewedById: old.id }, data: { reviewedById: primarySuperAdmin.id } });
      const vevo = await tx.vevoSubmission.updateMany({ where: { reviewedById: old.id }, data: { reviewedById: primarySuperAdmin.id } });
      const tkt = await tx.supportTicket.updateMany({ where: { userId: old.id }, data: { userId: primarySuperAdmin.id } });
      const pg = await tx.sitePage.updateMany({ where: { updatedById: old.id }, data: { updatedById: primarySuperAdmin.id } });

      migratedSummary[old.email] =
        act.count + bat.count + log.count + med.count + rel.count + lbl.count + sub.count + rev.count + yt.count + vevo.count + tkt.count + pg.count;

      await tx.session.deleteMany({ where: { userId: old.id } });
      await tx.verificationToken.deleteMany({ where: { userId: old.id } });
      await tx.notification.deleteMany({ where: { userId: old.id } });
      await tx.user.delete({ where: { id: old.id } });
    }

    // Also sync SUPER_ADMIN role_permissions in DB
    for (const perm of ALL_PERMISSIONS) {
      await tx.rolePermission.upsert({
        where: { role_permission: { role: "SUPER_ADMIN", permission: perm } },
        update: {},
        create: { role: "SUPER_ADMIN", permission: perm, description: "Full Super Admin control" },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: primarySuperAdmin.id,
        action: "SUPER_ADMIN_RESET_AND_CLEANUP",
        entityType: "User",
        entityId: primarySuperAdmin.id,
        metadataJson: JSON.stringify({
          newSuperAdmin: primarySuperAdmin.email,
          removedAdmins: oldAdmins.map((o) => o.email),
          migratedSummary,
        }),
      },
    });

    return {
      superAdmin: { id: primarySuperAdmin.id, email: primarySuperAdmin.email, role: primarySuperAdmin.role, status: primarySuperAdmin.status },
      removedAdmins: oldAdmins,
      migratedSummary,
    };
  });

  const remainingSuperAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true, role: true, status: true },
  });
  const remainingAdmins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, role: true, status: true },
  });

  console.log("Reset summary:", JSON.stringify({ ...result, remainingSuperAdmins, remainingAdmins }, null, 2));
}

main()
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
