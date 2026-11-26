"use client";

import React, { useEffect, useState } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface TicketItem {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  updatedAt: string;
  replies: Array<{
    id: string;
    message: string;
    createdAt: string;
    user: { name: string; role: string };
  }>;
}

export default function SupportTicketsPage() {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    subject: "",
    category: "Distribution",
    priority: "MEDIUM",
    message: "",
  });

  const load = async () => {
    const res = await fetch("/api/tickets");
    const data = await res.json();
    setTickets(data.tickets || []);
  };

  useEffect(() => {
    load();
  }, []);

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to create ticket.", "error");
      return;
    }
    showToast("Support ticket created!", "success");
    setForm({ subject: "", category: "Distribution", priority: "MEDIUM", message: "" });
    load();
  };

  const sendReply = async (ticketId: string) => {
    const msg = (replyText[ticketId] || "").trim();
    if (!msg) return;
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", ticketId, message: msg }),
    });
    if (res.ok) {
      setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Support Tickets</h1>
        <p className="text-sm text-[#b0b0b8]">
          Communicate directly with OneTab Catalog, Rights, and Royalty teams.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={createTicket}
          className="lg:col-span-4 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3 h-fit"
        >
          <h2 className="font-bold text-base flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-[#3b82f6]" /> Open New Ticket
          </h2>
          <input
            type="text"
            required
            placeholder="Subject*"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            >
              <option value="Distribution">Distribution</option>
              <option value="Royalties">Royalties</option>
              <option value="YouTube / VEVO">YouTube / VEVO</option>
              <option value="Copyright">Copyright</option>
              <option value="Account">Account</option>
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <textarea
            required
            rows={4}
            placeholder="Describe your issue or release ID..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
          >
            Submit Ticket
          </button>
        </form>

        <div className="lg:col-span-8 space-y-4">
          {tickets.length === 0 ? (
            <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-8 text-center text-sm text-[#71717a]">
              No support tickets yet.
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
                      {t.category} &bull; Priority: {t.priority}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-[#3b82f6]">
                    {t.status}
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {t.replies.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-[#111114] border border-white/5 text-xs"
                    >
                      <div className="font-semibold text-[#3b82f6]">
                        {r.user.name} ({r.user.role})
                      </div>
                      <p className="text-zinc-200 mt-1">{r.message}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={replyText[t.id] || ""}
                    onChange={(e) =>
                      setReplyText((prev) => ({ ...prev, [t.id]: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => sendReply(t.id)}
                    className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Reply
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
