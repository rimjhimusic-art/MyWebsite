"use client";

import React, { useEffect, useState } from "react";
import { UploadCloud, Search, Check, X, Film, FileCode } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export interface MediaLibraryItem {
  id: string;
  url: string;
  title: string;
  altText: string;
  folder: string;
  kind: string;
  mimeType: string;
  sizeBytes: number;
  isStatic: boolean;
}

const FOLDERS = ["ALL", "branding", "artists", "stores", "team", "brand", "videos", "general"];

export function CmsMediaPickerModal({
  open,
  onClose,
  onSelect,
  defaultFolder = "general",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  defaultFolder?: string;
}) {
  const { showToast } = useToast();
  const [assets, setAssets] = useState<MediaLibraryItem[]>([]);
  const [folder, setFolder] = useState("ALL");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const params = new URLSearchParams();
    if (folder !== "ALL") params.set("folder", folder);
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/admin/cms/media?${params.toString()}`);
    if (res.ok) {
      const d = await res.json();
      setAssets(d.assets || []);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, folder]);

  if (!open) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder === "ALL" ? defaultFolder : folder);
      fd.append("title", file.name);
      const res = await fetch("/api/admin/cms/media", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Upload failed.", "error");
        return;
      }
      showToast("Media uploaded to CMS library!", "success");
      await load();
      if (data.asset?.url) {
        onSelect(data.asset.url);
        onClose();
      }
    } finally {
      setUploading(false);
    }
  };

  const filtered = assets.filter((a) =>
    !query.trim()
      ? true
      : a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.url.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[3000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-[#18181b] border border-[#2a2a2a] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#2a2a2a] flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-base text-white">CMS Media Library</h3>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold cursor-pointer">
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? "Uploading..." : "Upload File"}</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.svg,.mp4,.webm,.mov,.ico"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-[#2a2a2a] flex flex-wrap gap-2 items-center justify-between bg-[#121215]">
          <div className="flex flex-wrap gap-1.5">
            {FOLDERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFolder(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer ${
                  folder === f
                    ? "bg-[#3b82f6] text-white"
                    : "bg-[#1e1e24] text-[#b0b0b8] hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search assets..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-xs text-white outline-none"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((asset) => {
            const isVideo = asset.kind === "CMS_VIDEO" || asset.mimeType.startsWith("video/");
            const isSvg = asset.kind === "CMS_SVG";
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  onSelect(asset.url);
                  onClose();
                }}
                className="group rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#3b82f6] overflow-hidden text-left transition-all cursor-pointer"
              >
                <div className="h-28 bg-[#141418] flex items-center justify-center relative overflow-hidden">
                  {isVideo ? (
                    <div className="flex flex-col items-center gap-1 text-blue-400">
                      <Film className="w-7 h-7" />
                      <span className="text-[10px]">Video</span>
                    </div>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.title}
                      className="max-h-full max-w-full object-contain p-1"
                    />
                  )}
                  <span className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-[#3b82f6] text-white rounded-full p-1">
                    <Check className="w-3 h-3" />
                  </span>
                  {isSvg && (
                    <span className="absolute top-1.5 left-1.5 bg-black/70 text-[9px] px-1.5 py-0.5 rounded text-zinc-200 flex items-center gap-0.5">
                      <FileCode className="w-2.5 h-2.5" /> SVG
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <div className="text-[11px] font-semibold text-white truncate">
                    {asset.title}
                  </div>
                  <div className="text-[10px] text-[#71717a] truncate">{asset.folder}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
