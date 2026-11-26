"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, FileWarning } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface AdminRelease {
  id: string;
  title: string;
  releaseType: string;
  primaryArtist: string;
  genre: string;
  language: string;
  upc: string | null;
  status: string;
  rejectionReason: string | null;
  correctionNotes: string | null;
  internalNotes: string | null;
  owner: { name: string; email: string };
  artworkAsset: { id: string; width: number | null; height: number | null } | null;
  tracks: Array<{
    id: string;
    trackNumber: number;
    title: string;
    isrc: string | null;
    audioAsset: { id: string; originalName: string } | null;
  }>;
  activities: Array<{
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    actor: { name: string };
  }>;
}

const ALL_STATUSES = [
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
];

export default function AdminReleasesPage() {
  const { showToast } = useToast();
  const [releases, setReleases] = useState<AdminRelease[]>([]);
  const [selected, setSelected] = useState<AdminRelease | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/releases");
    const d = await res.json();
    const list: AdminRelease[] = d.releases || [];
    setReleases(list);
    if (selected) {
      const updated = list.find((r) => r.id === selected.id) || null;
      setSelected(updated);
    } else if (list[0]) {
      setSelected(list[0]);
      setNotes(list[0].internalNotes || "");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (status: string) => {
    if (!selected) return;
    if (status === "REJECTED" && !reason.trim()) {
      showToast("Please enter a rejection reason.", "error");
      return;
    }

    const res = await fetch("/api/admin/releases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        releaseId: selected.id,
        status,
        rejectionReason: status === "REJECTED" ? reason : undefined,
        correctionNotes: status === "DRAFT" ? reason : undefined,
        internalNotes: notes || undefined,
        scheduledAt: status === "SCHEDULED" && scheduleDate ? scheduleDate : undefined,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Failed to update release.", "error");
      return;
    }
    showToast(d.partnerMessage || `Release status updated to ${status}`, "success");
    setReason("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Submissions &amp; Catalog Review</h1>
        <p className="text-sm text-[#b0b0b8]">
          Inspect artwork, listen to audio masters, approve, reject, request corrections, or schedule releases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
          {releases.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setSelected(r);
                setNotes(r.internalNotes || "");
              }}
              className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                selected?.id === r.id
                  ? "bg-blue-500/10 border-[#3b82f6]"
                  : "bg-[#18181b] border-[#2a2a2a] hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-sm text-white truncate">{r.title}</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#3b82f6] shrink-0">
                  {r.status}
                </span>
              </div>
              <div className="text-xs text-[#b0b0b8] mt-1">
                {r.primaryArtist} &bull; {r.releaseType} &bull; {r.tracks.length} track(s)
              </div>
              <div className="text-[11px] text-[#71717a] mt-0.5">
                Submitted by {r.owner.name} ({r.owner.email})
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-7">
          {!selected ? (
            <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-10 text-center text-sm text-[#71717a]">
              Select a release to inspect.
            </div>
          ) : (
            <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-6">
              <div className="flex flex-wrap items-start gap-4">
                {selected.artworkAsset ? (
                  <img
                    src={`/api/files/${selected.artworkAsset.id}`}
                    alt={selected.title}
                    className="w-28 h-28 rounded-xl object-cover border border-[#2a2a2a]"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-xl bg-[#111114] border border-[#2a2a2a] flex items-center justify-center text-xs text-[#71717a]">
                    No Artwork
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold">{selected.title}</h2>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-[#3b82f6]">
                      {selected.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#b0b0b8] mt-1">
                    {selected.primaryArtist} &bull; {selected.genre} &bull; {selected.language}
                  </p>
                  <p className="text-xs font-mono text-[#71717a] mt-1">
                    UPC: {selected.upc || "Not assigned"}
                  </p>
                </div>
              </div>

              {/* Audio Inspection */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717a]">
                  Tracks &amp; Audio QC
                </h3>
                {selected.tracks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#111114] border border-white/5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">
                        {t.trackNumber}. {t.title}
                      </div>
                      <div className="text-[11px] font-mono text-[#71717a]">
                        ISRC: {t.isrc || "Pending"}
                      </div>
                    </div>
                    {t.audioAsset ? (
                      <audio controls src={`/api/files/${t.audioAsset.id}`} className="h-8 w-52" />
                    ) : (
                      <span className="text-xs text-red-400">Missing Audio</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Review Controls */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <textarea
                  rows={2}
                  placeholder="Internal QC notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
                />
                <input
                  type="text"
                  placeholder="Rejection reason or correction request notes..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus("APPROVED")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus("REJECTED")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 text-red-300 font-bold text-xs cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus("DRAFT")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs cursor-pointer"
                  >
                    <FileWarning className="w-3.5 h-3.5" /> Request Corrections
                  </button>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => updateStatus("SCHEDULED")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3b82f6] text-white font-bold text-xs cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" /> Schedule
                  </button>
                  <select
                    value={selected.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    className="ml-auto px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        Set: {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Activity History */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717a]">
                  Activity History
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {selected.activities.map((a) => (
                    <div
                      key={a.id}
                      className="text-[11px] text-[#b0b0b8] flex justify-between gap-2"
                    >
                      <span>
                        <strong className="text-white">{a.action}</strong> &mdash; {a.details} ({a.actor.name})
                      </span>
                      <span className="text-[#71717a] shrink-0">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
