import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import {
  buildConversationReplySignature,
  parseAndVerifyReplyToAddress,
  sha256Hex,
  timingSafeEqualStr,
} from "@/lib/chat-crypto";
import { emitChatEvent } from "@/lib/chat-events";
import { getOrCreateChatbotSettings, resolveEffectiveEmailCredentials } from "@/lib/chat-kb";

export function verifyInboundSignature(params: {
  rawBody: string;
  headers: Headers;
  webhookSecret: string;
}): { valid: boolean; reason?: string } {
  if (!params.webhookSecret) {
    return { valid: false, reason: "Inbound webhook secret is not configured on server." };
  }

  // 1. Standard HMAC-SHA256 header (`x-onetab-signature: sha256=<hex>` or raw hex)
  const hmacHdr = params.headers.get("x-onetab-signature");
  if (hmacHdr) {
    const cleanSig = hmacHdr.replace(/^sha256=/i, "").trim().toLowerCase();
    const expected = crypto
      .createHmac("sha256", params.webhookSecret)
      .update(params.rawBody)
      .digest("hex")
      .toLowerCase();
    if (timingSafeEqualStr(cleanSig, expected)) {
      return { valid: true };
    }
    return { valid: false, reason: "Invalid x-onetab-signature HMAC digest." };
  }

  // 2. Svix / Resend webhook verification (`svix-id`, `svix-timestamp`, `svix-signature`)
  const svixId = params.headers.get("svix-id");
  const svixTs = params.headers.get("svix-timestamp");
  const svixSig = params.headers.get("svix-signature");
  if (svixId && svixTs && svixSig) {
    const signedContent = `${svixId}.${svixTs}.${params.rawBody}`;
    const secretBytes = params.webhookSecret.startsWith("whsec_")
      ? Buffer.from(params.webhookSecret.slice(6), "base64")
      : Buffer.from(params.webhookSecret, "utf8");
    const expectedB64 = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");
    const candidates = svixSig
      .split(/\s+/)
      .map((s) => s.replace(/^v1,/, "").trim())
      .filter(Boolean);
    for (const c of candidates) {
      if (timingSafeEqualStr(c, expectedB64)) {
        return { valid: true };
      }
    }
    return { valid: false, reason: "Invalid Svix webhook signature." };
  }

  // 3. Provider secret header (`x-postmark-webhook-token`, `x-webhook-secret`, `authorization: Bearer ...`)
  const tokenHeader =
    params.headers.get("x-postmark-webhook-token") ||
    params.headers.get("x-sendgrid-webhook-token") ||
    params.headers.get("x-webhook-secret") ||
    params.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (tokenHeader && timingSafeEqualStr(tokenHeader.trim(), params.webhookSecret.trim())) {
    return { valid: true };
  }

  return { valid: false, reason: "Missing or unrecognized inbound webhook signature header." };
}

/**
 * Extracts only the human agent's new reply text by removing quoted threads and email signatures.
 */
export function extractCleanEmailReply(textBody?: string | null, htmlBody?: string | null): string {
  let raw = (textBody || "").trim();
  if (!raw && htmlBody) {
    raw = htmlBody
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, " ")
      .replace(/<div[^>]*class=["']?gmail_quote["']?[\s\S]*$/i, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  }

  if (!raw) return "";

  const lines = raw.split(/\r?\n/);
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^On .+ wrote:$/i.test(trimmed) ||
      /^-{2,}\s*Original Message\s*-{2,}$/i.test(trimmed) ||
      /^_{4,}$/.test(trimmed) ||
      /^From:\s.+@/i.test(trimmed)
    ) {
      break;
    }
    if (trimmed.startsWith(">")) {
      continue;
    }
    kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function collectAddressCandidates(payload: Record<string, unknown>): string[] {
  const candidates: string[] = [];
  const pushStr = (v: unknown) => {
    if (typeof v === "string" && v.trim()) candidates.push(v);
  };

  pushStr(payload.To);
  pushStr(payload.to);
  pushStr(payload.OriginalRecipient);
  pushStr(payload.originalRecipient);
  pushStr(payload.DeliveredTo);
  pushStr(payload.envelope);

  if (Array.isArray(payload.ToFull)) {
    for (const item of payload.ToFull) {
      if (item && typeof item === "object" && "Email" in item) {
        pushStr((item as { Email?: unknown }).Email);
      }
    }
  }
  if (Array.isArray(payload.to)) {
    for (const item of payload.to) pushStr(item);
  }
  return candidates;
}

function extractHeaderValue(payload: Record<string, unknown>, headerName: string): string {
  const lower = headerName.toLowerCase();
  if (Array.isArray(payload.Headers)) {
    for (const h of payload.Headers) {
      if (
        h &&
        typeof h === "object" &&
        typeof (h as { Name?: unknown }).Name === "string" &&
        (h as { Name: string }).Name.toLowerCase() === lower
      ) {
        return String((h as { Value?: unknown }).Value || "").trim();
      }
    }
  }
  if (typeof payload.headers === "string") {
    const regex = new RegExp(`^${headerName}:\\s*(.+)$`, "im");
    const m = payload.headers.match(regex);
    if (m) return m[1].trim();
  }
  if (payload.headers && typeof payload.headers === "object") {
    for (const [k, v] of Object.entries(payload.headers as Record<string, unknown>)) {
      if (k.toLowerCase() === lower && typeof v === "string") return v.trim();
    }
  }
  return "";
}

export async function processInboundEmailWebhook(params: {
  rawBody: string;
  headers: Headers;
  payload: Record<string, unknown>;
}) {
  const settings = await getOrCreateChatbotSettings();
  const creds = resolveEffectiveEmailCredentials(settings);
  const sigCheck = verifyInboundSignature({
    rawBody: params.rawBody,
    headers: params.headers,
    webhookSecret: creds.webhookSecret,
  });

  const payload = params.payload;
  const provider = String(payload.provider || settings.emailProvider || "POSTMARK").toUpperCase();
  const externalMsgId =
    String(
      payload.MessageID ||
        payload.MessageId ||
        payload.message_id ||
        extractHeaderValue(payload, "Message-ID") ||
        ""
    ).trim() || null;

  const eventHash = sha256Hex(
    externalMsgId ? `msgid:${externalMsgId}` : `body:${params.rawBody}`
  );

  if (!sigCheck.valid) {
    await prisma.chatWebhookLog.upsert({
      where: { eventHash: sha256Hex(`bad:${Date.now()}:${eventHash}`) },
      update: {},
      create: {
        provider,
        eventType: "INBOUND",
        eventHash: sha256Hex(`bad:${Date.now()}:${eventHash}`),
        signatureValid: false,
        status: "REJECTED_SIGNATURE",
        summary: sigCheck.reason || "Invalid signature",
      },
    });
    return {
      ok: false,
      httpStatus: 401,
      status: "REJECTED_SIGNATURE",
      error: sigCheck.reason || "Unauthorized webhook signature",
    };
  }

  // Update verified webhook timestamp cleanly
  await prisma.chatbotSettings.update({
    where: { id: "default" },
    data: { lastWebhookVerifiedAt: new Date() },
  });

  // Duplicate / replay protection
  const existingLog = await prisma.chatWebhookLog.findUnique({ where: { eventHash } });
  if (existingLog) {
    return {
      ok: true,
      httpStatus: 200,
      status: "DUPLICATE",
      conversationId: existingLog.conversationId,
      message: "Duplicate webhook event ignored safely.",
    };
  }

  // Handle Bounce / Delivery Failure webhook cleanly
  const recordType = String(payload.RecordType || payload.event || payload.type || "").toLowerCase();
  if (recordType.includes("bounce") || recordType.includes("failed") || recordType === "email.bounced") {
    const bouncedMsgId = String(payload.MessageID || payload.messageId || "").trim();
    if (bouncedMsgId) {
      await prisma.chatEmailRecord.updateMany({
        where: {
          OR: [{ providerEventId: bouncedMsgId }, { messageIdHeader: bouncedMsgId }],
        },
        data: {
          status: "BOUNCED",
          errorMessage: String(payload.Description || payload.reason || "Email bounced at recipient mail server"),
        },
      });
    }
    await prisma.chatWebhookLog.create({
      data: {
        provider,
        eventType: "BOUNCE",
        eventHash,
        signatureValid: true,
        status: "PROCESSED",
        summary: `Recorded bounce event (${bouncedMsgId || "unknown"})`,
      },
    });
    return { ok: true, httpStatus: 200, status: "BOUNCE_RECORDED" };
  }

  // Map reply to the exact ChatConversation via signed Reply-To token or Message-ID threading
  let conversation = null;

  for (const candidate of collectAddressCandidates(payload)) {
    const parsedAddr = parseAndVerifyReplyToAddress(candidate);
    if (!parsedAddr) continue;
    const conv = await prisma.chatConversation.findUnique({
      where: { replyToken: parsedAddr.replyToken },
    });
    if (!conv) continue;
    const expectedSig = buildConversationReplySignature(conv.id, conv.replyToken);
    if (timingSafeEqualStr(parsedAddr.signature, expectedSig)) {
      conversation = conv;
      break;
    }
  }

  const inReplyTo =
    String(payload.InReplyTo || extractHeaderValue(payload, "In-Reply-To") || "").trim() || null;
  const references = extractHeaderValue(payload, "References");

  if (!conversation && (inReplyTo || references)) {
    const refIds = [inReplyTo, ...references.split(/\s+/)].filter(Boolean) as string[];
    if (refIds.length > 0) {
      const emailRec = await prisma.chatEmailRecord.findFirst({
        where: { messageIdHeader: { in: refIds }, conversationId: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (emailRec?.conversationId) {
        conversation = await prisma.chatConversation.findUnique({
          where: { id: emailRec.conversationId },
        });
      }
    }
  }

  if (!conversation) {
    await prisma.chatWebhookLog.create({
      data: {
        provider,
        eventType: "INBOUND",
        eventHash,
        signatureValid: true,
        status: "ORPHANED",
        summary: "Verified webhook did not match any known conversation Reply-To or Message-ID.",
      },
    });
    return {
      ok: false,
      httpStatus: 404,
      status: "ORPHANED",
      error: "No matching conversation found for inbound email.",
    };
  }

  const strippedText =
    typeof payload.StrippedTextReply === "string" && payload.StrippedTextReply.trim()
      ? payload.StrippedTextReply.trim()
      : extractCleanEmailReply(
          typeof payload.TextBody === "string"
            ? payload.TextBody
            : typeof payload.text === "string"
            ? payload.text
            : null,
          typeof payload.HtmlBody === "string"
            ? payload.HtmlBody
            : typeof payload.html === "string"
            ? payload.html
            : null
        );

  if (!strippedText) {
    await prisma.chatWebhookLog.create({
      data: {
        provider,
        eventType: "INBOUND",
        eventHash,
        signatureValid: true,
        conversationId: conversation.id,
        status: "ERROR",
        summary: "Inbound email contained no extractable reply text.",
      },
    });
    return {
      ok: false,
      httpStatus: 400,
      status: "EMPTY_REPLY",
      error: "No reply text found in inbound email.",
    };
  }

  const fromEmail =
    String(
      payload.From ||
        (payload.FromFull as { Email?: string } | undefined)?.Email ||
        payload.from ||
        settings.supportEmail
    ).trim();

  const savedMsg = await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      senderType: "HUMAN_SUPPORT",
      senderName: "Support Team",
      content: strippedText,
      externalMessageId: externalMsgId,
    },
  });

  let refs: string[] = [];
  try {
    refs = JSON.parse(conversation.emailThreadRefsJson) as string[];
    if (!Array.isArray(refs)) refs = [];
  } catch {
    refs = [];
  }
  if (externalMsgId && !refs.includes(externalMsgId)) {
    refs = [...refs, externalMsgId].slice(-25);
  }

  const now = new Date();
  await Promise.all([
    prisma.chatEmailRecord.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        provider,
        fromEmail,
        toEmail: collectAddressCandidates(payload)[0] || settings.supportEmail,
        subject: String(payload.Subject || payload.subject || conversation.subject),
        messageIdHeader: externalMsgId,
        inReplyToHeader: inReplyTo,
        status: "RECEIVED",
      },
    }),
    prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        status: "HUMAN_REPLIED",
        escalatedToHuman: true,
        pendingHumanReply: false,
        firstHumanReplyAt: conversation.firstHumanReplyAt || now,
        lastMessageAt: now,
        lastEmailThreadMsgId: externalMsgId || conversation.lastEmailThreadMsgId,
        emailThreadRefsJson: JSON.stringify(refs),
      },
    }),
    prisma.chatWebhookLog.create({
      data: {
        provider,
        eventType: "INBOUND",
        eventHash,
        signatureValid: true,
        conversationId: conversation.id,
        status: "PROCESSED",
        summary: `Delivered human email reply from ${fromEmail}`,
      },
    }),
  ]);

  emitChatEvent(conversation.id, "message", {
    id: savedMsg.id,
    conversationId: savedMsg.conversationId,
    senderType: savedMsg.senderType,
    senderName: savedMsg.senderName,
    content: savedMsg.content,
    createdAt: savedMsg.createdAt,
  });
  emitChatEvent(conversation.id, "status", {
    status: "HUMAN_REPLIED",
    escalatedToHuman: true,
  });

  return {
    ok: true,
    httpStatus: 200,
    status: "PROCESSED",
    conversationId: conversation.id,
    messageId: savedMsg.id,
  };
}
