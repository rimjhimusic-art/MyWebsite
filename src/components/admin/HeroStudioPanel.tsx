"use client";

import React, { useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Eye,
  Image as ImageIcon,
  Layers,
  Monitor,
  Move,
  Palette,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  X,
} from "lucide-react";
import {
  DEFAULT_UPDATES_HERO_EXTENDED,
  HERO_FONT_CATALOG,
  HERO_FONT_CATEGORIES,
  getHeroFontCssStack,
  type HeroAlign,
  type HeroBreakpoint,
  type HeroElementKey,
  type HeroFontCategory,
  type UpdatesHeroExtendedConfig,
} from "@/lib/updates-hero-config";
import { UpcomingBrushTitle, UpcomingSynchronizedDots } from "@/components/UpcomingBrushTitle";

export interface HeroFormState {
  title: string;
  subtitle: string;
  description: string;
  statusBadge: string;
  releaseDate: string;
  supportingLabelsText: string;
  additionalText: string;
  mediaUrl: string;
  bgColor: string;
  textColor: string;
  glowColor: string;
  subtitleColor: string;
  animationEnabled: boolean;
  spacing: "compact" | "normal" | "spacious";
  showFilterPills: boolean;
  enabled: boolean;
  extended: UpdatesHeroExtendedConfig;
}

type StudioSubTab = "general" | "glass" | "background" | "layout" | "typography" | "animations";

const ELEMENT_ORDER: HeroElementKey[] = [
  "latestRelease",
  "upcoming",
  "dots",
  "comingSoon",
  "releaseTitle",
  "releaseDescription",
  "exploreDrops",
];

function cloneExtended(src: UpdatesHeroExtendedConfig): UpdatesHeroExtendedConfig {
  return JSON.parse(JSON.stringify(src)) as UpdatesHeroExtendedConfig;
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#cbd5e1] font-medium">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
            }}
            className="w-16 px-2 py-0.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-right text-xs font-mono text-white"
          />
          {unit && <span className="text-[10px] text-[#71717a] w-5">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#3b82f6] cursor-pointer h-1.5"
      />
    </div>
  );
}

export function HeroStudioPanel({
  heroForm,
  setHeroForm,
  fallbackBgUrl,
  previewReleaseSubtitle,
  busy,
  onSave,
  onCancel,
  onResetDefaults,
  onOpenGallery,
}: {
  heroForm: HeroFormState;
  setHeroForm: React.Dispatch<React.SetStateAction<HeroFormState>>;
  fallbackBgUrl: string;
  previewReleaseSubtitle: string;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
  onResetDefaults: () => void;
  onOpenGallery: () => void;
}) {
  const [subTab, setSubTab] = useState<StudioSubTab>("general");
  const [simulateHover, setSimulateHover] = useState(false);
  const [activeBp, setActiveBp] = useState<HeroBreakpoint>("desktop");
  const [selectedEl, setSelectedEl] = useState<HeroElementKey>("upcoming");
  const [draggingKey, setDraggingKey] = useState<HeroElementKey | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x50: boolean; y50: boolean }>({ x50: false, y50: false });
  const [fontCategory, setFontCategory] = useState<HeroFontCategory | "All">("All");
  const [fontSearch, setFontSearch] = useState("");
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const ext = heroForm.extended || DEFAULT_UPDATES_HERO_EXTENDED;
  const effectiveBg = heroForm.mediaUrl || fallbackBgUrl || "/ref/abir.jpg";
  const currentBpEl = ext.elements[selectedEl][activeBp];

  const updateExt = (updater: (prev: UpdatesHeroExtendedConfig) => UpdatesHeroExtendedConfig) => {
    setHeroForm((prev) => ({
      ...prev,
      extended: updater(cloneExtended(prev.extended || DEFAULT_UPDATES_HERO_EXTENDED)),
    }));
  };

  const updateElCoord = (
    key: HeroElementKey,
    bp: HeroBreakpoint,
    patch: Partial<{ x: number; y: number; align: HeroAlign; fontSize: number; width: number; height: number }>
  ) => {
    updateExt((prev) => ({
      ...prev,
      elements: {
        ...prev.elements,
        [key]: {
          ...prev.elements[key],
          [bp]: {
            ...prev.elements[key][bp],
            ...patch,
          },
        },
      },
    }));
  };

  const updatePointerCoord = (clientX: number, clientY: number, key: HeroElementKey) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    let x = Math.round(((clientX - rect.left) / rect.width) * 1000) / 10;
    let y = Math.round(((clientY - rect.top) / rect.height) * 1000) / 10;
    x = Math.max(4, Math.min(96, x));
    y = Math.max(5, Math.min(95, y));

    const snapX = Math.abs(x - 50) <= 2.2;
    const snapY = Math.abs(y - 50) <= 2.2;
    if (snapX) x = 50;
    if (snapY) y = 50;
    setSnapGuides({ x50: snapX, y50: snapY });
    updateElCoord(key, activeBp, { x: Math.round(x), y: Math.round(y) });
  };

  const filteredFonts = HERO_FONT_CATALOG.filter((f) => {
    if (fontCategory !== "All" && f.category !== fontCategory) return false;
    if (fontSearch.trim() && !f.name.toLowerCase().includes(fontSearch.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const bg = ext.bgAppearance;
  const activeBrightness = simulateHover ? bg.hoverBrightness : bg.defaultBrightness;
  const activeContrast = simulateHover ? bg.hoverContrast : bg.defaultContrast;
  const activeOpacity = simulateHover ? bg.hoverOpacity : bg.defaultOpacity;
  const activeOverlay = simulateHover ? bg.hoverOverlay : bg.defaultOverlay;
  const activeBlur = simulateHover ? bg.hoverBlur : bg.defaultBlur;

  const ng = ext.navGlass;
  const dotsInline = ext.elements.dots.inlineWithHeading !== false;
  const supportLabels = (heroForm.supportingLabelsText || "UPCOMING, LATEST RELEASE, SPOTIFY, TRENDING, MUSIC")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Studio Sub-Navigation + Global Save/Cancel/Reset Action Bar */}
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "general", label: "Hero Text & Media", icon: ImageIcon },
              { id: "glass", label: "1. Navigation Glass", icon: Layers },
              { id: "background", label: "2. BG Appearance & Blur", icon: Eye },
              { id: "layout", label: "3. Position & Drag Editor", icon: Move },
              { id: "typography", label: "4. UPCOMING Fonts", icon: Type },
              { id: "animations", label: "5. Multicolor & Motion", icon: Palette },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`hero-studio-tab-${item.id}`}
                onClick={() => setSubTab(item.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active
                    ? "bg-[#3b82f6] text-white shadow-lg"
                    : "bg-[#0f0f0f] text-[#b0b0b8] border border-[#2a2a2a] hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            data-testid="hero-reset-defaults-btn"
            onClick={onResetDefaults}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Default
          </button>
          <button
            type="button"
            disabled={busy}
            data-testid="hero-cancel-btn"
            onClick={onCancel}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            data-testid="hero-save-publish-btn"
            onClick={onSave}
            className="px-4 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      </div>

      {/* Main Split: Left Controls (7 cols) + Right Live Preview / Visual Drag Canvas (5 or 7 cols for layout mode) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div
          className={`${
            subTab === "layout" ? "xl:col-span-5" : "xl:col-span-6"
          } rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-4`}
        >
          {/* PANEL 0: GENERAL TEXT & PHOTO */}
          {subTab === "general" && (
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Hero Copy, Release Details & Background Photo
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                    Main Heading (Default: UPCOMING)
                  </label>
                  <input
                    type="text"
                    value={heroForm.title}
                    onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                    Status Badge (e.g. Coming Soon)
                  </label>
                  <input
                    type="text"
                    value={heroForm.statusBadge}
                    onChange={(e) => setHeroForm({ ...heroForm, statusBadge: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                    Upcoming Release Title Override
                  </label>
                  <input
                    type="text"
                    placeholder="Leave blank to pull from active Hero Upcoming Release"
                    value={heroForm.subtitle}
                    onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                    Release Date Override
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={heroForm.releaseDate}
                    onChange={(e) => setHeroForm({ ...heroForm, releaseDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                  Supporting Micro-Labels (comma-separated, includes LATEST RELEASE)
                </label>
                <input
                  type="text"
                  value={heroForm.supportingLabelsText}
                  onChange={(e) => setHeroForm({ ...heroForm, supportingLabelsText: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                  Upcoming Release Description
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
                  Tagline (Default: EXPLORE FRESH DROPS)
                </label>
                <input
                  type="text"
                  placeholder="EXPLORE FRESH DROPS"
                  value={heroForm.additionalText}
                  onChange={(e) => setHeroForm({ ...heroForm, additionalText: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#9ca3af] mb-1">
                  Hero Background Photograph
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={heroForm.mediaUrl}
                    onChange={(e) => setHeroForm({ ...heroForm, mediaUrl: e.target.value })}
                    placeholder="/ref/abir.jpg or Gallery URL"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  />
                  <button
                    type="button"
                    onClick={onOpenGallery}
                    className="px-3 py-2 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-blue-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Gallery
                  </button>
                  {heroForm.mediaUrl && (
                    <button
                      type="button"
                      onClick={() => setHeroForm({ ...heroForm, mediaUrl: "" })}
                      className="px-3 py-2 rounded-xl bg-red-500/15 text-red-400 text-xs cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-[#9ca3af] mb-1">Hero Spacing</label>
                  <select
                    value={heroForm.spacing}
                    onChange={(e) =>
                      setHeroForm({ ...heroForm, spacing: e.target.value as "compact" | "normal" | "spacious" })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  >
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={heroForm.enabled}
                    onChange={(e) => setHeroForm({ ...heroForm, enabled: e.target.checked })}
                  />
                  Publish Hero
                </label>
                <label className="flex items-center gap-2 text-xs pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={heroForm.showFilterPills}
                    onChange={(e) => setHeroForm({ ...heroForm, showFilterPills: e.target.checked })}
                  />
                  Show Liquid Glass Nav
                </label>
              </div>
            </div>
          )}

          {/* PANEL 1: NAVIGATION GLASS APPEARANCE */}
          {subTab === "glass" && (
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Navigation Glass Appearance (Apple Liquid Glass)
              </h2>
              <p className="text-xs text-[#9ca3af]">
                Tune translucent tint, frosted backdrop blur, inner light reflections, and glass borders over the Hero photograph while keeping the 4-edge neon rim active.
              </p>

              <SliderField
                label="Glass Tint Opacity"
                value={ng.opacity}
                min={10}
                max={85}
                unit="%"
                onChange={(v) => updateExt((p) => ({ ...p, navGlass: { ...p.navGlass, opacity: v } }))}
              />
              <SliderField
                label="Backdrop Blur Intensity"
                value={ng.blurPx}
                min={4}
                max={36}
                unit="px"
                onChange={(v) => updateExt((p) => ({ ...p, navGlass: { ...p.navGlass, blurPx: v } }))}
              />
              <SliderField
                label="Inner Glass Reflection Highlight"
                value={ng.reflectionOpacity}
                min={0}
                max={80}
                unit="%"
                onChange={(v) => updateExt((p) => ({ ...p, navGlass: { ...p.navGlass, reflectionOpacity: v } }))}
              />
              <SliderField
                label="Refined Glass Border Opacity"
                value={ng.borderOpacity}
                min={5}
                max={70}
                unit="%"
                onChange={(v) => updateExt((p) => ({ ...p, navGlass: { ...p.navGlass, borderOpacity: v } }))}
              />
              <label className="flex items-center gap-2 text-xs pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ng.neonBorderEnabled}
                  onChange={(e) =>
                    updateExt((p) => ({
                      ...p,
                      navGlass: { ...p.navGlass, neonBorderEnabled: e.target.checked },
                    }))
                  }
                />
                Enable Red / Blue / Cyan Traveling Neon Outer Rim
              </label>
            </div>
          )}

          {/* PANEL 2: HERO BACKGROUND APPEARANCE CONTROL */}
          {subTab === "background" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  Hero Background Appearance Control
                </h2>
                <button
                  type="button"
                  data-testid="bg-appearance-reset-btn"
                  onClick={() =>
                    updateExt((p) => ({
                      ...p,
                      bgAppearance: { ...DEFAULT_UPDATES_HERO_EXTENDED.bgAppearance },
                    }))
                  }
                  className="text-[11px] text-blue-300 hover:underline cursor-pointer"
                >
                  Reset Initial Values
                </button>
              </div>

              <div className="rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] p-3.5 space-y-3">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                  A. Default Appearance (Before Hover)
                </h3>
                <SliderField
                  label="Default Brightness"
                  value={bg.defaultBrightness}
                  min={25}
                  max={140}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, defaultBrightness: v } }))
                  }
                />
                <SliderField
                  label="Default Contrast"
                  value={bg.defaultContrast}
                  min={40}
                  max={150}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, defaultContrast: v } }))
                  }
                />
                <SliderField
                  label="Default Opacity"
                  value={bg.defaultOpacity}
                  min={10}
                  max={100}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, defaultOpacity: v } }))
                  }
                />
                <SliderField
                  label="Default Dark Overlay Intensity"
                  value={bg.defaultOverlay}
                  min={0}
                  max={85}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, defaultOverlay: v } }))
                  }
                />
                <SliderField
                  label="Default Background Blur"
                  value={bg.defaultBlur}
                  min={0}
                  max={20}
                  step={0.5}
                  unit="px"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, defaultBlur: v } }))
                  }
                />
              </div>

              <div className="rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] p-3.5 space-y-3">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                  B. Mouse Hover Appearance
                </h3>
                <SliderField
                  label="Hover Brightness"
                  value={bg.hoverBrightness}
                  min={25}
                  max={150}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, hoverBrightness: v } }))
                  }
                />
                <SliderField
                  label="Hover Contrast"
                  value={bg.hoverContrast}
                  min={40}
                  max={150}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, hoverContrast: v } }))
                  }
                />
                <SliderField
                  label="Hover Opacity"
                  value={bg.hoverOpacity}
                  min={10}
                  max={100}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, hoverOpacity: v } }))
                  }
                />
                <SliderField
                  label="Hover Dark Overlay Intensity"
                  value={bg.hoverOverlay}
                  min={0}
                  max={85}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, hoverOverlay: v } }))
                  }
                />
                <SliderField
                  label="Hover Background Blur"
                  value={bg.hoverBlur}
                  min={0}
                  max={20}
                  step={0.5}
                  unit="px"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, hoverBlur: v } }))
                  }
                />
                <SliderField
                  label="Hover Transition Speed"
                  value={bg.transitionMs}
                  min={150}
                  max={1500}
                  step={50}
                  unit="ms"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, bgAppearance: { ...p.bgAppearance, transitionMs: v } }))
                  }
                />
              </div>
            </div>
          )}

          {/* PANEL 3: HERO CONTENT POSITION & LAYOUT CONTROL */}
          {subTab === "layout" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  Hero Content Position &amp; Layout Control
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    updateExt((p) => ({
                      ...p,
                      elements: cloneExtended(DEFAULT_UPDATES_HERO_EXTENDED).elements,
                    }))
                  }
                  className="text-[11px] text-blue-300 hover:underline cursor-pointer"
                >
                  Reset All Positions
                </button>
              </div>

              {/* Responsive Breakpoint Selector */}
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#0f0f0f] p-1 border border-[#2a2a2a]">
                {(
                  [
                    { id: "desktop", label: "Desktop", icon: Monitor },
                    { id: "tablet", label: "Tablet", icon: Tablet },
                    { id: "mobile", label: "Mobile", icon: Smartphone },
                  ] as const
                ).map((bp) => {
                  const Icon = bp.icon;
                  return (
                    <button
                      key={bp.id}
                      type="button"
                      data-testid={`hero-layout-bp-${bp.id}`}
                      onClick={() => setActiveBp(bp.id)}
                      className={`py-1.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer ${
                        activeBp === bp.id ? "bg-[#3b82f6] text-white" : "text-[#9ca3af] hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {bp.label}
                    </button>
                  );
                })}
              </div>

              {/* Element Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ELEMENT_ORDER.map((key) => {
                  const info = ext.elements[key];
                  const active = selectedEl === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      data-testid={`hero-el-select-${key}`}
                      onClick={() => setSelectedEl(key)}
                      className={`px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between border cursor-pointer ${
                        active
                          ? "bg-[#3b82f6]/20 border-[#3b82f6] text-white"
                          : "bg-[#0f0f0f] border-[#2a2a2a] text-[#b0b0b8] hover:text-white"
                      }`}
                    >
                      <span className="truncate">{info.label}</span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {info[activeBp].x}%,{info[activeBp].y}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Element Coordinates */}
              <div className="rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {ext.elements[selectedEl].label} ({activeBp.toUpperCase()})
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ext.elements[selectedEl].visible}
                      onChange={(e) =>
                        updateExt((p) => ({
                          ...p,
                          elements: {
                            ...p.elements,
                            [selectedEl]: { ...p.elements[selectedEl], visible: e.target.checked },
                          },
                        }))
                      }
                    />
                    Visible
                  </label>
                </div>

                {selectedEl === "dots" && (
                  <label className="flex items-center gap-2 text-xs text-cyan-200 cursor-pointer pb-1">
                    <input
                      type="checkbox"
                      checked={ext.elements.dots.inlineWithHeading !== false}
                      onChange={(e) =>
                        updateExt((p) => ({
                          ...p,
                          elements: {
                            ...p.elements,
                            dots: { ...p.elements.dots, inlineWithHeading: e.target.checked },
                          },
                        }))
                      }
                    />
                    Align inline right after UPCOMING (uncheck for independent X/Y drag)
                  </label>
                )}

                <SliderField
                  label="Horizontal Position (X)"
                  value={currentBpEl.x}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => updateElCoord(selectedEl, activeBp, { x: v })}
                />
                <SliderField
                  label="Vertical Position (Y)"
                  value={currentBpEl.y}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => updateElCoord(selectedEl, activeBp, { y: v })}
                />
                <SliderField
                  label="Font Size (0 = auto)"
                  value={currentBpEl.fontSize}
                  min={0}
                  max={130}
                  unit="px"
                  onChange={(v) => updateElCoord(selectedEl, activeBp, { fontSize: v })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <SliderField
                    label="Width (0 = auto)"
                    value={currentBpEl.width}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) => updateElCoord(selectedEl, activeBp, { width: v })}
                  />
                  <SliderField
                    label="Height (0 = auto)"
                    value={currentBpEl.height}
                    min={0}
                    max={300}
                    unit="px"
                    onChange={(v) => updateElCoord(selectedEl, activeBp, { height: v })}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#cbd5e1]">Alignment</span>
                  <div className="flex gap-1">
                    {(
                      [
                        { a: "left", icon: AlignLeft },
                        { a: "center", icon: AlignCenter },
                        { a: "right", icon: AlignRight },
                      ] as const
                    ).map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.a}
                          type="button"
                          onClick={() => updateElCoord(selectedEl, activeBp, { align: item.a })}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            currentBpEl.align === item.a
                              ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                              : "bg-[#18181b] border-[#2a2a2a] text-[#9ca3af]"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PANEL 4: UPCOMING TYPOGRAPHY & FONT CUSTOMIZATION */}
          {subTab === "typography" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  UPCOMING Typography &amp; Font Customization
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    updateExt((p) => ({
                      ...p,
                      typography: { ...DEFAULT_UPDATES_HERO_EXTENDED.typography },
                    }))
                  }
                  className="text-[11px] text-blue-300 hover:underline cursor-pointer"
                >
                  Reset Font Defaults
                </button>
              </div>
              <p className="text-[11px] text-[#9ca3af]">
                Affects ONLY the main UPCOMING heading across 30 selectable fonts in 10 categories.
              </p>

              {/* Category filter & search */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFontCategory("All")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                    fontCategory === "All" ? "bg-[#3b82f6] text-white" : "bg-[#0f0f0f] text-[#9ca3af]"
                  }`}
                >
                  All (30)
                </button>
                {HERO_FONT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFontCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      fontCategory === cat ? "bg-[#3b82f6] text-white" : "bg-[#0f0f0f] text-[#9ca3af] hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search font family..."
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />

              {/* Visual Font Gallery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {filteredFonts.map((f) => {
                  const selected = ext.typography.fontId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      data-testid={`hero-font-card-${f.id}`}
                      onClick={() =>
                        updateExt((p) => ({
                          ...p,
                          typography: { ...p.typography, fontId: f.id },
                        }))
                      }
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        selected
                          ? "bg-[#3b82f6]/20 border-[#3b82f6] ring-1 ring-[#3b82f6]/50"
                          : "bg-[#0f0f0f] border-[#2a2a2a] hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#9ca3af] mb-1">
                        <span className="font-semibold text-white">{f.name}</span>
                        <span>{f.category}</span>
                      </div>
                      <div
                        style={{ fontFamily: getHeroFontCssStack(f.id) }}
                        className="text-xl text-[#f6d365] tracking-wider truncate"
                      >
                        UPCOMING...
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{f.sampleNote}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <SliderField
                  label="Font Weight"
                  value={ext.typography.fontWeight}
                  min={400}
                  max={900}
                  step={100}
                  onChange={(v) => updateExt((p) => ({ ...p, typography: { ...p.typography, fontWeight: v } }))}
                />
                <SliderField
                  label="Letter Spacing"
                  value={ext.typography.letterSpacing}
                  min={-2}
                  max={24}
                  unit="px"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, typography: { ...p.typography, letterSpacing: v } }))
                  }
                />
                <SliderField
                  label="Text Shadow Depth"
                  value={ext.typography.textShadowIntensity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, typography: { ...p.typography, textShadowIntensity: v } }))
                  }
                />
                <SliderField
                  label="Glow Intensity"
                  value={ext.typography.glowIntensity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) =>
                    updateExt((p) => ({ ...p, typography: { ...p.typography, glowIntensity: v } }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <select
                  value={ext.typography.textTransform}
                  onChange={(e) =>
                    updateExt((p) => ({
                      ...p,
                      typography: {
                        ...p.typography,
                        textTransform: e.target.value as "uppercase" | "capitalize" | "none",
                      },
                    }))
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                >
                  <option value="uppercase">UPPERCASE</option>
                  <option value="capitalize">Capitalize</option>
                  <option value="none">As Typed</option>
                </select>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ext.typography.gradientEnabled}
                    onChange={(e) =>
                      updateExt((p) => ({
                        ...p,
                        typography: { ...p.typography, gradientEnabled: e.target.checked },
                      }))
                    }
                  />
                  Metallic Edge
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ext.typography.brushStyle}
                    onChange={(e) =>
                      updateExt((p) => ({
                        ...p,
                        typography: { ...p.typography, brushStyle: e.target.checked },
                      }))
                    }
                  />
                  Brush Flare
                </label>
              </div>
            </div>
          )}

          {/* PANEL 5: UPCOMING MULTICOLOR ANIMATION CONTROL */}
          {subTab === "animations" && (
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                UPCOMING &amp; Dots Synchronized Multicolor Animation Control
              </h2>
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a]">
                {[
                  { name: "Metallic Gold", c: "#f6d365" },
                  { name: "Electric Blue", c: "#3b82f6" },
                  { name: "Cyan", c: "#22d3ee" },
                  { name: "Purple", c: "#a855f7" },
                  { name: "Magenta", c: "#d946ef" },
                  { name: "Pink", c: "#ec4899" },
                  { name: "Orange", c: "#fb923c" },
                  { name: "Champagne", c: "#f3e2b3" },
                  { name: "Silver", c: "#d1d5db" },
                  { name: "Warm White", c: "#fff9eb" },
                ].map((swatch) => (
                  <span
                    key={swatch.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-zinc-300"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: swatch.c }} />
                    {swatch.name}
                  </span>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={ext.multicolor.enabled}
                  onChange={(e) =>
                    updateExt((p) => ({ ...p, multicolor: { ...p.multicolor, enabled: e.target.checked } }))
                  }
                />
                Enable Synchronized 10-Color Sequence Across UPCOMING + All 3 Dots
              </label>

              <SliderField
                label="Main Color Change Interval (~10s default)"
                value={ext.multicolor.colorIntervalSeconds}
                min={2}
                max={20}
                step={1}
                unit="s"
                onChange={(v) =>
                  updateExt((p) => ({ ...p, multicolor: { ...p.multicolor, colorIntervalSeconds: v } }))
                }
              />

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={ext.multicolor.dropCycleEnabled}
                  onChange={(e) =>
                    updateExt((p) => ({
                      ...p,
                      multicolor: { ...p.multicolor, dropCycleEnabled: e.target.checked },
                    }))
                  }
                />
                Enable Drop-Down Entrance &amp; Fade-Out Cycle
              </label>

              <SliderField
                label="Drop / Visibility / Fade Cycle Duration"
                value={ext.multicolor.dropCycleSeconds}
                min={6}
                max={24}
                step={0.5}
                unit="s"
                onChange={(v) =>
                  updateExt((p) => ({ ...p, multicolor: { ...p.multicolor, dropCycleSeconds: v } }))
                }
              />

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={ext.multicolor.dotsSequenceEnabled}
                  onChange={(e) =>
                    updateExt((p) => ({
                      ...p,
                      multicolor: { ...p.multicolor, dotsSequenceEnabled: e.target.checked },
                    }))
                  }
                />
                Enable Sequential 3-Dot Loop (1 → 2 → 3 → 1 → 2 → 3)
              </label>

              <SliderField
                label="Sequential Dot Cycle Duration"
                value={ext.multicolor.dotsSpeedSeconds}
                min={1.2}
                max={5}
                step={0.2}
                unit="s"
                onChange={(v) =>
                  updateExt((p) => ({ ...p, multicolor: { ...p.multicolor, dotsSpeedSeconds: v } }))
                }
              />

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={ext.multicolor.mouseFloatEnabled}
                  onChange={(e) =>
                    updateExt((p) => ({
                      ...p,
                      multicolor: { ...p.multicolor, mouseFloatEnabled: e.target.checked },
                    }))
                  }
                />
                Enable Individual Letter 3D Mouse Floating (Desktop) &amp; Mobile Float
              </label>
            </div>
          )}
        </div>

        {/* LIVE HERO PREVIEW + INTERACTIVE DRAG-AND-DROP STAGE */}
        <div className={`${subTab === "layout" ? "xl:col-span-7" : "xl:col-span-6"} space-y-2.5`}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Live Interactive Hero Preview</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 uppercase">
                {subTab === "layout" ? `Drag Mode (${activeBp})` : simulateHover ? "Hover State" : "Default State"}
              </span>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateHover}
                onChange={(e) => setSimulateHover(e.target.checked)}
              />
              Simulate Mouse Hover Photo Reveal
            </label>
          </div>

          <div
            onMouseEnter={() => setSimulateHover(true)}
            onMouseLeave={() => setSimulateHover(false)}
            className="relative rounded-2xl bg-[#050505] border border-white/15 overflow-hidden flex flex-col justify-between p-4 select-none"
            style={{
              minHeight: activeBp === "mobile" ? 470 : 420,
              maxWidth: activeBp === "mobile" ? 390 : activeBp === "tablet" ? 640 : "100%",
              marginInline: "auto",
            }}
          >
            {/* Background photograph with live Appearance filter */}
            <div className="goldex-hero-dissolve-mask pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src={effectiveBg}
                alt="Hero Studio Preview"
                className="w-full h-full object-contain object-center"
                style={{
                  filter: `brightness(${activeBrightness}%) contrast(${activeContrast}%) blur(${activeBlur}px)`,
                  opacity: activeOpacity / 100,
                  transition: `filter ${bg.transitionMs}ms cubic-bezier(0.22,1,0.36,1), opacity ${bg.transitionMs}ms ease`,
                }}
              />
            </div>

            {/* Live dark overlay */}
            <div
              className="pointer-events-none absolute inset-0 bg-[#050505]"
              style={{
                opacity: activeOverlay / 100,
                transition: `opacity ${bg.transitionMs}ms ease`,
              }}
            />

            {/* Interactive Positioned Elements Canvas */}
            <div
              ref={canvasRef}
              onPointerMove={(e) => {
                if (draggingKey) updatePointerCoord(e.clientX, e.clientY, draggingKey);
              }}
              onPointerUp={() => {
                setDraggingKey(null);
                setSnapGuides({ x50: false, y50: false });
              }}
              onPointerLeave={() => {
                setDraggingKey(null);
                setSnapGuides({ x50: false, y50: false });
              }}
              className="relative z-10 w-full flex-1 min-h-[300px]"
            >
              {/* Alignment guides in drag mode */}
              {snapGuides.x50 && (
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-cyan-400/70 z-30" />
              )}
              {snapGuides.y50 && (
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-cyan-400/70 z-30" />
              )}

              {/* Element 1: latestRelease */}
              {ext.elements.latestRelease.visible && (
                <div
                  onPointerDown={(e) => {
                    if (subTab !== "layout") return;
                    e.preventDefault();
                    setSelectedEl("latestRelease");
                    setDraggingKey("latestRelease");
                  }}
                  style={{
                    position: "absolute",
                    left: `${ext.elements.latestRelease[activeBp].x}%`,
                    top: `${ext.elements.latestRelease[activeBp].y}%`,
                    transform:
                      ext.elements.latestRelease[activeBp].align === "left"
                        ? "translate(0%, -50%)"
                        : ext.elements.latestRelease[activeBp].align === "right"
                        ? "translate(-100%, -50%)"
                        : "translate(-50%, -50%)",
                    fontSize: `${Math.max(8, ext.elements.latestRelease[activeBp].fontSize || 10)}px`,
                    width: ext.elements.latestRelease[activeBp].width > 0 ? `${ext.elements.latestRelease[activeBp].width}%` : "92%",
                  }}
                  className={`text-center tracking-[0.2em] uppercase text-zinc-200 ${
                    subTab === "layout" ? "cursor-grab active:cursor-grabbing" : ""
                  } ${selectedEl === "latestRelease" && subTab === "layout" ? "ring-1 ring-cyan-400 rounded px-1" : ""}`}
                >
                  {supportLabels.join(" / ")}
                </div>
              )}

              {/* Element 2: UPCOMING heading */}
              {ext.elements.upcoming.visible && (
                <div
                  onPointerDown={(e) => {
                    if (subTab !== "layout") return;
                    e.preventDefault();
                    setSelectedEl("upcoming");
                    setDraggingKey("upcoming");
                  }}
                  style={{
                    position: "absolute",
                    left: `${ext.elements.upcoming[activeBp].x}%`,
                    top: `${ext.elements.upcoming[activeBp].y}%`,
                    transform:
                      ext.elements.upcoming[activeBp].align === "left"
                        ? "translate(0%, -50%)"
                        : ext.elements.upcoming[activeBp].align === "right"
                        ? "translate(-100%, -50%)"
                        : "translate(-50%, -50%)",
                  }}
                  className={`z-20 ${subTab === "layout" ? "cursor-grab active:cursor-grabbing" : ""} ${
                    selectedEl === "upcoming" && subTab === "layout" ? "ring-1 ring-amber-400 rounded px-2" : ""
                  }`}
                >
                  <UpcomingBrushTitle
                    text={heroForm.title || "UPCOMING"}
                    animationEnabled={heroForm.animationEnabled}
                    glowColor={heroForm.glowColor}
                    typography={ext.typography}
                    multicolor={ext.multicolor}
                    showInlineDots={ext.elements.dots.visible && dotsInline}
                    fontSizeOverridePx={Math.round((ext.elements.upcoming[activeBp].fontSize || 58) * 0.62)}
                  />
                </div>
              )}

              {/* Element 3: Detached Dots when unlinked */}
              {ext.elements.dots.visible && !dotsInline && (
                <div
                  onPointerDown={(e) => {
                    if (subTab !== "layout") return;
                    e.preventDefault();
                    setSelectedEl("dots");
                    setDraggingKey("dots");
                  }}
                  style={{
                    position: "absolute",
                    left: `${ext.elements.dots[activeBp].x}%`,
                    top: `${ext.elements.dots[activeBp].y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`z-20 ${subTab === "layout" ? "cursor-grab active:cursor-grabbing" : ""} ${
                    selectedEl === "dots" && subTab === "layout" ? "ring-1 ring-amber-400 rounded px-1" : ""
                  }`}
                >
                  <UpcomingSynchronizedDots
                    multicolor={ext.multicolor}
                    typography={ext.typography}
                    standalone={true}
                    fontSizeOverridePx={Math.round((ext.elements.dots[activeBp].fontSize || 58) * 0.62)}
                  />
                </div>
              )}

              {/* Element 4: COMING SOON badge */}
              {ext.elements.comingSoon.visible && heroForm.statusBadge && (
                <div
                  onPointerDown={(e) => {
                    if (subTab !== "layout") return;
                    e.preventDefault();
                    setSelectedEl("comingSoon");
                    setDraggingKey("comingSoon");
                  }}
                  style={{
                    position: "absolute",
                    left: `${ext.elements.comingSoon[activeBp].x}%`,
                    top: `${ext.elements.comingSoon[activeBp].y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`${subTab === "layout" ? "cursor-grab active:cursor-grabbing" : ""} ${
                    selectedEl === "comingSoon" && subTab === "layout" ? "ring-1 ring-cyan-400 rounded-full" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/50 border border-white/15 text-[10px] font-bold uppercase text-red-300">
                    <Sparkles className="w-2.5 h-2.5 text-red-400" />
                    {heroForm.statusBadge}
                  </span>
                </div>
              )}

              {/* Element 5: releaseTitle */}
              {ext.elements.releaseTitle.visible && (
                <div
                  onPointerDown={(e) => {
                    if (subTab !== "layout") return;
                    e.preventDefault();
                    setSelectedEl("releaseTitle");
                    setDraggingKey("releaseTitle");
                  }}
                  style={{
                    position: "absolute",
                    left: `${ext.elements.releaseTitle[activeBp].x}%`,
                    top: `${ext.elements.releaseTitle[activeBp].y}%`,
                    transform: "translate(-50%, -50%)",
                    width: "86%",
                  }}
                  className={`text-center text-xs font-semibold text-white truncate ${
                    subTab === "layout" ? "cursor-grab active:cursor-grabbing" : ""
                  } ${selectedEl === "releaseTitle" && subTab === "layout" ? "ring-1 ring-cyan-400 rounded px-1" : ""}`}
                >
                  {heroForm.subtitle || previewReleaseSubtitle || "Next Wave Independent Premiere"}
                </div>
              )}

              {/* Element 6: releaseDescription */}
              {ext.elements.releaseDescription.visible && heroForm.description && (
                <div
                  onPointerDown={(e) => {
                    if (subTab !== "layout") return;
                    e.preventDefault();
                    setSelectedEl("releaseDescription");
                    setDraggingKey("releaseDescription");
                  }}
                  style={{
                    position: "absolute",
                    left: `${ext.elements.releaseDescription[activeBp].x}%`,
                    top: `${ext.elements.releaseDescription[activeBp].y}%`,
                    transform: "translate(-50%, -50%)",
                    width: "80%",
                  }}
                  className={`text-center text-[10px] text-zinc-300 line-clamp-2 ${
                    subTab === "layout" ? "cursor-grab active:cursor-grabbing" : ""
                  } ${selectedEl === "releaseDescription" && subTab === "layout" ? "ring-1 ring-cyan-400 rounded px-1" : ""}`}
                >
                  {heroForm.description}
                </div>
              )}

              {/* Element 7: EXPLORE FRESH DROPS */}
              {ext.elements.exploreDrops.visible && (
                <div
                  onPointerDown={(e) => {
                    if (subTab !== "layout") return;
                    e.preventDefault();
                    setSelectedEl("exploreDrops");
                    setDraggingKey("exploreDrops");
                  }}
                  style={{
                    position: "absolute",
                    left: `${ext.elements.exploreDrops[activeBp].x}%`,
                    top: `${ext.elements.exploreDrops[activeBp].y}%`,
                    transform: "translate(-50%, -50%)",
                    width: "86%",
                  }}
                  className={`text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200 ${
                    subTab === "layout" ? "cursor-grab active:cursor-grabbing" : ""
                  } ${selectedEl === "exploreDrops" && subTab === "layout" ? "ring-1 ring-cyan-400 rounded px-1" : ""}`}
                >
                  {heroForm.additionalText.trim() || "EXPLORE FRESH DROPS"}
                </div>
              )}
            </div>

            {/* Live Liquid Glass Nav Box Preview in Lower Portion */}
            {heroForm.showFilterPills && (
              <div
                className={`relative z-10 w-full mt-2 ${ng.neonBorderEnabled ? "goldex-neon-nav-wrap" : ""}`}
                style={
                  {
                    "--nav-glass-alpha": (ng.opacity / 100).toFixed(2),
                    "--nav-glass-blur": `${ng.blurPx}px`,
                    "--nav-glass-reflect": (ng.reflectionOpacity / 100).toFixed(2),
                    "--nav-glass-border": (ng.borderOpacity / 100).toFixed(2),
                  } as React.CSSProperties
                }
              >
                {ng.neonBorderEnabled && (
                  <div aria-hidden="true" className="goldex-neon-nav-border">
                    <div className="goldex-neon-nav-rotator" />
                  </div>
                )}
                <div
                  style={{
                    backdropFilter: `blur(${ng.blurPx}px) saturate(1.75) contrast(1.06)`,
                    WebkitBackdropFilter: `blur(${ng.blurPx}px) saturate(1.75) contrast(1.06)`,
                  }}
                  className="goldex-liquid-glass-nav rounded-[15px] px-2.5 py-2 flex flex-wrap items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-zinc-100"
                >
                  <span className="px-2 py-1 rounded-lg bg-[#ef4444] text-white">ALL UPDATES</span>
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/15">LATEST RELEASES</span>
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/15">SPOTIFY MUSIC</span>
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/15">TRENDING MUSIC</span>
                  <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/15">MUSIC VIDEOS</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
