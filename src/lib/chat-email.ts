import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { buildConversationReplyToAddress } from "@/lib/chat-crypto";
import { getOrCreateChatbotSettings, resolveEffectiveEmailCredentials } from "@/lib/chat-kb";

export interface OutboundEmailPayload {
  conversationId?: string;
  toEmail: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  replyTo?: string;
  messageIdHeader: string;
  inReplyToHeader?: string | null;
  referencesHeader?: string | null;
  direction?: "OUTBOUND";
}

export interface EmailSendResult {
  delivered: boolean;
  configured: boolean;
  recordId: string;
  status: string;
  messageIdHeader: string;
  error?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeRfcMessageId(conversationId: string, domain: string): string {
  const cleanDomain = (domain || "reply.goldexmedianetwork.com").replace(/^@+/, "").trim();
  const rand = crypto.randomBytes(6).toString("hex");
  return `<chat-${conversationId}-${Date.now()}.${rand}@${cleanDomain}>`;
}

async function dispatchViaProvider(params: {
  provider: string;
  apiKey: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  replyTo?: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  messageIdHeader: string;
  inReplyToHeader?: string | null;
  referencesHeader?: string | null;
}): Promise<{ ok: boolean; providerMessageId?: string; retryable?: boolean; error?: string }> {
  const headersList: Array<{ Name: string; Value: string }> = [
    { Name: "Message-ID", Value: params.messageIdHeader },
  ];
  const headersMap: Record<string, string> = {
    "Message-ID": params.messageIdHeader,
  };
  if (params.inReplyToHeader) {
    headersList.push({ Name: "In-Reply-To", Value: params.inReplyToHeader });
    headersMap["In-Reply-To"] = params.inReplyToHeader;
  }
  if (params.referencesHeader) {
    headersList.push({ Name: "References", Value: params.referencesHeader });
    headersMap["References"] = params.referencesHeader;
  }

  try {
    if (params.provider === "POSTMARK") {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Postmark-Server-Token": params.apiKey,
        },
        body: JSON.stringify({
          From: `${params.fromName} <${params.fromEmail}>`,
          To: params.toEmail,
          ReplyTo: params.replyTo,
          Subject: params.subject,
          TextBody: params.textBody,
          HtmlBody: params.htmlBody,
          Headers: headersList,
          TrackOpens: false,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await res.json().catch(() => ({}))) as { MessageID?: string; Message?: string };
      if (!res.ok) {
        return {
          ok: false,
          retryable: res.status >= 500 || res.status === 429,
          error: json.Message || `Postmark HTTP ${res.status}`,
        };
      }
      return { ok: true, providerMessageId: json.MessageID };
    }

    if (params.provider === "SENDGRID") {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: params.toEmail }], headers: headersMap }],
          from: { email: params.fromEmail, name: params.fromName },
          reply_to: params.replyTo ? { email: params.replyTo } : undefined,
          subject: params.subject,
          content: [
            { type: "text/plain", value: params.textBody },
            { type: "text/html", value: params.htmlBody },
          ],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          ok: false,
          retryable: res.status >= 500 || res.status === 429,
          error: `SendGrid HTTP ${res.status}: ${errText.slice(0, 180)}`,
        };
      }
      return { ok: true, providerMessageId: res.headers.get("x-message-id") || undefined };
    }

    if (params.provider === "RESEND") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          from: `${params.fromName} <${params.fromEmail}>`,
          to: [params.toEmail],
          reply_to: params.replyTo ? [params.replyTo] : undefined,
          subject: params.subject,
          text: params.textBody,
          html: params.htmlBody,
          headers: headersMap,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) {
        return {
          ok: false,
          retryable: res.status >= 500 || res.status === 429,
          error: json.message || `Resend HTTP ${res.status}`,
        };
      }
      return { ok: true, providerMessageId: json.id };
    }

    return {
      ok: false,
      retryable: false,
      error: `Email provider ${params.provider} requires webhook-capable REST transport (POSTMARK, SENDGRID, or RESEND) for automated two-way replies.`,
    };
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      error: err instanceof Error ? err.message : "Network error communicating with email provider",
    };
  }
}

export async function sendSupportHandoverEmail(params: {
  conversationId: string;
  isFollowUp: boolean;
  reason: string;
  latestMessage: string;
}): Promise<EmailSendResult> {
  const settings = await getOrCreateChatbotSettings();
  const creds = resolveEffectiveEmailCredentials(settings);

  const conv = await prisma.chatConversation.findUnique({
    where: { id: params.conversationId },
    include: {
      visitor: true,
      messages: { orderBy: { createdAt: "asc" }, take: 80 },
    },
  });

  if (!conv) {
    throw new Error("Conversation not found for email dispatch.");
  }

  const replyToAddress = buildConversationReplyToAddress(
    conv.id,
    conv.replyToken,
    settings.replyRoutingDomain
  );
  const messageIdHeader = makeRfcMessageId(conv.id, settings.replyRoutingDomain);

  let refs: string[] = [];
  try {
    refs = JSON.parse(conv.emailThreadRefsJson) as string[];
    if (!Array.isArray(refs)) refs = [];
  } catch {
    refs = [];
  }
  const inReplyToHeader = conv.lastEmailThreadMsgId || refs[refs.length - 1] || null;
  const referencesHeader = refs.length > 0 ? refs.join(" ") : null;

  const shortId = conv.id.slice(-8).toUpperCase();
  const subjectPrefix = params.isFollowUp ? "Re: " : "";
  const subject = `${subjectPrefix}[Goldex Support #${shortId}] ${
    conv.visitor.name || "Website Visitor"
  } — ${params.reason.slice(0, 60)}`;

  const historyLines = conv.messages
    .filter((m) => m.senderType !== "SYSTEM")
    .map((m) => {
      const label =
        m.senderType === "VISITOR"
          ? conv.visitor.name || "Visitor"
          : m.senderType === "HUMAN_SUPPORT"
          ? "Support Team"
          : settings.assistantName;
      return `[${new Date(m.createdAt).toISOString()}] ${label}:\n${m.content}`;
    })
    .join("\n\n");

  const textBody = [
    params.isFollowUp
      ? "A visitor replied in an ongoing support conversation on Goldex Media Network:"
      : "AI Support Assistant escalated a conversation requiring human support:",
    "",
    `Visitor ID: ${conv.visitorId}`,
    `Conversation ID: ${conv.id}`,
    `Visitor Name: ${conv.visitor.name || "Not provided"}`,
    `Visitor Email: ${conv.visitor.email || "Not provided"}`,
    `Escalation Reason: ${params.reason}`,
    "",
    "--- LATEST VISITOR MESSAGE ---",
    params.latestMessage,
    "",
    "--- COMPLETE CONVERSATION HISTORY ---",
    historyLines,
    "",
    "============================================================",
    "HOW TO REPLY: Simply reply directly to this email from your inbox.",
    "Your reply will automatically appear inside the visitor's website chat window.",
    `Reply-To Routing Address: ${replyToAddress}`,
  ].join("\n");

  const htmlHistory = conv.messages
    .filter((m) => m.senderType !== "SYSTEM")
    .map((m) => {
      const label =
        m.senderType === "VISITOR"
          ? escapeHtml(conv.visitor.name || "Visitor")
          : m.senderType === "HUMAN_SUPPORT"
          ? "Support Team"
          : escapeHtml(settings.assistantName);
      const bg =
        m.senderType === "VISITOR"
          ? "#eef2ff"
          : m.senderType === "HUMAN_SUPPORT"
          ? "#ecfdf5"
          : "#f4f4f5";
      return `<div style="margin-bottom:10px;padding:10px 12px;border-radius:8px;background:${bg};">
        <div style="font-size:11px;color:#52525b;margin-bottom:4px;"><strong>${label}</strong> &bull; ${new Date(
          m.createdAt
        ).toUTCString()}</div>
        <div style="white-space:pre-wrap;font-size:13px;color:#18181b;">${escapeHtml(m.content)}</div>
      </div>`;
    })
    .join("");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#18181b;">
      <h2 style="color:#2563eb;margin-bottom:6px;">Goldex Media Network Customer Support Handover</h2>
      <p style="font-size:13px;color:#52525b;">Reply directly to this email and your message will appear in the visitor's website chat.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;background:#fafafa;border:1px solid #e4e4e7;">
        <tr><td style="padding:6px 10px;font-weight:bold;">Visitor ID</td><td style="padding:6px 10px;">${escapeHtml(conv.visitorId)}</td></tr>
        <tr><td style="padding:6px 10px;font-weight:bold;">Conversation ID</td><td style="padding:6px 10px;">${escapeHtml(conv.id)}</td></tr>
        <tr><td style="padding:6px 10px;font-weight:bold;">Visitor Name</td><td style="padding:6px 10px;">${escapeHtml(conv.visitor.name || "Not provided")}</td></tr>
        <tr><td style="padding:6px 10px;font-weight:bold;">Visitor Email</td><td style="padding:6px 10px;">${escapeHtml(conv.visitor.email || "Not provided")}</td></tr>
        <tr><td style="padding:6px 10px;font-weight:bold;">Reason</td><td style="padding:6px 10px;">${escapeHtml(params.reason)}</td></tr>
      </table>
      <div style="padding:12px;border-left:4px solid #2563eb;background:#eff6ff;margin:12px 0;">
        <div style="font-size:11px;font-weight:bold;color:#1d4ed8;">LATEST VISITOR MESSAGE</div>
        <div style="white-space:pre-wrap;font-size:14px;margin-top:4px;">${escapeHtml(params.latestMessage)}</div>
      </div>
      <h3 style="font-size:14px;margin-top:18px;">Complete Conversation History</h3>
      ${htmlHistory}
    </div>
  `;

  if (!settings.emailEnabled || !creds.configured) {
    const rec = await prisma.chatEmailRecord.create({
      data: {
        conversationId: conv.id,
        direction: "OUTBOUND",
        provider: settings.emailProvider,
        fromEmail: settings.senderEmail,
        toEmail: settings.supportEmail,
        replyToEmail: replyToAddress,
        subject,
        messageIdHeader,
        inReplyToHeader,
        status: "LOGGED_UNCONFIGURED",
        errorMessage: "Email provider API credentials are not configured.",
      },
    });
    return {
      delivered: false,
      configured: false,
      recordId: rec.id,
      status: rec.status,
      messageIdHeader,
      error: "Email integration is not configured yet.",
    };
  }

  const dispatch = await dispatchViaProvider({
    provider: settings.emailProvider,
    apiKey: creds.apiKey,
    fromName: settings.senderName,
    fromEmail: settings.senderEmail,
    toEmail: settings.supportEmail,
    replyTo: replyToAddress,
    subject,
    textBody,
    htmlBody,
    messageIdHeader,
    inReplyToHeader,
    referencesHeader,
  });

  const nextRefs = [...refs, messageIdHeader].slice(-25);

  if (dispatch.ok) {
    const [rec] = await Promise.all([
      prisma.chatEmailRecord.create({
        data: {
          conversationId: conv.id,
          direction: "OUTBOUND",
          provider: settings.emailProvider,
          fromEmail: settings.senderEmail,
          toEmail: settings.supportEmail,
          replyToEmail: replyToAddress,
          subject,
          messageIdHeader,
          inReplyToHeader,
          status: "SENT",
          providerEventId: dispatch.providerMessageId || null,
        },
      }),
      prisma.chatConversation.update({
        where: { id: conv.id },
        data: {
          lastEmailThreadMsgId: messageIdHeader,
          emailThreadRefsJson: JSON.stringify(nextRefs),
        },
      }),
    ]);

    return {
      delivered: true,
      configured: true,
      recordId: rec.id,
      status: "SENT",
      messageIdHeader,
    };
  }

  const nextRetryAt = dispatch.retryable ? new Date(Date.now() + 60_000) : null;
  const rec = await prisma.chatEmailRecord.create({
    data: {
      conversationId: conv.id,
      direction: "OUTBOUND",
      provider: settings.emailProvider,
      fromEmail: settings.senderEmail,
      toEmail: settings.supportEmail,
      replyToEmail: replyToAddress,
      subject,
      messageIdHeader,
      inReplyToHeader,
      status: "FAILED",
      nextRetryAt,
      errorMessage: dispatch.error || "Failed to dispatch support notification email.",
    },
  });

  return {
    delivered: false,
    configured: true,
    recordId: rec.id,
    status: "FAILED",
    messageIdHeader,
    error: dispatch.error,
  };
}

export async function sendTestSupportEmail(): Promise<{
  ok: boolean;
  status: string;
  message: string;
}> {
  const settings = await getOrCreateChatbotSettings();
  const creds = resolveEffectiveEmailCredentials(settings);
  if (!creds.configured) {
    await prisma.chatbotSettings.update({
      where: { id: "default" },
      data: {
        lastTestEmailAt: new Date(),
        lastTestEmailStatus: "NOT_CONFIGURED",
      },
    });
    return {
      ok: false,
      status: "NOT_CONFIGURED",
      message: `Configure ${settings.emailProvider} API credentials before sending a live test email.`,
    };
  }

  const testMsgId = makeRfcMessageId("test", settings.replyRoutingDomain);
  const dispatch = await dispatchViaProvider({
    provider: settings.emailProvider,
    apiKey: creds.apiKey,
    fromName: settings.senderName,
    fromEmail: settings.senderEmail,
    toEmail: settings.supportEmail,
    replyTo: `reply+test.verification@${settings.replyRoutingDomain}`,
    subject: "[Goldex Support] Email Integration Connection Verification",
    textBody: "This is a test verification email from Goldex Media Network AI Customer Support.",
    htmlBody: "<p>This is a test verification email from <strong>Goldex Media Network AI Customer Support</strong>.</p>",
    messageIdHeader: testMsgId,
  });

  await prisma.chatEmailRecord.create({
    data: {
      direction: "OUTBOUND",
      provider: settings.emailProvider,
      fromEmail: settings.senderEmail,
      toEmail: settings.supportEmail,
      subject: "[Goldex Support] Email Integration Connection Verification",
      messageIdHeader: testMsgId,
      status: dispatch.ok ? "SENT" : "FAILED",
      errorMessage: dispatch.error || null,
    },
  });

  await prisma.chatbotSettings.update({
    where: { id: "default" },
    data: {
      lastTestEmailAt: new Date(),
      lastTestEmailStatus: dispatch.ok ? "SENT" : `FAILED: ${dispatch.error || "Unknown"}`,
    },
  });

  return {
    ok: dispatch.ok,
    status: dispatch.ok ? "SENT" : "FAILED",
    message: dispatch.ok
      ? `Test email dispatched via ${settings.emailProvider} to ${settings.supportEmail}.`
      : dispatch.error || "Test email delivery failed.",
  };
}

export async function retryFailedSupportEmails(): Promise<{ retried: number; succeeded: number }> {
  const settings = await getOrCreateChatbotSettings();
  const creds = resolveEffectiveEmailCredentials(settings);
  if (!settings.emailEnabled || !creds.configured) {
    return { retried: 0, succeeded: 0 };
  }

  const due = await prisma.chatEmailRecord.findMany({
    where: {
      direction: "OUTBOUND",
      status: "FAILED",
      attemptCount: { lt: 4 },
      nextRetryAt: { lte: new Date() },
      conversationId: { not: null },
    },
    take: 5,
    orderBy: { nextRetryAt: "asc" },
  });

  let succeeded = 0;
  for (const rec of due) {
    if (!rec.conversationId) continue;
    const conv = await prisma.chatConversation.findUnique({
      where: { id: rec.conversationId },
      include: { visitor: true, messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });
    if (!conv) continue;

    const latestVisitorMsg =
      [...conv.messages].reverse().find((m) => m.senderType === "VISITOR")?.content || "";

    const dispatch = await dispatchViaProvider({
      provider: settings.emailProvider,
      apiKey: creds.apiKey,
      fromName: settings.senderName,
      fromEmail: settings.senderEmail,
      toEmail: rec.toEmail,
      replyTo: rec.replyToEmail || undefined,
      subject: rec.subject,
      textBody: `Retry support notification for Conversation ${conv.id}\nLatest message:\n${latestVisitorMsg}`,
      htmlBody: `<p>Retry support notification for Conversation <strong>${escapeHtml(
        conv.id
      )}</strong></p><pre>${escapeHtml(latestVisitorMsg)}</pre>`,
      messageIdHeader: rec.messageIdHeader || makeRfcMessageId(conv.id, settings.replyRoutingDomain),
      inReplyToHeader: rec.inReplyToHeader,
    });

    const nextAttempt = rec.attemptCount + 1;
    if (dispatch.ok) {
      succeeded += 1;
      await prisma.chatEmailRecord.update({
        where: { id: rec.id },
        data: {
          status: "SENT",
          attemptCount: nextAttempt,
          nextRetryAt: null,
          errorMessage: null,
          providerEventId: dispatch.providerMessageId || rec.providerEventId,
        },
      });
    } else {
      const backoffMs = Math.min(900_000, 60_000 * Math.pow(2, nextAttempt - 1));
      await prisma.chatEmailRecord.update({
        where: { id: rec.id },
        data: {
          attemptCount: nextAttempt,
          nextRetryAt: nextAttempt < 4 ? new Date(Date.now() + backoffMs) : null,
          errorMessage: dispatch.error || rec.errorMessage,
        },
      });
    }
  }

  return { retried: due.length, succeeded };
}
