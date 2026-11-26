"use client";

import React, { useState } from "react";
import { Bot, Send, X } from "lucide-react";

interface ChatMsg {
  role: "user" | "bot";
  text: string;
}

const QUICK_PROMPTS = [
  "Pricing & plans?",
  "Supported DSP stores?",
  "Audio & artwork specs?",
  "How VEVO & Content ID work?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "bot",
      text: "Hi! I'm OneTab Assistant. Ask me about distribution plans, DSP stores, audio/artwork specs, royalties, or VEVO.",
    },
  ]);

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/chat?message=${encodeURIComponent(text)}`);
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            data.reply ||
            "Thanks for reaching out! Visit Help & Support or submit a contact inquiry for detailed assistance.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Unable to connect right now. Please try again or visit our Help & Support page.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-2xl shadow-blue-500/40 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
        aria-label="Toggle OneTab Support Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
      </button>

      {open && (
        <div className="fixed bottom-22 right-5 z-50 w-[350px] max-w-[calc(100vw-2.5rem)] h-[460px] bg-[#111113] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-[#3b82f6] px-4 py-3.5 flex items-center justify-between text-white">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Bot className="w-4 h-4" />
              <span>OneTab Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-[#0f0f0f]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-[#262626] text-white rounded-br-sm"
                    : "mr-auto bg-blue-500/10 border border-blue-500/20 text-zinc-200 rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="mr-auto max-w-[60%] px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-zinc-400 text-xs">
                Typing...
              </div>
            )}
          </div>

          <div className="px-3 py-2 bg-[#141417] border-t border-[#2a2a2a] flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-[#1f1f24] border border-[#2a2a2a] text-[#b0b0b8] hover:text-white hover:border-[#3b82f6] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-2.5 border-t border-[#2a2a2a] bg-[#0a0a0a] flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about distribution..."
              className="flex-1 bg-[#18181b] border border-[#2a2a2a] text-white text-xs px-3 py-2.5 rounded-lg outline-none focus:border-[#3b82f6]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center justify-center disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
