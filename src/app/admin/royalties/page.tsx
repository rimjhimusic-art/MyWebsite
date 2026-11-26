"use client";

import React, { useEffect, useState } from "react";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface AdminRoyaltyData {
  batches: Array<{
    id: string;
    periodMonth: string;
    sourcePartner: string;
    fileName: string;
    totalRows: number;
    totalNetRevenue: number;
    createdAt: string;
    importedBy: { name: string };
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    accountSummary: string;
    status: string;
    referenceNumber: string | null;
    user: { name: string; email: string };
  }>;
}

export default function AdminRoyaltiesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<AdminRoyaltyData | null>(null);
  const [releases, setReleases] = useState<Array<{ id: string; title: string }>>([]);
  const [form, setForm] = useState({
    periodMonth: "2026-11",
    sourcePartner: "Authorized DSP Statement CSV",
    releaseId: "",
    storeSlug: "spotify",
    countryName: "India",
    streams: 10000,
    grossRevenue: 45,
    platformFee: 4.5,
  });

  const load = async () => {
    const [royRes, relRes] = await Promise.all([
      fetch("/api/admin/royalties"),
      fetch("/api/admin/releases"),
    ]);
    const roy = await royRes.json();
    const rel = await relRes.json();
    setData(roy);
    const rList = rel.releases || [];
    setReleases(rList);
    if (rList[0] && !form.releaseId) {
      setForm((p) => ({ ...p, releaseId: rList[0].id }));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/royalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodMonth: form.periodMonth,
        sourcePartner: form.sourcePartner,
        fileName: `verified-${form.periodMonth}.csv`,
        rows: [
          {
            releaseId: form.releaseId,
            storeSlug: form.storeSlug,
            countryCode: "IN",
            countryName: form.countryName,
            streams: Number(form.streams),
            grossRevenue: Number(form.grossRevenue),
            platformFee: Number(form.platformFee),
          },
        ],
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Import failed.", "error");
      return;
    }
    showToast("Verified royalty batch imported & statements updated!", "success");
    load();
  };

  const processPayout = async (paymentId: string, status: string) => {
    const ref =
      status === "COMPLETED"
        ? window.prompt("Enter bank/transaction reference ID:", `TXN-${Date.now().toString().slice(-6)}`)
        : undefined;
    const res = await fetch("/api/admin/royalties", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, status, referenceNumber: ref }),
    });
    if (res.ok) {
      showToast(`Payout marked ${status}`, "success");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Admin Royalty Ledger &amp; Payouts</h1>
        <p className="text-sm text-[#b0b0b8]">
          Import verified DSP royalty statements and process creator payout requests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleImport}
          className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3 h-fit"
        >
          <h2 className="font-bold text-base flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#3b82f6]" /> Import Verified Royalty Entry
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="YYYY-MM"
              value={form.periodMonth}
              onChange={(e) => setForm({ ...form, periodMonth: e.target.value })}
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="text"
              required
              value={form.sourcePartner}
              onChange={(e) => setForm({ ...form, sourcePartner: e.target.value })}
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
          </div>
          <select
            value={form.releaseId}
            onChange={(e) => setForm({ ...form, releaseId: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
          >
            {releases.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.storeSlug}
              onChange={(e) => setForm({ ...form, storeSlug: e.target.value })}
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            >
              <option value="spotify">Spotify</option>
              <option value="apple-music">Apple Music</option>
              <option value="jiosaavn">JioSaavn</option>
              <option value="youtube-music">YouTube Music</option>
            </select>
            <input
              type="text"
              value={form.countryName}
              onChange={(e) => setForm({ ...form, countryName: e.target.value })}
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-[#71717a]">Streams</label>
              <input
                type="number"
                value={form.streams}
                onChange={(e) => setForm({ ...form, streams: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#71717a]">Gross ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.grossRevenue}
                onChange={(e) => setForm({ ...form, grossRevenue: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#71717a]">Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.platformFee}
                onChange={(e) => setForm({ ...form, platformFee: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
          >
            Import Verified Royalty Batch
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
            <h2 className="font-bold text-base">Payout Queue</h2>
            {!data?.payments.length ? (
              <p className="text-sm text-[#71717a]">No payout requests.</p>
            ) : (
              data.payments.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-[#111114] border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">
                      {p.user.name} &mdash; ${p.amount.toFixed(2)} ({p.method})
                    </div>
                    <div className="text-[#71717a]">
                      {p.accountSummary} &bull; Status: {p.status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.status !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => processPayout(p.id, "COMPLETED")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                      </button>
                    )}
                    {p.status === "REQUESTED" && (
                      <button
                        type="button"
                        onClick={() => processPayout(p.id, "REJECTED")}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 font-bold cursor-pointer"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-2">
            <h2 className="font-bold text-base">Imported Royalty Batches</h2>
            {data?.batches.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-[#111114] flex justify-between text-xs"
              >
                <span>
                  <strong>{b.periodMonth}</strong> &bull; {b.fileName} ({b.totalRows} rows)
                </span>
                <span className="text-emerald-400 font-bold">
                  ${b.totalNetRevenue.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
