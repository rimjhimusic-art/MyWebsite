"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Disc3,
  ExternalLink,
  Flame,
  Music2,
  Play,
  Sparkles,
  Star,
  Tv,
  X,
} from "lucide-react";
import { Navbar, type CmsBrandHeaderSettings, type CmsNavLink } from "@/components/Navbar";
import { Footer, type CmsFooterLink, type CmsFooterSettings } from "@/components/Footer";
import { AppleMusicIcon, SpotifyIcon, YouTubeIcon } from "@/components/BrandIcons";
import { UpcomingBrushTitle } from "@/components/UpcomingBrushTitle";
import type {
  PublicUpcomingRelease,
  PublicUpdateRelease,
  PublicUpdateSpotifyTrack,
  PublicUpdateYoutubeVideo,
} from "@/lib/updates";

type FilterTab = "all" | "releases" | "spotify" | "trending" | "videos";

export interface UpdatesHeroConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  description: string;
  statusBadge: string;
  releaseDate: string;
  artistLine: string;
  additionalText: string;
  supportingLabels: string[];
  bgImageUrl: string;
  bgColor: string;
  headingColor: string;
  glowColor: string;
  subtitleColor: string;
  animationEnabled: boolean;
  spacing: "compact" | "normal" | "spacious";
  showFilterBar: boolean;
}

export interface UpdatesSectionMeta {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface UpdatesSectionsConfig {
  releases: UpdatesSectionMeta & { attentionHref: string };
  upcoming: UpdatesSectionMeta;
  spotify: UpdatesSectionMeta & {
    autoScroll: boolean;
    scrollSpeed: number;
    pauseOnHover: boolean;
  };
  trending: UpdatesSectionMeta;
  videos: UpdatesSectionMeta;
  featured: UpdatesSectionMeta;
}

function SpotifyTrackCard({
  item,
  compactWidth = true,
}: {
  item: PublicUpdateSpotifyTrack;
  compactWidth?: boolean;
}) {
  const [pressed, setPressed] = useState(false);

  const handleCardPress = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 180);
  };

  return (
    <div
      data-testid="spotify-music-card"
      onPointerDown={handleCardPress}
      onClick={handleCardPress}
      className={`spotify-update-card ${pressed ? "is-pressed" : ""} ${
        compactWidth ? "w-[260px] sm:w-[272px] lg:w-[288px] shrink-0" : "w-full"
      } rounded-[18px] bg-white/[0.045] backdrop-blur-xl border border-white/10 p-3 space-y-2.5 select-none`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {item.coverUrl ? (
            <img
              src={item.coverUrl}
              alt={item.title}
              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#1DB954]/15 flex items-center justify-center shrink-0">
              <SpotifyIcon className="w-5 h-5" color="#1DB954" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-[13px] text-white truncate leading-tight">
              {item.title}
            </div>
            <div className="text-[11px] text-[#b0b0b8] truncate mt-0.5">
              {item.artistName}
            </div>
          </div>
        </div>
        <a
          href={item.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open ${item.title} on Spotify`}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1DB954]/15 hover:bg-[#1DB954]/30 border border-[#1DB954]/40 text-[#1DB954] text-[11px] font-bold transition-colors"
        >
          <SpotifyIcon className="w-3 h-3" color="#1DB954" />
          <span>Open</span>
        </a>
      </div>

      <div className="rounded-xl overflow-hidden bg-black/45 border border-white/10">
        <iframe
          title={`${item.title} Spotify Player`}
          src={item.embedUrl}
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="block w-full border-0"
        />
      </div>
    </div>
  );
}

function SpotifyCarouselTrack({
  items,
  autoScroll,
  scrollSpeed,
  pauseOnHover,
}: {
  items: PublicUpdateSpotifyTrack[];
  autoScroll: boolean;
  scrollSpeed: number;
  pauseOnHover: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  const shouldLoop = items.length >= 4 && autoScroll;

  useEffect(() => {
    if (!shouldLoop) return;
    const el = scrollerRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let rafId = 0;
    let lastTs = performance.now();

    const step = (ts: number) => {
      const dt = Math.min(0.08, (ts - lastTs) / 1000);
      lastTs = ts;

      if (!pausedRef.current && el.scrollWidth > el.clientWidth) {
        const halfWidth = el.scrollWidth / 2;
        const pxPerSec = Math.max(24, halfWidth / Math.max(10, scrollSpeed || 32));
        el.scrollLeft += pxPerSec * dt;
        if (el.scrollLeft >= halfWidth) {
          el.scrollLeft -= halfWidth;
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [shouldLoop, scrollSpeed, items.length]);

  if (items.length <= 3) {
    return (
      <div
        data-testid="spotify-carousel-static"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {items.map((item) => (
          <SpotifyTrackCard key={item.id} item={item} compactWidth={false} />
        ))}
      </div>
    );
  }

  const displayList = shouldLoop ? [...items, ...items] : items;

  return (
    <div
      ref={scrollerRef}
      data-testid="spotify-carousel-scroll"
      data-autoscroll={shouldLoop ? "true" : "false"}
      onMouseEnter={() => {
        if (pauseOnHover) pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onTouchStart={() => {
        pausedRef.current = true;
      }}
      onTouchEnd={() => {
        setTimeout(() => {
          pausedRef.current = false;
        }, 1200);
      }}
      className="w-full overflow-x-auto no-scrollbar py-2 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-stretch gap-4 w-max">
        {displayList.map((item, idx) => (
          <SpotifyTrackCard key={`${item.id}-${idx}`} item={item} compactWidth={true} />
        ))}
      </div>
    </div>
  );
}

export function UpdatesClient({
  user,
  releases,
  upcomingReleases,
  spotifyMusic,
  trendingSpotify,
  youtubeVideos,
  settings,
  headerNav,
  footerNav,
  previewActive = false,
  heroConfig,
  sectionsConfig,
}: {
  user?: { name: string; role: string } | null;
  releases: PublicUpdateRelease[];
  upcomingReleases: PublicUpcomingRelease[];
  spotifyMusic: PublicUpdateSpotifyTrack[];
  trendingSpotify: PublicUpdateSpotifyTrack[];
  youtubeVideos: PublicUpdateYoutubeVideo[];
  settings?: Partial<CmsBrandHeaderSettings & CmsFooterSettings>;
  headerNav?: CmsNavLink[];
  footerNav?: CmsFooterLink[];
  previewActive?: boolean;
  heroConfig: UpdatesHeroConfig;
  sectionsConfig: UpdatesSectionsConfig;
}) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [activeVideo, setActiveVideo] = useState<PublicUpdateYoutubeVideo | null>(null);
  const [expandedTrendingId, setExpandedTrendingId] = useState<string | null>(null);

  const showReleases =
    sectionsConfig.releases.enabled && (filter === "all" || filter === "releases");
  const showUpcoming =
    sectionsConfig.upcoming.enabled && filter === "all" && upcomingReleases.length > 0;
  const showSpotify =
    sectionsConfig.spotify.enabled && (filter === "all" || filter === "spotify");
  const showTrending =
    sectionsConfig.trending.enabled && (filter === "all" || filter === "trending");
  const showVideos =
    sectionsConfig.videos.enabled && (filter === "all" || filter === "videos");

  const featuredReleases = releases.filter((r) => r.featured);
  const featuredVideos = youtubeVideos.filter((v) => v.featured);
  const hasFeaturedSpotlight =
    sectionsConfig.featured.enabled &&
    filter === "all" &&
    (featuredReleases.length > 0 || featuredVideos.length > 0);

  const hasAnyContent =
    releases.length > 0 ||
    upcomingReleases.length > 0 ||
    spotifyMusic.length > 0 ||
    trendingSpotify.length > 0 ||
    youtubeVideos.length > 0;

  const spacingHeight =
    heroConfig.spacing === "compact"
      ? "min-h-[360px] sm:min-h-[430px] lg:h-[500px]"
      : heroConfig.spacing === "spacious"
      ? "min-h-[450px] sm:min-h-[540px] lg:h-[640px]"
      : "min-h-[400px] sm:min-h-[490px] lg:aspect-[16/9] lg:max-h-[600px]";

  const supportingLabels =
    heroConfig.supportingLabels && heroConfig.supportingLabels.length > 0
      ? heroConfig.supportingLabels
      : ["UPCOMING", "LATEST RELEASE", "SPOTIFY", "TRENDING", "MUSIC"];

  const handleNavFilter = (key: FilterTab, anchorId?: string) => {
    setFilter(key);
    if (anchorId && key !== "all") {
      setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-x-clip">
      {/* Subtle Ambient Red + Blue Background Atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(239,68,68,0.12) 0%, transparent 42%), radial-gradient(circle at 82% 28%, rgba(29,185,84,0.08) 0%, transparent 40%), radial-gradient(circle at 50% 82%, rgba(59,130,246,0.09) 0%, transparent 48%)",
        }}
      />

      <Navbar
        user={user}
        settings={settings}
        navItems={headerNav}
        previewActive={previewActive}
      />

      <main className="relative z-10 pt-22 sm:pt-26 pb-20 px-4 sm:px-8 max-w-[1280px] mx-auto space-y-12 sm:space-y-14">
        {/* FUTURISTIC SEAMLESS HERO WITH CRYSTAL-CLEAR PHOTOGRAPH & 4-EDGE DISSOLVE */}
        {heroConfig.enabled && (
          <section
            data-testid="updates-hero-section"
            style={{
              backgroundColor:
                heroConfig.bgColor &&
                heroConfig.bgColor !== "#050505" &&
                heroConfig.bgColor !== "rgba(255,255,255,0.04)"
                  ? heroConfig.bgColor
                  : "transparent",
            }}
            className={`relative w-full ${spacingHeight} overflow-hidden flex flex-col justify-end items-center text-center px-4 sm:px-10 pb-8 sm:pb-10 pt-8`}
          >
            {/* Atmospheric glass cinema light behind artwork (fades smoothly to transparent, zero seams) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(ellipse 64% 56% at 50% 44%, rgba(239,68,68,0.14) 0%, rgba(59,130,246,0.10) 44%, rgba(34,211,238,0.05) 66%, transparent 86%)",
              }}
            />

            {/* Crystal-clear unblurred photograph dissolved smoothly to transparent on ALL 4 SIDES */}
            {heroConfig.bgImageUrl && (
              <div
                aria-hidden="true"
                className="pointer-events-none select-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden"
              >
                <div className="goldex-hero-dissolve-mask relative h-full max-w-full inline-flex items-center justify-center">
                  <img
                    data-testid="updates-hero-bg-image"
                    src={heroConfig.bgImageUrl}
                    alt={heroConfig.subtitle || "Upcoming release artwork"}
                    className="block h-full w-auto max-w-full object-contain object-center"
                  />
                </div>
              </div>
            )}

            {/* Soft localized legibility scrim purely behind lower foreground typography (never creates outer box edge) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                background:
                  "radial-gradient(ellipse 70% 46% at 50% 82%, rgba(5,5,5,0.74) 0%, rgba(5,5,5,0.34) 56%, transparent 100%)",
              }}
            />
            {/* Delicate frosted glass lighting sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[3] opacity-30"
              style={{
                background:
                  "radial-gradient(ellipse 68% 58% at 50% 42%, rgba(255,255,255,0.05) 0%, rgba(34,211,238,0.03) 48%, transparent 80%)",
              }}
            />

            {/* FOREGROUND TYPOGRAPHY COMPOSITION DIRECTLY OVER LOWER ARTWORK */}
            <div className="relative z-10 w-full max-w-[820px] mx-auto flex flex-col items-center gap-2.5 sm:gap-3">
              {/* Small, subtle supporting labels around the main UPCOMING heading */}
              <div
                data-testid="updates-hero-supporting-labels"
                className="flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3.5 gap-y-1 text-[9px] sm:text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-300/80"
              >
                {supportingLabels.map((lbl, idx) => (
                  <React.Fragment key={`${lbl}-${idx}`}>
                    {idx > 0 && (
                      <span aria-hidden="true" className="text-cyan-400/50 text-[8px]">
                        /
                      </span>
                    )}
                    <span className="transition-colors hover:text-white">{lbl}</span>
                  </React.Fragment>
                ))}
              </div>

              {/* Stylized artistic Brush UPCOMING centerpiece heading directly over Hero image */}
              <UpcomingBrushTitle
                text={heroConfig.title || "UPCOMING"}
                animationEnabled={heroConfig.animationEnabled}
                glowColor={heroConfig.glowColor}
              />

              {/* Compact, restrained glass metadata strip for upcoming release details (no bulky box or CTA button) */}
              {(heroConfig.subtitle || heroConfig.statusBadge || heroConfig.releaseDate || heroConfig.description || heroConfig.additionalText) && (
                <div className="w-full max-w-[680px] mx-auto flex flex-col items-center gap-1.5 pt-0.5">
                  <div className="inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-4 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10">
                    {heroConfig.statusBadge && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">
                        <Sparkles className="w-2.5 h-2.5 text-red-400" />
                        <span>{heroConfig.statusBadge}</span>
                      </span>
                    )}
                    {heroConfig.subtitle && (
                      <span
                        style={{ color: heroConfig.subtitleColor || "#f8fafc" }}
                        className="text-[11px] sm:text-xs font-semibold tracking-wide"
                      >
                        {heroConfig.subtitle}
                        {heroConfig.artistLine ? (
                          <span className="text-cyan-300/90 font-medium"> — {heroConfig.artistLine}</span>
                        ) : null}
                      </span>
                    )}
                    {heroConfig.releaseDate && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-200/90">
                        <Calendar className="w-2.5 h-2.5 text-blue-300" />
                        <span>{heroConfig.releaseDate}</span>
                      </span>
                    )}
                  </div>

                  {heroConfig.description && (
                    <p className="text-[11px] sm:text-xs text-zinc-300/80 max-w-xl leading-relaxed line-clamp-2">
                      {heroConfig.description}
                    </p>
                  )}

                  {heroConfig.additionalText && (
                    <p className="text-[10px] sm:text-[11px] text-cyan-200/85 tracking-wide">
                      {heroConfig.additionalText}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* NAVIGATION BOX BELOW HERO WITH CONTINUOUS RED/BLUE/CYAN PERIMETER NEON ANIMATION */}
        {heroConfig.showFilterBar && (
          <div
            data-testid="updates-subnav-neon-border"
            className="goldex-neon-nav-wrap -mt-4 sm:-mt-6 shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
          >
            {/* Outer soft glowing trail hugging the perimeter */}
            <div aria-hidden="true" className="goldex-neon-nav-halo">
              <div className="goldex-neon-nav-rotator" />
            </div>
            {/* Crisp animated neon border line along all 4 sides */}
            <div aria-hidden="true" className="goldex-neon-nav-border">
              <div className="goldex-neon-nav-rotator" />
            </div>
            {/* Preserved original frosted-glass navigation options & layout */}
            <nav
              aria-label="New Updates Categories"
              data-testid="updates-subnav-box"
              className="relative z-[1] rounded-[16px] bg-[#0a0a0d]/85 backdrop-blur-xl px-3 sm:px-5 py-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
            >
              {(
                [
                  { key: "all", label: "ALL UPDATES", anchor: undefined },
                  sectionsConfig.releases.enabled
                    ? { key: "releases", label: `LATEST RELEASES (${releases.length})`, anchor: "latest-releases" }
                    : null,
                  sectionsConfig.spotify.enabled
                    ? { key: "spotify", label: `SPOTIFY MUSIC (${spotifyMusic.length})`, anchor: "spotify-music" }
                    : null,
                  sectionsConfig.trending.enabled
                    ? { key: "trending", label: `TRENDING MUSIC (${trendingSpotify.length})`, anchor: "trending-music" }
                    : null,
                  sectionsConfig.videos.enabled
                    ? { key: "videos", label: `MUSIC VIDEOS (${youtubeVideos.length})`, anchor: "music-videos" }
                    : null,
                ] as Array<{ key: FilterTab; label: string; anchor?: string } | null>
              )
                .filter((x): x is { key: FilterTab; label: string; anchor?: string } => Boolean(x))
                .map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => handleNavFilter(pill.key, pill.anchor)}
                    className={`px-4 py-2 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer border ${
                      filter === pill.key
                        ? "bg-[#ef4444] text-white border-[#ef4444] shadow-[0_6px_22px_rgba(239,68,68,0.42)]"
                        : "bg-white/[0.04] text-zinc-300 border-white/10 hover:text-white hover:bg-white/[0.09] hover:border-white/25"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
            </nav>
          </div>
        )}

        {!hasAnyContent && (
          <section className="rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-12 text-center">
            <Disc3 className="w-10 h-10 text-[#ef4444] mx-auto mb-3 opacity-80" />
            <h2 className="text-xl font-bold text-white mb-2">Fresh Releases Coming Soon</h2>
            <p className="text-sm text-[#9ca3af] max-w-md mx-auto">
              Our curation team is adding upcoming releases, Spotify tracks, and music videos. Check back soon.
            </p>
          </section>
        )}

        {/* FEATURED UPDATES SPOTLIGHT */}
        {hasFeaturedSpotlight && (
          <section className="space-y-4" data-testid="section-featured-updates">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-amber-400 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> {sectionsConfig.featured.eyebrow}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                  {sectionsConfig.featured.title}
                </h2>
              </div>
              {sectionsConfig.featured.subtitle && (
                <p className="text-xs text-[#9ca3af]">{sectionsConfig.featured.subtitle}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {featuredReleases.slice(0, 3).map((rel) => (
                <div
                  key={`feat-rel-${rel.id}`}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-amber-400/25 max-w-xs"
                >
                  <img
                    src={rel.coverUrl}
                    alt={rel.title}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{rel.title}</div>
                    <div className="text-[11px] text-amber-300 truncate">{rel.artistName}</div>
                  </div>
                </div>
              ))}
              {featuredVideos.slice(0, 2).map((vid) => (
                <button
                  key={`feat-vid-${vid.id}`}
                  type="button"
                  onClick={() => setActiveVideo(vid)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-[#E3001B]/30 max-w-xs text-left cursor-pointer transition-colors"
                >
                  <img
                    src={vid.thumbnailUrl}
                    alt={vid.title}
                    className="w-12 h-9 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{vid.title}</div>
                    <div className="text-[11px] text-[#f87171] truncate">Watch Video</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* PART 4: LATEST RELEASES (CATALOG DROP REMOVED -> RED GLOWING ATTENTION BUTTON ADDED) */}
        {showReleases && releases.length > 0 && (
          <section id="latest-releases" className="space-y-6" data-testid="section-latest-releases">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-2">
                <a
                  href={sectionsConfig.releases.attentionHref || "#upcoming-releases"}
                  data-testid="upcoming-attention-btn"
                  className="goldex-red-attention-btn inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/20 hover:bg-red-600/35 border border-red-500/70 text-red-300 hover:text-white text-[11px] font-black uppercase tracking-[1.8px] transition-all hover:-translate-y-0.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  <span>{sectionsConfig.releases.eyebrow || "UPCOMING RELEASES"}</span>
                </a>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {sectionsConfig.releases.title}
                </h2>
                {sectionsConfig.releases.subtitle && (
                  <p className="text-xs text-[#9ca3af]">{sectionsConfig.releases.subtitle}</p>
                )}
              </div>
              <span className="text-xs text-[#9ca3af]">{releases.length} active release(s)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {releases.map((rel) => {
                const links = [
                  rel.spotifyUrl
                    ? {
                        label: "Spotify",
                        url: rel.spotifyUrl,
                        icon: <SpotifyIcon className="w-4 h-4" color="#1DB954" />,
                      }
                    : null,
                  rel.appleMusicUrl
                    ? {
                        label: "Apple Music",
                        url: rel.appleMusicUrl,
                        icon: <AppleMusicIcon className="w-4 h-4" color="#FA243C" />,
                      }
                    : null,
                  rel.youtubeMusicUrl
                    ? {
                        label: "YouTube Music",
                        url: rel.youtubeMusicUrl,
                        icon: <YouTubeIcon className="w-4 h-4" color="#FF0000" />,
                      }
                    : null,
                  ...rel.otherLinks.map((o) => ({
                    label: o.label,
                    url: o.url,
                    icon: <ExternalLink className="w-3.5 h-3.5 text-[#60a5fa]" />,
                  })),
                ].filter((x): x is NonNullable<typeof x> => Boolean(x));

                return (
                  <article
                    key={rel.id}
                    className="rounded-[24px] bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-[#3b82f6]/50 overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.45)] flex flex-col transition-all hover:-translate-y-1"
                  >
                    <div className="relative aspect-square bg-black/50 overflow-hidden">
                      <img
                        src={rel.coverUrl}
                        alt={`${rel.title} cover artwork`}
                        className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25 pointer-events-none" />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-bold uppercase tracking-wider text-white">
                          {rel.releaseType}
                        </span>
                        {rel.featured && (
                          <span className="px-2.5 py-1 rounded-full bg-blue-600/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white">
                            Featured
                          </span>
                        )}
                        {rel.trending && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/85 text-black text-[10px] font-extrabold uppercase tracking-wider">
                            Trending
                          </span>
                        )}
                      </div>
                      {rel.releaseDate && (
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[11px] font-semibold text-zinc-200 border border-white/10">
                          {rel.releaseDate}
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-extrabold text-white leading-snug">
                          {rel.title}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#60a5fa] mt-1">
                          {rel.artistName}
                        </p>
                        {rel.description && (
                          <p className="text-xs sm:text-sm text-[#b0b0b8] leading-relaxed mt-3 line-clamp-3">
                            {rel.description}
                          </p>
                        )}
                      </div>

                      {links.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
                          {links.map((l, idx) => (
                            <a
                              key={`${rel.id}-link-${idx}`}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-xs font-semibold text-white transition-colors"
                            >
                              {l.icon}
                              <span>{l.label}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* PART 3: UPCOMING RELEASES (LOGICALLY SEPARATE FROM LATEST RELEASES) */}
        {showUpcoming && (
          <section
            id="upcoming-releases"
            className="space-y-6 pt-2"
            data-testid="section-upcoming-releases"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ef4444] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {sectionsConfig.upcoming.eyebrow}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  {sectionsConfig.upcoming.title}
                </h2>
                {sectionsConfig.upcoming.subtitle && (
                  <p className="text-xs text-[#9ca3af] mt-1">{sectionsConfig.upcoming.subtitle}</p>
                )}
              </div>
              <span className="text-xs text-[#9ca3af]">
                {upcomingReleases.length} upcoming item(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingReleases.map((up) => (
                <article
                  key={up.id}
                  className="rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-red-500/20 hover:border-red-400/50 overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.45)] flex flex-col transition-all hover:-translate-y-1"
                >
                  <div className="relative aspect-video bg-black/70 overflow-hidden">
                    <img
                      src={up.thumbnailUrl}
                      alt={up.title}
                      className="w-full h-full object-contain bg-black/80"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-red-600/90 text-[10px] font-extrabold uppercase tracking-wider text-white">
                        {up.statusBadge || "Coming Soon"}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-black/65 border border-white/15 text-[10px] font-bold uppercase text-zinc-200">
                        {up.releaseType}
                      </span>
                    </div>
                    {up.releaseDate && (
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/75 border border-white/15 text-[11px] font-semibold text-zinc-100">
                        {up.releaseDate}
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-white">
                        {up.title}
                      </h3>
                      {up.artistName && (
                        <p className="text-xs font-bold uppercase tracking-wider text-[#60a5fa] mt-1">
                          {up.artistName}
                        </p>
                      )}
                      {up.description && (
                        <p className="text-xs sm:text-sm text-[#b0b0b8] mt-2 leading-relaxed line-clamp-3">
                          {up.description}
                        </p>
                      )}
                    </div>
                    {up.preSaveUrl && (
                      <a
                        href={up.preSaveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-red-500/20 hover:bg-red-500/35 border border-red-400/50 text-red-200 text-xs font-bold transition-colors"
                      >
                        <span>Pre-Save / Notify</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* SPOTIFY MUSIC (COMPACT 4-PER-ROW AUTO-SCROLLING CAROUSEL) */}
        {showSpotify && spotifyMusic.length > 0 && (
          <section id="spotify-music" className="space-y-5" data-testid="section-spotify-music">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#1DB954] flex items-center gap-1.5">
                  <Music2 className="w-3.5 h-3.5" /> {sectionsConfig.spotify.eyebrow}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  {sectionsConfig.spotify.title}
                </h2>
                {sectionsConfig.spotify.subtitle && (
                  <p className="text-xs text-[#9ca3af] mt-1">{sectionsConfig.spotify.subtitle}</p>
                )}
              </div>
              <span className="text-xs text-[#9ca3af]">{spotifyMusic.length} track(s)</span>
            </div>

            <SpotifyCarouselTrack
              items={spotifyMusic}
              autoScroll={sectionsConfig.spotify.autoScroll}
              scrollSpeed={sectionsConfig.spotify.scrollSpeed}
              pauseOnHover={sectionsConfig.spotify.pauseOnHover}
            />
          </section>
        )}

        {/* TRENDING ON SPOTIFY */}
        {showTrending && trendingSpotify.length > 0 && (
          <section id="trending-music" className="space-y-6" data-testid="section-trending-spotify">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> {sectionsConfig.trending.eyebrow}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  {sectionsConfig.trending.title}
                </h2>
                {sectionsConfig.trending.subtitle && (
                  <p className="text-xs text-[#9ca3af] mt-1">{sectionsConfig.trending.subtitle}</p>
                )}
              </div>
              <span className="text-xs text-[#9ca3af]">{trendingSpotify.length} curated track(s)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingSpotify.map((item, idx) => {
                const isExpanded = expandedTrendingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="spotify-update-card rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-base font-black text-amber-400/90 w-5 text-center shrink-0">
                        #{idx + 1}
                      </div>
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-11 h-11 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <SpotifyIcon className="w-5 h-5" color="#1DB954" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#b0b0b8] truncate">
                          {item.artistName}
                        </div>
                        {item.metricLabel && (
                          <div className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[10px] font-bold text-amber-300">
                            {item.metricLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTrendingId(isExpanded ? null : item.id)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-[11px] font-semibold text-white cursor-pointer transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        <span>{isExpanded ? "Hide" : "Play"}</span>
                      </button>
                      <a
                        href={item.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1DB954] hover:underline"
                      >
                        <SpotifyIcon className="w-3 h-3" color="#1DB954" />
                        <span>Spotify</span>
                      </a>
                    </div>

                    {isExpanded && (
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50 pt-1">
                        <iframe
                          title={`${item.title} Trending Spotify Player`}
                          src={item.embedUrl}
                          width="100%"
                          height="152"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          className="block w-full border-0"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* LATEST MUSIC VIDEOS (YOUTUBE) */}
        {showVideos && youtubeVideos.length > 0 && (
          <section id="music-videos" className="space-y-6" data-testid="section-latest-videos">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#E3001B] flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5" /> {sectionsConfig.videos.eyebrow}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  {sectionsConfig.videos.title}
                </h2>
                {sectionsConfig.videos.subtitle && (
                  <p className="text-xs text-[#9ca3af] mt-1">{sectionsConfig.videos.subtitle}</p>
                )}
              </div>
              <span className="text-xs text-[#9ca3af]">{youtubeVideos.length} video(s)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {youtubeVideos.map((vid) => (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => setActiveVideo(vid)}
                  className="text-left rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:border-[#E3001B]/60 overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.45)] group cursor-pointer transition-all hover:-translate-y-1 flex flex-col"
                >
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-[#E3001B]/90 group-hover:scale-110 transition-transform flex items-center justify-center shadow-[0_0_25px_rgba(227,0,27,0.65)]">
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    {vid.featured && (
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-blue-600/85 text-[10px] font-bold uppercase tracking-wider text-white">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 flex-1">
                    <h3 className="font-bold text-sm sm:text-base text-white leading-snug line-clamp-2 group-hover:text-[#60a5fa] transition-colors">
                      {vid.title}
                    </h3>
                    {vid.channelName && (
                      <div className="text-xs text-[#9ca3af] mt-1.5 flex items-center gap-1.5">
                        <YouTubeIcon className="w-3.5 h-3.5 shrink-0" color="#FF0000" />
                        <span className="truncate">{vid.channelName}</span>
                      </div>
                    )}
                    {vid.description && (
                      <p className="text-xs text-[#71717a] mt-2 line-clamp-2">
                        {vid.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* EMBEDDED YOUTUBE PLAYER MODAL */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-[2200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            data-testid="youtube-player-modal"
            className="w-full max-w-[920px] rounded-[24px] bg-[#0d0d10]/90 backdrop-blur-xl border border-white/15 overflow-hidden shadow-[0_25px_75px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-white truncate">
                  {activeVideo.title}
                </h3>
                {activeVideo.channelName && (
                  <p className="text-xs text-[#9ca3af] truncate">{activeVideo.channelName}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeVideo.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white inline-flex items-center gap-1"
                >
                  <span>YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#E3001B] text-white flex items-center justify-center cursor-pointer transition-colors"
                  aria-label="Close video player"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                title={activeVideo.title}
                src={activeVideo.embedUrl}
                width="100%"
                height="100%"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      <Footer settings={settings} footerNav={footerNav} />
    </div>
  );
}
