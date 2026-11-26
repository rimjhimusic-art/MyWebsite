"use client";

import React, { useEffect, useState } from "react";
import { Plug, ShieldCheck } from "lucide-react";
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

  const load = async () => {
    const res = await fetch("/api/admin/services");
    const d = await res.json();
    setData(d);
  };

  useEffect(() => {
    load();
  }, []);

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
          Third-Party Integrations &amp; Security Audit Logs
        </h1>
        <p className="text-sm text-[#b0b0b8]">
          Provider adapters remain honestly unconfigured until valid API credentials are set in server environment variables.
        </p>
      </div>

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
