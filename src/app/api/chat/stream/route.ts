import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sha256Hex } from "@/lib/chat-crypto";
import { subscribeToConversation } from "@/lib/chat-events";
import { userHasAnyPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = (searchParams.get("conversationId") || "").trim();
  const afterIso = searchParams.get("after");

  if (!conversationId) {
    return new Response("conversationId is required", { status: 400 });
  }

  const cookieStore = await cookies();
  const rawToken =
    request.headers.get("x-visitor-token") ||
    searchParams.get("visitorToken") ||
    cookieStore.get("onetab_chat_visitor")?.value ||
    "";

  let authorized = false;
  if (rawToken) {
    const visitor = await prisma.chatVisitor.findUnique({
      where: { visitorTokenHash: sha256Hex(rawToken) },
      select: { id: true },
    });
    if (visitor) {
      const conv = await prisma.chatConversation.findFirst({
        where: { id: conversationId, visitorId: visitor.id },
        select: { id: true },
      });
      if (conv) authorized = true;
    }
  }

  if (!authorized) {
    const admin = await getCurrentUser();
    if (admin && userHasAnyPermission(admin, ["chatbot:view", "chatbot:manage", "tickets:manage_all"])) {
      authorized = true;
    }
  }

  if (!authorized) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // stream already closed
        }
      };

      // Catch-up messages after `afterIso` on reconnect
      if (afterIso) {
        const afterDate = new Date(afterIso);
        if (!Number.isNaN(afterDate.getTime())) {
          const missed = await prisma.chatMessage.findMany({
            where: {
              conversationId,
              createdAt: { gt: afterDate },
            },
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
          });
          for (const m of missed) {
            send("message", m);
          }
        }
      }

      send("connected", { conversationId, connectedAt: new Date().toISOString() });

      unsubscribe = subscribeToConversation(conversationId, (evt) => {
        send(evt.type, evt.payload);
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {
          // ignore
        }
      }, 15_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
