import { NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import fs from "fs/promises";
import type { AssetKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { putObject, validateUploadFile } from "@/lib/storage";
import { findMediaReferences, requireCmsApiAuth } from "@/lib/cms";
import { recordAuditLog } from "@/lib/audit";

function detectCmsKind(filename: string): AssetKind {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".svg") return "CMS_SVG";
  if ([".mp4", ".webm", ".mov"].includes(ext)) return "CMS_VIDEO";
  return "CMS_IMAGE";
}

export async function GET(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "media", action: "view" });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder");
  const q = searchParams.get("q")?.trim().toLowerCase();

  const assets = await prisma.mediaAsset.findMany({
    where: {
      isPublicCms: true,
      ...(folder && folder !== "ALL" ? { folder } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  // Also include curated static assets from public/ref
  const staticAssets: Array<{
    id: string;
    url: string;
    title: string;
    altText: string;
    folder: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
    isStatic: boolean;
    createdAt: string;
  }> = [];

  try {
    const scanDirs = [
      { dir: path.join(process.cwd(), "public", "ref"), urlPrefix: "/ref", folder: "branding" },
      { dir: path.join(process.cwd(), "public", "ref", "stores"), urlPrefix: "/ref/stores", folder: "stores" },
      { dir: path.join(process.cwd(), "public", "ref", "team"), urlPrefix: "/ref/team", folder: "team" },
      { dir: path.join(process.cwd(), "public", "ref", "brand"), urlPrefix: "/ref/brand", folder: "brand" },
      { dir: path.join(process.cwd(), "public", "ref", "video"), urlPrefix: "/ref/video", folder: "videos" },
    ];
    for (const s of scanDirs) {
      if (folder && folder !== "ALL" && folder !== s.folder) continue;
      const entries = await fs.readdir(s.dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (![".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp4", ".webm"].includes(ext)) continue;
        const fullUrl = `${s.urlPrefix}/${entry.name}`;
        staticAssets.push({
          id: `static:${fullUrl}`,
          url: fullUrl,
          title: entry.name,
          altText: entry.name,
          folder: s.folder,
          kind: ext === ".svg" ? "CMS_SVG" : ext === ".mp4" || ext === ".webm" ? "CMS_VIDEO" : "CMS_IMAGE",
          mimeType: ext === ".svg" ? "image/svg+xml" : ext === ".mp4" ? "video/mp4" : `image/${ext.slice(1)}`,
          sizeBytes: 0,
          isStatic: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      }
    }
  } catch {
    // Non-fatal
  }

  const uploadedFormatted = assets.map((a) => ({
    id: a.id,
    url: `/api/files/${a.id}`,
    title: a.title || a.originalName,
    altText: a.altText || a.originalName,
    folder: a.folder,
    kind: a.kind,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    width: a.width,
    height: a.height,
    isStatic: false,
    createdAt: a.createdAt.toISOString(),
  }));

  const combined = [...uploadedFormatted, ...staticAssets].filter((item) => {
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.folder.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q)
    );
  });

  return NextResponse.json({ assets: combined });
}

export async function POST(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "media", action: "add" });
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "general").replace(/[^a-zA-Z0-9_-]/g, "");
    const title = String(formData.get("title") || "").trim();
    const altText = String(formData.get("altText") || "").trim();
    const replaceAssetId = String(formData.get("replaceAssetId") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File field is required." }, { status: 400 });
    }

    const kind = detectCmsKind(file.name);
    const validated = await validateUploadFile({ file, kind });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const ext = path.extname(validated.data.originalName).toLowerCase();
    const storageKey = `cms/${folder}/${crypto.randomUUID()}${ext}`;
    await putObject(storageKey, validated.data.buffer, validated.data.mimeType);

    if (replaceAssetId) {
      const existing = await prisma.mediaAsset.findUnique({ where: { id: replaceAssetId } });
      if (!existing) {
        return NextResponse.json({ error: "Target asset to replace not found." }, { status: 404 });
      }
      const updated = await prisma.mediaAsset.update({
        where: { id: replaceAssetId },
        data: {
          kind,
          originalName: validated.data.originalName,
          storageKey,
          mimeType: validated.data.mimeType,
          sizeBytes: validated.data.sizeBytes,
          sha256: validated.data.sha256,
          width: validated.data.width,
          height: validated.data.height,
          title: title || existing.title || validated.data.originalName,
          altText: altText || existing.altText || validated.data.originalName,
          folder: folder || existing.folder,
          isPublicCms: true,
        },
      });
      await recordAuditLog({
        actorUserId: auth.user.id,
        action: "CMS_MEDIA_REPLACED",
        entityType: "MediaAsset",
        entityId: updated.id,
        metadata: { originalName: updated.originalName, folder: updated.folder },
      });
      return NextResponse.json({
        asset: { ...updated, url: `/api/files/${updated.id}`, isStatic: false },
      });
    }

    const created = await prisma.mediaAsset.create({
      data: {
        ownerUserId: auth.user.id,
        kind,
        originalName: validated.data.originalName,
        storageKey,
        mimeType: validated.data.mimeType,
        sizeBytes: validated.data.sizeBytes,
        sha256: validated.data.sha256,
        width: validated.data.width,
        height: validated.data.height,
        validationNotes: validated.data.validationNotes,
        isPublicCms: true,
        folder: folder || "general",
        title: title || validated.data.originalName,
        altText: altText || title || validated.data.originalName,
      },
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CMS_MEDIA_UPLOADED",
      entityType: "MediaAsset",
      entityId: created.id,
      metadata: { originalName: created.originalName, folder: created.folder },
    });

    return NextResponse.json(
      { asset: { ...created, url: `/api/files/${created.id}`, isStatic: false } },
      { status: 201 }
    );
  } catch (err) {
    console.error("CMS media upload error:", err);
    return NextResponse.json({ error: "Failed to upload CMS media." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "media", action: "edit" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { id, title, altText, folder } = body || {};
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
  }

  const updated = await prisma.mediaAsset.update({
    where: { id },
    data: {
      ...(typeof title === "string" ? { title: title.trim() } : {}),
      ...(typeof altText === "string" ? { altText: altText.trim() } : {}),
      ...(typeof folder === "string" ? { folder: folder.trim() } : {}),
    },
  });
  return NextResponse.json({ asset: { ...updated, url: `/api/files/${updated.id}` } });
}

export async function DELETE(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "media", action: "delete" });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const force = searchParams.get("force") === "true";

  if (!id) {
    return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
  }
  if (id.startsWith("static:")) {
    return NextResponse.json(
      { error: "Built-in seed assets cannot be deleted from disk." },
      { status: 400 }
    );
  }

  const fileUrl = `/api/files/${id}`;
  const refs = await findMediaReferences(fileUrl);
  if (refs.length > 0 && !force) {
    return NextResponse.json(
      {
        error: `Asset is currently referenced by: ${refs.join(", ")}. Replace it in those sections or confirm force delete.`,
        references: refs,
      },
      { status: 409 }
    );
  }

  await prisma.mediaAsset.delete({ where: { id } });
  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CMS_MEDIA_DELETED",
    entityType: "MediaAsset",
    entityId: id,
    metadata: { force, refs },
  });

  return NextResponse.json({ ok: true });
}
