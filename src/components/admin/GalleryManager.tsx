"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Edit3,
  Eye,
  FileText,
  Film,
  Grid,
  List,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export interface GalleryAssetItem {
  id: string;
  url: string;
  title: string;
  originalName: string;
  altText: string;
  folder: string;
  kind: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  isStatic: boolean;
  createdAt: string;
}

const FOLDERS = [
  "ALL",
  "branding",
  "artists",
  "stores",
  "team",
  "brand",
  "about",
  "updates",
  "upcoming",
  "videos",
  "documents",
  "general",
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "Built-in";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function GalleryManager() {
  const { showToast } = useToast();
  const [assets, setAssets] = useState<GalleryAssetItem[]>([]);
  const [folder, setFolder] = useState("ALL");
  const [kindFilter, setKindFilter] = useState("ALL");
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "size">("newest");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploadFolder, setUploadFolder] = useState("updates");
  const [uploadProgress, setUploadProgress] = useState<
    Array<{ name: string; pct: number; status: "uploading" | "done" | "error" }>
  >([]);

  // Modals
  const [previewAsset, setPreviewAsset] = useState<{
    asset: GalleryAssetItem;
    refs: string[];
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    title: string;
    folder: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    asset: GalleryAssetItem;
    refs: string[];
    loading: boolean;
    replaceWith: string;
  } | null>(null);

  const load = async () => {
    const params = new URLSearchParams();
    if (folder !== "ALL") params.set("folder", folder);
    if (kindFilter !== "ALL") params.set("kind", kindFilter);
    if (sort) params.set("sort", sort);
    if (query.trim()) params.set("q", query.trim());

    const res = await fetch(`/api/admin/cms/media?${params.toString()}`);
    if (res.ok) {
      const d = await res.json();
      setAssets(d.assets || []);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder, kindFilter, sort, query]);

  const uploadSingleWithProgress = (
    file: File,
    opts?: { replaceAssetId?: string }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", uploadFolder);
      fd.append("title", file.name);
      if (opts?.replaceAssetId) fd.append("replaceAssetId", opts.replaceAssetId);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/cms/media", true);

      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setUploadProgress((prev) =>
          prev.map((p) => (p.name === file.name ? { ...p, pct } : p))
        );
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress((prev) =>
            prev.map((p) => (p.name === file.name ? { ...p, pct: 100, status: "done" } : p))
          );
          resolve(true);
        } else {
          let err = "Upload failed";
          try {
            err = JSON.parse(xhr.responseText)?.error || err;
          } catch {
            // keep default
          }
          showToast(`${file.name}: ${err}`, "error");
          setUploadProgress((prev) =>
            prev.map((p) => (p.name === file.name ? { ...p, status: "error" } : p))
          );
          resolve(false);
        }
      };

      xhr.onerror = () => {
        showToast(`${file.name}: Network upload failed.`, "error");
        setUploadProgress((prev) =>
          prev.map((p) => (p.name === file.name ? { ...p, status: "error" } : p))
        );
        resolve(false);
      };

      xhr.send(fd);
    });
  };

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadProgress(
      files.map((f) => ({ name: f.name, pct: 0, status: "uploading" }))
    );

    let okCount = 0;
    for (const f of files) {
      const ok = await uploadSingleWithProgress(f);
      if (ok) okCount += 1;
    }

    if (okCount > 0) {
      showToast(`Uploaded ${okCount} file(s) to Gallery!`, "success");
      await load();
    }
    setTimeout(() => setUploadProgress([]), 1800);
    e.target.value = "";
  };

  const handleReplaceFile = async (assetId: string, file: File) => {
    setUploadProgress([{ name: file.name, pct: 0, status: "uploading" }]);
    const ok = await uploadSingleWithProgress(file, { replaceAssetId: assetId });
    if (ok) {
      showToast("Replaced media asset across the website cleanly!", "success");
      await load();
    }
    setTimeout(() => setUploadProgress([]), 1500);
  };

  const openSafeDelete = async (asset: GalleryAssetItem) => {
    setDeleteModal({ asset, refs: [], loading: true, replaceWith: "" });
    const res = await fetch(
      `/api/admin/cms/media?usage=1&checkUsageUrl=${encodeURIComponent(asset.url)}`
    );
    const json = await res.json();
    setDeleteModal({
      asset,
      refs: Array.isArray(json.references) ? json.references : [],
      loading: false,
      replaceWith: "",
    });
  };

  const executeSafeDelete = async (mode: "normal" | "replace" | "clear") => {
    if (!deleteModal) return;
    const { asset, replaceWith } = deleteModal;
    const params = new URLSearchParams({ id: asset.id });
    if (mode === "replace") {
      if (!replaceWith) {
        showToast("Select a replacement asset first.", "error");
        return;
      }
      params.set("replaceWith", replaceWith);
    } else if (mode === "clear") {
      params.set("clearRefs", "true");
    }

    const res = await fetch(`/api/admin/cms/media?${params.toString()}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || "Delete failed.", "error");
      return;
    }
    showToast(
      json.replacedCount
        ? `Replaced ${json.replacedCount} website reference(s) and deleted media.`
        : "Media asset safely deleted.",
      "success"
    );
    setDeleteModal(null);
    await load();
  };

  const openPreview = async (asset: GalleryAssetItem) => {
    setPreviewAsset({ asset, refs: [] });
    const res = await fetch(
      `/api/admin/cms/media?usage=1&checkUsageUrl=${encodeURIComponent(asset.url)}`
    );
    if (res.ok) {
      const json = await res.json();
      setPreviewAsset({ asset, refs: json.references || [] });
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Upload & Controls Bar */}
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              Central Gallery &amp; Media Library ({assets.length})
            </h2>
            <p className="text-xs text-[#b0b0b8]">
              Upload multiple images, covers, YouTube thumbnails, videos, and documents. Replace, rename, inspect website usage, or safely delete without broken links.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            >
              {FOLDERS.filter((f) => f !== "ALL").map((f) => (
                <option key={f} value={f}>
                  Upload to: {f}
                </option>
              ))}
            </select>
            <label className="px-4 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-blue-600/20">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Multiple Files</span>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.svg,.ico,.mp4,.webm,.mov,.pdf,.csv,.txt,.json"
                onChange={handleMultiUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Upload Progress Bars */}
        {uploadProgress.length > 0 && (
          <div className="space-y-2 p-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]">
            {uploadProgress.map((u) => (
              <div key={u.name} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white truncate">{u.name}</span>
                  <span className="text-[#60a5fa] font-bold">
                    {u.status === "error" ? "Error" : `${u.pct}%`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      u.status === "error" ? "bg-red-500" : "bg-[#3b82f6]"
                    }`}
                    style={{ width: `${u.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter, Search, Sort & Grid/List Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex flex-wrap gap-1.5">
            {FOLDERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFolder(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer ${
                  folder === f
                    ? "bg-[#3b82f6] text-white"
                    : "bg-[#0f0f0f] text-[#b0b0b8] hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search file name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs text-white"
              />
            </div>

            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            >
              <option value="ALL">All Types</option>
              <option value="IMAGE">Images &amp; SVGs</option>
              <option value="CMS_VIDEO">Videos</option>
              <option value="DOCUMENT">Documents</option>
            </select>

            <select
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as "newest" | "oldest" | "name" | "size")
              }
              className="px-3 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="size">Largest Size</option>
            </select>

            <div className="flex rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  viewMode === "grid" ? "bg-[#3b82f6] text-white" : "text-[#9ca3af]"
                }`}
                aria-label="Grid view"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  viewMode === "list" ? "bg-[#3b82f6] text-white" : "text-[#9ca3af]"
                }`}
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {assets.map((a) => {
            const isVideo = a.kind === "CMS_VIDEO" || a.mimeType.startsWith("video/");
            const isDoc = a.kind === "DOCUMENT";
            return (
              <div
                key={a.id}
                data-testid="gallery-asset-card"
                className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] hover:border-white/25 p-3 flex flex-col justify-between gap-2.5 transition-all"
              >
                <button
                  type="button"
                  onClick={() => openPreview(a)}
                  className="h-28 rounded-xl bg-[#0f0f0f] flex items-center justify-center overflow-hidden relative group cursor-pointer"
                >
                  {isVideo ? (
                    <video src={a.url} className="w-full h-full object-cover" muted />
                  ) : isDoc ? (
                    <div className="flex flex-col items-center gap-1 text-amber-400">
                      <FileText className="w-8 h-8" />
                      <span className="text-[10px] font-bold uppercase">Document</span>
                    </div>
                  ) : (
                    <img
                      src={a.url}
                      alt={a.title}
                      className="max-h-full max-w-full object-contain p-1"
                    />
                  )}
                  <span className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3 h-3" />
                  </span>
                </button>

                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{a.title}</div>
                  <div className="text-[10px] text-[#71717a] flex justify-between mt-0.5">
                    <span>{a.folder}</span>
                    <span>{formatBytes(a.sizeBytes)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-white/10 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(a.url);
                      showToast(`Copied URL: ${a.url}`, "success");
                    }}
                    className="p-1 rounded hover:bg-white/10 text-[#60a5fa] cursor-pointer"
                    title="Copy URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {!a.isStatic && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setRenameTarget({ id: a.id, title: a.title, folder: a.folder })
                        }
                        className="p-1 rounded hover:bg-white/10 text-zinc-300 cursor-pointer"
                        title="Rename"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <label
                        className="p-1 rounded hover:bg-white/10 text-emerald-400 cursor-pointer"
                        title="Replace File"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleReplaceFile(a.id, f);
                          }}
                        />
                      </label>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => openSafeDelete(a)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 cursor-pointer"
                    title="Delete Media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#2a2a2a] text-[#9ca3af] uppercase text-[10px]">
              <tr>
                <th className="p-3">Preview</th>
                <th className="p-3">Name &amp; URL</th>
                <th className="p-3">Folder</th>
                <th className="p-3">Type</th>
                <th className="p-3">Size</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {assets.map((a) => {
                const isVideo = a.kind === "CMS_VIDEO" || a.mimeType.startsWith("video/");
                const isDoc = a.kind === "DOCUMENT";
                return (
                  <tr key={a.id} className="hover:bg-white/[0.02]">
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => openPreview(a)}
                        className="w-11 h-11 rounded-lg bg-[#0f0f0f] flex items-center justify-center overflow-hidden cursor-pointer"
                      >
                        {isVideo ? (
                          <Film className="w-4 h-4 text-blue-400" />
                        ) : isDoc ? (
                          <FileText className="w-4 h-4 text-amber-400" />
                        ) : (
                          <img src={a.url} alt={a.title} className="w-full h-full object-cover" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 max-w-[240px]">
                      <div className="font-bold text-white truncate">{a.title}</div>
                      <div className="text-[11px] text-[#71717a] truncate">{a.url}</div>
                    </td>
                    <td className="p-3">{a.folder}</td>
                    <td className="p-3">{a.mimeType}</td>
                    <td className="p-3">{formatBytes(a.sizeBytes)}</td>
                    <td className="p-3">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(a.url);
                            showToast(`Copied: ${a.url}`, "success");
                          }}
                          className="px-2 py-1 rounded bg-blue-500/15 text-blue-400 font-bold cursor-pointer"
                        >
                          Copy
                        </button>
                        {!a.isStatic && (
                          <button
                            type="button"
                            onClick={() =>
                              setRenameTarget({ id: a.id, title: a.title, folder: a.folder })
                            }
                            className="px-2 py-1 rounded bg-white/10 text-white cursor-pointer"
                          >
                            Rename
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openSafeDelete(a)}
                          className="px-2 py-1 rounded bg-red-500/15 text-red-400 font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PREVIEW & FILE DETAILS MODAL */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-[3100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[#18181b] border border-[#2a2a2a] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a2a2a]">
              <h3 className="font-bold text-sm text-white truncate">
                {previewAsset.asset.title}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="p-1.5 rounded-lg bg-white/10 text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="max-h-[320px] rounded-xl bg-black flex items-center justify-center overflow-hidden">
                {previewAsset.asset.kind === "CMS_VIDEO" ? (
                  <video src={previewAsset.asset.url} controls className="max-h-[320px] w-full" />
                ) : previewAsset.asset.kind === "DOCUMENT" ? (
                  <a
                    href={previewAsset.asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-12 px-6 text-amber-400 font-bold text-sm underline"
                  >
                    Open Document ({previewAsset.asset.mimeType})
                  </a>
                ) : (
                  <img
                    src={previewAsset.asset.url}
                    alt={previewAsset.asset.title}
                    className="max-h-[320px] object-contain"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#0f0f0f] p-3.5 rounded-xl border border-[#2a2a2a]">
                <div>
                  <div className="text-[#71717a] text-[10px]">Type</div>
                  <div className="text-white font-semibold truncate">{previewAsset.asset.mimeType}</div>
                </div>
                <div>
                  <div className="text-[#71717a] text-[10px]">Size</div>
                  <div className="text-white font-semibold">{formatBytes(previewAsset.asset.sizeBytes)}</div>
                </div>
                <div>
                  <div className="text-[#71717a] text-[10px]">Dimensions</div>
                  <div className="text-white font-semibold">
                    {previewAsset.asset.width && previewAsset.asset.height
                      ? `${previewAsset.asset.width}x${previewAsset.asset.height}`
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-[#71717a] text-[10px]">Uploaded</div>
                  <div className="text-white font-semibold">
                    {new Date(previewAsset.asset.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="text-xs">
                <div className="font-bold text-[#9ca3af] mb-1">
                  Active Website References ({previewAsset.refs.length})
                </div>
                {previewAsset.refs.length === 0 ? (
                  <p className="text-[#71717a]">Not currently linked to any active CMS section.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {previewAsset.refs.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[11px]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renameTarget && (
        <div
          className="fixed inset-0 z-[3100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setRenameTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base text-white">Rename &amp; Organize Asset</h3>
            <input
              type="text"
              value={renameTarget.title}
              onChange={(e) =>
                setRenameTarget({ ...renameTarget, title: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <select
              value={renameTarget.folder}
              onChange={(e) =>
                setRenameTarget({ ...renameTarget, folder: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            >
              {FOLDERS.filter((f) => f !== "ALL").map((f) => (
                <option key={f} value={f}>
                  Folder: {f}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/admin/cms/media", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(renameTarget),
                  });
                  if (res.ok) {
                    showToast("Media file renamed!", "success");
                    setRenameTarget(null);
                    await load();
                  } else {
                    showToast("Rename failed.", "error");
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFE DELETE & REASSIGN MODAL */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-[3200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteModal(null)}
        >
          <div
            data-testid="safe-delete-modal"
            className="w-full max-w-lg rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-base text-white">
                  Delete &ldquo;{deleteModal.asset.title}&rdquo;?
                </h3>
                <p className="text-xs text-[#b0b0b8] mt-1">
                  {deleteModal.loading
                    ? "Checking where this media is used across the website..."
                    : deleteModal.refs.length > 0
                    ? `This media is actively used by ${deleteModal.refs.length} place(s) on your website.`
                    : "No active website references found. Safe to remove cleanly."}
                </p>
              </div>
            </div>

            {!deleteModal.loading && deleteModal.refs.length > 0 && (
              <div className="space-y-3 rounded-xl bg-[#0f0f0f] border border-amber-500/30 p-3.5">
                <div className="text-[11px] font-bold uppercase text-amber-300">
                  Pages &amp; Sections Using This Asset:
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {deleteModal.refs.map((r) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 rounded bg-white/10 text-[11px] text-zinc-200"
                    >
                      {r}
                    </span>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                    Select Replacement Media Before Deletion (Recommended):
                  </label>
                  <select
                    value={deleteModal.replaceWith}
                    onChange={(e) =>
                      setDeleteModal({ ...deleteModal, replaceWith: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs"
                  >
                    <option value="">-- Choose replacement asset from Gallery --</option>
                    {assets
                      .filter((x) => x.id !== deleteModal.asset.id)
                      .map((x) => (
                        <option key={x.id} value={x.url}>
                          {x.title} ({x.folder})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs cursor-pointer"
              >
                Cancel
              </button>

              {!deleteModal.loading && deleteModal.refs.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => executeSafeDelete("replace")}
                    disabled={!deleteModal.replaceWith}
                    className="px-4 py-2 rounded-xl bg-[#3b82f6] disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                  >
                    Replace References &amp; Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => executeSafeDelete("clear")}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Clear References &amp; Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={deleteModal.loading}
                  onClick={() => executeSafeDelete("normal")}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
