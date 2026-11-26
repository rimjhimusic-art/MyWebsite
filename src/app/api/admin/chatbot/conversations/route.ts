import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { userHasAnyPermission } from "@/lib/permissions";
import { emitChatEvent } from "@/lib/chat-events";
import { recordAuditLog } from "@/lib/audit";

const StatusPatchSchema = z.object({
  conversationId: z.string().trim().min(1),
  status: z.enum(["AI_ACTIVE", "ESCALATED", "WAITING_HUMAN", "HUMAN_REPLIED", "RESOLVED"]),
});

const AdminReplySchema = z.object({
  conversationId: z.string().trim().min(1),
  message: z.string().trim().min(1).max(3000),
  markResolved: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:view", "chatbot:manage", "tickets:manage_all"])) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const status = (searchParams.get("status") || "").trim();
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");
  const selectedId = searchParams.get("conversationId");

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") {
    where.status = status;
  }
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  const [conversations, allForStats, emailFailureCount] = await Promise.all([
    prisma.chatConversation.findMany({
      where,
      include: {
        visitor: { select: { id: true, name: true, email: true, preferredLanguage: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, senderType: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 80,
    }),
    prisma.chatConversation.findMany({
      select: {
        id: true,
        status: true,
        escalatedToHuman: true,
        pendingHumanReply: true,
        escalatedAt: true,
        firstHumanReplyAt: true,
      },
    }),
    prisma.chatEmailRecord.count({
      where: { status: { in: ["FAILED", "BOUNCED"] } },
    }),
  ]);

  const filteredConversations = q
    ? conversations.filter((c) => {
        const lastMsg = c.messages[0]?.content || "";
        return `${c.id} ${c.visitorId} ${c.visitor.name || ""} ${c.visitor.email || ""} ${
          c.escalationReason || ""
        } ${lastMsg}`
          .toLowerCase()
          .includes(q);
      })
    : conversations;

  const selectedConversation = selectedId
    ? await prisma.chatConversation.findUnique({
        where: { id: selectedId },
        include: {
          visitor: true,
          messages: { orderBy: { createdAt: "asc" } },
          emailDeliveries: { orderBy: { createdAt: "desc" } },
        },
      })
    : null;

  const totalConversations = allForStats.length;
  const humanEscalated = allForStats.filter((c) => c.escalatedToHuman).length;
  const aiResolved = allForStats.filter((c) => !c.escalatedToHuman).length;
  const pendingReplies = allForStats.filter((c) => c.pendingHumanReply && c.status !== "RESOLVED").length;

  const responseDeltasSec = allForStats
    .filter((c) => c.escalatedAt && c.firstHumanReplyAt)
    .map((c) => (c.firstHumanReplyAt!.getTime() - c.escalatedAt!.getTime()) / 1000)
    .filter((s) => s >= 0);

  const avgFirstResponseSeconds =
    responseDeltasSec.length > 0
      ? Math.round(responseDeltasSec.reduce((a, b) => a + b, 0) / responseDeltasSec.length)
      : 0;

  const aiResolutionRate =
    totalConversations > 0 ? Math.round((aiResolved / totalConversations) * 1000) / 10 : 0;

  return NextResponse.json({
    conversations: filteredConversations,
    selectedConversation,
    analytics: {
      totalConversations,
      aiResolved,
      humanEscalated,
      pendingReplies,
      avgFirstResponseSeconds,
      aiResolutionRate,
      emailDeliveryFailures: emailFailureCount,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:manage", "tickets:manage_all"])) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = StatusPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status payload." }, { status: 400 });
  }

  const updated = await prisma.chatConversation.update({
    where: { id: parsed.data.conversationId },
    data: {
      status: parsed.data.status,
      pendingHumanReply: parsed.data.status === "RESOLVED" ? false : undefined,
      resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : null,
    },
  });

  emitChatEvent(updated.id, "status", {
    status: updated.status,
    escalatedToHuman: updated.escalatedToHuman,
  });

  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CHATBOT_CONVERSATION_STATUS",
    entityType: "ChatConversation",
    entityId: updated.id,
    metadata: { status: updated.status },
  });

  return NextResponse.json({ ok: true, conversation: updated });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:manage", "tickets:manage_all"])) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = AdminReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reply payload." }, { status: 400 });
  }

  const conv = await prisma.chatConversation.findUnique({
    where: { id: parsed.data.conversationId },
  });
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const now = new Date();
  const msg = await prisma.chatMessage.create({
    data: {
      conversationId: conv.id,
      senderType: "HUMAN_SUPPORT",
      senderName: "Support Team",
      content: parsed.data.message,
    },
  });

  const nextStatus = parsed.data.markResolved ? "RESOLVED" : "HUMAN_REPLIED";
  await prisma.chatConversation.update({
    where: { id: conv.id },
    data: {
      status: nextStatus,
      escalatedToHuman: true,
      pendingHumanReply: false,
      firstHumanReplyAt: conv.firstHumanReplyAt || now,
      lastMessageAt: now,
      resolvedAt: parsed.data.markResolved ? now : null,
    },
  });

  emitChatEvent(conv.id, "message", {
    id: msg.id,
    conversationId: msg.conversationId,
    senderType: msg.senderType,
    senderName: msg.senderName,
    content: msg.content,
    createdAt: msg.createdAt,
  });
  emitChatEvent(conv.id, "status", { status: nextStatus, escalatedToHuman: true });

  return NextResponse.json({ ok: true, message: msg });
}
