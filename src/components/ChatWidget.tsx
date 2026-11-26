"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bot,
  Headphones,
  Plus,
  RefreshCw,
  Send,
  UserCheck,
  X,
} from "lucide-react";

export interface PublicChatMessage {
  id: string;
  conversationId: string;
  senderType: "VISITOR" | "AI" | "HUMAN_SUPPORT" | "SYSTEM" | string;
  senderName: string | null;
  content: string;
  language?: string | null;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
  clientMessageId?: string;
}

interface PublicWidgetConfig {
  assistantName: string;
  welcomeMessage: string;
  aiEnabled: boolean;
  humanHandoverEnabled: boolean;
}

const STORAGE_KEY_TOKEN = "onetab_chat_visitor_token_v1";
const STORAGE_KEY_CONV = "onetab_chat_conv_id_v1";

const QUICK_PROMPTS = [
  "Pricing & plans?",
  "Supported DSP stores?",
  "Audio & artwork specs?",
  "How VEVO & Content ID work?",
];

function formatMsgTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [showContactBar, setShowContactBar] = useState(false);

  const [config, setConfig] = useState<PublicWidgetConfig>({
    assistantName: "OneTab Assistant",
    welcomeMessage:
      "Hi! I'm OneTab Assistant. Ask me about distribution plans, DSP stores, audio/artwork specs, royalties, or VEVO.",
    aiEnabled: true,
    humanHandoverEnabled: true,
  });

  const [visitorToken, setVisitorToken] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [conversationStatus, setConversationStatus] = useState<string>("AI_ACTIVE");
  const [escalatedToHuman, setEscalatedToHuman] = useState<boolean>(false);

  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, loading, open, scrollToBottom]);

  const mergeIncomingMessages = useCallback((incoming: PublicChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const next = [...prev];
      for (const item of incoming) {
        const existsIdx = next.findIndex(
          (m) =>
            m.id === item.id ||
            (item.clientMessageId && m.clientMessageId === item.clientMessageId)
        );
        if (existsIdx >= 0) {
          next[existsIdx] = { ...item, pending: false, failed: false };
        } else {
          next.push({ ...item, pending: false, failed: false });
        }
      }
      return next;
    });
  }, []);

  const restoreSession = useCallback(async () => {
    setInitializing(true);
    try {
      const savedToken =
        typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) || "" : "";
      const savedConv =
        typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_CONV) || "" : "";

      if (savedToken) setVisitorToken(savedToken);

      const qs = new URLSearchParams();
      if (savedConv) qs.set("conversationId", savedConv);
      const res = await fetch(`/api/chat/session?${qs.toString()}`, {
        headers: savedToken ? { "x-visitor-token": savedToken } : undefined,
      });

      if (!res.ok) return;
      const data = await res.json();
      if (data.config) setConfig(data.config);
      if (data.visitor?.name) setVisitorName(data.visitor.name);
      if (data.visitor?.email) setVisitorEmail(data.visitor.email);

      if (data.conversation) {
        setConversationId(data.conversation.id);
        setConversationStatus(data.conversation.status);
        setEscalatedToHuman(Boolean(data.conversation.escalatedToHuman));
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_CONV, data.conversation.id);
        }
        setMessages(data.messages || []);
      } else {
        setMessages([
          {
            id: "welcome-local",
            conversationId: "",
            senderType: "AI",
            senderName: data.config?.assistantName || "OneTab Assistant",
            content:
              data.config?.welcomeMessage ||
              "Hi! I'm OneTab Assistant. How can I help you today?",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages([
        {
          id: "welcome-fallback",
          conversationId: "",
          senderType: "AI",
          senderName: "OneTab Assistant",
          content:
            "Hi! I'm OneTab Assistant. Ask me about distribution plans, DSP stores, audio/artwork specs, royalties, or VEVO.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setInitializing(false);
    }
  }, []);

  // Load saved conversation immediately on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Real-time SSE subscription + fallback sync while chat is active
  useEffect(() => {
    if (!conversationId) return;

    const token =
      visitorToken ||
      (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) || "" : "");
    const lastCreated = messages
      .filter((m) => !m.id.startsWith("temp-") && !m.id.startsWith("welcome-"))
      .slice(-1)[0]?.createdAt;

    const qs = new URLSearchParams({ conversationId });
    if (token) qs.set("visitorToken", token);
    if (lastCreated) qs.set("after", lastCreated);

    const es = new EventSource(`/api/chat/stream?${qs.toString()}`);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setConnectionLost(false);
    });

    es.addEventListener("message", (evt) => {
      try {
        const msg = JSON.parse((evt as MessageEvent).data) as PublicChatMessage;
        mergeIncomingMessages([msg]);
        if (msg.senderType === "HUMAN_SUPPORT") {
          setEscalatedToHuman(true);
          setConversationStatus("HUMAN_REPLIED");
        }
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("status", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data) as {
          status?: string;
          escalatedToHuman?: boolean;
        };
        if (payload.status) setConversationStatus(payload.status);
        if (typeof payload.escalatedToHuman === "boolean") {
          setEscalatedToHuman(payload.escalatedToHuman);
        }
      } catch {
        // ignore
      }
    });

    es.onerror = () => {
      setConnectionLost(true);
    };

    // Reliable fallback polling every 8s for active escalated conversations or interrupted SSE
    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/chat/session?conversationId=${encodeURIComponent(conversationId)}`,
          { headers: token ? { "x-visitor-token": token } : undefined }
        );
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d.messages) && d.messages.length > 0) {
            mergeIncomingMessages(d.messages);
          }
          if (d.conversation) {
            setConversationStatus(d.conversation.status);
            setEscalatedToHuman(Boolean(d.conversation.escalatedToHuman));
          }
          setConnectionLost(false);
        }
      } catch {
        setConnectionLost(true);
      }
    }, 8000);

    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [conversationId, visitorToken, mergeIncomingMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureSession = async (newConv = false) => {
    const savedToken =
      visitorToken ||
      (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) || "" : "");

    const res = await fetch("/api/chat/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(savedToken ? { "x-visitor-token": savedToken } : {}),
      },
      body: JSON.stringify({
        name: visitorName.trim() || undefined,
        email: visitorEmail.trim() || undefined,
        newConversation: newConv,
      }),
    });

    if (!res.ok) throw new Error("Unable to initialize chat session");
    const data = await res.json();
    if (data.visitorToken) {
      setVisitorToken(data.visitorToken);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_TOKEN, data.visitorToken);
      }
    }
    if (data.conversation) {
      setConversationId(data.conversation.id);
      setConversationStatus(data.conversation.status);
      setEscalatedToHuman(Boolean(data.conversation.escalatedToHuman));
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_CONV, data.conversation.id);
      }
    }
    if (Array.isArray(data.messages)) {
      setMessages(data.messages);
    }
    return data as {
      visitorToken: string;
      conversation: { id: string; status: string; escalatedToHuman: boolean };
    };
  };

  const handleStartNewConversation = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await ensureSession(true);
    } catch {
      setConnectionLost(true);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (
    textToSend?: string,
    opts?: { forceHumanHandover?: boolean; retryMsg?: PublicChatMessage }
  ) => {
    const text = (opts?.retryMsg?.content ?? textToSend ?? input).trim();
    if (!text || loading) return;

    const clientMsgId =
      opts?.retryMsg?.clientMessageId ||
      `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (opts?.retryMsg) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === opts.retryMsg!.id ? { ...m, failed: false, pending: true } : m
        )
      );
    } else {
      const optimistic: PublicChatMessage = {
        id: `temp-${clientMsgId}`,
        conversationId,
        senderType: "VISITOR",
        senderName: visitorName || "You",
        content: text,
        createdAt: new Date().toISOString(),
        pending: true,
        clientMessageId: clientMsgId,
      };
      setMessages((prev) => [...prev, optimistic]);
      if (!textToSend) setInput("");
    }

    setLoading(true);
    setConnectionLost(false);

    try {
      let activeConvId = conversationId;
      let activeToken =
        visitorToken ||
        (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) || "" : "");

      if (!activeConvId) {
        const s = await ensureSession(false);
        activeConvId = s.conversation.id;
        activeToken = s.visitorToken;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { "x-visitor-token": activeToken } : {}),
        },
        body: JSON.stringify({
          conversationId: activeConvId,
          message: text,
          clientMessageId: clientMsgId,
          visitorName: visitorName.trim() || undefined,
          visitorEmail: visitorEmail.trim() || undefined,
          forceHumanHandover: opts?.forceHumanHandover,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to deliver message.");
      }

      if (data.visitorToken) {
        setVisitorToken(data.visitorToken);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_TOKEN, data.visitorToken);
        }
      }
      if (data.conversation) {
        setConversationId(data.conversation.id);
        setConversationStatus(data.conversation.status);
        setEscalatedToHuman(Boolean(data.conversation.escalatedToHuman));
      }

      // Replace optimistic temp message cleanly with persisted server messages
      setMessages((prev) => {
        const withoutTemp = prev.filter(
          (m) => m.id !== `temp-${clientMsgId}` && m.clientMessageId !== clientMsgId
        );
        const merged = [...withoutTemp];
        const serverMsgs: PublicChatMessage[] = Array.isArray(data.newMessages)
          ? data.newMessages
          : Array.isArray(data.messages)
          ? data.messages
          : [];
        for (const item of serverMsgs) {
          if (!merged.some((x) => x.id === item.id)) {
            merged.push(item);
          }
        }
        return merged;
      });
    } catch {
      setConnectionLost(true);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === `temp-${clientMsgId}` || m.clientMessageId === clientMsgId
            ? { ...m, pending: false, failed: true, clientMessageId: clientMsgId }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const saveVisitorContactDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const token =
      visitorToken ||
      (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) || "" : "");
    if (!token) {
      await ensureSession(false);
      setShowContactBar(false);
      return;
    }
    await fetch("/api/chat/session", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-visitor-token": token,
      },
      body: JSON.stringify({
        name: visitorName.trim() || undefined,
        email: visitorEmail.trim() || undefined,
      }),
    }).catch(() => {});
    setShowContactBar(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-2xl shadow-blue-500/40 flex items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer"
        aria-label="Toggle OneTab Support Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
        {!open && escalatedToHuman && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0f0f0f]" />
        )}
      </button>

      <div
        className={`fixed bottom-22 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] sm:w-[375px] h-[520px] max-h-[80vh] bg-[#111113] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 origin-bottom-right ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="bg-[#3b82f6] px-4 py-3 flex items-center justify-between text-white shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-bold text-sm">
              {escalatedToHuman ? (
                <Headphones className="w-4 h-4 shrink-0" />
              ) : (
                <Bot className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{config.assistantName}</span>
            </div>
            <div className="text-[11px] text-white/85 flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionLost ? "bg-amber-300" : "bg-emerald-300"
                }`}
              />
              <span>
                {escalatedToHuman
                  ? conversationStatus === "HUMAN_REPLIED"
                    ? "Support Team Connected"
                    : "Waiting for Support Team"
                  : "AI Support Online"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowContactBar((p) => !p)}
              title="Add optional name or email for faster follow-up"
              className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-medium cursor-pointer"
            >
              Details
            </button>
            <button
              type="button"
              onClick={handleStartNewConversation}
              title="Start new conversation"
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer"
              aria-label="Start new conversation"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 text-white/80 hover:text-white cursor-pointer"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Visitor Info Drawer (no signup required) */}
        {showContactBar && (
          <form
            onSubmit={saveVisitorContactDetails}
            className="p-3 bg-[#17171b] border-b border-[#2a2a2a] space-y-2 text-xs shrink-0"
          >
            <div className="text-[11px] text-[#b0b0b8]">
              Optional details (no account required):
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your name"
                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-[#3b82f6]"
              />
              <input
                type="email"
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                placeholder="Email (optional)"
                className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-[#3b82f6]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowContactBar(false)}
                className="px-2.5 py-1 text-[#b0b0b8] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-[#3b82f6] text-white font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Message List */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#0f0f0f]">
          {initializing && messages.length === 0 ? (
            <div className="text-center text-xs text-[#71717a] py-8">
              Restoring your conversation...
            </div>
          ) : (
            messages.map((m) => {
              const isVisitor = m.senderType === "VISITOR";
              const isHuman = m.senderType === "HUMAN_SUPPORT";
              const isSystem = m.senderType === "SYSTEM";

              if (isSystem) {
                return (
                  <div
                    key={m.id}
                    className="mx-auto max-w-[92%] px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-[11px] text-center leading-relaxed"
                  >
                    {m.content}
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isVisitor ? "items-end" : "items-start"}`}
                >
                  {!isVisitor && (
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      {isHuman ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Headphones className="w-2.5 h-2.5" />
                          Support Team
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#93c5fd]">
                          <Bot className="w-2.5 h-2.5" />
                          {m.senderName || config.assistantName}
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                      isVisitor
                        ? "bg-[#262626] text-white rounded-br-sm"
                        : isHuman
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-zinc-100 rounded-bl-sm"
                        : "bg-blue-500/10 border border-blue-500/20 text-zinc-200 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-[#71717a]">
                    <span>{formatMsgTime(m.createdAt)}</span>
                    {m.pending && <span>Sending...</span>}
                    {m.failed && (
                      <button
                        type="button"
                        onClick={() => sendMessage(undefined, { retryMsg: m })}
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                      >
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed &bull; Retry</span>
                        <RefreshCw className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {loading && (
            <div className="mr-auto max-w-[65%] px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-zinc-300 text-xs flex items-center gap-2">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:240ms]" />
              </span>
              <span>Typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts + Direct Human Escalation Option */}
        <div className="px-3 py-2 bg-[#141417] border-t border-[#2a2a2a] flex gap-1.5 overflow-x-auto shrink-0">
          {!escalatedToHuman && config.humanHandoverEnabled && (
            <button
              type="button"
              onClick={() =>
                sendMessage("I would like to speak with the Support Team.", {
                  forceHumanHandover: true,
                })
              }
              className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3 h-3" />
              Talk to Support Team
            </button>
          )}
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-[#1f1f24] border border-[#2a2a2a] text-[#b0b0b8] hover:text-white hover:border-[#3b82f6] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-2.5 border-t border-[#2a2a2a] bg-[#0a0a0a] shrink-0 space-y-1.5"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                escalatedToHuman
                  ? "Reply directly to Support Team..."
                  : "Ask about distribution, English/हिन्दी/বাংলা..."
              }
              className="flex-1 bg-[#18181b] border border-[#2a2a2a] text-white text-xs px-3 py-2.5 rounded-lg outline-none focus:border-[#3b82f6]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3.5 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center justify-center disabled:opacity-50 cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#71717a] px-1">
            <span>Conversations are saved privately in your browser session.</span>
            <Link href="/privacy" className="underline hover:text-[#b0b0b8]">
              Privacy
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
