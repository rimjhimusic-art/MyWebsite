"use client";

import React, { useEffect, useState } from "react";
import { Tv, ShieldAlert, Plus } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface YoutubeState {
  integrationStatus: { configured: boolean; mode: string; reason: string };
  channels: Array<{
    id: string;
    channelId: string;
    channelName: string;
    channelUrl: string;
    oacStatus: string;
    monetizationStatus: string;
  }>;
  requests: Array<{
    id: string;
    requestType: string;
    status: string;
    notes: string | null;
    createdAt: string;
    channel: { channelName: string } | null;
  }>;
}

export default function YoutubeServicesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<YoutubeState | null>(null);
  const [channelForm, setChannelForm] = useState({
    channelId: "",
    channelName: "",
    channelUrl: "",
  });
  const [reqForm, setReqForm] = useState({
    requestType: "OAC",
    channelId: "",
    externalClaimId: "",
    notes: "",
  });

  const load = async () => {
    const res = await fetch("/api/youtube");
    const d = await res.json();
    setData(d);
    if (d.channels?.[0] && !reqForm.channelId) {
      setReqForm((p) => ({ ...p, channelId: d.channels[0].id }));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register_channel", ...channelForm }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Failed to register channel.", "error");
      return;
    }
    showToast("YouTube channel registered!", "success");
    setChannelForm({ channelId: "", channelName: "", channelUrl: "" });
    load();
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_request", ...reqForm }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Failed to submit YouTube request.", "error");
      return;
    }
    showToast(d.message, "success");
    setReqForm((p) => ({ ...p, externalClaimId: "", notes: "" }));
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Tv className="w-6 h-6 text-[#E3001B]" /> YouTube &amp; Content ID Services
        </h1>
        <p className="text-sm text-[#b0b0b8]">
          Channel registration, Official Artist Channel (OAC), Content ID, and claim disputes.
        </p>
      </div>

      {data?.integrationStatus && !data.integrationStatus.configured && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Integration Pending Partner Credentials:</strong>{" "}
            {data.integrationStatus.reason} Requests are stored for admin review and queued honestly without simulating live YouTube CMS claims.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={registerChannel}
          className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3"
        >
          <h2 className="font-bold text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#3b82f6]" /> Register YouTube Channel
          </h2>
          <input
            type="text"
            required
            placeholder="Channel ID (e.g. UCxxxx)*"
            value={channelForm.channelId}
            onChange={(e) => setChannelForm({ ...channelForm, channelId: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="text"
            required
            placeholder="Channel Name*"
            value={channelForm.channelName}
            onChange={(e) => setChannelForm({ ...channelForm, channelName: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="url"
            required
            placeholder="https://youtube.com/@channel*"
            value={channelForm.channelUrl}
            onChange={(e) => setChannelForm({ ...channelForm, channelUrl: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
          >
            Register Channel
          </button>
        </form>

        <form
          onSubmit={submitRequest}
          className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3"
        >
          <h2 className="font-bold text-base">Submit OAC / Content ID / Claim Request</h2>
          <select
            value={reqForm.requestType}
            onChange={(e) => setReqForm({ ...reqForm, requestType: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          >
            <option value="OAC">Official Artist Channel (OAC)</option>
            <option value="CONTENT_ID">Content ID Protection</option>
            <option value="MONETIZATION">Channel Monetization Enable</option>
            <option value="CLAIM_DISPUTE">Copyright Claim Dispute</option>
          </select>
          <select
            value={reqForm.channelId}
            onChange={(e) => setReqForm({ ...reqForm, channelId: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          >
            <option value="">Select Registered Channel (optional)</option>
            {data?.channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.channelName} ({c.channelId})
              </option>
            ))}
          </select>
          <textarea
            required
            rows={3}
            placeholder="Provide release ISRC, video URL, or claim details*"
            value={reqForm.notes}
            onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-[#E3001B] text-white text-xs font-bold cursor-pointer"
          >
            Submit Request
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
        <h2 className="font-bold text-base">Registered Channels &amp; Request History</h2>
        {data?.requests.map((r) => (
          <div
            key={r.id}
            className="p-3.5 rounded-xl bg-[#111114] border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div>
              <span className="font-bold text-white">{r.requestType}</span>
              {r.channel && <span className="text-[#b0b0b8]"> &bull; {r.channel.channelName}</span>}
              <p className="text-[#71717a] mt-0.5">{r.notes}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 font-bold">
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
