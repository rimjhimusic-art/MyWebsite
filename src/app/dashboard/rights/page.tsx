"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface RightsState {
  assets: Array<{
    id: string;
    isrc: string | null;
    upc: string | null;
    audioSha256: string | null;
    copyrightOwner: string;
    status: string;
    release: { title: string };
    track: { title: string } | null;
  }>;
  claims: Array<{
    id: string;
    claimType: string;
    status: string;
    details: string;
    resolutionNotes: string | null;
    rightsAsset: { release: { title: string }; isrc: string | null };
  }>;
}

export default function RightsManagementPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<RightsState | null>(null);
  const [assetId, setAssetId] = useState("");
  const [claimType, setClaimType] = useState("COPYRIGHT_CLAIM");
  const [details, setDetails] = useState("");

  const load = async () => {
    const res = await fetch("/api/rights");
    const d = await res.json();
    setData(d);
    if (d.assets?.[0] && !assetId) {
      setAssetId(d.assets[0].id);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/rights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rightsAssetId: assetId, claimType, details }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Failed to submit claim.", "error");
      return;
    }
    showToast("Rights claim logged!", "success");
    setDetails("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" /> Rights Management &amp; Copyright Catalog
        </h1>
        <p className="text-sm text-[#b0b0b8]">
          Asset ownership registry, duplicate SHA-256/ISRC detection, territory blocks, and claims.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={submitClaim}
          className="lg:col-span-4 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3 h-fit"
        >
          <h2 className="font-bold text-base">File Rights / Takedown / Territory Claim</h2>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          >
            {data?.assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.track?.title || a.release.title} ({a.isrc || "No ISRC"})
              </option>
            ))}
          </select>
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          >
            <option value="COPYRIGHT_CLAIM">Copyright Claim</option>
            <option value="TAKEDOWN_REQUEST">Takedown Request</option>
            <option value="TERRITORY_BLOCK">Territory Restriction</option>
            <option value="DUPLICATE_ASSET">Duplicate Asset Report</option>
          </select>
          <textarea
            required
            rows={4}
            placeholder="Describe ownership conflict, infringing URL, or restricted territories*"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
          />
          <button
            type="submit"
            disabled={!assetId}
            className="w-full py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer disabled:opacity-40"
          >
            Submit Rights Action
          </button>
        </form>

        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
            <h2 className="font-bold text-base">Copyright Asset Registry</h2>
            {!data?.assets.length ? (
              <p className="text-sm text-[#71717a]">
                Rights assets are automatically registered when releases are submitted.
              </p>
            ) : (
              data.assets.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl bg-[#111114] border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">
                      {a.track?.title || a.release.title}
                    </div>
                    <div className="text-[#b0b0b8]">
                      Owner: {a.copyrightOwner} &bull; ISRC: {a.isrc || "-"} &bull; UPC:{" "}
                      {a.upc || "-"}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold ${
                      a.status === "DISPUTED"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
            <h2 className="font-bold text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Active Claims &amp; Duplicate Alerts
            </h2>
            {!data?.claims.length ? (
              <p className="text-sm text-[#71717a]">No claims or duplicate flags.</p>
            ) : (
              data.claims.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-[#111114] border border-white/5 text-xs space-y-1"
                >
                  <div className="flex justify-between font-bold">
                    <span>
                      {c.claimType} &mdash; {c.rightsAsset.release.title}
                    </span>
                    <span className="text-[#3b82f6]">{c.status}</span>
                  </div>
                  <p className="text-[#b0b0b8]">{c.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
