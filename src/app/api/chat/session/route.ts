import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateRandomToken, sha256Hex } from "@/lib/chat-crypto";
import { getOrCreateChatbotSettings, resolveEffectiveAiCredentials, resolveEffectiveEmailCredentials } from "@/lib/chat-kb";
import { checkRateLimit } from "@/lib/rate-limit";

const COOKIE_NAME = "onetab_chat_visitor";

function extractToken(request: Request, cookieVal?: string | null): string | null {
  const hdr = request.headers.get("x-visitor-token");
  if (hdr && hdr.trim().length >= 16) return hdr.trim();
  const { searchParams } = new URL(request.url);
  const qs = searchParams.get("visitorToken");
  if (qs && qs.trim().length >= 16) return qs.trim();
  if (cookieVal && cookieVal.trim().length >= 16) return cookieVal.trim();
  return null;
}

export async function GET(request: Request) {
  const settings = await getOrCreateChatbotSettings();
  const aiReady = resolveEffectiveAiCredentials(settings).configured;
  const emailReady = resolveEffectiveEmailCredentials(settings).configured;

  const cookieStore = await cookies();
  const token = extractToken(request, cookieStore.get(COOKIE_NAME)?.value);

  const publicConfig = {
    assistantName: settings.assistantName,
    welcomeMessage: settings.welcomeMessage,
    aiEnabled: settings.aiEnabled,
    humanHandoverEnabled: settings.humanHandoverEnabled,
    aiReady,
    emailReady,
  };

  if (!token) {
    return NextResponse.json({
      config: publicConfig,
      visitor: null,
      conversation: null,
      messages: [],
    });
  }

  const tokenHash = sha256Hex(token);
  const visitor = await prisma.chatVisitor.findUnique({
    where: { visitorTokenHash: tokenHash },
  });

  if (!visitor) {
    return NextResponse.json({
      config: publicConfig,
      visitor: null,
      conversation: null,
      messages: [],
    });
  }

  const { searchParams } = new URL(request.url);
  const requestedConvId = searchParams.get("conversationId");

  const conversation = requestedConvId
    ? await prisma.chatConversation.findFirst({
        where: { id: requestedConvId, visitorId: visitor.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              conversationId: true,
              senderType: true,
              senderName: true,
              content: true,
              language: true,
              createdAt: true,
            },
          },
        },
      })
    : await prisma.chatConversation.findFirst({
        where: { visitorId: visitor.id },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              conversationId: true,
              senderType: true,
              senderName: true,
              content: true,
              language: true,
              createdAt: true,
            },
          },
        },
      });

  return NextResponse.json({
    config: publicConfig,
    visitor: {
      id: visitor.id,
      name: visitor.name,
      email: visitor.email,
    },
    conversation: conversation
      ? {
          id: conversation.id,
          status: conversation.status,
          escalatedToHuman: conversation.escalatedToHuman,
          createdAt: conversation.createdAt,
        }
      : null,
    messages: conversation?.messages || [],
  });
}

const CreateSessionSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  newConversation: z.boolean().optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`chat-session:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many chat sessions created. Please wait a moment." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session details." }, { status: 400 });
  }

  const settings = await getOrCreateChatbotSettings();
  const cookieStore = await cookies();
  let rawToken = extractToken(request, cookieStore.get(COOKIE_NAME)?.value);

  let visitor = rawToken
    ? await prisma.chatVisitor.findUnique({ where: { visitorTokenHash: sha256Hex(rawToken) } })
    : null;

  if (!visitor) {
    rawToken = generateRandomToken(24);
    visitor = await prisma.chatVisitor.create({
      data: {
        visitorTokenHash: sha256Hex(rawToken),
        name: parsed.data.name || null,
        email: parsed.data.email || null,
        userAgent: (request.headers.get("user-agent") || "").slice(0, 250) || null,
        ipHash: sha256Hex(ip),
      },
    });
  } else if (parsed.data.name || parsed.data.email) {
    visitor = await prisma.chatVisitor.update({
      where: { id: visitor.id },
      data: {
        name: parsed.data.name || visitor.name,
        email: parsed.data.email || visitor.email,
        lastSeenAt: new Date(),
      },
    });
  }

  let conversation = !parsed.data.newConversation
    ? await prisma.chatConversation.findFirst({
        where: { visitorId: visitor.id },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              conversationId: true,
              senderType: true,
              senderName: true,
              content: true,
              language: true,
              createdAt: true,
            },
          },
        },
      })
    : null;

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
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            conversationId: true,
            senderType: true,
            senderName: true,
            content: true,
            language: true,
            createdAt: true,
          },
        },
      },
    });
  }

  const res = NextResponse.json({
    visitor: { id: visitor.id, name: visitor.name, email: visitor.email },
    visitorToken: rawToken,
    conversation: {
      id: conversation.id,
      status: conversation.status,
      escalatedToHuman: conversation.escalatedToHuman,
      createdAt: conversation.createdAt,
    },
    messages: conversation.messages,
  });

  if (rawToken) {
    res.cookies.set(COOKIE_NAME, rawToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.FORCE_SECURE_COOKIE === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  }

  return res;
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = extractToken(request, cookieStore.get(COOKIE_NAME)?.value);
  if (!token) {
    return NextResponse.json({ error: "Missing visitor session token." }, { status: 401 });
  }
  const visitor = await prisma.chatVisitor.findUnique({
    where: { visitorTokenHash: sha256Hex(token) },
  });
  if (!visitor) {
    return NextResponse.json({ error: "Invalid visitor session." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid visitor details." }, { status: 400 });
  }

  const updated = await prisma.chatVisitor.update({
    where: { id: visitor.id },
    data: {
      name: parsed.data.name !== undefined ? parsed.data.name || null : visitor.name,
      email: parsed.data.email !== undefined ? parsed.data.email || null : visitor.email,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({
    visitor: { id: updated.id, name: updated.name, email: updated.email },
  });
}
