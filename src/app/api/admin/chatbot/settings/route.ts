import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { userHasAnyPermission } from "@/lib/permissions";
import { recordAuditLog } from "@/lib/audit";
import { decryptSecret, encryptSecret } from "@/lib/chat-crypto";
import { getOrCreateChatbotSettings, resolveEffectiveEmailCredentials, sanitizeChatbotSettingsForAdmin } from "@/lib/chat-kb";
import { retryFailedSupportEmails, sendTestSupportEmail } from "@/lib/chat-email";
import { processInboundEmailWebhook } from "@/lib/chat-email-inbound";

function resolveWebhookEndpoints(request: Request): { webhookUrl: string; localWebhookUrl: string | null } {
  const url = new URL(request.url);
  const forwardedHost = (request.headers.get("x-forwarded-host") || "").split(",")[0].trim();
  const forwardedProto = (request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")).split(",")[0].trim();
  const reqHost = forwardedHost || url.host;
  const isLocalReq = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(reqHost);
  const localOrigin = `${url.protocol}//${url.host}`;

  const envUrl = (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    ""
  ).trim();
  const isLocalEnv = !envUrl || /localhost|127\.0\.0\.1/i.test(envUrl);

  let publicBase = !isLocalReq ? `${forwardedProto || "https"}://${reqHost}` : "";
  if (!publicBase && !isLocalEnv) {
    publicBase = envUrl;
  }
  if (!publicBase) {
    try {
      const cnamePath = path.join(process.cwd(), "CNAME");
      if (fs.existsSync(cnamePath)) {
        const domain = fs.readFileSync(cnamePath, "utf8").trim().split(/\r?\n/)[0]?.trim();
        if (domain) {
          publicBase = domain.startsWith("http") ? domain : `https://${domain}`;
        }
      }
    } catch {
      // Ignore CNAME read errors
    }
  }
  if (!publicBase) {
    publicBase = "https://www.goldexmedianetwork.info";
  }

  const webhookUrl = `${publicBase.replace(/\/+$/, "")}/api/webhooks/email/inbound`;
  const localWebhookUrl = isLocalReq ? `${localOrigin.replace(/\/+$/, "")}/api/webhooks/email/inbound` : null;
  return { webhookUrl, localWebhookUrl };
}

const UpdateChatbotSettingsSchema = z.object({
  aiEnabled: z.boolean().optional(),
  aiProvider: z.enum(["OPENAI", "GEMINI", "ANTHROPIC", "OPENAI_COMPATIBLE"]).optional(),
  aiModel: z.string().trim().min(1).max(120).optional(),
  aiBaseUrl: z.string().trim().max(300).optional().nullable(),
  aiApiKey: z.string().trim().max(300).optional(),
  clearAiApiKey: z.boolean().optional(),
  assistantName: z.string().trim().min(2).max(100).optional(),
  welcomeMessage: z.string().trim().min(5).max(1000).optional(),
  systemInstructions: z.string().trim().min(10).max(5000).optional(),
  defaultLanguage: z.string().trim().min(2).max(40).optional(),
  escalationThreshold: z.number().min(0.1).max(0.99).optional(),
  humanHandoverEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  emailProvider: z.enum(["POSTMARK", "SENDGRID", "RESEND", "SMTP"]).optional(),
  supportEmail: z.string().trim().email().max(160).optional(),
  senderEmail: z.string().trim().email().max(160).optional(),
  senderName: z.string().trim().min(2).max(100).optional(),
  replyRoutingDomain: z.string().trim().min(3).max(160).optional(),
  emailApiKey: z.string().trim().max(300).optional(),
  clearEmailApiKey: z.boolean().optional(),
  inboundWebhookSecret: z.string().trim().max(300).optional(),
  clearInboundWebhookSecret: z.boolean().optional(),
  smtpHost: z.string().trim().max(160).optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
  smtpUser: z.string().trim().max(160).optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:view", "chatbot:manage", "tickets:manage_all"])) {
    return NextResponse.json({ error: "Forbidden: chatbot permission required." }, { status: 403 });
  }

  const settings = await getOrCreateChatbotSettings();
  const webhookLogs = await prisma.chatWebhookLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  const emailLogs = await prisma.chatEmailRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const { webhookUrl, localWebhookUrl } = resolveWebhookEndpoints(request);

  return NextResponse.json({
    settings: sanitizeChatbotSettingsForAdmin(settings),
    webhookUrl,
    localWebhookUrl,
    webhookLogs,
    emailLogs,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:manage", "integrations:manage"])) {
    return NextResponse.json({ error: "Forbidden: chatbot:manage permission required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdateChatbotSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid settings input." },
      { status: 400 }
    );
  }

  await getOrCreateChatbotSettings();
  const d = parsed.data;

  // Credentials and sensitive provider keys can only be modified by Super Admin or integrations:manage
  const modifyingSecrets =
    Boolean(d.aiApiKey) ||
    Boolean(d.emailApiKey) ||
    Boolean(d.inboundWebhookSecret) ||
    Boolean(d.clearAiApiKey) ||
    Boolean(d.clearEmailApiKey) ||
    Boolean(d.clearInboundWebhookSecret);

  if (
    modifyingSecrets &&
    auth.user.role !== "SUPER_ADMIN" &&
    !userHasAnyPermission(auth.user, ["integrations:manage"])
  ) {
    return NextResponse.json(
      { error: "Only Super Admin or Integrations Manager may update API keys and webhook secrets." },
      { status: 403 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (d.aiEnabled !== undefined) updateData.aiEnabled = d.aiEnabled;
  if (d.aiProvider !== undefined) updateData.aiProvider = d.aiProvider;
  if (d.aiModel !== undefined) updateData.aiModel = d.aiModel;
  if (d.aiBaseUrl !== undefined) updateData.aiBaseUrl = d.aiBaseUrl || null;
  if (d.clearAiApiKey) updateData.aiApiKeyEncrypted = null;
  else if (d.aiApiKey) updateData.aiApiKeyEncrypted = encryptSecret(d.aiApiKey);

  if (d.assistantName !== undefined) updateData.assistantName = d.assistantName;
  if (d.welcomeMessage !== undefined) updateData.welcomeMessage = d.welcomeMessage;
  if (d.systemInstructions !== undefined) updateData.systemInstructions = d.systemInstructions;
  if (d.defaultLanguage !== undefined) updateData.defaultLanguage = d.defaultLanguage;
  if (d.escalationThreshold !== undefined) updateData.escalationThreshold = d.escalationThreshold;
  if (d.humanHandoverEnabled !== undefined) updateData.humanHandoverEnabled = d.humanHandoverEnabled;

  if (d.emailEnabled !== undefined) updateData.emailEnabled = d.emailEnabled;
  if (d.emailProvider !== undefined) updateData.emailProvider = d.emailProvider;
  if (d.supportEmail !== undefined) updateData.supportEmail = d.supportEmail;
  if (d.senderEmail !== undefined) updateData.senderEmail = d.senderEmail;
  if (d.senderName !== undefined) updateData.senderName = d.senderName;
  if (d.replyRoutingDomain !== undefined) updateData.replyRoutingDomain = d.replyRoutingDomain;

  if (d.clearEmailApiKey) updateData.emailApiKeyEncrypted = null;
  else if (d.emailApiKey) updateData.emailApiKeyEncrypted = encryptSecret(d.emailApiKey);

  if (d.clearInboundWebhookSecret) updateData.inboundWebhookSecretEncrypted = null;
  else if (d.inboundWebhookSecret) {
    updateData.inboundWebhookSecretEncrypted = encryptSecret(d.inboundWebhookSecret);
  }

  if (d.smtpHost !== undefined) updateData.smtpHost = d.smtpHost || null;
  if (d.smtpPort !== undefined) updateData.smtpPort = d.smtpPort || null;
  if (d.smtpUser !== undefined) updateData.smtpUser = d.smtpUser || null;

  const updated = await prisma.chatbotSettings.update({
    where: { id: "default" },
    data: updateData,
  });

  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CHATBOT_SETTINGS_UPDATED",
    entityType: "ChatbotSettings",
    entityId: "default",
    metadata: { updatedFields: Object.keys(updateData) },
  });

  return NextResponse.json({
    ok: true,
    settings: sanitizeChatbotSettingsForAdmin(updated),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:manage", "integrations:manage"])) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.action === "test_email") {
    const res = await sendTestSupportEmail();
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CHATBOT_TEST_EMAIL",
      entityType: "ChatbotSettings",
      entityId: "default",
      metadata: res,
    });
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  }

  if (body.action === "retry_emails") {
    const res = await retryFailedSupportEmails();
    return NextResponse.json({ ok: true, ...res });
  }

  if (body.action === "generate_webhook_secret") {
    if (auth.user.role !== "SUPER_ADMIN" && !userHasAnyPermission(auth.user, ["integrations:manage"])) {
      return NextResponse.json(
        { error: "Only Super Admin or Integrations Manager may rotate the webhook secret." },
        { status: 403 }
      );
    }
    const generatedSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const updated = await prisma.chatbotSettings.update({
      where: { id: "default" },
      data: { inboundWebhookSecretEncrypted: encryptSecret(generatedSecret) },
    });
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CHATBOT_WEBHOOK_SECRET_GENERATED",
      entityType: "ChatbotSettings",
      entityId: "default",
    });
    return NextResponse.json({
      ok: true,
      generatedSecret,
      settings: sanitizeChatbotSettingsForAdmin(updated),
      message: "Generated and saved a new Inbound Webhook Verification Secret.",
    });
  }

  if (body.action === "test_inbound_webhook") {
    const current = await getOrCreateChatbotSettings();
    const creds = resolveEffectiveEmailCredentials(current);
    const secret = creds.webhookSecret || decryptSecret(current.inboundWebhookSecretEncrypted);
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Generate or save an Inbound Webhook Verification Secret first." },
        { status: 400 }
      );
    }
    const rawBody = JSON.stringify({
      RecordType: "TestVerification",
      provider: current.emailProvider,
      To: `reply+test.verification@${current.replyRoutingDomain}`,
    });
    const sig = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const result = await processInboundEmailWebhook({
      rawBody,
      headers: new Headers({
        "content-type": "application/json",
        "x-onetab-signature": `sha256=${sig}`,
      }),
      payload: JSON.parse(rawBody),
    });
    return NextResponse.json(result, { status: result.httpStatus });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
