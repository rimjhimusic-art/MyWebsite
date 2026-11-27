import { NextResponse } from "next/server";
import type { AssetKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { putObject, validateUploadFile } from "@/lib/storage";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kindRaw = String(formData.get("kind") || "AUDIO").toUpperCase();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!["AUDIO", "ARTWORK", "VIDEO", "DOCUMENT"].includes(kindRaw)) {
      return NextResponse.json({ error: "Invalid asset kind." }, { status: 400 });
    }

    const kind = kindRaw as AssetKind;
    const validated = await validateUploadFile({ file, kind });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const safeFileName = validated.data.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${kind.toLowerCase()}/${auth.user.id}/${Date.now()}-${safeFileName}`;

    await putObject(storageKey, validated.data.buffer, validated.data.mimeType);
    const shouldInlineDb =
      process.env.STORAGE_DRIVER !== "s3" && validated.data.buffer.length <= 4 * 1024 * 1024;

    const asset = await prisma.mediaAsset.create({
      data: {
        ownerUserId: auth.user.id,
        kind,
        originalName: validated.data.originalName,
        storageKey,
        mimeType: validated.data.mimeType,
        sizeBytes: validated.data.sizeBytes,
        sha256: validated.data.sha256,
        width: validated.data.width ?? null,
        height: validated.data.height ?? null,
        durationSeconds: validated.data.durationSeconds ?? null,
        sampleRate: validated.data.sampleRate ?? null,
        validationStatus: "VALID",
        validationNotes: validated.data.validationNotes,
        inlineData: shouldInlineDb ? new Uint8Array(validated.data.buffer) : null,
      },
      select: {
        id: true,
        kind: true,
        originalName: true,
        storageKey: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        width: true,
        height: true,
        durationSeconds: true,
        sampleRate: true,
        validationStatus: true,
        validationNotes: true,
        createdAt: true,
      },
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "ASSET_UPLOADED",
      entityType: "MediaAsset",
      entityId: asset.id,
      metadata: { kind, sizeBytes: asset.sizeBytes, sha256: asset.sha256 },
    });

    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to process uploaded file." },
      { status: 500 }
    );
  }
}
