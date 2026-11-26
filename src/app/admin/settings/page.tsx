"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, Mail, Plug, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface SettingsPayload {
  integrations: Array<{
    id: string;
    provider: string;
    displayName: string;
    enabled: boolean;
    mode: string;
    statusMessage: string;
    envStatus: { configured: boolean; mode: string; reason: string };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    actor: { name: string; email: string; role: string } | null;
  }>;
}

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingAccount, setSavingAccount] = useState(false);

  const load = async () => {
    const [svcRes, meRes] = await Promise.all([
      fetch("/api/admin/services"),
      fetch("/api/auth/me"),
    ]);
    if (svcRes.ok) setData(await svcRes.json());
    if (meRes.ok) {
      const me = await meRes.json();
      if (me.user) {
        setAccountForm((prev) => ({
          ...prev,
          name: me.user.name || "",
          email: me.user.email || "",
        }));
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountForm.newPassword && accountForm.newPassword !== accountForm.confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    setSavingAccount(true);
    try {
      const payload: Record<string, string> = {
        name: accountForm.name,
        email: accountForm.email,
        currentPassword: accountForm.currentPassword,
      };
      if (accountForm.newPassword.trim()) {
        payload.newPassword = accountForm.newPassword;
      }
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || "Failed to update account credentials.", "error");
        return;
      }
      showToast("Admin email / password updated securely!", "success");
      setAccountForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      load();
    } finally {
      setSavingAccount(false);
    }
  };

  const toggleIntegration = async (id: string, enabled: boolean) => {
    const res = await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: "integration", id, enabled }),
    });
    if (res.ok) {
      showToast("Integration flag updated.", "success");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">
          Account Security, Integrations &amp; Audit Logs
        </h1>
        <p className="text-sm text-[#b0b0b8]">
          Update your Super Admin email/password with current password verification, manage integrations, and inspect security logs.
        </p>
      </div>

      {/* Super Admin / Admin Email & Password Security Card */}
      <form
        onSubmit={handleAccountSave}
        className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4"
      >
        <div className="flex items-center gap-2 font-bold text-base text-white">
          <KeyRound className="w-4 h-4 text-[#3b82f6]" />
          <span>My Admin Account Security (Email &amp; Password)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Display Name</label>
            <input
              type="text"
              required
              value={accountForm.name}
              onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Login Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#71717a] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">
              Current Password* (Required to change email or password)
            </label>
            <input
              type="password"
              required
              value={accountForm.currentPassword}
              onChange={(e) => setAccountForm({ ...accountForm, currentPassword: e.target.value })}
              placeholder="Verify current password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">New Password (optional)</label>
              <input
                type="password"
                minLength={8}
                value={accountForm.newPassword}
                onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                placeholder="Min 8 chars"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Confirm New Password</label>
              <input
                type="password"
                minLength={8}
                value={accountForm.confirmPassword}
                onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                placeholder="Repeat new password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={savingAccount}
          className="px-5 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {savingAccount ? "Updating Credentials..." : "Update Email / Password"}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.integrations.map((cfg) => (
          <div
            key={cfg.id}
            className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex items-start justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Plug className="w-4 h-4 text-[#3b82f6]" />
                <span>{cfg.displayName}</span>
              </div>
              <p className="text-xs text-[#b0b0b8] mt-1">{cfg.envStatus.reason}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cfg.envStatus.configured
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  Credentials: {cfg.envStatus.mode}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleIntegration(cfg.id, !cfg.enabled)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer shrink-0 ${
                cfg.enabled
                  ? "bg-emerald-500 text-black"
                  : "bg-[#0f0f0f] border border-[#2a2a2a] text-[#b0b0b8]"
              }`}
            >
              {cfg.enabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
        <h2 className="font-bold text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Security Audit Logs
        </h2>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {data?.auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-[#111114] border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-bold text-white">{log.action}</span>
                <span className="text-[#71717a]">
                  {" "}
                  &bull; {log.entityType} {log.entityId ? `(${log.entityId})` : ""}
                </span>
                {log.actor && (
                  <span className="text-[#3b82f6]"> &bull; {log.actor.email}</span>
                )}
              </div>
              <span className="text-[#71717a]">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
