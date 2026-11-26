import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateRandomToken, sha256Hex } from "@/lib/chat-crypto";
import { emitChatEvent } from "@/lib/chat-events";
import { buildUnifiedKnowledgeContext, getOrCreateChatbotSettings } from "@/lib/chat-kb";
import { generateAiChatResponse } from "@/lib/chat-ai";
import { retryFailedSupportEmails, sendSupportHandoverEmail } from "@/lib/chat-email";
import { checkRateLimit } from "@/lib/rate-limit";

const PostMessageSchema = z.object({
  conversationId: z.string().trim().min(4).max(100).optional(),
  message: z.string().trim().min(1).max(3000),
  clientMessageId: z.string().trim().max(100).optional(),
  visitorName: z.string().trim().max(100).optional(),
  visitorEmail: z.string().trim().email().max(160).optional().or(z.literal("")),
  forceHumanHandover: z.boolean().optional(),
});

function sanitizePublicMessage(m: {
  id: string;
  conversationId: string;
  senderType: string;
  senderName: string | null;
  content: string;
  language: string | null;
  createdAt: Date;
}) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderType: m.senderType,
    senderName: m.senderName,
    content: m.content,
    language: m.language,
    createdAt: m.createdAt,
  };
}

/**
 * Legacy GET fallback preserved cleanly for backward compatibility with older checks.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const message = (searchParams.get("message") || "").trim().toLowerCase();

  if (!message) {
    const settings = await getOrCreateChatbotSettings();
    return NextResponse.json({ reply: settings.welcomeMessage });
  }

  const faqs = await prisma.faqItem.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
  });

  const tokens = message
    .replace(/[^a-z0-9\s₹]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  let bestFaq: (typeof faqs)[number] | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const haystack = `${faq.question} ${faq.answer} ${faq.category} ${faq.keywords}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (faq.keywords.toLowerCase().includes(token)) score += 3;
      if (faq.question.toLowerCase().includes(token)) score += 2;
      if (haystack.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestFaq = faq;
    }
  }

  if (bestFaq && bestScore >= 2) {
    return NextResponse.json({
      reply: bestFaq.answer,
      matchedCategory: bestFaq.category,
      faqId: bestFaq.id,
    });
  }

  return NextResponse.json({
    reply:
      "Please open the chat assistant to ask your question or connect with our support team right here.",
  });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const ipRate = checkRateLimit(`chat-msg-ip:${ip}`, 25, 60_000);
  if (!ipRate.allowed) {
    return NextResponse.json(
      { error: "Too many messages sent too quickly. Please wait a few seconds." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = PostMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Please enter a valid message." },
      { status: 400 }
    );
  }

  const settings = await getOrCreateChatbotSettings();
  const cookieStore = await cookies();
  let rawToken =
    request.headers.get("x-visitor-token") ||
    cookieStore.get("onetab_chat_visitor")?.value ||
    "";

  let visitor = rawToken
    ? await prisma.chatVisitor.findUnique({ where: { visitorTokenHash: sha256Hex(rawToken) } })
    : null;

  if (!visitor) {
    if (parsed.data.conversationId) {
      return NextResponse.json(
        { error: "Unauthorized conversation access." },
        { status: 403 }
      );
    }
    rawToken = generateRandomToken(24);
    visitor = await prisma.chatVisitor.create({
      data: {
        visitorTokenHash: sha256Hex(rawToken),
        name: parsed.data.visitorName || null,
        email: parsed.data.visitorEmail || null,
        userAgent: (request.headers.get("user-agent") || "").slice(0, 250) || null,
        ipHash: sha256Hex(ip),
      },
    });
  } else if (parsed.data.visitorName || parsed.data.visitorEmail) {
    visitor = await prisma.chatVisitor.update({
      where: { id: visitor.id },
      data: {
        name: parsed.data.visitorName || visitor.name,
        email: parsed.data.visitorEmail || visitor.email,
        lastSeenAt: new Date(),
      },
    });
  }

  // Opportunistic retry of temporary failed support emails cleanly in background
  retryFailedSupportEmails().catch(() => {});

  let conversation = parsed.data.conversationId
    ? await prisma.chatConversation.findUnique({
        where: { id: parsed.data.conversationId },
      })
    : await prisma.chatConversation.findFirst({
        where: { visitorId: visitor.id },
        orderBy: { updatedAt: "desc" },
      });

  if (parsed.data.conversationId && (!conversation || conversation.visitorId !== visitor.id)) {
    return NextResponse.json(
      { error: "Forbidden: cross-conversation access denied." },
      { status: 403 }
    );
  }

  if (!conversation) {
    conversation = await prisma.chatConversation.create({
      data: {
        visitorId: visitor.id,
        replyToken: generateRandomToken(18),
        messages: {
          create: {
            senderType: "AI",
            senderName: settings.assistantName,
            content: settings.welcomeMessage,
          },
        },
      },
    });
  }

  // Idempotent duplicate check for client retry
  if (parsed.data.clientMessageId) {
    const duplicate = await prisma.chatMessage.findUnique({
      where: {
        conversationId_clientMessageId: {
          conversationId: conversation.id,
          clientMessageId: parsed.data.clientMessageId,
        },
      },
    });
    if (duplicate) {
      const latestMessages = await prisma.chatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({
        visitorToken: rawToken,
        conversation: {
          id: conversation.id,
          status: conversation.status,
          escalatedToHuman: conversation.escalatedToHuman,
        },
        messages: latestMessages.map(sanitizePublicMessage),
        duplicate: true,
      });
    }
  }

  // Save incoming visitor message immediately
  const visitorMsg = await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      senderType: "VISITOR",
      senderName: visitor.name || "Visitor",
      content: parsed.data.message,
      clientMessageId: parsed.data.clientMessageId || null,
    },
  });
  const pubVisitorMsg = sanitizePublicMessage(visitorMsg);
  emitChatEvent(conversation.id, "message", pubVisitorMsg);

  const createdReplies: Array<ReturnType<typeof sanitizePublicMessage>> = [];
  let emailDelivered = false;
  let emailConfigured = true;

  const alreadyEscalated =
    conversation.escalatedToHuman ||
    conversation.status === "ESCALATED" ||
    conversation.status === "WAITING_HUMAN" ||
    conversation.status === "HUMAN_REPLIED";

  // STEP 6: Already escalated conversation forwards visitor messages straight to same email thread
  if (alreadyEscalated || parsed.data.forceHumanHandover) {
    const reason = parsed.data.forceHumanHandover
      ? "Visitor requested human support team."
      : conversation.escalationReason || "Ongoing escalated support conversation.";

    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        escalatedToHuman: true,
        status: "WAITING_HUMAN",
        escalationReason: conversation.escalationReason || reason,
        escalatedAt: conversation.escalatedAt || new Date(),
        pendingHumanReply: true,
        lastMessageAt: new Date(),
        resolvedAt: null,
      },
    });

    const emailRes = await sendSupportHandoverEmail({
      conversationId: conversation.id,
      isFollowUp: alreadyEscalated,
      reason,
      latestMessage: parsed.data.message,
    });
    emailDelivered = emailRes.delivered;
    emailConfigured = emailRes.configured;

    if (emailRes.delivered) {
      await prisma.chatMessage.update({
        where: { id: visitorMsg.id },
        data: { emailForwarded: true },
      });
    }

    const ackContent = emailRes.delivered
      ? "Our support team has been notified. You can continue this conversation here. We'll reply as soon as possible."
      : "Your message has been saved for our support team, though automated email notification delivery could not be confirmed at this moment.";

    // Avoid spamming duplicate ack banners on every rapid follow-up if already notified recently
    const recentMsgs = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
    const hasRecentSameAck = recentMsgs.some(
      (m) => m.senderType === "SYSTEM" && m.content === ackContent
    );

    if (!hasRecentSameAck) {
      const sysMsg = await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderType: "SYSTEM",
          senderName: "Support Handover",
          content: ackContent,
        },
      });
      const pubSys = sanitizePublicMessage(sysMsg);
      createdReplies.push(pubSys);
      emitChatEvent(conversation.id, "message", pubSys);
    }

    const res = NextResponse.json({
      visitorToken: rawToken,
      conversation: {
        id: conversation.id,
        status: "WAITING_HUMAN",
        escalatedToHuman: true,
      },
      newMessages: [pubVisitorMsg, ...createdReplies],
      emailNotification: {
        attempted: true,
        delivered: emailDelivered,
        configured: emailConfigured,
      },
    });
    res.cookies.set("onetab_chat_visitor", rawToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.FORCE_SECURE_COOKIE === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
    return res;
  }

  // STEP 2: AI handles conversation using full website + KB context and conversation memory
  const priorHistory = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id, id: { not: visitorMsg.id } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const kb = await buildUnifiedKnowledgeContext(parsed.data.message);
  const aiDecision = await generateAiChatResponse({
    settings,
    visitorMessage: parsed.data.message,
    historyMessages: priorHistory,
    knowledgeContext: kb.formattedContext,
  });

  let nextStatus = "AI_ACTIVE";
  let escalatedNow = false;

  const aiMsg = await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      senderType: "AI",
      senderName: settings.assistantName,
      content: aiDecision.reply,
      language: aiDecision.language,
      aiModel: aiDecision.modelUsed,
      aiConfidence: aiDecision.confidence,
      requiresHumanReview: aiDecision.shouldEscalate,
    },
  });
  const pubAi = sanitizePublicMessage(aiMsg);
  createdReplies.push(pubAi);
  emitChatEvent(conversation.id, "message", pubAi);

  if (aiDecision.shouldEscalate && settings.humanHandoverEnabled) {
    escalatedNow = true;
    nextStatus = "ESCALATED";
    const reason =
      aiDecision.escalationReason ||
      "AI escalated conversation for human support verification.";

    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        status: "ESCALATED",
        escalatedToHuman: true,
        escalationReason: reason,
        escalatedAt: new Date(),
        pendingHumanReply: true,
        lastMessageAt: new Date(),
      },
    });

    const emailRes = await sendSupportHandoverEmail({
      conversationId: conversation.id,
      isFollowUp: false,
      reason,
      latestMessage: parsed.data.message,
    });
    emailDelivered = emailRes.delivered;
    emailConfigured = emailRes.configured;

    if (emailRes.delivered) {
      await prisma.chatMessage.update({
        where: { id: visitorMsg.id },
        data: { emailForwarded: true },
      });
    }

    const handoverMsgContent = emailRes.delivered
      ? "Our support team has been notified. You can continue this conversation here. We'll reply as soon as possible."
      : "This issue has been queued for human support review, though outbound email notification could not be confirmed automatically right now.";

    const handoverMsg = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderType: "SYSTEM",
        senderName: "Support Handover",
        content: handoverMsgContent,
      },
    });
    const pubHandover = sanitizePublicMessage(handoverMsg);
    createdReplies.push(pubHandover);
    emitChatEvent(conversation.id, "message", pubHandover);
  } else {
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        status: "AI_ACTIVE",
        lastMessageAt: new Date(),
      },
    });
  }

  emitChatEvent(conversation.id, "status", {
    status: nextStatus,
    escalatedToHuman: escalatedNow,
  });

  const res = NextResponse.json({
    visitorToken: rawToken,
    conversation: {
      id: conversation.id,
      status: nextStatus,
      escalatedToHuman: escalatedNow,
    },
    newMessages: [pubVisitorMsg, ...createdReplies],
    emailNotification: escalatedNow
      ? {
          attempted: true,
          delivered: emailDelivered,
          configured: emailConfigured,
        }
      : { attempted: false, delivered: false, configured: emailConfigured },
  });

  res.cookies.set("onetab_chat_visitor", rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.FORCE_SECURE_COOKIE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });

  return res;
}
