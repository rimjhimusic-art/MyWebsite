"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Edit3, ExternalLink, Ban, Trash2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface ReleaseItem {
  id: string;
  title: string;
  releaseType: string;
  primaryArtist: string;
  genre: string;
  upc: string | null;
  status: string;
  smartLinkSlug: string | null;
  rejectionReason: string | null;
  updatedAt: string;
  _count: { tracks: number; stores: number };
}

function ReleasesContent() {
  const params = useSearchParams();
  const initialType = params.get("type") || "";
  const { showToast } = useToast();

  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (typeFilter) qs.set("type", typeFilter);
    if (statusFilter) qs.set("status", statusFilter);
    if (search) qs.set("search", search);
    const res = await fetch(`/api/releases?${qs.toString()}`);
    const data = await res.json();
    setReleases(data.releases || []);
    setLoading(false);
  };

  useEffect(() => {
    setTypeFilter(initialType);
  }, [initialType]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter]);

  const requestTakedown = async (id: string) => {
    const reason = window.prompt("Enter reason for takedown request:");
    if (!reason) return;
    const res = await fetch(`/api/releases/${id}/takedown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to request takedown.", "error");
      return;
    }
    showToast("Takedown request submitted.", "success");
    load();
  };

  const deleteDraft = async (id: string) => {
    const res = await fetch(`/api/releases/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Draft deleted.", "info");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">
            {typeFilter ? `${typeFilter} Releases` : "My Releases"}
          </h1>
          <p className="text-sm text-[#b0b0b8]">
            Manage drafts, submissions, approvals, and live releases.
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-xs"
        >
          <Plus className="w-4 h-4" /> New Release
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search by title, artist, or UPC..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-sm"
        >
          <option value="">All Types</option>
          <option value="SINGLE">Single</option>
          <option value="EP">EP</option>
          <option value="ALBUM">Album</option>
          <option value="COMPILATION">Compilation</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-sm"
        >
          <option value="">All Statuses</option>
          {[
            "DRAFT",
            "SUBMITTED",
            "UNDER_REVIEW",
            "APPROVED",
            "REJECTED",
            "SCHEDULED",
            "PROCESSING",
            "DELIVERED",
            "LIVE",
            "TAKEDOWN_REQUESTED",
            "TAKEN_DOWN",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2.5 rounded-xl bg-[#3b82f6] text-xs font-bold cursor-pointer"
        >
          Filter
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[#71717a]">Loading releases...</div>
      ) : releases.length === 0 ? (
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-10 text-center text-sm text-[#71717a]">
          No releases match your filter. Click &ldquo;New Release&rdquo; to distribute a track.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-[#18181b] border border-[#2a2a2a]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#2a2a2a] text-xs uppercase text-[#71717a]">
              <tr>
                <th className="p-4">Release</th>
                <th className="p-4">Type</th>
                <th className="p-4">Tracks / DSPs</th>
                <th className="p-4">UPC</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {releases.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="font-bold text-white">{r.title}</div>
                    <div className="text-xs text-[#b0b0b8]">{r.primaryArtist} &bull; {r.genre}</div>
                    {r.rejectionReason && (
                      <div className="text-[11px] text-red-400 mt-1">
                        Rejection: {r.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-xs text-[#b0b0b8]">{r.releaseType}</td>
                  <td className="p-4 text-xs text-[#b0b0b8]">
                    {r._count.tracks} track(s) &bull; {r._count.stores} store(s)
                  </td>
                  <td className="p-4 text-xs font-mono text-[#71717a]">{r.upc || "-"}</td>
                  <td className="p-4">
                    <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-[#3b82f6] border border-blue-500/25">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    {["DRAFT", "REJECTED"].includes(r.status) && (
                      <Link
                        href={`/dashboard/upload/${r.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3b82f6] text-xs font-semibold"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </Link>
                    )}
                    {r.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => deleteDraft(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {r.smartLinkSlug && (
                      <Link
                        href={`/release/${r.smartLinkSlug}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Smart Link
                      </Link>
                    )}
                    {["LIVE", "DELIVERED", "APPROVED"].includes(r.status) && (
                      <button
                        type="button"
                        onClick={() => requestTakedown(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 text-xs cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" /> Takedown
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ReleasesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#71717a]">Loading...</div>}>
      <ReleasesContent />
    </Suspense>
  );
}
