"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";

interface ServicesPayload {
  youtubeRequests: Array<{
    id: string;
    requestType: string;
    status: string;
    notes: string | null;
    owner: { name: string; email: string };
    channel: { channelName: string } | null;
  }>;
  vevoSubmissions: Array<{
    id: string;
    videoTitle: string;
    genre: string;
    status: string;
    artist: { stageName: string };
    owner: { name: string };
  }>;
  rightsClaims: Array<{
    id: string;
    claimType: string;
    status: string;
    details: string;
    rightsAsset: { release: { title: string } };
  }>;
  dspStores: Array<{
    id: string;
    name: string;
    category: string;
    active: boolean;
  }>;
}

export default function AdminServicesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<ServicesPayload | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/services");
    const d = await res.json();
    setData(d);
  };

  useEffect(() => {
    load();
  }, []);

  const patchItem = async (payload: Record<string, unknown>, msg: string) => {
    const res = await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showToast(msg, "success");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">
          YouTube, VEVO, Rights &amp; Store Management
        </h1>
        <p className="text-sm text-[#b0b0b8]">
          Review creator service requests, resolve copyright claims, and toggle supported DSPs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
          <h2 className="font-bold text-base">YouTube &amp; Content ID Requests</h2>
          {!data?.youtubeRequests.length ? (
            <p className="text-xs text-[#71717a]">No YouTube requests queued.</p>
          ) : (
            data.youtubeRequests.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl bg-[#111114] flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-white">
                    {r.requestType} &mdash; {r.owner.name}
                  </div>
                  <div className="text-[#71717a]">{r.notes}</div>
                </div>
                <select
                  value={r.status}
                  onChange={(e) =>
                    patchItem(
                      { module: "youtube", id: r.id, status: e.target.value },
                      "YouTube request updated."
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#2a2a2a]"
                >
                  {["SUBMITTED", "UNDER_REVIEW", "PENDING_PARTNER_AUTH", "APPROVED", "REJECTED", "LIVE"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
          <h2 className="font-bold text-base">VEVO Music Video Queue</h2>
          {!data?.vevoSubmissions.length ? (
            <p className="text-xs text-[#71717a]">No VEVO submissions queued.</p>
          ) : (
            data.vevoSubmissions.map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-xl bg-[#111114] flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{v.videoTitle}</div>
                  <div className="text-[#71717a]">
                    {v.artist.stageName} ({v.genre})
                  </div>
                </div>
                <select
                  value={v.status}
                  onChange={(e) =>
                    patchItem(
                      { module: "vevo", id: v.id, status: e.target.value },
                      "VEVO submission updated."
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#2a2a2a]"
                >
                  {["SUBMITTED", "UNDER_REVIEW", "PENDING_PARTNER_AUTH", "APPROVED", "REJECTED", "LIVE"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
          <h2 className="font-bold text-base">Rights &amp; Duplicate Claims</h2>
          {!data?.rightsClaims.length ? (
            <p className="text-xs text-[#71717a]">No open rights claims.</p>
          ) : (
            data.rightsClaims.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-[#111114] flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-white">
                    {c.claimType} &mdash; {c.rightsAsset.release.title}
                  </div>
                  <div className="text-[#71717a]">{c.details}</div>
                </div>
                <select
                  value={c.status}
                  onChange={(e) =>
                    patchItem(
                      { module: "rights", id: c.id, status: e.target.value },
                      "Rights claim updated."
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#2a2a2a]"
                >
                  {["OPEN", "INVESTIGATING", "RESOLVED", "REJECTED"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
          <h2 className="font-bold text-base">DSP Store Management</h2>
          <div className="grid grid-cols-2 gap-2">
            {data?.dspStores.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() =>
                  patchItem(
                    { module: "store", id: st.id, active: !st.active },
                    `${st.name} ${st.active ? "disabled" : "enabled"}.`
                  )
                }
                className={`p-3 rounded-xl border text-left text-xs flex items-center justify-between cursor-pointer ${
                  st.active
                    ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                    : "bg-[#111114] border-[#2a2a2a] text-[#71717a]"
                }`}
              >
                <span className="font-bold">{st.name}</span>
                <span>{st.active ? "Active" : "Paused"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
