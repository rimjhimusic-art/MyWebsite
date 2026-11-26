import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { applyDraftOverlay, countPendingCmsDrafts, requireCmsApiAuth } from "@/lib/cms";
import { buildDraftPatch, revalidatePublicCmsPaths } from "@/lib/cms-crud";

const SettingsSchema = z.object({
  mode: z.enum(["draft", "publish"]).optional().default("draft"),
  siteName: z.string().trim().min(1).max(120).optional(),
  tagline: z.string().trim().max(500).optional(),
  headerLogoUrl: z.string().trim().min(1).max(500).optional(),
  headerLogoWidth: z.number().int().min(24).max(500).optional(),
  headerLogoHeight: z.number().int().min(16).max(200).optional(),
  footerLogoUrl: z.string().trim().min(1).max(500).optional(),
  footerLogoWidth: z.number().int().min(24).max(500).optional(),
  footerLogoHeight: z.number().int().min(16).max(200).optional(),
  faviconUrl: z.string().trim().min(1).max(500).optional(),
  contactEmail: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(100).optional(),
  contactAddress: z.string().trim().max(300).optional(),
  instagramUrl: z.string().trim().max(500).optional(),
  facebookUrl: z.string().trim().max(500).optional(),
  whatsappUrl: z.string().trim().max(500).optional(),
  youtubeUrl: z.string().trim().max(500).optional(),
  copyrightText: z.string().trim().max(300).optional(),
});

export async function GET(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "settings", action: "view" });
  if (!auth.ok) return auth.response;

  const row = await prisma.websiteSettings.findUnique({ where: { id: "default" } });
  const pendingDrafts = await countPendingCmsDrafts();
  return NextResponse.json({
    settings: row ? applyDraftOverlay(row, true) : null,
    pendingDrafts,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "settings", action: "edit" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid settings input." },
      { status: 400 }
    );
  }

  const { mode, ...updates } = parsed.data;
  const existing = await prisma.websiteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  const patch = buildDraftPatch(existing, updates, mode);
  const updated = await prisma.websiteSettings.update({
    where: { id: "default" },
    data: {
      ...patch,
      ...(mode === "publish" ? { lastPublishedAt: new Date(), lastPublishedById: auth.user.id } : {}),
    },
  });

  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CMS_SETTINGS_UPDATE",
    entityType: "WebsiteSettings",
    entityId: "default",
    metadata: { mode, fields: Object.keys(updates) },
  });

  if (mode === "publish") revalidatePublicCmsPaths();
  const pendingDrafts = await countPendingCmsDrafts();
  return NextResponse.json({
    settings: applyDraftOverlay(updated, true),
    pendingDrafts,
  });
}
