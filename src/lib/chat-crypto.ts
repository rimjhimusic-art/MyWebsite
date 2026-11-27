import crypto from "node:crypto";

function getAppSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    "onetab-local-dev-secret-change-in-production-32chars-min"
  );
}

function getEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(`onetab-chat-key:${getAppSecret()}`).digest();
}

/**
 * Encrypts sensitive AI or email API credentials using AES-256-GCM so plaintext secrets
 * are never persisted in database rows.
 */
export function encryptSecret(plaintext: string): string {
  const trimmed = plaintext.trim();
  if (!trimmed) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith("v1:")) return stored;
  const parts = stored.split(":");
  if (parts.length !== 4) return "";
  try {
    const iv = Buffer.from(parts[1], "hex");
    const tag = Buffer.from(parts[2], "hex");
    const data = Buffer.from(parts[3], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function maskSecretPreview(secret: string | null | undefined): string | null {
  if (!secret) return null;
  const raw = secret.startsWith("v1:") ? decryptSecret(secret) : secret;
  if (!raw) return null;
  if (raw.length <= 8) return "••••••••";
  return `${raw.slice(0, 4)}••••${raw.slice(-4)}`;
}

export function generateRandomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Builds an authenticated, conversation-specific Reply-To address so inbound
 * email replies can always be mapped cleanly back without creating duplicate threads.
 */
export function buildConversationReplySignature(conversationId: string, replyToken: string): string {
  return crypto
    .createHmac("sha256", getAppSecret())
    .update(`${conversationId}:${replyToken}`)
    .digest("hex")
    .slice(0, 12);
}

export function buildConversationReplyToAddress(
  conversationId: string,
  replyToken: string,
  domain: string
): string {
  const cleanDomain = (domain || "reply.goldexmedianetwork.com").replace(/^@+/, "").trim().toLowerCase();
  const sig = buildConversationReplySignature(conversationId, replyToken);
  return `reply+${replyToken}.${sig}@${cleanDomain}`;
}

export function parseAndVerifyReplyToAddress(addressText: string): {
  replyToken: string;
  signature: string;
} | null {
  const match = addressText.match(/reply\+([a-f0-9]{16,64})\.([a-f0-9]{12})@/i);
  if (!match) return null;
  return {
    replyToken: match[1].toLowerCase(),
    signature: match[2].toLowerCase(),
  };
}
