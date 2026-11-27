"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Disc3,
  ExternalLink,
  Flame,
  Image as ImageIcon,
  Music2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  Trash2,
  Tv,
  Wand2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { CmsConfirmModal } from "@/components/admin/CmsConfirmModal";
import { CmsMediaPickerModal } from "@/components/admin/CmsMediaPickerModal";
import type {
  PublicUpdateRelease,
  PublicUpdateSpotifyTrack,
  PublicUpdateYoutubeVideo,
} from "@/lib/updates";

interface UpdatesAdminPayload {
  releases: PublicUpdateRelease[];
  spotifyMusic: PublicUpdateSpotifyTrack[];
  trendingSpotify: PublicUpdateSpotifyTrack[];
  youtubeVideos: PublicUpdateYoutubeVideo[];
  badgeSettings: {
    showNewUpdatesBadge: boolean;
    newUpdatesBadgeText: string;
    newUpdatesBadgePulse: boolean;
  };
}

type AdminUpdatesTab =
  | "releases"
  | "spotify"
  | "trending"
  | "videos"
  | "featured"
  | "badge";

export default function AdminUpdatesManagementPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<AdminUpdatesTab>("releases");
  const [data, setData] = useState<UpdatesAdminPayload | null>(null);
  const [busy, setBusy] = useState(false);

  const [mediaPicker, setMediaPicker] = useState<{
    open: boolean;
    callback: ((url: string) => void) | null;
  }>({ open: false, callback: null });

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    type: string;
    id: string;
    label: string;
  }>({ open: false, type: "", id: "", label: "" });

  // Latest Release Form
  const [editingReleaseId, setEditingReleaseId] = useState<string | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    title: "",
    artistName: "",
    releaseType: "SINGLE",
    releaseDate: "",
    coverUrl: "/ref/abir.jpg",
    description: "",
    spotifyUrl: "",
    appleMusicUrl: "",
    youtubeMusicUrl: "",
    featured: false,
    trending: false,
    published: true,
    scheduledAt: "",
  });

  // Spotify / Trending Form
  const [editingSpotifyId, setEditingSpotifyId] = useState<string | null>(null);
  const [spotifyForm, setSpotifyForm] = useState({
    spotifyUrl: "",
    section: "SPOTIFY" as "SPOTIFY" | "TRENDING",
    title: "",
    artistName: "",
    coverUrl: "",
    metricLabel: "",
    featured: false,
    published: true,
    scheduledAt: "",
  });

  // YouTube Video Form
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [videoForm, setVideoForm] = useState({
    youtubeUrl: "",
    title: "",
    channelName: "",
    description: "",
    thumbnailUrl: "",
    featured: false,
    published: true,
    scheduledAt: "",
  });

  // Badge Settings Form
  const [badgeForm, setBadgeForm] = useState({
    showNewUpdatesBadge: true,
    newUpdatesBadgeText: "NEW",
    newUpdatesBadgePulse: true,
  });

  const loadData = async () => {
    const res = await fetch("/api/admin/updates");
    if (res.ok) {
      const json = (await res.json()) as UpdatesAdminPayload;
      setData(json);
      setBadgeForm(json.badgeSettings);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchMetadata = async (platform: "spotify" | "youtube", url: string) => {
    if (!url.trim()) {
      showToast(`Paste a ${platform} URL first.`, "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/updates/fetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Could not fetch metadata from URL.", "error");
        return;
      }
      if (platform === "spotify" && json.metadata) {
        setSpotifyForm((prev) => ({
          ...prev,
          spotifyUrl: json.metadata.canonicalUrl || prev.spotifyUrl,
          title: json.metadata.title || prev.title,
          artistName: json.metadata.artistName || prev.artistName,
          coverUrl: json.metadata.coverUrl || prev.coverUrl,
        }));
        showToast("Spotify metadata fetched cleanly!", "success");
      } else if (platform === "youtube" && json.metadata) {
        setVideoForm((prev) => ({
          ...prev,
          youtubeUrl: json.metadata.canonicalUrl || prev.youtubeUrl,
          title: json.metadata.title || prev.title,
          channelName: json.metadata.channelName || prev.channelName,
          description: json.metadata.description || prev.description,
          thumbnailUrl: json.metadata.thumbnailUrl || prev.thumbnailUrl,
        }));
        showToast("YouTube metadata fetched cleanly!", "success");
      }
    } finally {
      setBusy(false);
    }
  };

  const apiMutate = async (method: "POST" | "PATCH" | "DELETE", body?: unknown, query?: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/updates${query || ""}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Operation failed.", "error");
        return false;
      }
      await loadData();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const reorder = async (type: "release" | "spotify" | "youtube", ids: string[], idx: number, dir: -1 | 1) => {
    const next = [...ids];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    const ok = await apiMutate("PATCH", { action: "reorder", type, ids: next });
    if (ok) showToast("Order updated.", "success");
  };

  if (!data) {
    return <div className="p-8 text-sm text-[#b0b0b8]">Loading New Updates Management...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#18181b] via-[#172554]/40 to-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#60a5fa]" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              New Updates Management
            </h1>
          </div>
          <p className="text-xs text-[#b0b0b8] mt-1">
            Manage Latest Releases, Spotify Music embeds, Trending Songs, YouTube Music Videos, Featured Highlights, and the Animated NEW Navigation Badge.
          </p>
        </div>

        <Link
          href="/updates"
          target="_blank"
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white inline-flex items-center gap-1.5"
        >
          <span>View Live /updates Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Subsections Nav */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "releases", label: `Latest Releases (${data.releases.length})`, icon: Disc3 },
            { key: "spotify", label: `Spotify Music (${data.spotifyMusic.length})`, icon: Music2 },
            { key: "trending", label: `Trending Songs (${data.trendingSpotify.length})`, icon: Flame },
            { key: "videos", label: `YouTube Videos (${data.youtubeVideos.length})`, icon: Tv },
            { key: "featured", label: "Featured Updates", icon: Star },
            { key: "badge", label: "New Badge Settings", icon: Sparkles },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                if (t.key === "spotify") setSpotifyForm((p) => ({ ...p, section: "SPOTIFY" }));
                if (t.key === "trending") setSpotifyForm((p) => ({ ...p, section: "TRENDING" }));
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
                active
                  ? "bg-[#3b82f6] text-white"
                  : "bg-[#18181b] border border-[#2a2a2a] text-[#b0b0b8] hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. LATEST RELEASES */}
      {tab === "releases" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
            <h2 className="font-bold text-sm text-white">
              {editingReleaseId ? "Edit Release" : "Add Latest Release"}
            </h2>
            <input
              type="text"
              placeholder="Track / Album Title*"
              value={releaseForm.title}
              onChange={(e) => setReleaseForm({ ...releaseForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Artist Name*"
                value={releaseForm.artistName}
                onChange={(e) => setReleaseForm({ ...releaseForm, artistName: e.target.value })}
                className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <select
                value={releaseForm.releaseType}
                onChange={(e) => setReleaseForm({ ...releaseForm, releaseType: e.target.value })}
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              >
                <option value="SINGLE">Single</option>
                <option value="EP">EP</option>
                <option value="ALBUM">Album</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="date"
                value={releaseForm.releaseDate}
                onChange={(e) => setReleaseForm({ ...releaseForm, releaseDate: e.target.value })}
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <input
                type="datetime-local"
                title="Optional Schedule Publish Time"
                value={releaseForm.scheduledAt}
                onChange={(e) => setReleaseForm({ ...releaseForm, scheduledAt: e.target.value })}
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Cover Artwork URL*"
                value={releaseForm.coverUrl}
                onChange={(e) => setReleaseForm({ ...releaseForm, coverUrl: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  setMediaPicker({
                    open: true,
                    callback: (u) => setReleaseForm((p) => ({ ...p, coverUrl: u })),
                  })
                }
                className="px-3 rounded-xl bg-white/10 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Pick
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="Release description / notes"
              value={releaseForm.description}
              onChange={(e) => setReleaseForm({ ...releaseForm, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
            />
            <input
              type="url"
              placeholder="Spotify URL (optional)"
              value={releaseForm.spotifyUrl}
              onChange={(e) => setReleaseForm({ ...releaseForm, spotifyUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="url"
                placeholder="Apple Music URL"
                value={releaseForm.appleMusicUrl}
                onChange={(e) => setReleaseForm({ ...releaseForm, appleMusicUrl: e.target.value })}
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <input
                type="url"
                placeholder="YouTube Music URL"
                value={releaseForm.youtubeMusicUrl}
                onChange={(e) => setReleaseForm({ ...releaseForm, youtubeMusicUrl: e.target.value })}
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-4 text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseForm.featured}
                  onChange={(e) => setReleaseForm({ ...releaseForm, featured: e.target.checked })}
                />
                Featured
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseForm.trending}
                  onChange={(e) => setReleaseForm({ ...releaseForm, trending: e.target.checked })}
                />
                Trending Badge
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseForm.published}
                  onChange={(e) => setReleaseForm({ ...releaseForm, published: e.target.checked })}
                />
                Published
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await apiMutate(
                    editingReleaseId ? "PATCH" : "POST",
                    {
                      type: "release",
                      ...(editingReleaseId ? { id: editingReleaseId } : {}),
                      ...releaseForm,
                    }
                  );
                  if (ok) {
                    showToast(
                      editingReleaseId ? "Release updated!" : "Release published!",
                      "success"
                    );
                    setEditingReleaseId(null);
                    setReleaseForm({
                      title: "",
                      artistName: "",
                      releaseType: "SINGLE",
                      releaseDate: "",
                      coverUrl: "/ref/abir.jpg",
                      description: "",
                      spotifyUrl: "",
                      appleMusicUrl: "",
                      youtubeMusicUrl: "",
                      featured: false,
                      trending: false,
                      published: true,
                      scheduledAt: "",
                    });
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {editingReleaseId ? "Update Release" : "Add Release"}
              </button>
              {editingReleaseId && (
                <button
                  type="button"
                  onClick={() => setEditingReleaseId(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {data.releases.map((rel, idx) => (
              <div
                key={rel.id}
                className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex items-center gap-4"
              >
                <img
                  src={rel.coverUrl}
                  alt={rel.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">{rel.title}</span>
                    {rel.featured && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                        Featured
                      </span>
                    )}
                    {!rel.published && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                        Unpublished
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#60a5fa]">{rel.artistName}</div>
                  <div className="text-[11px] text-[#71717a]">
                    {rel.releaseType} {rel.releaseDate ? `• ${rel.releaseDate}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      reorder(
                        "release",
                        data.releases.map((r) => r.id),
                        idx,
                        -1
                      )
                    }
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      reorder(
                        "release",
                        data.releases.map((r) => r.id),
                        idx,
                        1
                      )
                    }
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReleaseId(rel.id);
                      setReleaseForm({
                        title: rel.title,
                        artistName: rel.artistName,
                        releaseType: rel.releaseType,
                        releaseDate: rel.releaseDate || "",
                        coverUrl: rel.coverUrl,
                        description: rel.description || "",
                        spotifyUrl: rel.spotifyUrl || "",
                        appleMusicUrl: rel.appleMusicUrl || "",
                        youtubeMusicUrl: rel.youtubeMusicUrl || "",
                        featured: rel.featured,
                        trending: rel.trending,
                        published: rel.published,
                        scheduledAt: rel.scheduledAt ? rel.scheduledAt.slice(0, 16) : "",
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDelete({
                        open: true,
                        type: "release",
                        id: rel.id,
                        label: rel.title,
                      })
                    }
                    className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2 & 3. SPOTIFY MUSIC / TRENDING SONGS */}
      {(tab === "spotify" || tab === "trending") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
            <h2 className="font-bold text-sm text-white">
              {tab === "trending"
                ? editingSpotifyId
                  ? "Edit Trending Track"
                  : "Add Trending Song (Spotify URL)"
                : editingSpotifyId
                ? "Edit Spotify Item"
                : "Add Spotify Track / Album / Artist"}
            </h2>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste open.spotify.com/track/... URL*"
                value={spotifyForm.spotifyUrl}
                onChange={(e) => setSpotifyForm({ ...spotifyForm, spotifyUrl: e.target.value })}
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fetchMetadata("spotify", spotifyForm.spotifyUrl)}
                className="px-3 py-2 rounded-xl bg-[#1DB954] hover:bg-[#1aa34a] text-black font-bold text-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Wand2 className="w-3.5 h-3.5" /> Fetch
              </button>
            </div>

            <input
              type="text"
              placeholder="Track / Album / Artist Title"
              value={spotifyForm.title}
              onChange={(e) => setSpotifyForm({ ...spotifyForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <input
              type="text"
              placeholder="Artist Name"
              value={spotifyForm.artistName}
              onChange={(e) => setSpotifyForm({ ...spotifyForm, artistName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Cover Artwork URL (auto-filled on Fetch)"
                value={spotifyForm.coverUrl}
                onChange={(e) => setSpotifyForm({ ...spotifyForm, coverUrl: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  setMediaPicker({
                    open: true,
                    callback: (u) => setSpotifyForm((p) => ({ ...p, coverUrl: u })),
                  })
                }
                className="px-3 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
              >
                Pick
              </button>
            </div>
            {tab === "trending" && (
              <input
                type="text"
                placeholder="Optional Tag / Label (e.g. Top Rotation — leave blank to omit)"
                value={spotifyForm.metricLabel}
                onChange={(e) => setSpotifyForm({ ...spotifyForm, metricLabel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            )}
            <div className="flex gap-4 text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spotifyForm.featured}
                  onChange={(e) => setSpotifyForm({ ...spotifyForm, featured: e.target.checked })}
                />
                Featured
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spotifyForm.published}
                  onChange={(e) => setSpotifyForm({ ...spotifyForm, published: e.target.checked })}
                />
                Published
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await apiMutate(
                    editingSpotifyId ? "PATCH" : "POST",
                    {
                      type: "spotify",
                      ...(editingSpotifyId ? { id: editingSpotifyId } : {}),
                      ...spotifyForm,
                      section: tab === "trending" ? "TRENDING" : "SPOTIFY",
                    }
                  );
                  if (ok) {
                    showToast("Spotify entry saved!", "success");
                    setEditingSpotifyId(null);
                    setSpotifyForm({
                      spotifyUrl: "",
                      section: tab === "trending" ? "TRENDING" : "SPOTIFY",
                      title: "",
                      artistName: "",
                      coverUrl: "",
                      metricLabel: "",
                      featured: false,
                      published: true,
                      scheduledAt: "",
                    });
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
              >
                {editingSpotifyId ? "Update Track" : "Add to Section"}
              </button>
              {editingSpotifyId && (
                <button
                  type="button"
                  onClick={() => setEditingSpotifyId(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {(tab === "trending" ? data.trendingSpotify : data.spotifyMusic).map((sp, idx, arr) => (
              <div
                key={sp.id}
                className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex items-center gap-4"
              >
                {sp.coverUrl ? (
                  <img
                    src={sp.coverUrl}
                    alt={sp.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#1DB954]/20 flex items-center justify-center shrink-0 text-[#1DB954] font-bold">
                    SP
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white truncate">{sp.title}</div>
                  <div className="text-xs text-[#1DB954] truncate">{sp.artistName}</div>
                  <div className="text-[11px] text-[#71717a] truncate">{sp.spotifyUrl}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      reorder(
                        "spotify",
                        arr.map((x) => x.id),
                        idx,
                        -1
                      )
                    }
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      reorder(
                        "spotify",
                        arr.map((x) => x.id),
                        idx,
                        1
                      )
                    }
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSpotifyId(sp.id);
                      setSpotifyForm({
                        spotifyUrl: sp.spotifyUrl,
                        section: sp.section === "TRENDING" ? "TRENDING" : "SPOTIFY",
                        title: sp.title,
                        artistName: sp.artistName,
                        coverUrl: sp.coverUrl || "",
                        metricLabel: sp.metricLabel || "",
                        featured: sp.featured,
                        published: sp.published,
                        scheduledAt: sp.scheduledAt ? sp.scheduledAt.slice(0, 16) : "",
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDelete({
                        open: true,
                        type: "spotify",
                        id: sp.id,
                        label: sp.title,
                      })
                    }
                    className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. YOUTUBE MUSIC VIDEOS */}
      {tab === "videos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
            <h2 className="font-bold text-sm text-white">
              {editingVideoId ? "Edit YouTube Music Video" : "Add Official YouTube Music Video"}
            </h2>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste YouTube URL (youtube.com/watch?v=... or youtu.be/...)*"
                value={videoForm.youtubeUrl}
                onChange={(e) => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fetchMetadata("youtube", videoForm.youtubeUrl)}
                className="px-3 py-2 rounded-xl bg-[#E3001B] hover:bg-[#c20017] text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Wand2 className="w-3.5 h-3.5" /> Fetch
              </button>
            </div>
            <input
              type="text"
              placeholder="Video Title"
              value={videoForm.title}
              onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <input
              type="text"
              placeholder="Channel / Artist Name"
              value={videoForm.channelName}
              onChange={(e) => setVideoForm({ ...videoForm, channelName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Thumbnail URL (auto-fetched or override)"
                value={videoForm.thumbnailUrl}
                onChange={(e) => setVideoForm({ ...videoForm, thumbnailUrl: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  setMediaPicker({
                    open: true,
                    callback: (u) => setVideoForm((p) => ({ ...p, thumbnailUrl: u })),
                  })
                }
                className="px-3 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
              >
                Pick
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="Video Description (optional)"
              value={videoForm.description}
              onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
            />
            <div className="flex gap-4 text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoForm.featured}
                  onChange={(e) => setVideoForm({ ...videoForm, featured: e.target.checked })}
                />
                Featured
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoForm.published}
                  onChange={(e) => setVideoForm({ ...videoForm, published: e.target.checked })}
                />
                Published
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await apiMutate(
                    editingVideoId ? "PATCH" : "POST",
                    {
                      type: "youtube",
                      ...(editingVideoId ? { id: editingVideoId } : {}),
                      ...videoForm,
                    }
                  );
                  if (ok) {
                    showToast("YouTube music video saved!", "success");
                    setEditingVideoId(null);
                    setVideoForm({
                      youtubeUrl: "",
                      title: "",
                      channelName: "",
                      description: "",
                      thumbnailUrl: "",
                      featured: false,
                      published: true,
                      scheduledAt: "",
                    });
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
              >
                {editingVideoId ? "Update Video" : "Publish Music Video"}
              </button>
              {editingVideoId && (
                <button
                  type="button"
                  onClick={() => setEditingVideoId(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {data.youtubeVideos.map((vid, idx) => (
              <div
                key={vid.id}
                className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex items-center gap-4"
              >
                <img
                  src={vid.thumbnailUrl}
                  alt={vid.title}
                  className="w-24 aspect-video rounded-lg object-cover shrink-0 bg-black"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white truncate">{vid.title}</div>
                  <div className="text-xs text-[#f87171] truncate">{vid.channelName || "YouTube"}</div>
                  <div className="text-[11px] text-[#71717a] truncate">{vid.youtubeUrl}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      reorder(
                        "youtube",
                        data.youtubeVideos.map((v) => v.id),
                        idx,
                        -1
                      )
                    }
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      reorder(
                        "youtube",
                        data.youtubeVideos.map((v) => v.id),
                        idx,
                        1
                      )
                    }
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVideoId(vid.id);
                      setVideoForm({
                        youtubeUrl: vid.youtubeUrl,
                        title: vid.title,
                        channelName: vid.channelName || "",
                        description: vid.description || "",
                        thumbnailUrl: vid.thumbnailUrl,
                        featured: vid.featured,
                        published: vid.published,
                        scheduledAt: vid.scheduledAt ? vid.scheduledAt.slice(0, 16) : "",
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDelete({
                        open: true,
                        type: "youtube",
                        id: vid.id,
                        label: vid.title,
                      })
                    }
                    className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FEATURED UPDATES OVERVIEW */}
      {tab === "featured" && (
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-white">Featured Updates Overview</h2>
            <button
              type="button"
              onClick={loadData}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-2">
              <div className="text-xs font-bold uppercase text-[#60a5fa]">Featured Releases</div>
              {data.releases.map((r) => (
                <label key={r.id} className="flex items-center justify-between gap-2 text-xs py-1">
                  <span className="truncate">{r.title}</span>
                  <input
                    type="checkbox"
                    checked={r.featured}
                    onChange={() =>
                      apiMutate("PATCH", { type: "release", id: r.id, featured: !r.featured })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-2">
              <div className="text-xs font-bold uppercase text-[#1DB954]">Featured Spotify</div>
              {[...data.spotifyMusic, ...data.trendingSpotify].map((s) => (
                <label key={s.id} className="flex items-center justify-between gap-2 text-xs py-1">
                  <span className="truncate">{s.title}</span>
                  <input
                    type="checkbox"
                    checked={s.featured}
                    onChange={() =>
                      apiMutate("PATCH", { type: "spotify", id: s.id, featured: !s.featured })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-2">
              <div className="text-xs font-bold uppercase text-[#f87171]">Featured Videos</div>
              {data.youtubeVideos.map((v) => (
                <label key={v.id} className="flex items-center justify-between gap-2 text-xs py-1">
                  <span className="truncate">{v.title}</span>
                  <input
                    type="checkbox"
                    checked={v.featured}
                    onChange={() =>
                      apiMutate("PATCH", { type: "youtube", id: v.id, featured: !v.featured })
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. NEW BADGE SETTINGS */}
      {tab === "badge" && (
        <div className="max-w-xl rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4">
          <h2 className="font-bold text-base text-white">
            Header &amp; Mobile Navigation NEW Badge Settings
          </h2>
          <p className="text-xs text-[#b0b0b8]">
            Controls the glassmorphic badge displayed next to the NEW UPDATES navigation link across desktop and mobile headers.
          </p>

          <div className="p-4 rounded-xl bg-[#0f0f0f] border border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[1px] text-white inline-flex items-center gap-2">
              NEW UPDATES
              {badgeForm.showNewUpdatesBadge && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-[0.08em] uppercase bg-blue-500/25 border border-blue-400/50 text-blue-200 backdrop-blur-md ${
                    badgeForm.newUpdatesBadgePulse ? "goldex-new-badge-pulse" : ""
                  }`}
                >
                  {badgeForm.newUpdatesBadgeText || "NEW"}
                </span>
              )}
            </span>
            <span className="text-[11px] text-[#71717a]">Live Header Preview</span>
          </div>

          <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
            <input
              type="checkbox"
              checked={badgeForm.showNewUpdatesBadge}
              onChange={(e) =>
                setBadgeForm({ ...badgeForm, showNewUpdatesBadge: e.target.checked })
              }
            />
            Show NEW badge next to NEW UPDATES nav item
          </label>

          <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
            <input
              type="checkbox"
              checked={badgeForm.newUpdatesBadgePulse}
              onChange={(e) =>
                setBadgeForm({ ...badgeForm, newUpdatesBadgePulse: e.target.checked })
              }
            />
            Enable subtle pulsing glassmorphic glow animation
          </label>

          <input
            type="text"
            maxLength={20}
            placeholder="Badge Text (default: NEW)"
            value={badgeForm.newUpdatesBadgeText}
            onChange={(e) =>
              setBadgeForm({ ...badgeForm, newUpdatesBadgeText: e.target.value })
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />

          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await apiMutate("PATCH", {
                type: "badge",
                ...badgeForm,
              });
              if (ok) showToast("NEW badge settings updated live!", "success");
            }}
            className="px-5 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save Badge Settings
          </button>
        </div>
      )}

      <CmsConfirmModal
        open={confirmDelete.open}
        title={`Delete "${confirmDelete.label}"?`}
        description="This permanently removes the selected item from New Updates."
        confirmLabel="Delete Item"
        onConfirm={async () => {
          const { type, id, label } = confirmDelete;
          setConfirmDelete({ open: false, type: "", id: "", label: "" });
          const ok = await apiMutate(
            "DELETE",
            undefined,
            `?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
          );
          if (ok) showToast(`Deleted "${label}".`, "success");
        }}
        onCancel={() => setConfirmDelete({ open: false, type: "", id: "", label: "" })}
      />

      <CmsMediaPickerModal
        open={mediaPicker.open}
        defaultFolder="updates"
        onClose={() => setMediaPicker({ open: false, callback: null })}
        onSelect={(url) => {
          if (mediaPicker.callback) mediaPicker.callback(url);
        }}
      />
    </div>
  );
}
