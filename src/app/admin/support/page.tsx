"use client";

import React, { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface AdminTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  user: { name: string; email: string };
  replies: Array<{
    id: string;
    message: string;
    user: { name: string; role: string };
  }>;
}

export default function AdminSupportPage() {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const load = async () => {
    const res = await fetch("/api/tickets");
    const d = await res.json();
    setTickets(d.tickets || []);
  };

  useEffect(() => {
    load();
  }, []);

  const reply = async (ticketId: string, status?: string) => {
    const msg = (replyText[ticketId] || "").trim();
    if (!msg) return;
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", ticketId, message: msg, status }),
    });
    if (res.ok) {
      showToast("Reply sent!", "success");
      setReplyText((p) => ({ ...p, [ticketId]: "" }));
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Admin Support Desk</h1>
        <p className="text-sm text-[#b0b0b8]">
          Respond to artist and label tickets and manage resolution statuses.
        </p>
      </div>

      <div className="space-y-4">
        {tickets.length === 0 ? (
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-8 text-center text-sm text-[#71717a]">
            No support tickets found.
          </div>
        ) : (
          tickets.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white">{t.subject}</h3>
                  <p className="text-xs text-[#71717a]">
                    From: {t.user.name} ({t.user.email}) &bull; {t.category} &bull;{" "}
                    {t.priority}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-[#3b82f6]">
                  {t.status}
                </span>
              </div>

              <div className="space-y-2">
                {t.replies.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-[#111114] text-xs">
                    <span className="font-bold text-[#3b82f6]">
                      {r.user.name} ({r.user.role}):{" "}
                    </span>
                    <span className="text-zinc-200">{r.message}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Write admin response..."
                  value={replyText[t.id] || ""}
                  onChange={(e) =>
                    setReplyText((p) => ({ ...p, [t.id]: e.target.value }))
                  }
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <button
                  type="button"
                  onClick={() => reply(t.id, "WAITING_USER")}
                  className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Reply
                </button>
                <button
                  type="button"
                  onClick={() => reply(t.id, "RESOLVED")}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                >
                  Reply &amp; Resolve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
