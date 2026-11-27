export type HeroBreakpoint = "desktop" | "tablet" | "mobile";

export type HeroAlign = "left" | "center" | "right";

export type HeroElementKey =
  | "latestRelease"
  | "upcoming"
  | "dots"
  | "comingSoon"
  | "releaseTitle"
  | "releaseDescription"
  | "exploreDrops";

export interface HeroBreakpointCoords {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  align: HeroAlign;
  fontSize: number; // 0 = auto default, else px
  width: number; // 0 = auto, else % (10..100)
  height: number; // 0 = auto, else px
}

export interface HeroElementPositionConfig {
  label: string;
  visible: boolean;
  inlineWithHeading?: boolean; // used by "dots" so it locks inline cleanly by default or positions freely
  desktop: HeroBreakpointCoords;
  tablet: HeroBreakpointCoords;
  mobile: HeroBreakpointCoords;
}

export interface HeroNavGlassConfig {
  opacity: number; // 10..85 (%)
  blurPx: number; // 4..36 (px)
  reflectionOpacity: number; // 0..80 (%)
  borderOpacity: number; // 5..70 (%)
  neonBorderEnabled: boolean;
}

export interface HeroBgAppearanceConfig {
  defaultBrightness: number; // 25..140 (%)
  defaultContrast: number; // 40..150 (%)
  defaultOpacity: number; // 10..100 (%)
  defaultOverlay: number; // 0..85 (%)
  defaultBlur: number; // 0..20 (px)
  hoverBrightness: number; // 25..150 (%)
  hoverContrast: number; // 40..150 (%)
  hoverOpacity: number; // 10..100 (%)
  hoverOverlay: number; // 0..85 (%)
  hoverBlur: number; // 0..20 (px)
  transitionMs: number; // 150..1500 (ms)
}

export type HeroFontCategory =
  | "Premium Brush"
  | "Bold Brush"
  | "Artistic Handwritten"
  | "Futuristic"
  | "Modern Stylish"
  | "Bold Display"
  | "Elegant Serif"
  | "Standard Sans-Serif"
  | "Minimal Clean"
  | "Premium Decorative";

export interface HeroFontOption {
  id: string;
  name: string;
  category: HeroFontCategory;
  cssVar: string;
  fallback: string;
  supportsWeights: number[];
  sampleNote: string;
}

export interface HeroUpcomingTypographyConfig {
  fontId: string;
  fontWeight: number;
  letterSpacing: number; // -2..24 (px)
  textTransform: "uppercase" | "capitalize" | "none";
  textAlign: HeroAlign;
  textShadowIntensity: number; // 0..100 (%)
  glowIntensity: number; // 0..100 (%)
  gradientEnabled: boolean;
  brushStyle: boolean;
}

export interface HeroMulticolorAnimationConfig {
  enabled: boolean;
  colorIntervalSeconds: number; // 2..20s per color shift (default 10s -> 100s full 10-color loop)
  dropCycleEnabled: boolean;
  dropCycleSeconds: number; // 6..24s (default 13.5s)
  dotsSequenceEnabled: boolean;
  dotsSpeedSeconds: number; // 1.2..5s (default 2.4s)
  mouseFloatEnabled: boolean;
}

export interface UpdatesHeroExtendedConfig {
  navGlass: HeroNavGlassConfig;
  bgAppearance: HeroBgAppearanceConfig;
  elements: Record<HeroElementKey, HeroElementPositionConfig>;
  typography: HeroUpcomingTypographyConfig;
  multicolor: HeroMulticolorAnimationConfig;
}

export const HERO_FONT_CATEGORIES: HeroFontCategory[] = [
  "Premium Brush",
  "Bold Brush",
  "Artistic Handwritten",
  "Futuristic",
  "Modern Stylish",
  "Bold Display",
  "Elegant Serif",
  "Standard Sans-Serif",
  "Minimal Clean",
  "Premium Decorative",
];

export const HERO_FONT_CATALOG: HeroFontOption[] = [
  // 1. Premium Brush Fonts
  { id: "kaushan-script", name: "Kaushan Script", category: "Premium Brush", cssVar: "--font-kaushan-script", fallback: "cursive", supportsWeights: [400], sampleNote: "Artistic fluid brush" },
  { id: "permanent-marker", name: "Permanent Marker", category: "Premium Brush", cssVar: "--font-permanent-marker", fallback: "cursive", supportsWeights: [400], sampleNote: "Expressive studio marker" },
  { id: "caveat-brush", name: "Caveat Brush", category: "Premium Brush", cssVar: "--font-caveat-brush", fallback: "cursive", supportsWeights: [400], sampleNote: "Organic textured brush" },
  // 2. Bold Brush Fonts
  { id: "rubik-wet-paint", name: "Rubik Wet Paint", category: "Bold Brush", cssVar: "--font-rubik-wet-paint", fallback: "display", supportsWeights: [400], sampleNote: "Heavy paint stroke" },
  { id: "shrikhand", name: "Shrikhand", category: "Bold Brush", cssVar: "--font-shrikhand", fallback: "serif", supportsWeights: [400], sampleNote: "Thick poster script" },
  { id: "sedgwick-ave-display", name: "Sedgwick Ave Display", category: "Bold Brush", cssVar: "--font-sedgwick-ave", fallback: "cursive", supportsWeights: [400], sampleNote: "Street calligraphy flare" },
  // 3. Artistic Handwritten Fonts
  { id: "caveat", name: "Caveat", category: "Artistic Handwritten", cssVar: "--font-caveat", fallback: "cursive", supportsWeights: [400, 500, 600, 700], sampleNote: "Signature natural hand" },
  { id: "dancing-script", name: "Dancing Script", category: "Artistic Handwritten", cssVar: "--font-dancing-script", fallback: "cursive", supportsWeights: [400, 500, 600, 700], sampleNote: "Lively flowing script" },
  { id: "pacifico", name: "Pacifico", category: "Artistic Handwritten", cssVar: "--font-pacifico", fallback: "cursive", supportsWeights: [400], sampleNote: "Retro surf brush" },
  // 4. Futuristic Fonts
  { id: "orbitron", name: "Orbitron", category: "Futuristic", cssVar: "--font-orbitron", fallback: "sans-serif", supportsWeights: [400, 500, 600, 700, 800, 900], sampleNote: "Geometric sci-fi" },
  { id: "audiowide", name: "Audiowide", category: "Futuristic", cssVar: "--font-audiowide", fallback: "sans-serif", supportsWeights: [400], sampleNote: "Music-tech wide geometry" },
  { id: "michroma", name: "Michroma", category: "Futuristic", cssVar: "--font-michroma", fallback: "sans-serif", supportsWeights: [400], sampleNote: "Wide precision display" },
  // 5. Modern Stylish Fonts
  { id: "syne", name: "Syne", category: "Modern Stylish", cssVar: "--font-syne", fallback: "sans-serif", supportsWeights: [400, 500, 600, 700, 800], sampleNote: "Avant-garde editorial" },
  { id: "outfit", name: "Outfit", category: "Modern Stylish", cssVar: "--font-outfit", fallback: "sans-serif", supportsWeights: [300, 400, 500, 600, 700, 800], sampleNote: "Clean neo-grotesque" },
  { id: "righteous", name: "Righteous", category: "Modern Stylish", cssVar: "--font-righteous", fallback: "sans-serif", supportsWeights: [400], sampleNote: "Smooth modern curves" },
  // 6. Bold Display Fonts
  { id: "bebas-neue", name: "Bebas Neue", category: "Bold Display", cssVar: "--font-bebas-neue", fallback: "sans-serif", supportsWeights: [400], sampleNote: "Tall cinema poster" },
  { id: "anton", name: "Anton", category: "Bold Display", cssVar: "--font-anton", fallback: "sans-serif", supportsWeights: [400], sampleNote: "High-impact block" },
  { id: "oswald", name: "Oswald", category: "Bold Display", cssVar: "--font-oswald", fallback: "sans-serif", supportsWeights: [400, 500, 600, 700], sampleNote: "Condensed punchy caps" },
  // 7. Elegant Serif Fonts
  { id: "cinzel", name: "Cinzel", category: "Elegant Serif", cssVar: "--font-cinzel", fallback: "serif", supportsWeights: [400, 500, 600, 700, 800, 900], sampleNote: "Imperial luxury caps" },
  { id: "playfair-display", name: "Playfair Display", category: "Elegant Serif", cssVar: "--font-playfair-display", fallback: "serif", supportsWeights: [400, 500, 600, 700, 800, 900], sampleNote: "High-fashion editorial" },
  { id: "cormorant-garamond", name: "Cormorant Garamond", category: "Elegant Serif", cssVar: "--font-cormorant-garamond", fallback: "serif", supportsWeights: [400, 500, 600, 700], sampleNote: "Delicate timeless serif" },
  // 8. Standard Sans-Serif Fonts
  { id: "montserrat", name: "Montserrat", category: "Standard Sans-Serif", cssVar: "--font-montserrat", fallback: "sans-serif", supportsWeights: [400, 500, 600, 700, 800, 900], sampleNote: "Balanced modern classic" },
  { id: "poppins", name: "Poppins", category: "Standard Sans-Serif", cssVar: "--font-poppins", fallback: "sans-serif", supportsWeights: [400, 500, 600, 700, 800, 900], sampleNote: "Geometric friendly sans" },
  { id: "inter", name: "Inter", category: "Standard Sans-Serif", cssVar: "--font-inter", fallback: "sans-serif", supportsWeights: [400, 500, 600, 700, 800, 900], sampleNote: "Clean Apple-UI neutral" },
  // 9. Minimal Clean Fonts
  { id: "space-grotesk", name: "Space Grotesk", category: "Minimal Clean", cssVar: "--font-space-grotesk", fallback: "sans-serif", supportsWeights: [400, 500, 600, 700], sampleNote: "Minimal tech character" },
  { id: "plus-jakarta-sans", name: "Plus Jakarta Sans", category: "Minimal Clean", cssVar: "--font-plus-jakarta", fallback: "sans-serif", supportsWeights: [400, 500, 600, 700, 800], sampleNote: "Crisp architectural sans" },
  { id: "dm-sans", name: "DM Sans", category: "Minimal Clean", cssVar: "--font-dm-sans", fallback: "sans-serif", supportsWeights: [400, 500, 600, 700], sampleNote: "Soft minimal geometry" },
  // 10. Premium Decorative Fonts
  { id: "bungee", name: "Bungee", category: "Premium Decorative", cssVar: "--font-bungee", fallback: "display", supportsWeights: [400], sampleNote: "Bold urban sign display" },
  { id: "black-ops-one", name: "Black Ops One", category: "Premium Decorative", cssVar: "--font-black-ops-one", fallback: "display", supportsWeights: [400], sampleNote: "Stenciled festival impact" },
  { id: "cinzel-decorative", name: "Cinzel Decorative", category: "Premium Decorative", cssVar: "--font-cinzel-decorative", fallback: "serif", supportsWeights: [400, 700, 900], sampleNote: "Ornate crown swashes" },
];

export const HERO_FONT_MAP: Record<string, HeroFontOption> = Object.fromEntries(
  HERO_FONT_CATALOG.map((f) => [f.id, f])
);

export function getHeroFontCssStack(fontId?: string): string {
  const opt = (fontId && HERO_FONT_MAP[fontId]) || HERO_FONT_MAP["kaushan-script"];
  return `var(${opt.cssVar}), "${opt.name}", var(--font-outfit), ${opt.fallback}`;
}

export const DEFAULT_UPDATES_HERO_EXTENDED: UpdatesHeroExtendedConfig = {
  navGlass: {
    opacity: 38,
    blurPx: 18,
    reflectionOpacity: 28,
    borderOpacity: 24,
    neonBorderEnabled: true,
  },
  bgAppearance: {
    defaultBrightness: 75,
    defaultContrast: 90,
    defaultOpacity: 100,
    defaultOverlay: 30,
    defaultBlur: 3,
    hoverBrightness: 100,
    hoverContrast: 100,
    hoverOpacity: 100,
    hoverOverlay: 0,
    hoverBlur: 0,
    transitionMs: 650,
  },
  elements: {
    latestRelease: {
      label: "LATEST RELEASE / Micro Labels",
      visible: true,
      desktop: { x: 50, y: 12, align: "center", fontSize: 11, width: 92, height: 0 },
      tablet: { x: 50, y: 11, align: "center", fontSize: 10, width: 94, height: 0 },
      mobile: { x: 50, y: 9, align: "center", fontSize: 9, width: 96, height: 0 },
    },
    upcoming: {
      label: "UPCOMING Heading",
      visible: true,
      desktop: { x: 50, y: 34, align: "center", fontSize: 78, width: 92, height: 0 },
      tablet: { x: 50, y: 31, align: "center", fontSize: 62, width: 94, height: 0 },
      mobile: { x: 50, y: 27, align: "center", fontSize: 44, width: 96, height: 0 },
    },
    dots: {
      label: "Three Animated Dots",
      visible: true,
      inlineWithHeading: true,
      desktop: { x: 76, y: 34, align: "center", fontSize: 78, width: 0, height: 0 },
      tablet: { x: 78, y: 31, align: "center", fontSize: 62, width: 0, height: 0 },
      mobile: { x: 84, y: 27, align: "center", fontSize: 44, width: 0, height: 0 },
    },
    comingSoon: {
      label: "COMING SOON Badge",
      visible: true,
      desktop: { x: 50, y: 55, align: "center", fontSize: 11, width: 88, height: 0 },
      tablet: { x: 50, y: 51, align: "center", fontSize: 10, width: 92, height: 0 },
      mobile: { x: 50, y: 46, align: "center", fontSize: 10, width: 94, height: 0 },
    },
    releaseTitle: {
      label: "Upcoming Release Title & Artist",
      visible: true,
      desktop: { x: 50, y: 67, align: "center", fontSize: 14, width: 86, height: 0 },
      tablet: { x: 50, y: 63, align: "center", fontSize: 13, width: 90, height: 0 },
      mobile: { x: 50, y: 58, align: "center", fontSize: 12, width: 94, height: 0 },
    },
    releaseDescription: {
      label: "Upcoming Release Description",
      visible: true,
      desktop: { x: 50, y: 79, align: "center", fontSize: 12, width: 72, height: 0 },
      tablet: { x: 50, y: 76, align: "center", fontSize: 12, width: 84, height: 0 },
      mobile: { x: 50, y: 73, align: "center", fontSize: 11, width: 92, height: 0 },
    },
    exploreDrops: {
      label: "EXPLORE FRESH DROPS Tagline",
      visible: true,
      desktop: { x: 50, y: 91, align: "center", fontSize: 11, width: 86, height: 0 },
      tablet: { x: 50, y: 90, align: "center", fontSize: 10, width: 90, height: 0 },
      mobile: { x: 50, y: 89, align: "center", fontSize: 10, width: 94, height: 0 },
    },
  },
  typography: {
    fontId: "kaushan-script",
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    textShadowIntensity: 75,
    glowIntensity: 70,
    gradientEnabled: true,
    brushStyle: true,
  },
  multicolor: {
    enabled: true,
    colorIntervalSeconds: 10,
    dropCycleEnabled: true,
    dropCycleSeconds: 13.5,
    dotsSequenceEnabled: true,
    dotsSpeedSeconds: 2.4,
    mouseFloatEnabled: true,
  },
};

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normAlign(v: unknown, fallback: HeroAlign): HeroAlign {
  return v === "left" || v === "center" || v === "right" ? v : fallback;
}

function normBreakpointCoords(
  raw: unknown,
  def: HeroBreakpointCoords
): HeroBreakpointCoords {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    x: clampNum(o.x, 0, 100, def.x),
    y: clampNum(o.y, 0, 100, def.y),
    align: normAlign(o.align, def.align),
    fontSize: clampNum(o.fontSize, 0, 140, def.fontSize),
    width: clampNum(o.width, 0, 100, def.width),
    height: clampNum(o.height, 0, 600, def.height),
  };
}

export function normalizeUpdatesHeroExtended(raw: unknown): UpdatesHeroExtendedConfig {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const ng = src.navGlass && typeof src.navGlass === "object" ? (src.navGlass as Record<string, unknown>) : {};
  const bg = src.bgAppearance && typeof src.bgAppearance === "object" ? (src.bgAppearance as Record<string, unknown>) : {};
  const els = src.elements && typeof src.elements === "object" ? (src.elements as Record<string, unknown>) : {};
  const ty = src.typography && typeof src.typography === "object" ? (src.typography as Record<string, unknown>) : {};
  const mc = src.multicolor && typeof src.multicolor === "object" ? (src.multicolor as Record<string, unknown>) : {};

  const d = DEFAULT_UPDATES_HERO_EXTENDED;

  const elements = {} as Record<HeroElementKey, HeroElementPositionConfig>;
  (Object.keys(d.elements) as HeroElementKey[]).forEach((key) => {
    const defEl = d.elements[key];
    const rawEl = els[key] && typeof els[key] === "object" ? (els[key] as Record<string, unknown>) : {};
    elements[key] = {
      label: typeof rawEl.label === "string" && rawEl.label.trim() ? rawEl.label.trim() : defEl.label,
      visible: typeof rawEl.visible === "boolean" ? rawEl.visible : defEl.visible,
      ...(key === "dots"
        ? {
            inlineWithHeading:
              typeof rawEl.inlineWithHeading === "boolean"
                ? rawEl.inlineWithHeading
                : defEl.inlineWithHeading ?? true,
          }
        : {}),
      desktop: normBreakpointCoords(rawEl.desktop, defEl.desktop),
      tablet: normBreakpointCoords(rawEl.tablet, defEl.tablet),
      mobile: normBreakpointCoords(rawEl.mobile, defEl.mobile),
    };
  });

  const fontId =
    typeof ty.fontId === "string" && HERO_FONT_MAP[ty.fontId]
      ? ty.fontId
      : d.typography.fontId;

  return {
    navGlass: {
      opacity: clampNum(ng.opacity, 10, 85, d.navGlass.opacity),
      blurPx: clampNum(ng.blurPx, 4, 36, d.navGlass.blurPx),
      reflectionOpacity: clampNum(ng.reflectionOpacity, 0, 80, d.navGlass.reflectionOpacity),
      borderOpacity: clampNum(ng.borderOpacity, 5, 70, d.navGlass.borderOpacity),
      neonBorderEnabled:
        typeof ng.neonBorderEnabled === "boolean"
          ? ng.neonBorderEnabled
          : d.navGlass.neonBorderEnabled,
    },
    bgAppearance: {
      defaultBrightness: clampNum(bg.defaultBrightness, 25, 140, d.bgAppearance.defaultBrightness),
      defaultContrast: clampNum(bg.defaultContrast, 40, 150, d.bgAppearance.defaultContrast),
      defaultOpacity: clampNum(bg.defaultOpacity, 10, 100, d.bgAppearance.defaultOpacity),
      defaultOverlay: clampNum(bg.defaultOverlay, 0, 85, d.bgAppearance.defaultOverlay),
      defaultBlur: clampNum(bg.defaultBlur, 0, 20, d.bgAppearance.defaultBlur),
      hoverBrightness: clampNum(bg.hoverBrightness, 25, 150, d.bgAppearance.hoverBrightness),
      hoverContrast: clampNum(bg.hoverContrast, 40, 150, d.bgAppearance.hoverContrast),
      hoverOpacity: clampNum(bg.hoverOpacity, 10, 100, d.bgAppearance.hoverOpacity),
      hoverOverlay: clampNum(bg.hoverOverlay, 0, 85, d.bgAppearance.hoverOverlay),
      hoverBlur: clampNum(bg.hoverBlur, 0, 20, d.bgAppearance.hoverBlur),
      transitionMs: clampNum(bg.transitionMs, 150, 1500, d.bgAppearance.transitionMs),
    },
    elements,
    typography: {
      fontId,
      fontWeight: clampNum(ty.fontWeight, 300, 900, d.typography.fontWeight),
      letterSpacing: clampNum(ty.letterSpacing, -2, 24, d.typography.letterSpacing),
      textTransform:
        ty.textTransform === "uppercase" ||
        ty.textTransform === "capitalize" ||
        ty.textTransform === "none"
          ? ty.textTransform
          : d.typography.textTransform,
      textAlign: normAlign(ty.textAlign, d.typography.textAlign),
      textShadowIntensity: clampNum(ty.textShadowIntensity, 0, 100, d.typography.textShadowIntensity),
      glowIntensity: clampNum(ty.glowIntensity, 0, 100, d.typography.glowIntensity),
      gradientEnabled:
        typeof ty.gradientEnabled === "boolean" ? ty.gradientEnabled : d.typography.gradientEnabled,
      brushStyle:
        typeof ty.brushStyle === "boolean" ? ty.brushStyle : d.typography.brushStyle,
    },
    multicolor: {
      enabled: typeof mc.enabled === "boolean" ? mc.enabled : d.multicolor.enabled,
      colorIntervalSeconds: clampNum(mc.colorIntervalSeconds, 2, 20, d.multicolor.colorIntervalSeconds),
      dropCycleEnabled:
        typeof mc.dropCycleEnabled === "boolean" ? mc.dropCycleEnabled : d.multicolor.dropCycleEnabled,
      dropCycleSeconds: clampNum(mc.dropCycleSeconds, 6, 24, d.multicolor.dropCycleSeconds),
      dotsSequenceEnabled:
        typeof mc.dotsSequenceEnabled === "boolean"
          ? mc.dotsSequenceEnabled
          : d.multicolor.dotsSequenceEnabled,
      dotsSpeedSeconds: clampNum(mc.dotsSpeedSeconds, 1.2, 5, d.multicolor.dotsSpeedSeconds),
      mouseFloatEnabled:
        typeof mc.mouseFloatEnabled === "boolean" ? mc.mouseFloatEnabled : d.multicolor.mouseFloatEnabled,
    },
  };
}
