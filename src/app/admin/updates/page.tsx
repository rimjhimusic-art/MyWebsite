"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
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
import { HeroStudioPanel, type HeroFormState } from "@/components/admin/HeroStudioPanel";
import {
  DEFAULT_UPDATES_HERO_EXTENDED,
  normalizeUpdatesHeroExtended,
} from "@/lib/updates-hero-config";
import type {
  PublicUpcomingRelease,
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
  ctaHref?: string | null;
  bodyHtml?: string | null;
  mediaUrl?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  extraJson?: string;
  enabled: boolean;
}

interface UpdatesAdminPayload {
  releases: PublicUpdateRelease[];
  upcomingReleases: PublicUpcomingRelease[];
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
  | "upcoming"
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

  // Hero CMS state + snapshot for Cancel Changes
  const defaultHeroState: HeroFormState = {
    title: "UPCOMING",
    subtitle: "",
    description: "",
    statusBadge: "Coming Soon",
    releaseDate: "",
    supportingLabelsText: "UPCOMING, LATEST RELEASE, SPOTIFY, TRENDING, MUSIC",
    additionalText: "EXPLORE FRESH DROPS",
    mediaUrl: "",
    bgColor: "#050505",
    textColor: "#ef4444",
    glowColor: "#ef4444",
    subtitleColor: "#ffffff",
    animationEnabled: true,
    spacing: "normal",
    showFilterPills: true,
    enabled: true,
    extended: DEFAULT_UPDATES_HERO_EXTENDED,
  };
  const [heroForm, setHeroForm] = useState<HeroFormState>(defaultHeroState);
  const [savedHeroSnapshot, setSavedHeroSnapshot] = useState<HeroFormState>(defaultHeroState);

  // Section header + Spotify carousel config state
  const [secConfig, setSecConfig] = useState({
    releasesTitle: "LATEST RELEASES",
    releasesSubtitle: "",
    releasesEyebrow: "UPCOMING RELEASES",
    releasesAttentionHref: "#upcoming-releases",
    releasesEnabled: true,

    upcomingTitle: "UPCOMING RELEASES",
    upcomingSubtitle: "Exclusive upcoming releases, singles, and visual premieres coming soon.",
    upcomingEyebrow: "Coming Soon",
    upcomingEnabled: true,

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

  // Upcoming Release Form
  const [editingUpcomingId, setEditingUpcomingId] = useState<string | null>(null);
  const [upcomingForm, setUpcomingForm] = useState({
    title: "",
    artistName: "",
    releaseType: "SINGLE",
    releaseDate: "",
    statusBadge: "Coming Soon",
    description: "",
    thumbnailUrl: "/ref/abir.jpg",
    heroBgUrl: "",
    useAsHeroBg: false,
    ctaLabel: "Pre-Save / Explore",
    ctaHref: "#upcoming-releases",
    preSaveUrl: "",
    published: true,
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
      const rawLabels = Array.isArray(ext.supportingLabels)
        ? ext.supportingLabels.map((s) => String(s).trim()).filter(Boolean)
        : ["UPCOMING", "LATEST RELEASE", "SPOTIFY", "TRENDING", "MUSIC"];
      const hydratedHero: HeroFormState = {
        title: h.title && h.title !== "NEW UPDATES" ? h.title : "UPCOMING",
        subtitle: typeof ext.upcomingTitle === "string" ? ext.upcomingTitle : h.subtitle || "",
        description: h.bodyHtml || "",
        statusBadge: typeof ext.statusBadge === "string" ? ext.statusBadge : "Coming Soon",
        releaseDate: typeof ext.releaseDate === "string" ? ext.releaseDate : "",
        supportingLabelsText: rawLabels.join(", "),
        additionalText:
          typeof ext.additionalText === "string" && ext.additionalText.trim()
            ? ext.additionalText
            : "EXPLORE FRESH DROPS",
        mediaUrl: h.mediaUrl || "",
        bgColor: h.bgColor && h.bgColor !== "rgba(255,255,255,0.04)" ? h.bgColor : "#050505",
        textColor: h.textColor || "#ef4444",
        glowColor: typeof ext.glowColor === "string" ? ext.glowColor : "#ef4444",
        subtitleColor: typeof ext.subtitleColor === "string" ? ext.subtitleColor : "#ffffff",
        animationEnabled: ext.animationEnabled !== false,
        spacing:
          ext.spacing === "compact" || ext.spacing === "spacious" ? ext.spacing : "normal",
        showFilterPills: ext.showFilterPills !== false,
        enabled: h.enabled !== false,
        extended: normalizeUpdatesHeroExtended(ext.heroStudio),
      };
      setHeroForm(hydratedHero);
      setSavedHeroSnapshot(JSON.parse(JSON.stringify(hydratedHero)) as HeroFormState);
    }

    const r = sections["releases"];
    const up = sections["upcoming"];
    const sp = sections["spotify"];
    const tr = sections["trending"];
    const vid = sections["videos"];
    const ft = sections["featured"];
    const spExt = parseExtra(sp?.extraJson);

    setSecConfig({
      releasesTitle: r?.title || "LATEST RELEASES",
      releasesSubtitle: r?.subtitle || "",
      releasesEyebrow:
        r?.badgeText && r.badgeText !== "Catalog Drop" ? r.badgeText : "UPCOMING RELEASES",
      releasesAttentionHref: r?.ctaHref || "#upcoming-releases",
      releasesEnabled: r ? r.enabled !== false : true,

      upcomingTitle: up?.title || "UPCOMING RELEASES",
      upcomingSubtitle: up?.subtitle || "",
      upcomingEyebrow: up?.badgeText || "Coming Soon",
      upcomingEnabled: up ? up.enabled !== false : true,

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
      ctaHref?: string;
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
    type: "release" | "upcoming" | "spotify" | "youtube",
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
            { key: "upcoming", label: `Upcoming Releases (${data.upcomingReleases?.length || 0})`, icon: Calendar },
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

      {/* 0. HERO SECTION CMS & CUSTOMIZER STUDIO */}
      {tab === "hero" && (
        <HeroStudioPanel
          heroForm={heroForm}
          setHeroForm={setHeroForm}
          fallbackBgUrl={
            data.upcomingReleases?.find((u) => u.useAsHeroBg)?.heroBgUrl ||
            data.upcomingReleases?.[0]?.thumbnailUrl ||
            "/ref/abir.jpg"
          }
          previewReleaseSubtitle={
            data.upcomingReleases?.find((u) => u.useAsHeroBg)?.title ||
            data.upcomingReleases?.[0]?.title ||
            "Next Wave Independent Premiere"
          }
          busy={busy}
          onSave={() =>
            saveSectionSettings("hero", {
              title: heroForm.title,
              subtitle: heroForm.subtitle,
              bodyHtml: heroForm.description,
              mediaUrl: heroForm.mediaUrl,
              bgColor: heroForm.bgColor,
              textColor: heroForm.textColor,
              enabled: heroForm.enabled,
              extra: {
                upcomingTitle: heroForm.subtitle,
                statusBadge: heroForm.statusBadge,
                releaseDate: heroForm.releaseDate,
                supportingLabels: heroForm.supportingLabelsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                glowColor: heroForm.glowColor,
                subtitleColor: heroForm.subtitleColor,
                animationEnabled: heroForm.animationEnabled,
                spacing: heroForm.spacing,
                showFilterPills: heroForm.showFilterPills,
                additionalText: heroForm.additionalText,
                heroStudio: normalizeUpdatesHeroExtended(heroForm.extended),
              },
            })
          }
          onCancel={() => {
            setHeroForm(JSON.parse(JSON.stringify(savedHeroSnapshot)) as HeroFormState);
            showToast("Reverted unsaved Hero changes.", "info");
          }}
          onResetDefaults={() => {
            setHeroForm(JSON.parse(JSON.stringify(defaultHeroState)) as HeroFormState);
            showToast("Restored suggested default Hero settings. Click Save Changes to publish.", "info");
          }}
          onOpenGallery={() =>
            setMediaPicker({
              open: true,
              callback: (u) => setHeroForm((p) => ({ ...p, mediaUrl: u })),
            })
          }
        />
      )}

      {/* 0b. UPCOMING RELEASES MANAGEMENT */}
      {tab === "upcoming" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Upcoming Section Heading
              </label>
              <input
                type="text"
                value={secConfig.upcomingTitle}
                onChange={(e) => setSecConfig({ ...secConfig, upcomingTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs font-bold"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Upcoming Section Description
              </label>
              <input
                type="text"
                value={secConfig.upcomingSubtitle}
                onChange={(e) => setSecConfig({ ...secConfig, upcomingSubtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={secConfig.upcomingEnabled}
                onChange={(e) => setSecConfig({ ...secConfig, upcomingEnabled: e.target.checked })}
              />
              Enable Section
            </label>
            <button
              type="button"
              onClick={() =>
                saveSectionSettings("upcoming", {
                  title: secConfig.upcomingTitle,
                  subtitle: secConfig.upcomingSubtitle,
                  badgeText: secConfig.upcomingEyebrow,
                  enabled: secConfig.upcomingEnabled,
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
                {editingUpcomingId ? "Edit Upcoming Release" : "Add Upcoming Release"}
              </h2>
              <input
                type="text"
                placeholder="Upcoming Title*"
                value={upcomingForm.title}
                onChange={(e) => setUpcomingForm({ ...upcomingForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Artist Name"
                  value={upcomingForm.artistName}
                  onChange={(e) => setUpcomingForm({ ...upcomingForm, artistName: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <select
                  value={upcomingForm.releaseType}
                  onChange={(e) => setUpcomingForm({ ...upcomingForm, releaseType: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                >
                  <option value="SINGLE">Single</option>
                  <option value="EP">EP</option>
                  <option value="ALBUM">Album</option>
                  <option value="VIDEO">Music Video</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Status Badge (e.g. Coming Soon)"
                  value={upcomingForm.statusBadge}
                  onChange={(e) => setUpcomingForm({ ...upcomingForm, statusBadge: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <input
                  type="date"
                  value={upcomingForm.releaseDate}
                  onChange={(e) => setUpcomingForm({ ...upcomingForm, releaseDate: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Thumbnail / 16:9 Artwork URL*"
                  value={upcomingForm.thumbnailUrl}
                  onChange={(e) => setUpcomingForm({ ...upcomingForm, thumbnailUrl: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    setMediaPicker({
                      open: true,
                      callback: (u) => setUpcomingForm((p) => ({ ...p, thumbnailUrl: u })),
                    })
                  }
                  className="px-3 rounded-xl bg-white/10 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Gallery
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Optional Custom Hero BG URL (else uses Thumbnail)"
                  value={upcomingForm.heroBgUrl}
                  onChange={(e) => setUpcomingForm({ ...upcomingForm, heroBgUrl: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    setMediaPicker({
                      open: true,
                      callback: (u) => setUpcomingForm((p) => ({ ...p, heroBgUrl: u })),
                    })
                  }
                  className="px-3 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
                >
                  Pick BG
                </button>
              </div>

              <textarea
                rows={2}
                placeholder="Upcoming description / teaser notes"
                value={upcomingForm.description}
                onChange={(e) => setUpcomingForm({ ...upcomingForm, description: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
              />

              <input
                type="url"
                placeholder="Optional Pre-Save / Teaser URL"
                value={upcomingForm.preSaveUrl}
                onChange={(e) => setUpcomingForm({ ...upcomingForm, preSaveUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />

              <div className="flex flex-wrap gap-4 text-xs pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={upcomingForm.useAsHeroBg}
                    onChange={(e) => setUpcomingForm({ ...upcomingForm, useAsHeroBg: e.target.checked })}
                  />
                  Showcase in Hero Background
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={upcomingForm.published}
                    onChange={(e) => setUpcomingForm({ ...upcomingForm, published: e.target.checked })}
                  />
                  Published
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const ok = await apiMutate(editingUpcomingId ? "PATCH" : "POST", {
                      type: "upcoming",
                      ...(editingUpcomingId ? { id: editingUpcomingId } : {}),
                      ...upcomingForm,
                    });
                    if (ok) {
                      showToast(
                        editingUpcomingId ? "Upcoming release updated!" : "Upcoming release saved!",
                        "success"
                      );
                      setEditingUpcomingId(null);
                      setUpcomingForm({
                        title: "",
                        artistName: "",
                        releaseType: "SINGLE",
                        releaseDate: "",
                        statusBadge: "Coming Soon",
                        description: "",
                        thumbnailUrl: "/ref/abir.jpg",
                        heroBgUrl: "",
                        useAsHeroBg: false,
                        ctaLabel: "Pre-Save / Explore",
                        ctaHref: "#upcoming-releases",
                        preSaveUrl: "",
                        published: true,
                      });
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {editingUpcomingId ? "Update Upcoming Release" : "Add Upcoming Release"}
                </button>
                {editingUpcomingId && (
                  <button
                    type="button"
                    onClick={() => setEditingUpcomingId(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-3">
              {(data.upcomingReleases || []).map((up, idx) => (
                <div
                  key={up.id}
                  className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex flex-wrap sm:flex-nowrap items-center gap-3.5"
                >
                  <img
                    src={up.thumbnailUrl}
                    alt={up.title}
                    className="w-24 aspect-video rounded-xl object-contain bg-black shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-sm text-white truncate">{up.title}</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">
                        {up.statusBadge}
                      </span>
                      {up.useAsHeroBg && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                          Active Hero
                        </span>
                      )}
                      {!up.published && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#60a5fa]">
                      {up.artistName || "Artist"} {up.releaseDate ? `• ${up.releaseDate}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        apiMutate("PATCH", {
                          type: "upcoming",
                          id: up.id,
                          useAsHeroBg: !up.useAsHeroBg,
                        })
                      }
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        up.useAsHeroBg
                          ? "bg-blue-600 text-white"
                          : "bg-white/10 text-zinc-300"
                      }`}
                    >
                      {up.useAsHeroBg ? "Hero On" : "Use Hero"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await apiMutate("PATCH", {
                          action: "move_to_latest",
                          id: up.id,
                        });
                        if (ok) {
                          showToast(`Moved "${up.title}" into Latest Releases!`, "success");
                        }
                      }}
                      className="px-2 py-1 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      title="Move to Latest Releases"
                    >
                      <span>Move to Latest</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        reorder(
                          "upcoming",
                          (data.upcomingReleases || []).map((x) => x.id),
                          idx,
                          -1
                        )
                      }
                      className="p-1.5 rounded-lg bg-white/5 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        reorder(
                          "upcoming",
                          (data.upcomingReleases || []).map((x) => x.id),
                          idx,
                          1
                        )
                      }
                      className="p-1.5 rounded-lg bg-white/5 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUpcomingId(up.id);
                        setUpcomingForm({
                          title: up.title,
                          artistName: up.artistName || "",
                          releaseType: up.releaseType,
                          releaseDate: up.releaseDate || "",
                          statusBadge: up.statusBadge || "Coming Soon",
                          description: up.description || "",
                          thumbnailUrl: up.thumbnailUrl,
                          heroBgUrl: up.heroBgUrl || "",
                          useAsHeroBg: up.useAsHeroBg,
                          ctaLabel: up.ctaLabel || "",
                          ctaHref: up.ctaHref || "",
                          preSaveUrl: up.preSaveUrl || "",
                          published: up.published,
                        });
                      }}
                      className="px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          open: true,
                          type: "upcoming",
                          id: up.id,
                          label: up.title,
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
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Red Attention Button Label
              </label>
              <input
                type="text"
                value={secConfig.releasesEyebrow}
                onChange={(e) => setSecConfig({ ...secConfig, releasesEyebrow: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs font-bold"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10px] uppercase text-[#9ca3af] mb-1">
                Attention Button Destination
              </label>
              <input
                type="text"
                value={secConfig.releasesAttentionHref}
                onChange={(e) =>
                  setSecConfig({ ...secConfig, releasesAttentionHref: e.target.value })
                }
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
                  ctaHref: secConfig.releasesAttentionHref,
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
