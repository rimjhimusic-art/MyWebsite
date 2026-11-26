"use client";

import React, { useEffect, useState } from "react";
import { BadgeDollarSign, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface SplitDraft {
  beneficiaryName: string;
  beneficiaryEmail: string;
  beneficiaryRole: "LABEL" | "ARTIST" | "PRODUCER" | "CONTRIBUTOR";
  percentage: number;
}

interface RoyaltyResponse {
  totals: { totalStreams: number; grossRevenue: number; netRevenue: number };
  releases: Array<{ id: string; title: string; primaryArtist: string }>;
  entries: Array<{
    id: string;
    periodMonth: string;
    countryName: string;
    streams: number;
    grossRevenue: number;
    netRevenue: number;
    release: { title: string } | null;
    track: { title: string; isrc: string | null } | null;
    store: { name: string } | null;
  }>;
  splits: Array<{
    id: string;
    releaseId: string;
    beneficiaryName: string;
    beneficiaryEmail: string | null;
    beneficiaryRole: "LABEL" | "ARTIST" | "PRODUCER" | "CONTRIBUTOR";
    percentage: number;
  }>;
  breakdowns: {
    byPlatform: Array<{ name: string; streams: number; revenue: number }>;
    byCountry: Array<{ name: string; streams: number; revenue: number }>;
    byRelease: Array<{ title: string; streams: number; revenue: number }>;
  };
}

export default function RoyaltiesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<RoyaltyResponse | null>(null);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [splitRows, setSplitRows] = useState<SplitDraft[]>([
    { beneficiaryName: "Primary Artist", beneficiaryEmail: "", beneficiaryRole: "ARTIST", percentage: 80 },
    { beneficiaryName: "Record Label", beneficiaryEmail: "", beneficiaryRole: "LABEL", percentage: 20 },
  ]);

  const load = async () => {
    const res = await fetch("/api/royalties");
    const d: RoyaltyResponse = await res.json();
    setData(d);
    if (d.releases?.[0] && !selectedReleaseId) {
      const firstId = d.releases[0].id;
      setSelectedReleaseId(firstId);
      const existing = d.splits.filter((s) => s.releaseId === firstId);
      if (existing.length > 0) {
        setSplitRows(
          existing.map((s) => ({
            beneficiaryName: s.beneficiaryName,
            beneficiaryEmail: s.beneficiaryEmail || "",
            beneficiaryRole: s.beneficiaryRole,
            percentage: s.percentage,
          }))
        );
      }
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onReleaseChange = (relId: string) => {
    setSelectedReleaseId(relId);
    const existing = data?.splits.filter((s) => s.releaseId === relId) || [];
    if (existing.length > 0) {
      setSplitRows(
        existing.map((s) => ({
          beneficiaryName: s.beneficiaryName,
          beneficiaryEmail: s.beneficiaryEmail || "",
          beneficiaryRole: s.beneficiaryRole,
          percentage: s.percentage,
        }))
      );
    } else {
      setSplitRows([
        { beneficiaryName: "Primary Artist", beneficiaryEmail: "", beneficiaryRole: "ARTIST", percentage: 80 },
        { beneficiaryName: "Record Label", beneficiaryEmail: "", beneficiaryRole: "LABEL", percentage: 20 },
      ]);
    }
  };

  const totalPct = splitRows.reduce((s, r) => s + Number(r.percentage || 0), 0);

  const saveSplits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReleaseId) {
      showToast("Select a release first.", "error");
      return;
    }
    const res = await fetch("/api/royalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId: selectedReleaseId, splits: splitRows }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Failed to save splits.", "error");
      return;
    }
    showToast(d.message, "success");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Royalties &amp; Revenue Splits</h1>
        <p className="text-sm text-[#b0b0b8]">
          Verified earnings from imported DSP statements and 100%-validated split rules.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5">
          <p className="text-xs text-[#71717a]">Verified Streams</p>
          <p className="text-2xl font-extrabold mt-1">
            {(data?.totals.totalStreams ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5">
          <p className="text-xs text-[#71717a]">Gross Royalty Revenue</p>
          <p className="text-2xl font-extrabold mt-1">
            ${(data?.totals.grossRevenue ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5">
          <p className="text-xs text-[#71717a]">Net Distributable Revenue</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">
            ${(data?.totals.netRevenue ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Revenue Split Manager */}
      <form
        onSubmit={saveSplits}
        className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BadgeDollarSign className="w-5 h-5 text-[#3b82f6]" /> Revenue Split Manager
            </h2>
            <p className="text-xs text-[#71717a]">
              Allocate Label, Artist, Producer &amp; Contributor shares. Total must equal 100%.
            </p>
          </div>
          <select
            value={selectedReleaseId}
            onChange={(e) => onReleaseChange(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          >
            {data?.releases.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.primaryArtist})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2.5">
          {splitRows.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-[#111114] p-3 rounded-xl"
            >
              <input
                type="text"
                required
                placeholder="Beneficiary Name"
                value={row.beneficiaryName}
                onChange={(e) =>
                  setSplitRows((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, beneficiaryName: e.target.value } : x
                    )
                  )
                }
                className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={row.beneficiaryEmail}
                onChange={(e) =>
                  setSplitRows((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, beneficiaryEmail: e.target.value } : x
                    )
                  )
                }
                className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs"
              />
              <select
                value={row.beneficiaryRole}
                onChange={(e) =>
                  setSplitRows((prev) =>
                    prev.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            beneficiaryRole: e.target.value as SplitDraft["beneficiaryRole"],
                          }
                        : x
                    )
                  )
                }
                className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs"
              >
                <option value="ARTIST">Artist</option>
                <option value="LABEL">Label</option>
                <option value="PRODUCER">Producer</option>
                <option value="CONTRIBUTOR">Other Contributor</option>
              </select>
              <div className="sm:col-span-2 flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={row.percentage}
                  onChange={(e) =>
                    setSplitRows((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, percentage: Number(e.target.value) } : x
                      )
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs"
                />
                <span className="text-xs text-[#71717a]">%</span>
              </div>
              <div className="sm:col-span-1 text-right">
                {splitRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSplitRows((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 cursor-pointer"
                    aria-label="Remove split row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSplitRows((prev) => [
                  ...prev,
                  {
                    beneficiaryName: "",
                    beneficiaryEmail: "",
                    beneficiaryRole: "PRODUCER",
                    percentage: 0,
                  },
                ])
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Split Party
            </button>
            <span
              className={`text-xs font-bold ${
                Math.abs(totalPct - 100) < 0.01 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              Total Allocation: {totalPct.toFixed(2)}%
            </span>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save 100% Split
          </button>
        </div>
      </form>

      {/* Platform & Country Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6">
          <h3 className="font-bold text-base mb-4">Platform-wise Earnings</h3>
          <div className="space-y-2.5 text-sm">
            {data?.breakdowns.byPlatform.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between p-3 rounded-xl bg-[#111114]"
              >
                <span>{p.name}</span>
                <span className="font-bold text-emerald-400">
                  ${p.revenue.toFixed(2)} ({p.streams.toLocaleString()} streams)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6">
          <h3 className="font-bold text-base mb-4">Country-wise Earnings</h3>
          <div className="space-y-2.5 text-sm">
            {data?.breakdowns.byCountry.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between p-3 rounded-xl bg-[#111114]"
              >
                <span>{c.name}</span>
                <span className="font-bold text-[#3b82f6]">
                  ${c.revenue.toFixed(2)} ({c.streams.toLocaleString()} streams)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
