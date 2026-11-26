import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { createNotification, recordAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const isAdmin = isAdminRole(auth.user.role);

  const labels = await prisma.label.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { ownerId: auth.user.id },
            { members: { some: { userId: auth.user.id } } },
          ],
        },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      parentLabel: { select: { id: true, name: true } },
      subLabels: { select: { id: true, name: true, slug: true, defaultRevenueSharePercent: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      artists: {
        select: { id: true, stageName: true, genre: true, verified: true, userId: true },
      },
      invitations: { orderBy: { createdAt: "desc" } },
      _count: { select: { releases: true, artists: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Also include invitations addressed to this user's email
  const myInvitations = await prisma.labelInvitation.findMany({
    where: { invitedEmail: auth.user.email },
    include: { label: { select: { id: true, name: true, country: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ labels, myInvitations });
}

const LabelActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_label"),
    name: z.string().trim().min(2),
    parentLabelId: z.string().optional().nullable(),
    country: z.string().trim().default("India"),
    website: z.string().trim().optional().nullable(),
    description: z.string().trim().optional().nullable(),
    defaultRevenueSharePercent: z.number().min(0).max(100).default(20),
  }),
  z.object({
    action: z.literal("invite_artist"),
    labelId: z.string(),
    invitedEmail: z.string().trim().email().toLowerCase(),
    revenueSharePercent: z.number().min(0).max(100).default(80),
    notes: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("respond_invitation"),
    invitationId: z.string(),
    decision: z.enum(["ACCEPTED", "DECLINED", "APPROVED", "CANCELLED"]),
  }),
  z.object({
    action: z.literal("add_member"),
    labelId: z.string(),
    email: z.string().trim().email().toLowerCase(),
    role: z.enum(["LABEL_MANAGER", "FINANCE_MANAGER", "CONTENT_MANAGER"]).default("LABEL_MANAGER"),
  }),
]);

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = LabelActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid label action." },
        { status: 400 }
      );
    }

    const d = parsed.data;

    if (d.action === "create_label") {
      if (!["SUPER_ADMIN", "ADMIN", "LABEL_OWNER"].includes(auth.user.role)) {
        return NextResponse.json(
          { error: "Only Label Owners or Admins can create labels or sub-labels." },
          { status: 403 }
        );
      }

      const slugBase = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const label = await prisma.label.create({
        data: {
          name: d.name,
          slug: `${slugBase || "label"}-${Date.now().toString(36).slice(-4)}`,
          ownerId: auth.user.id,
          parentLabelId: d.parentLabelId || null,
          country: d.country,
          website: d.website || null,
          description: d.description || null,
          defaultRevenueSharePercent: d.defaultRevenueSharePercent,
        },
      });
      await recordAuditLog({
        actorUserId: auth.user.id,
        action: "LABEL_CREATED",
        entityType: "Label",
        entityId: label.id,
      });
      return NextResponse.json({ ok: true, label }, { status: 201 });
    }

    if (d.action === "invite_artist") {
      const label = await prisma.label.findUnique({ where: { id: d.labelId } });
      if (!label) return NextResponse.json({ error: "Label not found." }, { status: 404 });
      if (label.ownerId !== auth.user.id && !isAdminRole(auth.user.role)) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const targetUser = await prisma.user.findUnique({
        where: { email: d.invitedEmail },
        include: { artists: true },
      });

      const invitation = await prisma.labelInvitation.create({
        data: {
          labelId: label.id,
          artistId: targetUser?.artists[0]?.id ?? null,
          invitedEmail: d.invitedEmail,
          invitedByUserId: auth.user.id,
          revenueSharePercent: d.revenueSharePercent,
          notes: d.notes || null,
        },
      });

      if (targetUser) {
        await createNotification({
          userId: targetUser.id,
          type: "LABEL_INVITE",
          title: `Invitation from ${label.name}`,
          message: `${label.name} invited you to join their label roster (${d.revenueSharePercent}% artist share).`,
          link: "/dashboard/labels",
        });
      }

      return NextResponse.json({ ok: true, invitation }, { status: 201 });
    }

    if (d.action === "respond_invitation") {
      const inv = await prisma.labelInvitation.findUnique({
        where: { id: d.invitationId },
        include: { label: true },
      });
      if (!inv) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });

      const isInvitedUser = inv.invitedEmail === auth.user.email;
      const isLabelOwner = inv.label.ownerId === auth.user.id || isAdminRole(auth.user.role);

      if (!isInvitedUser && !isLabelOwner) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const updated = await prisma.labelInvitation.update({
        where: { id: inv.id },
        data: { status: d.decision },
      });

      if (d.decision === "ACCEPTED" || d.decision === "APPROVED") {
        const invitedUser = await prisma.user.findUnique({
          where: { email: inv.invitedEmail },
          include: { artists: true },
        });
        if (invitedUser?.artists[0]) {
          await prisma.artist.update({
            where: { id: invitedUser.artists[0].id },
            data: { labelId: inv.labelId },
          });
        } else if (invitedUser) {
          await prisma.artist.create({
            data: {
              userId: invitedUser.id,
              labelId: inv.labelId,
              stageName: invitedUser.name,
              legalName: invitedUser.name,
              country: invitedUser.country,
            },
          });
        }
      }

      return NextResponse.json({ ok: true, invitation: updated });
    }

    if (d.action === "add_member") {
      const label = await prisma.label.findUnique({ where: { id: d.labelId } });
      if (!label) return NextResponse.json({ error: "Label not found." }, { status: 404 });
      if (label.ownerId !== auth.user.id && !isAdminRole(auth.user.role)) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const targetUser = await prisma.user.findUnique({ where: { email: d.email } });
      if (!targetUser) {
        return NextResponse.json(
          { error: "No registered user found with that email." },
          { status: 404 }
        );
      }

      const member = await prisma.labelMember.upsert({
        where: { labelId_userId: { labelId: label.id, userId: targetUser.id } },
        update: { role: d.role },
        create: {
          labelId: label.id,
          userId: targetUser.id,
          role: d.role,
          permissionsJson: JSON.stringify(["release:create", "release:submit"]),
        },
      });

      return NextResponse.json({ ok: true, member }, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    console.error("Label POST error:", err);
    return NextResponse.json({ error: "Failed to process label request." }, { status: 500 });
  }
}
