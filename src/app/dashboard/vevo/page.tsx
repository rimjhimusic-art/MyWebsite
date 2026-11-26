"use client";

import React, { useEffect, useState } from "react";
import { Video, ShieldAlert, UploadCloud } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface VevoState {
  partnerStatus: { configured: boolean; reason: string };
  submissions: Array<{
    id: string;
    videoTitle: string;
    genre: string;
    vevoChannelName: string | null;
    status: string;
    rejectionReason: string | null;
    artist: { stageName: string };
    createdAt: string;
  }>;
}

export default function VevoDistributionPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<VevoState | null>(null);
  const [artists, setArtists] = useState<Array<{ id: string; stageName: string }>>([]);
  const [videoAssetId, setVideoAssetId] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [form, setForm] = useState({
    artistId: "",
    videoTitle: "",
    director: "",
    genre: "Pop",
    language: "English",
    vevoChannelName: "",
    videoDescription: "",
    explicitContent: false,
  });

  const load = async () => {
    const [vRes, aRes] = await Promise.all([fetch("/api/vevo"), fetch("/api/artists")]);
    const vData = await vRes.json();
    const aData = await aRes.json();
    setData(vData);
    const aList = aData.artists || [];
    setArtists(aList);
    if (aList[0] && !form.artistId) {
      setForm((p) => ({ ...p, artistId: aList[0].id }));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadVideoFile = async (file: File) => {
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("kind", "VIDEO");
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || "Video upload failed.", "error");
        return;
      }
      setVideoAssetId(d.asset.id);
      showToast("Music video uploaded!", "success");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/vevo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, videoAssetId }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "VEVO submission failed.", "error");
      return;
    }
    showToast(d.message, "success");
    setForm((p) => ({ ...p, videoTitle: "", director: "", videoDescription: "" }));
    setVideoAssetId(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Video className="w-6 h-6 text-[#E3001B]" /> VEVO Music Video Distribution
        </h1>
        <p className="text-sm text-[#b0b0b8]">
          Submit official music videos, director credits, and VEVO channel requests.
        </p>
      </div>

      {data?.partnerStatus && !data.partnerStatus.configured && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Partner Delivery Pending Credentials:</strong>{" "}
            {data.partnerStatus.reason} Videos enter internal QC review and wait for authorized VEVO/Vydia delivery activation.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3 h-fit"
        >
          <h2 className="font-bold text-base">Submit Music Video</h2>
          <select
            required
            value={form.artistId}
            onChange={(e) => setForm({ ...form, artistId: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.stageName}
              </option>
            ))}
          </select>
          <input
            type="text"
            required
            placeholder="Video Title*"
            value={form.videoTitle}
            onChange={(e) => setForm({ ...form, videoTitle: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="text"
            placeholder="Requested VEVO Channel (e.g. ArtistVEVO)"
            value={form.vevoChannelName}
            onChange={(e) => setForm({ ...form, vevoChannelName: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Genre*"
              value={form.genre}
              onChange={(e) => setForm({ ...form, genre: e.target.value })}
              className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <input
              type="text"
              placeholder="Director"
              value={form.director}
              onChange={(e) => setForm({ ...form, director: e.target.value })}
              className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>
          <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-[#2a2a2a] hover:border-[#E3001B] text-xs cursor-pointer">
            <UploadCloud className="w-4 h-4 text-[#E3001B]" />
            <span>
              {uploadingVideo
                ? "Uploading video..."
                : videoAssetId
                ? "Video asset attached!"
                : "Upload MP4 / MOV / WebM Video (optional)"}
            </span>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadVideoFile(f);
              }}
            />
          </label>
          <textarea
            rows={3}
            placeholder="Video description / credits..."
            value={form.videoDescription}
            onChange={(e) => setForm({ ...form, videoDescription: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-full bg-[#E3001B] hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
          >
            Submit for VEVO Review
          </button>
        </form>

        <div className="lg:col-span-7 space-y-3">
          {data?.submissions.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-bold text-white">{s.videoTitle}</h3>
                <p className="text-xs text-[#b0b0b8]">
                  {s.artist.stageName} &bull; {s.genre} &bull; Channel:{" "}
                  {s.vevoChannelName || "Pending"}
                </p>
                {s.rejectionReason && (
                  <p className="text-xs text-red-400 mt-1">Note: {s.rejectionReason}</p>
                )}
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/25">
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
