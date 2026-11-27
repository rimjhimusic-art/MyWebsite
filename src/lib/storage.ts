import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { imageSize } from "image-size";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { AssetKind } from "@prisma/client";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function getS3Client(): { client: S3Client; bucket: string } | null {
  if (
    process.env.STORAGE_DRIVER === "s3" &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  ) {
    return {
      bucket: process.env.S3_BUCKET,
      client: new S3Client({
        region: process.env.S3_REGION || "us-east-1",
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: Boolean(process.env.S3_ENDPOINT),
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
      }),
    };
  }
  return null;
}

export interface ValidatedUpload {
  kind: AssetKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  sampleRate?: number;
  validationNotes: string;
  buffer: Buffer;
}

const ALLOWED_EXTENSIONS: Record<AssetKind, string[]> = {
  AUDIO: [".wav", ".flac", ".mp3"],
  ARTWORK: [".jpg", ".jpeg", ".png"],
  VIDEO: [".mp4", ".mov", ".webm"],
  DOCUMENT: [".pdf", ".csv", ".txt", ".json"],
  CMS_IMAGE: [".jpg", ".jpeg", ".png", ".webp", ".ico"],
  CMS_VIDEO: [".mp4", ".webm", ".mov"],
  CMS_SVG: [".svg"],
};

const ALLOWED_MIMES: Record<AssetKind, string[]> = {
  AUDIO: ["audio/wav", "audio/x-wav", "audio/wave", "audio/flac", "audio/x-flac", "audio/mpeg", "audio/mp3"],
  ARTWORK: ["image/jpeg", "image/jpg", "image/png"],
  VIDEO: ["video/mp4", "video/quicktime", "video/webm"],
  DOCUMENT: ["application/pdf", "text/csv", "text/plain", "application/json", "application/vnd.ms-excel"],
  CMS_IMAGE: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"],
  CMS_VIDEO: ["video/mp4", "video/webm", "video/quicktime"],
  CMS_SVG: ["image/svg+xml"],
};

function parseWavMetadata(buffer: Buffer): { sampleRate?: number; durationSeconds?: number } {
  if (buffer.length < 44) return {};
  const riff = buffer.subarray(0, 4).toString("ascii");
  const wave = buffer.subarray(8, 12).toString("ascii");
  if (riff !== "RIFF" || wave !== "WAVE") return {};
  const sampleRate = buffer.readUInt32LE(24);
  const byteRate = buffer.readUInt32LE(28);
  const durationSeconds = byteRate > 0 ? Math.max(1, Math.round((buffer.length - 44) / byteRate)) : undefined;
  return { sampleRate, durationSeconds };
}

function hasValidMagicBytes(kind: AssetKind, ext: string, buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (kind === "ARTWORK" || kind === "CMS_IMAGE") {
    if (ext === ".png") {
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    }
    if (ext === ".jpg" || ext === ".jpeg") {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (ext === ".webp") {
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    }
    if (ext === ".ico") {
      return buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00;
    }
  }
  if (kind === "CMS_SVG") {
    const head = buffer.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
    const full = buffer.toString("utf8").toLowerCase();
    if (!head.includes("<svg")) return false;
    if (full.includes("<script") || /\son\w+\s*=/.test(full)) return false;
    return true;
  }

  if (kind === "AUDIO") {
    if (ext === ".wav") {
      return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE";
    }
    if (ext === ".flac") {
      return buffer.subarray(0, 4).toString("ascii") === "fLaC";
    }
    if (ext === ".mp3") {
      const isId3 = buffer.subarray(0, 3).toString("ascii") === "ID3";
      const isFrameSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
      return isId3 || isFrameSync;
    }
  }
  if (kind === "VIDEO" || kind === "CMS_VIDEO") {
    if (ext === ".mp4" || ext === ".mov") {
      return buffer.subarray(4, 8).toString("ascii") === "ftyp";
    }
    if (ext === ".webm") {
      return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    }
  }
  return true;
}

export async function validateUploadFile(params: {
  file: File;
  kind: AssetKind;
  minArtworkSize?: number;
}): Promise<{ ok: true; data: ValidatedUpload } | { ok: false; error: string }> {
  const { file, kind } = params;
  const minArtwork = params.minArtworkSize ?? Number(process.env.ARTWORK_MIN_SIZE || 1400);
  const maxBytesMap: Record<AssetKind, number> = {
    AUDIO: Number(process.env.MAX_AUDIO_MB || 150) * 1024 * 1024,
    ARTWORK: Number(process.env.MAX_IMAGE_MB || 25) * 1024 * 1024,
    VIDEO: Number(process.env.MAX_VIDEO_MB || 500) * 1024 * 1024,
    DOCUMENT: 20 * 1024 * 1024,
    CMS_IMAGE: Number(process.env.MAX_IMAGE_MB || 25) * 1024 * 1024,
    CMS_VIDEO: Number(process.env.MAX_VIDEO_MB || 250) * 1024 * 1024,
    CMS_SVG: 2 * 1024 * 1024,
  };

  if (file.size <= 0) {
    return { ok: false, error: "Uploaded file is empty." };
  }
  if (file.size > maxBytesMap[kind]) {
    return {
      ok: false,
      error: `File exceeds maximum allowed size (${Math.round(maxBytesMap[kind] / (1024 * 1024))} MB).`,
    };
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS[kind].includes(ext)) {
    return {
      ok: false,
      error: `Unsupported ${kind.toLowerCase()} extension "${ext}". Allowed: ${ALLOWED_EXTENSIONS[kind].join(", ")}`,
    };
  }

  if (file.type && !ALLOWED_MIMES[kind].includes(file.type.toLowerCase())) {
    return {
      ok: false,
      error: `Unsupported MIME type "${file.type}" for ${kind.toLowerCase()}.`,
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!hasValidMagicBytes(kind, ext, buffer)) {
    return {
      ok: false,
      error: `File signature does not match ${ext} format. Ensure the file is a valid ${kind.toLowerCase()} asset.`,
    };
  }

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  if (kind === "ARTWORK") {
    try {
      const dims = imageSize(buffer);
      if (!dims.width || !dims.height) {
        return { ok: false, error: "Unable to read image dimensions." };
      }
      if (dims.width !== dims.height) {
        return {
          ok: false,
          error: `Artwork must have a 1:1 square aspect ratio (received ${dims.width}x${dims.height}px).`,
        };
      }
      if (dims.width < minArtwork || dims.height < minArtwork) {
        return {
          ok: false,
          error: `Artwork resolution must be at least ${minArtwork}x${minArtwork}px (received ${dims.width}x${dims.height}px).`,
        };
      }
      return {
        ok: true,
        data: {
          kind,
          originalName: path.basename(file.name),
          mimeType: file.type || (ext === ".png" ? "image/png" : "image/jpeg"),
          sizeBytes: file.size,
          sha256,
          width: dims.width,
          height: dims.height,
          validationNotes: `Verified ${dims.width}x${dims.height}px 1:1 ${ext.slice(1).toUpperCase()}`,
          buffer,
        },
      };
    } catch {
      return { ok: false, error: "Corrupted or invalid image file." };
    }
  }

  if (kind === "CMS_IMAGE") {
    try {
      const dims = imageSize(buffer);
      return {
        ok: true,
        data: {
          kind,
          originalName: path.basename(file.name),
          mimeType: file.type || (ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg"),
          sizeBytes: file.size,
          sha256,
          width: dims.width,
          height: dims.height,
          validationNotes: dims.width && dims.height ? `CMS Image (${dims.width}x${dims.height}px)` : `Verified ${ext.slice(1).toUpperCase()}`,
          buffer,
        },
      };
    } catch {
      return { ok: false, error: "Invalid CMS image file." };
    }
  }

  if (kind === "CMS_SVG") {
    return {
      ok: true,
      data: {
        kind,
        originalName: path.basename(file.name),
        mimeType: "image/svg+xml",
        sizeBytes: file.size,
        sha256,
        validationNotes: "Sanitized SVG asset",
        buffer,
      },
    };
  }

  if (kind === "AUDIO") {
    const wavMeta = ext === ".wav" ? parseWavMetadata(buffer) : {};
    return {
      ok: true,
      data: {
        kind,
        originalName: path.basename(file.name),
        mimeType: file.type || `audio/${ext.slice(1)}`,
        sizeBytes: file.size,
        sha256,
        sampleRate: wavMeta.sampleRate,
        durationSeconds: wavMeta.durationSeconds,
        validationNotes: wavMeta.sampleRate
          ? `Verified ${ext.slice(1).toUpperCase()} (${wavMeta.sampleRate} Hz)`
          : `Verified ${ext.slice(1).toUpperCase()} audio header`,
        buffer,
      },
    };
  }

  return {
    ok: true,
    data: {
      kind,
      originalName: path.basename(file.name),
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      sha256,
      validationNotes: `Verified ${ext.slice(1).toUpperCase()} asset`,
      buffer,
    },
  };
}

export async function putObject(
  storageKey: string,
  buffer: Buffer,
  contentType: string
): Promise<{ driver: "s3" | "local"; storageKey: string }> {
  const safeKey = storageKey.replace(/\.\./g, "").replace(/^\/+/, "");
  const s3 = getS3Client();

  if (s3) {
    await s3.client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: safeKey,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return { driver: "s3", storageKey: safeKey };
  }

  const targetPath = path.join(STORAGE_ROOT, safeKey);
  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, buffer);
  } catch (err) {
    // On read-only serverless filesystems (e.g. Vercel without S3), inlineData in DB persists the asset
    if (!process.env.VERCEL) {
      console.warn("Local storage write skipped:", err);
    }
  }
  return { driver: "local", storageKey: safeKey };
}

export async function getObject(storageKey: string): Promise<Buffer | null> {
  const safeKey = storageKey.replace(/\.\./g, "").replace(/^\/+/, "");
  const s3 = getS3Client();

  if (s3) {
    try {
      const res = await s3.client.send(
        new GetObjectCommand({ Bucket: s3.bucket, Key: safeKey })
      );
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }

  const targetPath = path.join(STORAGE_ROOT, safeKey);
  try {
    return await fs.readFile(targetPath);
  } catch {
    return null;
  }
}

export async function deleteObject(storageKey: string): Promise<void> {
  const safeKey = storageKey.replace(/\.\./g, "").replace(/^\/+/, "");
  const s3 = getS3Client();

  if (s3) {
    await s3.client.send(
      new DeleteObjectCommand({ Bucket: s3.bucket, Key: safeKey })
    );
    return;
  }

  const targetPath = path.join(STORAGE_ROOT, safeKey);
  await fs.unlink(targetPath).catch(() => {});
}
