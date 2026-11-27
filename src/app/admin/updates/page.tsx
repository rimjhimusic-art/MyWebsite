"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Disc3,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Image as ImageIcon,
  Layout,
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

interface UpdatesSectionRow {
  id?: string;
  sectionKey: string;
  title?: string | null;
  subtitle?: string | null;
  badgeText?: string | null;
  bodyHtml?: string | null;
  mediaUrl?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  extraJson?: string;
  enabled: boolean;
}

interface UpdatesAdminPayload {
  releases: PublicUpdateRelease[];
  spotifyMusic: PublicUpdateSpotifyTrack[];
  trendingSpotify: PublicUpdateSpotifyTrack[];
  youtubeVideos: PublicUpdateYoutubeVideo[];
  sections?: Record<string, UpdatesSectionRow>;
  badgeSettings: {
    showNewUpdatesBadge: boolean;
    newUpdatesBadgeText: string;
    newUpdatesBadgePulse: boolean;
  };
}

type AdminUpdatesTab =
  | "hero"
  | "releases"
  | "spotify"
  | "trending"
  | "videos"
  | "featured"
  | "badge";

function parseExtra(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default function AdminUpdatesManagementPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<AdminUpdatesTab>("hero");
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

  // Hero CMS state
  const [heroForm, setHeroForm] = useState({
    title: "NEW UPDATES",
    subtitle: "Latest Releases, Curated Spotify Picks & Official Music Videos",
    description:
      "Explore fresh drops, streaming releases, trending highlights, and official visuals across the network.",
    badgeText: "",
    additionalText: "",
    mediaUrl: "",
    bgColor: "rgba(255,255,255,0.04)",
    textColor: "#ef4444",
    glowColor: "#ef4444",
    subtitleColor: "#e2e8f0",
    animationEnabled: true,
    spacing: "normal" as "compact" | "normal" | "spacious",
    showFilterPills: true,
    enabled: true,
  });

  // Section header + Spotify carousel config state
  const [secConfig, setSecConfig] = useState({
    releasesTitle: "LATEST RELEASES",
    releasesSubtitle: "",
    releasesEyebrow: "Catalog Drop",
    releasesEnabled: true,

    spotifyTitle: "SPOTIFY MUSIC",
    spotifySubtitle: "",
    spotifyEyebrow: "Official Streaming",
    spotifyEnabled: true,
    spotifyAutoScroll: true,
    spotifyScrollSpeed: 32,
    spotifyPauseOnHover: true,

    trendingTitle: "TRENDING ON SPOTIFY",
    trendingSubtitle: "",
    trendingEyebrow: "Hot Picks",
    trendingEnabled: true,

    videosTitle: "LATEST MUSIC VIDEOS",
    videosSubtitle: "",
    videosEyebrow: "Official Premieres",
    videosEnabled: true,

    featuredTitle: "FEATURED UPDATES",
    featuredSubtitle: "",
    featuredEyebrow: "Spotlight",
    featuredEnabled: true,
  });

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

  const hydrateSections = (sections?: Record<string, UpdatesSectionRow>) => {
    if (!sections) return;
    const h = sections["hero"];
    if (h) {
      const ext = parseExtra(h.extraJson);
      setHeroForm({
        title: h.title || "NEW UPDATES",
        subtitle: h.subtitle || "",
        description: h.bodyHtml || "",
        badgeText: h.badgeText || "",
        additionalText: typeof ext.additionalText === "string" ? ext.additionalText : "",
        mediaUrl: h.mediaUrl || "",
        bgColor: h.bgColor || "rgba(255,255,255,0.04)",
        textColor: h.textColor || "#ef4444",
        glowColor: typeof ext.glowColor === "string" ? ext.glowColor : "#ef4444",
        subtitleColor: typeof ext.subtitleColor === "string" ? ext.subtitleColor : "#e2e8f0",
        animationEnabled: ext.animationEnabled !== false,
        spacing:
          ext.spacing === "compact" || ext.spacing === "spacious" ? ext.spacing : "normal",
        showFilterPills: ext.showFilterPills !== false,
        enabled: h.enabled !== false,
      });
    }

    const r = sections["releases"];
    const sp = sections["spotify"];
    const tr = sections["trending"];
    const vid = sections["videos"];
    const ft = sections["featured"];
    const spExt = parseExtra(sp?.extraJson);

    setSecConfig({
      releasesTitle: r?.title || "LATEST RELEASES",
      releasesSubtitle: r?.subtitle || "",
      releasesEyebrow: r?.badgeText || "Catalog Drop",
      releasesEnabled: r ? r.enabled !== false : true,

      spotifyTitle: sp?.title || "SPOTIFY MUSIC",
      spotifySubtitle: sp?.subtitle || "",
      spotifyEyebrow: sp?.badgeText || "Official Streaming",
      spotifyEnabled: sp ? sp.enabled !== false : true,
      spotifyAutoScroll: spExt.autoScroll !== false,
      spotifyScrollSpeed: Number(spExt.scrollSpeed || 32),
      spotifyPauseOnHover: spExt.pauseOnHover !== false,

      trendingTitle: tr?.title || "TRENDING ON SPOTIFY",
      trendingSubtitle: tr?.subtitle || "",
      trendingEyebrow: tr?.badgeText || "Hot Picks",
      trendingEnabled: tr ? tr.enabled !== false : true,

      videosTitle: vid?.title || "LATEST MUSIC VIDEOS",
      videosSubtitle: vid?.subtitle || "",
      videosEyebrow: vid?.badgeText || "Official Premieres",
      videosEnabled: vid ? vid.enabled !== false : true,

      featuredTitle: ft?.title || "FEATURED UPDATES",
      featuredSubtitle: ft?.subtitle || "",
      featuredEyebrow: ft?.badgeText || "Spotlight",
      featuredEnabled: ft ? ft.enabled !== false : true,
    });
  };

  const loadData = async () => {
    const res = await fetch("/api/admin/updates");
    if (res.ok) {
      const json = (await res.json()) as UpdatesAdminPayload;
      setData(json);
      setBadgeForm(json.badgeSettings);
      hydrateSections(json.sections);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const saveSectionSettings = async (
    sectionKey: string,
    payload: {
      title?: string;
      subtitle?: string;
      badgeText?: string;
      bodyHtml?: string;
      mediaUrl?: string;
      bgColor?: string;
      textColor?: string;
      enabled?: boolean;
      extra?: Record<string, unknown>;
    }
  ) => {
    const ok = await apiMutate("PATCH", {
      type: "section",
      sectionKey,
      ...payload,
    });
    if (ok) showToast(`Saved ${sectionKey.toUpperCase()} section settings live!`, "success");
  };

  const reorder = async (
    type: "release" | "spotify" | "youtube",
    ids: string[],
    idx: number,
    dir: -1 | 1
  ) => {
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
      <div className="rounded-2xl bg-gradient-to-r from-[#18181b] via-[#3f0d12]/40 to-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#ef4444]" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              New Updates Management
            </h1>
          </div>
          <p className="text-xs text-[#b0b0b8] mt-1">
            Control the red animated NEW UPDATES hero, Spotify auto-scroll carousel, Latest Releases, Trending Songs, YouTube Music Videos, Featured Highlights, and Header NEW Badge.
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
            { key: "hero", label: "Hero Section CMS", icon: Layout },
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

      {/* 0. HERO SECTION CMS */}
      {tab === "hero" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-4">
            <h2 className="font-bold text-base text-white">
              New Updates Hero Section CMS
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                  Hero Heading (Default: NEW UPDATES)
                </label>
                <input
                  type="text"
                  value={heroForm.title}
                  onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                  Optional Tag / Eyebrow (Blank = Clean Heading)
                </label>
                <input
                  type="text"
                  placeholder="Optional small tag above heading"
                  value={heroForm.badgeText}
                  onChange={(e) => setHeroForm({ ...heroForm, badgeText: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                Hero Subtitle
              </label>
              <input
                type="text"
                value={heroForm.subtitle}
                onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                Hero Description
              </label>
              <textarea
                rows={2}
                value={heroForm.description}
                onChange={(e) => setHeroForm({ ...heroForm, description: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                Additional Note / Announcement (Optional)
              </label>
              <input
                type="text"
                placeholder="Optional highlighted line below description"
                value={heroForm.additionalText}
                onChange={(e) => setHeroForm({ ...heroForm, additionalText: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Optional Background Image URL"
                value={heroForm.mediaUrl}
                onChange={(e) => setHeroForm({ ...heroForm, mediaUrl: e.target.value })}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  setMediaPicker({
                    open: true,
                    callback: (u) => setHeroForm((p) => ({ ...p, mediaUrl: u })),
                  })
                }
                className="px-3 rounded-xl bg-white/10 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Pick BG
              </button>
              {heroForm.mediaUrl && (
                <button
                  type="button"
                  onClick={() => setHeroForm({ ...heroForm, mediaUrl: "" })}
                  className="px-3 rounded-xl bg-red-500/15 text-red-400 text-xs cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-[#9ca3af] mb-1">Heading Red Color</label>
                <input
                  type="text"
                  value={heroForm.textColor}
                  onChange={(e) => setHeroForm({ ...heroForm, textColor: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#9ca3af] mb-1">Glow Color</label>
                <input
                  type="text"
                  value={heroForm.glowColor}
                  onChange={(e) => setHeroForm({ ...heroForm, glowColor: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#9ca3af] mb-1">Hero Card BG</label>
                <input
                  type="text"
                  value={heroForm.bgColor}
                  onChange={(e) => setHeroForm({ ...heroForm, bgColor: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#9ca3af] mb-1">Hero Spacing</label>
                <select
                  value={heroForm.spacing}
                  onChange={(e) =>
                    setHeroForm({
                      ...heroForm,
                      spacing: e.target.value as "compact" | "normal" | "spacious",
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="spacious">Spacious</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-5 text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heroForm.enabled}
                  onChange={(e) => setHeroForm({ ...heroForm, enabled: e.target.checked })}
                />
                Visible / Published on /updates
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heroForm.animationEnabled}
                  onChange={(e) =>
                    setHeroForm({ ...heroForm, animationEnabled: e.target.checked })
                  }
                />
                Enable Red Blinking / Glow Animation
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heroForm.showFilterPills}
                  onChange={(e) =>
                    setHeroForm({ ...heroForm, showFilterPills: e.target.checked })
                  }
                />
                Show Quick Filter Pills
              </label>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                saveSectionSettings("hero", {
                  title: heroForm.title,
                  subtitle: heroForm.subtitle,
                  bodyHtml: heroForm.description,
                  badgeText: heroForm.badgeText,
                  mediaUrl: heroForm.mediaUrl,
                  bgColor: heroForm.bgColor,
                  textColor: heroForm.textColor,
                  enabled: heroForm.enabled,
                  extra: {
                    glowColor: heroForm.glowColor,
                    subtitleColor: heroForm.subtitleColor,
                    animationEnabled: heroForm.animationEnabled,
                    spacing: heroForm.spacing,
                    showFilterPills: heroForm.showFilterPills,
                    additionalText: heroForm.additionalText,
                  },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save &amp; Publish Hero CMS
            </button>
          </div>

          {/* Live Hero Preview Card */}
          <div className="lg:col-span-5 rounded-2xl bg-[#050505] border border-white/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="text-[10px] uppercase tracking-widest text-[#71717a] mb-4">
              Live Hero Preview
            </div>
            <div className="relative inline-flex items-center justify-center px-5 py-2 mb-2">
              {heroForm.animationEnabled && (
                <span
                  aria-hidden="true"
                  className="goldex-red-hero-glow pointer-events-none absolute left-1/2 top-1/2 w-[130%] h-[155%] rounded-full blur-2xl"
                  style={{
                    background: `radial-gradient(circle, ${heroForm.glowColor || "#ef4444"}66 0%, ${heroForm.glowColor || "#ef4444"}22 50%, transparent 75%)`,
                  }}
                />
              )}
              <span
                style={{ color: heroForm.textColor || "#ef4444" }}
                className="relative z-10 text-3xl font-black uppercase tracking-wider"
              >
                {heroForm.title || "NEW UPDATES"}
              </span>
            </div>
            <p className="text-xs text-zinc-200 font-medium">{heroForm.subtitle}</p>
            <p className="text-[11px] text-zinc-400 mt-1">{heroForm.description}</p>
          </div>
        </div>
      )}

      {/* 1. LATEST RELEASES */}
      {tab === "releases" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Section Heading
              </label>
              <input
                type="text"
                value={secConfig.releasesTitle}
                onChange={(e) => setSecConfig({ ...secConfig, releasesTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs font-bold"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Section Description
              </label>
              <input
                type="text"
                value={secConfig.releasesSubtitle}
                onChange={(e) => setSecConfig({ ...secConfig, releasesSubtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={secConfig.releasesEnabled}
                onChange={(e) => setSecConfig({ ...secConfig, releasesEnabled: e.target.checked })}
              />
              Enable Section
            </label>
            <button
              type="button"
              onClick={() =>
                saveSectionSettings("releases", {
                  title: secConfig.releasesTitle,
                  subtitle: secConfig.releasesSubtitle,
                  badgeText: secConfig.releasesEyebrow,
                  enabled: secConfig.releasesEnabled,
                })
              }
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold cursor-pointer"
            >
              Save Section Header
            </button>
          </div>

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
                  onChange={(e) =>
                    setReleaseForm({ ...releaseForm, youtubeMusicUrl: e.target.value })
                  }
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
                    onChange={(e) =>
                      setReleaseForm({ ...releaseForm, published: e.target.checked })
                    }
                  />
                  Published
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const ok = await apiMutate(editingReleaseId ? "PATCH" : "POST", {
                      type: "release",
                      ...(editingReleaseId ? { id: editingReleaseId } : {}),
                      ...releaseForm,
                    });
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
                        apiMutate("PATCH", {
                          type: "release",
                          id: rel.id,
                          published: !rel.published,
                        })
                      }
                      className="p-1.5 rounded-lg bg-white/5 text-zinc-300 cursor-pointer"
                      title={rel.published ? "Unpublish" : "Publish"}
                    >
                      {rel.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
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
        </div>
      )}

      {/* 2 & 3. SPOTIFY MUSIC & CAROUSEL / TRENDING SONGS */}
      {(tab === "spotify" || tab === "trending") && (
        <div className="space-y-6">
          {/* Carousel & Section Settings */}
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                  Section Heading
                </label>
                <input
                  type="text"
                  value={tab === "trending" ? secConfig.trendingTitle : secConfig.spotifyTitle}
                  onChange={(e) =>
                    tab === "trending"
                      ? setSecConfig({ ...secConfig, trendingTitle: e.target.value })
                      : setSecConfig({ ...secConfig, spotifyTitle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                  Section Description
                </label>
                <input
                  type="text"
                  value={tab === "trending" ? secConfig.trendingSubtitle : secConfig.spotifySubtitle}
                  onChange={(e) =>
                    tab === "trending"
                      ? setSecConfig({ ...secConfig, trendingSubtitle: e.target.value })
                      : setSecConfig({ ...secConfig, spotifySubtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>
              {tab === "spotify" && (
                <div>
                  <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                    Carousel Scroll Speed (Seconds)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={secConfig.spotifyScrollSpeed}
                    onChange={(e) =>
                      setSecConfig({
                        ...secConfig,
                        spotifyScrollSpeed: Number(e.target.value || 32),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 pt-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      tab === "trending" ? secConfig.trendingEnabled : secConfig.spotifyEnabled
                    }
                    onChange={(e) =>
                      tab === "trending"
                        ? setSecConfig({ ...secConfig, trendingEnabled: e.target.checked })
                        : setSecConfig({ ...secConfig, spotifyEnabled: e.target.checked })
                    }
                  />
                  Visible
                </label>
                {tab === "spotify" && (
                  <>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={secConfig.spotifyAutoScroll}
                        onChange={(e) =>
                          setSecConfig({ ...secConfig, spotifyAutoScroll: e.target.checked })
                        }
                      />
                      Auto-Scroll
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={secConfig.spotifyPauseOnHover}
                        onChange={(e) =>
                          setSecConfig({ ...secConfig, spotifyPauseOnHover: e.target.checked })
                        }
                      />
                      Pause Hover
                    </label>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                tab === "trending"
                  ? saveSectionSettings("trending", {
                      title: secConfig.trendingTitle,
                      subtitle: secConfig.trendingSubtitle,
                      badgeText: secConfig.trendingEyebrow,
                      enabled: secConfig.trendingEnabled,
                    })
                  : saveSectionSettings("spotify", {
                      title: secConfig.spotifyTitle,
                      subtitle: secConfig.spotifySubtitle,
                      badgeText: secConfig.spotifyEyebrow,
                      enabled: secConfig.spotifyEnabled,
                      extra: {
                        autoScroll: secConfig.spotifyAutoScroll,
                        scrollSpeed: secConfig.spotifyScrollSpeed,
                        pauseOnHover: secConfig.spotifyPauseOnHover,
                      },
                    })
              }
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold cursor-pointer"
            >
              Save {tab === "trending" ? "Trending" : "Spotify Carousel"} Settings
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
              <h2 className="font-bold text-sm text-white">
                {tab === "trending"
                  ? editingSpotifyId
                    ? "Edit Trending Track"
                    : "Add Trending Song (Spotify URL)"
                  : editingSpotifyId
                  ? "Edit Spotify Song"
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
              <div className="flex flex-wrap gap-4 text-xs pt-1">
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
                    checked={spotifyForm.section === "TRENDING"}
                    onChange={(e) =>
                      setSpotifyForm({
                        ...spotifyForm,
                        section: e.target.checked ? "TRENDING" : "SPOTIFY",
                      })
                    }
                  />
                  Mark as Trending
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
                    const ok = await apiMutate(editingSpotifyId ? "PATCH" : "POST", {
                      type: "spotify",
                      ...(editingSpotifyId ? { id: editingSpotifyId } : {}),
                      ...spotifyForm,
                    });
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
                  className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex items-center gap-3.5"
                >
                  {sp.coverUrl ? (
                    <img
                      src={sp.coverUrl}
                      alt={sp.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#1DB954]/20 flex items-center justify-center shrink-0 text-[#1DB954] font-bold">
                      SP
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white truncate">{sp.title}</span>
                      {!sp.published && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#1DB954] truncate">{sp.artistName}</div>
                    <div className="text-[11px] text-[#71717a] truncate">{sp.spotifyUrl}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await apiMutate("PATCH", {
                          type: "spotify",
                          id: sp.id,
                          refreshMetadata: true,
                        });
                        if (ok) showToast("Refreshed Spotify metadata!", "success");
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#1DB954] cursor-pointer"
                      title="Refresh Spotify Metadata"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        apiMutate("PATCH", {
                          type: "spotify",
                          id: sp.id,
                          section: sp.section === "TRENDING" ? "SPOTIFY" : "TRENDING",
                        })
                      }
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        sp.section === "TRENDING"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-white/5 text-zinc-400"
                      }`}
                      title={
                        sp.section === "TRENDING"
                          ? "Move back to Spotify Carousel"
                          : "Mark as Trending"
                      }
                    >
                      <Flame className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        apiMutate("PATCH", {
                          type: "spotify",
                          id: sp.id,
                          published: !sp.published,
                        })
                      }
                      className="p-1.5 rounded-lg bg-white/5 text-zinc-300 cursor-pointer"
                      title={sp.published ? "Disable Song" : "Enable Song"}
                    >
                      {sp.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
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
        </div>
      )}

      {/* 4. YOUTUBE MUSIC VIDEOS */}
      {tab === "videos" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Videos Heading
              </label>
              <input
                type="text"
                value={secConfig.videosTitle}
                onChange={(e) => setSecConfig({ ...secConfig, videosTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs font-bold"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Videos Description
              </label>
              <input
                type="text"
                value={secConfig.videosSubtitle}
                onChange={(e) => setSecConfig({ ...secConfig, videosSubtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={secConfig.videosEnabled}
                onChange={(e) => setSecConfig({ ...secConfig, videosEnabled: e.target.checked })}
              />
              Enable Section
            </label>
            <button
              type="button"
              onClick={() =>
                saveSectionSettings("videos", {
                  title: secConfig.videosTitle,
                  subtitle: secConfig.videosSubtitle,
                  badgeText: secConfig.videosEyebrow,
                  enabled: secConfig.videosEnabled,
                })
              }
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold cursor-pointer"
            >
              Save Section Header
            </button>
          </div>

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
                    const ok = await apiMutate(editingVideoId ? "PATCH" : "POST", {
                      type: "youtube",
                      ...(editingVideoId ? { id: editingVideoId } : {}),
                      ...videoForm,
                    });
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
                        apiMutate("PATCH", {
                          type: "youtube",
                          id: vid.id,
                          published: !vid.published,
                        })
                      }
                      className="p-1.5 rounded-lg bg-white/5 text-zinc-300 cursor-pointer"
                      title={vid.published ? "Unpublish" : "Publish"}
                    >
                      {vid.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
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
        </div>
      )}

      {/* 5. FEATURED UPDATES OVERVIEW */}
      {tab === "featured" && (
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-5">
          <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-white/10">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Featured Section Heading
              </label>
              <input
                type="text"
                value={secConfig.featuredTitle}
                onChange={(e) => setSecConfig({ ...secConfig, featuredTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs font-bold"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Featured Section Subtitle
              </label>
              <input
                type="text"
                value={secConfig.featuredSubtitle}
                onChange={(e) =>
                  setSecConfig({ ...secConfig, featuredSubtitle: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={secConfig.featuredEnabled}
                onChange={(e) => setSecConfig({ ...secConfig, featuredEnabled: e.target.checked })}
              />
              Enable Spotlight Strip
            </label>
            <button
              type="button"
              onClick={() =>
                saveSectionSettings("featured", {
                  title: secConfig.featuredTitle,
                  subtitle: secConfig.featuredSubtitle,
                  badgeText: secConfig.featuredEyebrow,
                  enabled: secConfig.featuredEnabled,
                })
              }
              className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
            >
              Save Featured Settings
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
