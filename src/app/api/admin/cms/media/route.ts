import { NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import fs from "fs/promises";
import type { AssetKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deleteObject, putObject, validateUploadFile } from "@/lib/storage";
import {
  findMediaReferences,
  replaceMediaUrlAcrossCms,
  requireCmsApiAuth,
} from "@/lib/cms";
import { revalidatePublicCmsPaths } from "@/lib/cms-crud";
import { recordAuditLog } from "@/lib/audit";

function detectCmsKind(filename: string): AssetKind {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".svg") return "CMS_SVG";
  if ([".mp4", ".webm", ".mov"].includes(ext)) return "CMS_VIDEO";
  if ([".pdf", ".csv", ".txt", ".json"].includes(ext)) return "DOCUMENT";
  return "CMS_IMAGE";
}

export async function GET(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "media", action: "view" });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder");
  const kindFilter = searchParams.get("kind")?.toUpperCase();
  const sort = searchParams.get("sort") || "newest";
  const q = searchParams.get("q")?.trim().toLowerCase();
  const includeUsage = searchParams.get("usage") === "1";

  const assets = await prisma.mediaAsset.findMany({
    where: {
      isPublicCms: true,
      ...(folder && folder !== "ALL" ? { folder } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  // Also include curated static assets across public/ref
  const staticAssets: Array<{
    id: string;
    url: string;
    title: string;
    originalName: string;
    altText: string;
    folder: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
    width?: number | null;
    height?: number | null;
    isStatic: boolean;
    createdAt: string;
  }> = [];

  try {
    const scanDirs = [
      { dir: path.join(process.cwd(), "public", "ref"), urlPrefix: "/ref", folder: "branding" },
      { dir: path.join(process.cwd(), "public", "ref", "stores"), urlPrefix: "/ref/stores", folder: "stores" },
      { dir: path.join(process.cwd(), "public", "ref", "team"), urlPrefix: "/ref/team", folder: "team" },
      { dir: path.join(process.cwd(), "public", "ref", "brand"), urlPrefix: "/ref/brand", folder: "brand" },
      { dir: path.join(process.cwd(), "public", "ref", "flag"), urlPrefix: "/ref/flag", folder: "about" },
      { dir: path.join(process.cwd(), "public", "ref", "influencers"), urlPrefix: "/ref/influencers", folder: "brand" },
      { dir: path.join(process.cwd(), "public", "ref", "video"), urlPrefix: "/ref/video", folder: "videos" },
    ];
    for (const s of scanDirs) {
      if (folder && folder !== "ALL" && folder !== s.folder) continue;
      const entries = await fs.readdir(s.dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (![".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp4", ".webm", ".pdf"].includes(ext)) continue;
        const fullUrl = `${s.urlPrefix}/${entry.name}`;
        const st = await fs.stat(path.join(s.dir, entry.name)).catch(() => null);
        staticAssets.push({
          id: `static:${fullUrl}`,
          url: fullUrl,
          title: entry.name,
          originalName: entry.name,
          altText: entry.name,
          folder: s.folder,
          kind:
            ext === ".svg"
              ? "CMS_SVG"
              : ext === ".mp4" || ext === ".webm"
              ? "CMS_VIDEO"
              : ext === ".pdf"
              ? "DOCUMENT"
              : "CMS_IMAGE",
          mimeType:
            ext === ".svg"
              ? "image/svg+xml"
              : ext === ".mp4"
              ? "video/mp4"
              : ext === ".pdf"
              ? "application/pdf"
              : `image/${ext.slice(1)}`,
          sizeBytes: st ? st.size : 0,
          width: null,
          height: null,
          isStatic: true,
          createdAt: st ? st.mtime.toISOString() : "2026-01-01T00:00:00.000Z",
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
    originalName: a.originalName,
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
    if (kindFilter && kindFilter !== "ALL") {
      if (kindFilter === "IMAGE" && item.kind !== "CMS_IMAGE" && item.kind !== "CMS_SVG") {
        return false;
      } else if (kindFilter !== "IMAGE" && item.kind !== kindFilter) {
        return false;
      }
    }
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.originalName.toLowerCase().includes(q) ||
      item.folder.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q)
    );
  });

  if (sort === "oldest") {
    combined.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else if (sort === "name") {
    combined.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "size") {
    combined.sort((a, b) => b.sizeBytes - a.sizeBytes);
  } else {
    combined.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  if (includeUsage) {
    const checkId = searchParams.get("checkUsageUrl");
    if (checkId) {
      const references = await findMediaReferences(checkId);
      return NextResponse.json({ references });
    }
  }

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
    const shouldInlineDb =
      process.env.STORAGE_DRIVER !== "s3" && validated.data.buffer.length <= 4 * 1024 * 1024;
    const inlineData = shouldInlineDb ? new Uint8Array(validated.data.buffer) : null;

    if (replaceAssetId) {
      const existing = await prisma.mediaAsset.findUnique({ where: { id: replaceAssetId } });
      if (!existing) {
        return NextResponse.json({ error: "Target asset to replace not found." }, { status: 404 });
      }
      const oldStorageKey = existing.storageKey;
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
          inlineData,
          title: title || existing.title || validated.data.originalName,
          altText: altText || existing.altText || validated.data.originalName,
          folder: folder || existing.folder,
          isPublicCms: true,
        },
        select: {
          id: true,
          kind: true,
          originalName: true,
          storageKey: true,
          mimeType: true,
          sizeBytes: true,
          width: true,
          height: true,
          folder: true,
          title: true,
          altText: true,
          createdAt: true,
        },
      });
      await deleteObject(oldStorageKey).catch(() => {});
      await recordAuditLog({
        actorUserId: auth.user.id,
        action: "CMS_MEDIA_REPLACED",
        entityType: "MediaAsset",
        entityId: updated.id,
        metadata: { originalName: updated.originalName, folder: updated.folder },
      });
      revalidatePublicCmsPaths();
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
        inlineData,
        isPublicCms: true,
        folder: folder || "general",
        title: title || validated.data.originalName,
        altText: altText || title || validated.data.originalName,
      },
      select: {
        id: true,
        kind: true,
        originalName: true,
        storageKey: true,
        mimeType: true,
        sizeBytes: true,
        width: true,
        height: true,
        folder: true,
        title: true,
        altText: true,
        createdAt: true,
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
  const { id, title, originalName, altText, folder } = body || {};
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
  }
  if (id.startsWith("static:")) {
    return NextResponse.json(
      { error: "Built-in seed filenames cannot be renamed on disk." },
      { status: 400 }
    );
  }

  const updated = await prisma.mediaAsset.update({
    where: { id },
    data: {
      ...(typeof title === "string" && title.trim() ? { title: title.trim() } : {}),
      ...(typeof originalName === "string" && originalName.trim()
        ? { originalName: originalName.trim() }
        : {}),
      ...(typeof altText === "string" ? { altText: altText.trim() } : {}),
      ...(typeof folder === "string" && folder.trim() ? { folder: folder.trim() } : {}),
    },
  });
  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CMS_MEDIA_RENAMED",
    entityType: "MediaAsset",
    entityId: updated.id,
    metadata: { title: updated.title, folder: updated.folder },
  });
  return NextResponse.json({ asset: { ...updated, url: `/api/files/${updated.id}`, isStatic: false } });
}

export async function DELETE(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "media", action: "delete" });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const force = searchParams.get("force") === "true";
  const clearRefs = searchParams.get("clearRefs") === "true";
  const replaceWith = searchParams.get("replaceWith")?.trim() || "";

  if (!id) {
    return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
  }

  const isStatic = id.startsWith("static:");
  const fileUrl = isStatic ? id.slice("static:".length) : `/api/files/${id}`;
  const refs = await findMediaReferences(fileUrl);

  if (refs.length > 0 && !replaceWith && !clearRefs && !force) {
    return NextResponse.json(
      {
        error: `Asset is currently used by ${refs.length} location(s). Reassign a replacement or confirm removal before deleting.`,
        references: refs,
      },
      { status: 409 }
    );
  }

  let replacedCount = 0;
  if (refs.length > 0 && (replaceWith || clearRefs || force)) {
    replacedCount = await replaceMediaUrlAcrossCms(fileUrl, replaceWith);
  }

  if (isStatic) {
    const safeRel = fileUrl.replace(/^\/+/, "");
    const targetPath = path.join(process.cwd(), "public", safeRel);
    const refRoot = path.join(process.cwd(), "public", "ref");
    if (!targetPath.startsWith(refRoot)) {
      return NextResponse.json({ error: "Invalid static asset path." }, { status: 400 });
    }
    try {
      await fs.unlink(targetPath);
    } catch {
      return NextResponse.json(
        {
          error:
            "Cannot unlink read-only static asset in this runtime environment, though references were updated.",
          replacedCount,
        },
        { status: 400 }
      );
    }
  } else {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }
    await prisma.mediaAsset.delete({ where: { id } });
    await deleteObject(asset.storageKey).catch(() => {});
  }

  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CMS_MEDIA_DELETED",
    entityType: "MediaAsset",
    entityId: id,
    metadata: { force, clearRefs, replaceWith, replacedCount, refs },
  });

  revalidatePublicCmsPaths();
  return NextResponse.json({ ok: true, replacedCount });
}
