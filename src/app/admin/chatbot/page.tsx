"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Copy,
  Edit3,
  FileUp,
  Headphones,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface ChatbotSettingsDto {
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  aiBaseUrl: string;
  hasAiApiKey: boolean;
  aiApiKeyPreview: string | null;
  aiCredentialSource: string;
  assistantName: string;
  welcomeMessage: string;
  systemInstructions: string;
  defaultLanguage: string;
  escalationThreshold: number;
  humanHandoverEnabled: boolean;
  emailEnabled: boolean;
  emailProvider: string;
  supportEmail: string;
  senderEmail: string;
  senderName: string;
  replyRoutingDomain: string;
  hasEmailApiKey: boolean;
  emailApiKeyPreview: string | null;
  emailCredentialSource: string;
  hasInboundWebhookSecret: boolean;
  inboundWebhookSecretPreview: string | null;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  lastWebhookVerifiedAt: string | null;
  lastTestEmailAt: string | null;
  lastTestEmailStatus: string | null;
}

interface KbEntry {
  id: string;
  title: string;
  category: string;
  question: string | null;
  content: string;
  tags: string;
  documentFileName: string | null;
  enabled: boolean;
  sortOrder: number;
  updatedAt: string;
}

interface ConvSummary {
  id: string;
  visitorId: string;
  status: string;
  escalatedToHuman: boolean;
  escalationReason: string | null;
  pendingHumanReply: boolean;
  lastMessageAt: string;
  createdAt: string;
  visitor: { id: string; name: string | null; email: string | null };
  messages: Array<{ content: string; senderType: string; createdAt: string }>;
  _count: { messages: number };
}

interface FullConv {
  id: string;
  visitorId: string;
  status: string;
  escalatedToHuman: boolean;
  escalationReason: string | null;
  pendingHumanReply: boolean;
  createdAt: string;
  visitor: { id: string; name: string | null; email: string | null };
  messages: Array<{
    id: string;
    senderType: string;
    senderName: string | null;
    content: string;
    language: string | null;
    aiModel: string | null;
    aiConfidence: number | null;
    createdAt: string;
  }>;
  emailDeliveries: Array<{
    id: string;
    direction: string;
    provider: string;
    toEmail: string;
    subject: string;
    status: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

interface AnalyticsDto {
  totalConversations: number;
  aiResolved: number;
  humanEscalated: number;
  pendingReplies: number;
  avgFirstResponseSeconds: number;
  aiResolutionRate: number;
  emailDeliveryFailures: number;
}

interface WebhookLogDto {
  id: string;
  provider: string;
  eventType: string;
  signatureValid: boolean;
  conversationId: string | null;
  status: string;
  summary: string | null;
  createdAt: string;
}

type TabKey = "chats" | "kb" | "ai" | "email" | "analytics";

export default function AdminChatbotPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabKey>("chats");

  // Analytics & Conversations state
  const [analytics, setAnalytics] = useState<AnalyticsDto | null>(null);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [selectedConv, setSelectedConv] = useState<FullConv | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [convSearch, setConvSearch] = useState("");
  const [convStatus, setConvStatus] = useState("ALL");
  const [convFrom, setConvFrom] = useState("");
  const [convTo, setConvTo] = useState("");
  const [adminReplyText, setAdminReplyText] = useState("");

  // Settings & Webhook state
  const [settings, setSettings] = useState<ChatbotSettingsDto | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogDto[]>([]);
  const [newAiApiKey, setNewAiApiKey] = useState("");
  const [newEmailApiKey, setNewEmailApiKey] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Knowledge Base state
  const [kbEntries, setKbEntries] = useState<KbEntry[]>([]);
  const [publishedFaqCount, setPublishedFaqCount] = useState(0);
  const [kbSearch, setKbSearch] = useState("");
  const [kbCatFilter, setKbCatFilter] = useState("");
  const [editingKbId, setEditingKbId] = useState<string | null>(null);
  const [kbForm, setKbForm] = useState({
    title: "",
    category: "FAQ",
    question: "",
    content: "",
    tags: "",
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");

  const loadConversations = useCallback(
    async (keepId?: string) => {
      const qs = new URLSearchParams();
      if (convSearch.trim()) qs.set("q", convSearch.trim());
      if (convStatus !== "ALL") qs.set("status", convStatus);
      if (convFrom) qs.set("from", convFrom);
      if (convTo) qs.set("to", convTo);
      const targetId = keepId || selectedConvId;
      if (targetId) qs.set("conversationId", targetId);

      const res = await fetch(`/api/admin/chatbot/conversations?${qs.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setConversations(d.conversations || []);
        setAnalytics(d.analytics || null);
        if (d.selectedConversation) {
          setSelectedConv(d.selectedConversation);
        }
      }
    },
    [convSearch, convStatus, convFrom, convTo, selectedConvId]
  );

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/admin/chatbot/settings");
    if (res.ok) {
      const d = await res.json();
      setSettings(d.settings);
      setWebhookUrl(d.webhookUrl || "");
      setWebhookLogs(d.webhookLogs || []);
    }
  }, []);

  const loadKb = useCallback(async () => {
    const qs = new URLSearchParams();
    if (kbSearch.trim()) qs.set("q", kbSearch.trim());
    if (kbCatFilter) qs.set("category", kbCatFilter);
    const res = await fetch(`/api/admin/chatbot/knowledge?${qs.toString()}`);
    if (res.ok) {
      const d = await res.json();
      setKbEntries(d.entries || []);
      setPublishedFaqCount(d.publishedWebsiteFaqCount || 0);
    }
  }, [kbSearch, kbCatFilter]);

  useEffect(() => {
    loadConversations();
    loadSettings();
    loadKb();
  }, [loadConversations, loadSettings, loadKb]);

  const handleSelectConv = async (id: string) => {
    setSelectedConvId(id);
    await loadConversations(id);
  };

  const handleAdminReply = async (e: React.FormEvent, markResolved = false) => {
    e.preventDefault();
    if (!selectedConvId || !adminReplyText.trim()) return;
    const res = await fetch("/api/admin/chatbot/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: selectedConvId,
        message: adminReplyText.trim(),
        markResolved,
      }),
    });
    if (res.ok) {
      setAdminReplyText("");
      showToast("Reply delivered directly to visitor chat.", "success");
      loadConversations(selectedConvId);
    } else {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || "Failed to send reply.", "error");
    }
  };

  const handleUpdateConvStatus = async (status: string) => {
    if (!selectedConvId) return;
    const res = await fetch("/api/admin/chatbot/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selectedConvId, status }),
    });
    if (res.ok) {
      showToast(`Conversation updated to ${status}.`, "success");
      loadConversations(selectedConvId);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const payload: Record<string, unknown> = {
        ...settings,
        escalationThreshold: Number(settings.escalationThreshold),
        smtpPort: settings.smtpPort ? Number(settings.smtpPort) : null,
      };
      if (newAiApiKey.trim()) payload.aiApiKey = newAiApiKey.trim();
      if (newEmailApiKey.trim()) payload.emailApiKey = newEmailApiKey.trim();
      if (newWebhookSecret.trim()) payload.inboundWebhookSecret = newWebhookSecret.trim();

      const res = await fetch("/api/admin/chatbot/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || "Failed to save chatbot settings.", "error");
        return;
      }
      setSettings(d.settings);
      setNewAiApiKey("");
      setNewEmailApiKey("");
      setNewWebhookSecret("");
      showToast("AI & Email settings encrypted and saved!", "success");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestEmail = async () => {
    const res = await fetch("/api/admin/chatbot/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test_email" }),
    });
    const d = await res.json();
    showToast(d.message || (res.ok ? "Test email sent!" : "Test email failed."), res.ok ? "success" : "error");
    loadSettings();
  };

  const handleSaveKb = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingKbId ? "PATCH" : "POST";
    const res = await fetch("/api/admin/chatbot/knowledge", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingKbId ? { id: editingKbId, ...kbForm } : kbForm),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Failed to save KB entry.", "error");
      return;
    }
    showToast(editingKbId ? "Knowledge entry updated!" : "Knowledge entry added!", "success");
    setEditingKbId(null);
    setKbForm({ title: "", category: "FAQ", question: "", content: "", tags: "" });
    loadKb();
  };

  const handleToggleKb = async (entry: KbEntry) => {
    await fetch("/api/admin/chatbot/knowledge", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, enabled: !entry.enabled }),
    });
    loadKb();
  };

  const handleDeleteKb = async (id: string) => {
    await fetch(`/api/admin/chatbot/knowledge?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    showToast("Knowledge entry removed.", "success");
    loadKb();
  };

  const handleUploadKbDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    const fd = new FormData();
    fd.append("file", docFile);
    fd.append("title", docTitle.trim() || docFile.name);
    fd.append("category", "DOCUMENT");
    const res = await fetch("/api/admin/chatbot/knowledge", {
      method: "POST",
      body: fd,
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Document upload failed.", "error");
      return;
    }
    showToast("Support document uploaded & indexed into AI Knowledge Base!", "success");
    setDocFile(null);
    setDocTitle("");
    loadKb();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            AI Customer Support &amp; Two-Way Email Handover
          </h1>
          <p className="text-sm text-[#b0b0b8]">
            Manage AI assistant models, knowledge base, two-way email webhooks, live escalated chats, and support analytics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadConversations();
            loadSettings();
            loadKb();
          }}
          className="px-3.5 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs font-semibold text-white hover:border-[#3b82f6] flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Honest Integration Status Strip */}
      {settings && (!settings.hasAiApiKey || !settings.hasEmailApiKey || !settings.hasInboundWebhookSecret) && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300">Setup Required for Live External Delivery</div>
            <div className="flex flex-wrap gap-3 text-amber-100/90">
              <span>AI Provider Key: {settings.hasAiApiKey ? "Connected" : "Not configured (AI Settings tab)"}</span>
              <span>&bull; Email Outbound Key: {settings.hasEmailApiKey ? "Connected" : "Not configured (Email Settings tab)"}</span>
              <span>&bull; Inbound Webhook Secret: {settings.hasInboundWebhookSecret ? "Configured" : "Not configured (Email Settings tab)"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "chats" as TabKey, label: "Chat Management", icon: MessageSquare },
          { id: "kb" as TabKey, label: "Knowledge Base", icon: BookOpen },
          { id: "ai" as TabKey, label: "AI Settings", icon: Bot },
          { id: "email" as TabKey, label: "Email & Two-Way Reply", icon: Mail },
          { id: "analytics" as TabKey, label: "Analytics", icon: BarChart3 },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                active
                  ? "bg-[#3b82f6] text-white"
                  : "bg-[#18181b] border border-[#2a2a2a] text-[#b0b0b8] hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ANALYTICS SUMMARY CARDS */}
      {analytics && (tab === "analytics" || tab === "chats") && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          {[
            { label: "Total Chats", val: analytics.totalConversations },
            { label: "AI Resolved", val: analytics.aiResolved },
            { label: "Human Escalated", val: analytics.humanEscalated },
            { label: "Pending Replies", val: analytics.pendingReplies },
            { label: "AI Resolution Rate", val: `${analytics.aiResolutionRate}%` },
            { label: "Avg Response (s)", val: `${analytics.avgFirstResponseSeconds}s` },
            { label: "Email Failures", val: analytics.emailDeliveryFailures },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3.5 rounded-xl bg-[#18181b] border border-[#2a2a2a]">
              <div className="text-[#71717a]">{kpi.label}</div>
              <div className="text-lg font-extrabold text-white mt-1">{kpi.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: CHAT MANAGEMENT */}
      {tab === "chats" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative sm:col-span-2">
                <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder="Search ID, visitor, email, message..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>
              <select
                value={convStatus}
                onChange={(e) => setConvStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="AI_ACTIVE">AI Active</option>
                <option value="ESCALATED">Human Escalated</option>
                <option value="WAITING_HUMAN">Pending Human Reply</option>
                <option value="HUMAN_REPLIED">Human Replied</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={convFrom}
                  onChange={(e) => setConvFrom(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-[11px]"
                />
                <input
                  type="date"
                  value={convTo}
                  onChange={(e) => setConvTo(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-[11px]"
                />
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto space-y-2">
              {conversations.length === 0 ? (
                <div className="text-center text-xs text-[#71717a] py-8">
                  No conversations match your filters yet.
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConv(c.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                      selectedConvId === c.id
                        ? "bg-blue-500/10 border-[#3b82f6]"
                        : "bg-[#111114] border-white/5 hover:border-[#2a2a2a]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-white truncate">
                        {c.visitor.name || c.visitor.email || `Visitor ${c.visitorId.slice(-6)}`}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          c.status === "RESOLVED"
                            ? "bg-zinc-700 text-zinc-200"
                            : c.pendingHumanReply
                            ? "bg-amber-500/20 text-amber-300"
                            : c.escalatedToHuman
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#b0b0b8] truncate mt-1">
                      {c.messages[0]?.content || "New conversation"}
                    </p>
                    <div className="text-[10px] text-[#71717a] mt-1 flex justify-between">
                      <span>{c._count.messages} msgs</span>
                      <span>{new Date(c.lastMessageAt).toLocaleString()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex flex-col justify-between min-h-[560px]">
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center text-sm text-[#71717a]">
                Select a conversation on the left to view full history, email delivery records, or reply directly.
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2a2a2a] pb-3">
                    <div className="text-xs space-y-0.5">
                      <div className="text-sm font-bold text-white">
                        Conversation #{selectedConv.id.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-[#b0b0b8]">
                        Visitor ID: {selectedConv.visitorId} &bull; Name:{" "}
                        {selectedConv.visitor.name || "Not provided"} &bull; Email:{" "}
                        {selectedConv.visitor.email || "Not provided"}
                      </div>
                      {selectedConv.escalationReason && (
                        <div className="text-amber-300">
                          Escalation Reason: {selectedConv.escalationReason}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedConv.status !== "RESOLVED" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateConvStatus("RESOLVED")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateConvStatus("WAITING_HUMAN")}
                          className="px-3 py-1.5 rounded-lg bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Reopen
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conversation Transcript */}
                  <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1">
                    {selectedConv.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl text-xs border ${
                          m.senderType === "VISITOR"
                            ? "bg-[#111114] border-white/10"
                            : m.senderType === "HUMAN_SUPPORT"
                            ? "bg-emerald-500/10 border-emerald-500/25"
                            : m.senderType === "SYSTEM"
                            ? "bg-amber-500/10 border-amber-500/20"
                            : "bg-blue-500/10 border-blue-500/20"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#b0b0b8] mb-1">
                          <span className="font-bold text-white flex items-center gap-1">
                            {m.senderType === "HUMAN_SUPPORT" && <Headphones className="w-3 h-3 text-emerald-400" />}
                            {m.senderType === "AI" && <Bot className="w-3 h-3 text-blue-400" />}
                            {m.senderName || m.senderType}
                          </span>
                          <span>
                            {m.aiConfidence !== null ? `conf: ${m.aiConfidence.toFixed(2)} • ` : ""}
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap text-zinc-200">{m.content}</div>
                      </div>
                    ))}
                  </div>

                  {/* Email Logs for this Conversation */}
                  {selectedConv.emailDeliveries.length > 0 && (
                    <div className="text-[11px] space-y-1 border-t border-[#2a2a2a] pt-2">
                      <div className="font-bold text-[#b0b0b8]">Email Thread Deliveries</div>
                      {selectedConv.emailDeliveries.slice(0, 4).map((e) => (
                        <div key={e.id} className="flex justify-between text-[#71717a]">
                          <span>
                            [{e.direction}] {e.provider} &bull; {e.status}
                            {e.errorMessage ? ` (${e.errorMessage})` : ""}
                          </span>
                          <span>{new Date(e.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Admin Reply Composer */}
                <form onSubmit={(e) => handleAdminReply(e, false)} className="pt-3 border-t border-[#2a2a2a] flex flex-wrap gap-2 mt-3">
                  <input
                    type="text"
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    placeholder="Write live reply into visitor's chat..."
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Reply Live
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleAdminReply(e, true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                  >
                    Reply &amp; Resolve
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB: KNOWLEDGE BASE */}
      {tab === "kb" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form onSubmit={handleSaveKb} className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#3b82f6]" />
                <span>{editingKbId ? "Edit Knowledge Entry" : "Add Knowledge Base / FAQ / Policy Entry"}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={kbForm.title}
                  onChange={(e) => setKbForm({ ...kbForm, title: e.target.value })}
                  placeholder="Title (e.g. Payout Minimum Threshold)"
                  className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <select
                  value={kbForm.category}
                  onChange={(e) => setKbForm({ ...kbForm, category: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                >
                  <option value="FAQ">FAQ</option>
                  <option value="BUSINESS_INFO">Business Information</option>
                  <option value="SERVICE">Service Description</option>
                  <option value="PRICING">Pricing &amp; Plans</option>
                  <option value="POLICY">Support Policy</option>
                  <option value="DOCUMENT">Document Reference</option>
                </select>
              </div>
              <input
                type="text"
                value={kbForm.question}
                onChange={(e) => setKbForm({ ...kbForm, question: e.target.value })}
                placeholder="Question pattern (optional, great for FAQs)"
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <textarea
                required
                rows={4}
                value={kbForm.content}
                onChange={(e) => setKbForm({ ...kbForm, content: e.target.value })}
                placeholder="Verified answer, business details, pricing terms, or support rules..."
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <input
                type="text"
                value={kbForm.tags}
                onChange={(e) => setKbForm({ ...kbForm, tags: e.target.value })}
                placeholder="Comma-separated keywords (e.g. payout, threshold, royalty)"
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
                >
                  {editingKbId ? "Update Entry" : "Add Entry"}
                </button>
                {editingKbId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKbId(null);
                      setKbForm({ title: "", category: "FAQ", question: "", content: "", tags: "" });
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-4">
              <form onSubmit={handleUploadKbDoc} className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-[#3b82f6]" />
                  <span>Upload Support Document (.txt, .md, .csv, .json)</span>
                </div>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document title (optional)"
                  className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.csv,.json"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#b0b0b8]"
                />
                <button
                  type="submit"
                  disabled={!docFile}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Upload &amp; Index Document
                </button>
              </form>

              <div className="rounded-2xl bg-[#111114] border border-white/5 p-4 text-xs text-[#b0b0b8] space-y-1">
                <div className="font-bold text-white">Automatic Website Knowledge Sync Active</div>
                <p>
                  In addition to entries here, the AI automatically reads live published Website CMS Sections (About, Home, Services, Control), Distribution Plans, DSP Stores, and {publishedFaqCount} published Website FAQs.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="font-bold text-sm text-white">Knowledge Base Entries ({kbEntries.length})</div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder="Search KB entries..."
                  className="px-3 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <select
                  value={kbCatFilter}
                  onChange={(e) => setKbCatFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                >
                  <option value="">All Categories</option>
                  <option value="FAQ">FAQ</option>
                  <option value="BUSINESS_INFO">Business Info</option>
                  <option value="SERVICE">Service</option>
                  <option value="PRICING">Pricing</option>
                  <option value="POLICY">Policy</option>
                  <option value="DOCUMENT">Uploaded Document</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {kbEntries.map((entry) => (
                <div key={entry.id} className="p-3.5 rounded-xl bg-[#111114] border border-white/5 flex flex-wrap items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">{entry.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-[#93c5fd]">
                        {entry.category}
                      </span>
                      {entry.documentFileName && (
                        <span className="text-[10px] text-emerald-300">{entry.documentFileName}</span>
                      )}
                    </div>
                    {entry.question && <div className="text-[#b0b0b8]">Q: {entry.question}</div>}
                    <div className="text-[#9ca3af] line-clamp-2">{entry.content}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleKb(entry)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                        entry.enabled ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {entry.enabled ? "Enabled" : "Disabled"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKbId(entry.id);
                        setKbForm({
                          title: entry.title,
                          category: entry.category,
                          question: entry.question || "",
                          content: entry.content,
                          tags: entry.tags || "",
                        });
                      }}
                      className="p-1.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#3b82f6] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteKb(entry.id)}
                      className="p-1.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] hover:border-red-500 text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: AI SETTINGS */}
      {tab === "ai" && settings && (
        <form onSubmit={handleSaveSettings} className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-base text-white">AI Provider &amp; Behavior Configuration</h2>
              <p className="text-xs text-[#b0b0b8]">API keys are encrypted server-side with AES-256-GCM and never sent back to the browser.</p>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                settings.hasAiApiKey
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {settings.hasAiApiKey
                ? `Connected (${settings.aiCredentialSource})`
                : "API Credentials Not Configured"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="flex items-center gap-2 p-3 rounded-xl bg-[#111114] border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.aiEnabled}
                onChange={(e) => setSettings({ ...settings, aiEnabled: e.target.checked })}
              />
              <span className="font-bold text-white">Enable AI Support Assistant</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-xl bg-[#111114] border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.humanHandoverEnabled}
                onChange={(e) => setSettings({ ...settings, humanHandoverEnabled: e.target.checked })}
              />
              <span className="font-bold text-white">Enable Human Email Handover</span>
            </label>

            <div>
              <label className="block font-semibold text-[#b0b0b8] mb-1">AI Provider</label>
              <select
                value={settings.aiProvider}
                onChange={(e) => setSettings({ ...settings, aiProvider: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
              >
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google Gemini</option>
                <option value="ANTHROPIC">Anthropic Claude</option>
                <option value="OPENAI_COMPATIBLE">OpenAI-Compatible Endpoint</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#b0b0b8] mb-1">Model Name</label>
              <input
                type="text"
                value={settings.aiModel}
                onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
                placeholder="gpt-4o-mini / gemini-2.0-flash / claude-3-5-sonnet-latest"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#b0b0b8] mb-1">
                AI API Key ({settings.aiApiKeyPreview || "Unconfigured"})
              </label>
              <input
                type="password"
                value={newAiApiKey}
                onChange={(e) => setNewAiApiKey(e.target.value)}
                placeholder="Enter new API key (leave blank to keep existing)"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#b0b0b8] mb-1">Custom API Base URL (optional)</label>
              <input
                type="text"
                value={settings.aiBaseUrl}
                onChange={(e) => setSettings({ ...settings, aiBaseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#b0b0b8] mb-1">Assistant Display Name</label>
              <input
                type="text"
                value={settings.assistantName}
                onChange={(e) => setSettings({ ...settings, assistantName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Language Mode</label>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                >
                  <option value="auto">Auto (English / Hindi / Bengali)</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Bengali">Bengali</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Escalation Threshold (0.1 - 0.99)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="0.99"
                  value={settings.escalationThreshold}
                  onChange={(e) =>
                    setSettings({ ...settings, escalationThreshold: Number.parseFloat(e.target.value) || 0.65 })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-[#b0b0b8] mb-1">Welcome Message</label>
              <input
                type="text"
                value={settings.welcomeMessage}
                onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-[#b0b0b8] mb-1">Assistant Instructions</label>
              <textarea
                rows={4}
                value={settings.systemInstructions}
                onChange={(e) => setSettings({ ...settings, systemInstructions: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-5 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" /> {savingSettings ? "Saving..." : "Save AI Settings"}
          </button>
        </form>
      )}

      {/* TAB: EMAIL & TWO-WAY WEBHOOK SETTINGS */}
      {tab === "email" && settings && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-white">Two-Way Email &amp; Inbound Reply Routing</h2>
                <p className="text-xs text-[#b0b0b8]">
                  Replies sent from your email inbox to the unique Reply-To address flow automatically back into the visitor&apos;s live chat.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`px-3 py-1 rounded-full font-bold ${settings.hasEmailApiKey ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                  Outbound: {settings.hasEmailApiKey ? "Ready" : "Key Missing"}
                </span>
                <span className={`px-3 py-1 rounded-full font-bold ${settings.lastWebhookVerifiedAt ? "bg-emerald-500/15 text-emerald-300" : "bg-blue-500/15 text-blue-300"}`}>
                  Webhook: {settings.lastWebhookVerifiedAt ? "Verified Event Received" : settings.hasInboundWebhookSecret ? "Secret Configured" : "Secret Missing"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111114] border border-white/5 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[#71717a] block">Inbound Email Webhook Endpoint URL</span>
                <code className="text-[#93c5fd] font-mono">{webhookUrl}</code>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(webhookUrl);
                  showToast("Webhook URL copied!", "success");
                }}
                className="px-3 py-1.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy URL
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <label className="md:col-span-2 flex items-center gap-2 p-3 rounded-xl bg-[#111114] border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailEnabled}
                  onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                />
                <span className="font-bold text-white">Enable Automatic Escalation Emails &amp; Two-Way Reply Sync</span>
              </label>

              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Email Provider (Outbound + Inbound)</label>
                <select
                  value={settings.emailProvider}
                  onChange={(e) => setSettings({ ...settings, emailProvider: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                >
                  <option value="POSTMARK">Postmark (Recommended Two-Way Inbound)</option>
                  <option value="SENDGRID">SendGrid (Outbound + Inbound Parse)</option>
                  <option value="RESEND">Resend (Outbound + Webhook)</option>
                  <option value="SMTP">SMTP (Outbound Config)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Your Support Inbox Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Sender Name</label>
                <input
                  type="text"
                  value={settings.senderName}
                  onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Verified Sender Email</label>
                <input
                  type="email"
                  value={settings.senderEmail}
                  onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Inbound Reply Routing Domain</label>
                <input
                  type="text"
                  value={settings.replyRoutingDomain}
                  onChange={(e) => setSettings({ ...settings, replyRoutingDomain: e.target.value })}
                  placeholder="reply.onetabmedia.in"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">
                  Provider API Key / Server Token ({settings.emailApiKeyPreview || "Unconfigured"})
                </label>
                <input
                  type="password"
                  value={newEmailApiKey}
                  onChange={(e) => setNewEmailApiKey(e.target.value)}
                  placeholder="Enter Server Token / API Key"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-[#b0b0b8] mb-1">
                  Inbound Webhook Verification Secret ({settings.inboundWebhookSecretPreview || "Unconfigured"})
                </label>
                <input
                  type="password"
                  value={newWebhookSecret}
                  onChange={(e) => setNewWebhookSecret(e.target.value)}
                  placeholder="Secret sent via x-onetab-signature / x-postmark-webhook-token / svix-signature"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" /> {savingSettings ? "Saving..." : "Save Email Settings"}
              </button>
              <button
                type="button"
                onClick={handleTestEmail}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Send Test Email
              </button>
            </div>
            {settings.lastTestEmailAt && (
              <div className="text-[11px] text-[#b0b0b8]">
                Last Test Email: {new Date(settings.lastTestEmailAt).toLocaleString()} ({settings.lastTestEmailStatus})
              </div>
            )}
          </form>

          {/* Webhook Setup Guide + Recent Webhook Logs */}
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 text-xs">
            <h3 className="font-bold text-white text-sm">Recent Inbound Webhook Verification Logs</h3>
            {webhookLogs.length === 0 ? (
              <p className="text-[#71717a]">No inbound webhook calls received yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {webhookLogs.map((w) => (
                  <div key={w.id} className="p-2.5 rounded-xl bg-[#111114] border border-white/5 flex flex-wrap justify-between gap-2">
                    <div>
                      <span className="font-bold text-white">{w.status}</span>
                      <span className="text-[#b0b0b8]"> &bull; {w.provider} ({w.eventType})</span>
                      {w.summary && <span className="text-[#71717a]"> — {w.summary}</span>}
                    </div>
                    <span className="text-[#71717a]">{new Date(w.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
