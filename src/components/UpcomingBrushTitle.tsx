"use client";

import React, { useEffect, useRef } from "react";
import {
  DEFAULT_UPDATES_HERO_EXTENDED,
  getHeroFontCssStack,
  type HeroMulticolorAnimationConfig,
  type HeroUpcomingTypographyConfig,
} from "@/lib/updates-hero-config";

interface UpcomingBrushTitleProps {
  text: string;
  animationEnabled?: boolean;
  glowColor?: string;
  typography?: Partial<HeroUpcomingTypographyConfig>;
  multicolor?: Partial<HeroMulticolorAnimationConfig>;
  showInlineDots?: boolean;
  fontSizeOverridePx?: number;
  inheritFontSize?: boolean;
}

export function UpcomingSynchronizedDots({
  multicolor,
  typography,
  fontSizeOverridePx,
  standalone = false,
}: {
  multicolor?: Partial<HeroMulticolorAnimationConfig>;
  typography?: Partial<HeroUpcomingTypographyConfig>;
  fontSizeOverridePx?: number;
  standalone?: boolean;
}) {
  const mc = { ...DEFAULT_UPDATES_HERO_EXTENDED.multicolor, ...multicolor };
  const ty = { ...DEFAULT_UPDATES_HERO_EXTENDED.typography, ...typography };
  const fontStack = getHeroFontCssStack(ty.fontId);
  const colorTotalSec = Math.max(10, (mc.colorIntervalSeconds || 10) * 10);
  const dotsSec = Math.max(1.2, mc.dotsSpeedSeconds || 2.4);
  const dropSec = Math.max(6, mc.dropCycleSeconds || 13.5);

  return (
    <span
      data-testid="upcoming-dots-group"
      aria-hidden="true"
      style={{
        fontFamily: standalone ? fontStack : "inherit",
        fontSize: fontSizeOverridePx ? `${fontSizeOverridePx}px` : undefined,
        ...(standalone
          ? ({
              "--upcoming-color-total-sec": `${colorTotalSec}s`,
              "--upcoming-drop-sec": `${dropSec}s`,
            } as React.CSSProperties)
          : {}),
        ["--upcoming-dots-sec" as string]: `${dotsSec}s`,
        color: standalone && !mc.enabled ? "#f6d365" : "inherit",
      }}
      className={`inline-flex items-baseline gap-[0.09em] ${
        standalone
          ? `${mc.dropCycleEnabled ? "goldex-upcoming-breath" : ""} ${
              mc.enabled ? "goldex-upcoming-color" : ""
            }`
          : "ml-[0.14em]"
      }`}
    >
      <span
        data-testid="upcoming-dot-1"
        style={{ color: "inherit", textShadow: "inherit" }}
        className={`inline-block ${mc.dotsSequenceEnabled ? "goldex-upcoming-dot-1" : ""}`}
      >
        .
      </span>
      <span
        data-testid="upcoming-dot-2"
        style={{ color: "inherit", textShadow: "inherit" }}
        className={`inline-block ${mc.dotsSequenceEnabled ? "goldex-upcoming-dot-2" : ""}`}
      >
        .
      </span>
      <span
        data-testid="upcoming-dot-3"
        style={{ color: "inherit", textShadow: "inherit" }}
        className={`inline-block ${mc.dotsSequenceEnabled ? "goldex-upcoming-dot-3" : ""}`}
      >
        .
      </span>
    </span>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function UpcomingBrushTitle({
  text,
  animationEnabled = true,
  glowColor,
  typography,
  multicolor,
  showInlineDots = true,
  fontSizeOverridePx,
  inheritFontSize = false,
}: UpcomingBrushTitleProps) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const finePointerRef = useRef(false);
  const reducedMotionRef = useRef(false);

  const ty = { ...DEFAULT_UPDATES_HERO_EXTENDED.typography, ...typography };
  const mc = { ...DEFAULT_UPDATES_HERO_EXTENDED.multicolor, ...multicolor };

  const cleanText = (text || "UPCOMING").trim();
  const letters = Array.from(cleanText);
  const fontStack = getHeroFontCssStack(ty.fontId);
  const colorTotalSec = Math.max(10, (mc.colorIntervalSeconds || 10) * 10);
  const dropSec = Math.max(6, mc.dropCycleSeconds || 13.5);
  const dotsSec = Math.max(1.2, mc.dotsSpeedSeconds || 2.4);

  const useColorSync = animationEnabled && mc.enabled;
  const useDropCycle = animationEnabled && mc.dropCycleEnabled;
  const useMouseFloat = animationEnabled && mc.mouseFloatEnabled;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fineMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      finePointerRef.current = fineMq.matches;
      reducedMotionRef.current = reduceMq.matches;
    };
    sync();
    fineMq.addEventListener("change", sync);
    reduceMq.addEventListener("change", sync);
    return () => {
      fineMq.removeEventListener("change", sync);
      reduceMq.removeEventListener("change", sync);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const resetLetters = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    for (const el of letterRefs.current) {
      if (!el) continue;
      el.style.transform = "translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg) scale(1)";
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLHeadingElement>) => {
    if (!useMouseFloat || !finePointerRef.current || reducedMotionRef.current) return;
    if (e.pointerType === "touch") return;
    const host = containerRef.current;
    if (!host) return;

    const clientX = e.clientX;
    const clientY = e.clientY;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const normX = clamp((clientX - rect.left) / rect.width, 0, 1);
      const normY = clamp((clientY - rect.top) / rect.height, 0, 1);
      const total = Math.max(1, letters.length);

      letterRefs.current.forEach((el, idx) => {
        if (!el) return;
        const letterCenter = (idx + 0.5) / total;
        const deltaX = letterCenter - normX;
        const proximity = Math.max(0, 1 - Math.abs(deltaX) * 2.35);
        const ambientFactor = 0.25 + proximity * 0.75;

        const tx = clamp(deltaX * -9 * ambientFactor, -6, 6);
        const tyPx = clamp((-7.5 * proximity) + (normY - 0.5) * 9 * ambientFactor, -9, 6);
        const tz = Math.round(proximity * 22);
        const rotY = clamp(deltaX * 16 * proximity, -11, 11);
        const rotX = clamp((0.5 - normY) * 14 * proximity, -9, 9);
        const scale = 1 + proximity * 0.08;

        el.style.transform = `translate3d(${tx.toFixed(1)}px, ${tyPx.toFixed(1)}px, ${tz}px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      });
    });
  };

  const glowAlpha = Math.max(0.05, Math.min(0.65, (ty.glowIntensity ?? 70) / 140));
  const shadowStrength = Math.max(0.15, Math.min(1, (ty.textShadowIntensity ?? 75) / 100));

  return (
    <div
      className={`relative inline-flex items-center justify-center px-2 py-1 ${
        useDropCycle ? "goldex-upcoming-breath" : ""
      }`}
      style={{ "--upcoming-drop-sec": `${dropSec}s` } as React.CSSProperties}
    >
      {animationEnabled && (
        <span
          aria-hidden="true"
          data-testid="updates-hero-glow"
          className="goldex-red-hero-glow pointer-events-none absolute left-1/2 top-1/2 w-[125%] h-[155%] rounded-full blur-2xl -z-10"
          style={{
            opacity: glowAlpha,
            background: `radial-gradient(circle, rgba(246,211,101,${glowAlpha}) 0%, ${
              glowColor || "rgba(59,130,246,0.22)"
            }44 46%, transparent 76%)`,
          }}
        />
      )}

      {/* Unified color scope on <h1> so UPCOMING letters AND all 3 dots synchronize color identically */}
      <h1
        ref={containerRef}
        data-testid="updates-hero-heading"
        aria-label={cleanText}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetLetters}
        style={
          {
            perspective: "700px",
            fontFamily: fontStack,
            fontWeight: ty.fontWeight || 700,
            letterSpacing: `${ty.letterSpacing ?? 3}px`,
            textTransform: ty.textTransform || "uppercase",
            textAlign: ty.textAlign || "center",
            fontSize: fontSizeOverridePx
              ? `${fontSizeOverridePx}px`
              : inheritFontSize
              ? "1em"
              : undefined,
            fontStyle: ty.brushStyle ? "normal" : undefined,
            color: useColorSync ? undefined : "#f6d365",
            textShadow: useColorSync
              ? undefined
              : `0 -1px 1px rgba(255,255,255,${(0.55 * shadowStrength).toFixed(2)}), 0 4px 14px rgba(0,0,0,${(0.9 * shadowStrength).toFixed(2)}), 0 0 24px rgba(246,211,101,${glowAlpha.toFixed(2)})`,
            "--upcoming-color-total-sec": `${colorTotalSec}s`,
            "--upcoming-dots-sec": `${dotsSec}s`,
          } as React.CSSProperties
        }
        className={`leading-[1.08] select-none inline-flex items-baseline justify-center ${
          fontSizeOverridePx || inheritFontSize ? "" : "text-4xl sm:text-6xl lg:text-[4.85rem]"
        } ${useColorSync ? "goldex-upcoming-color" : ""}`}
      >
        <span
          className="inline-flex items-baseline"
          style={{
            color: "inherit",
            textShadow: "inherit",
            ...(ty.gradientEnabled
              ? {
                  WebkitTextStroke: "0.35px rgba(255,255,255,0.24)",
                  filter: `drop-shadow(0 2px 10px rgba(0,0,0,${(0.75 * shadowStrength).toFixed(2)}))`,
                }
              : {}),
          }}
        >
          {letters.map((char, idx) => (
            <span
              key={`${char}-${idx}`}
              ref={(el) => {
                letterRefs.current[idx] = el;
              }}
              data-testid="upcoming-letter"
              style={{
                color: "inherit",
                textShadow: "inherit",
                ...(useMouseFloat
                  ? { animationDelay: `${(idx * 0.14).toFixed(2)}s` }
                  : {}),
              }}
              className={`${useMouseFloat ? "goldex-upcoming-letter" : "inline-block"} ${
                char === " " ? "w-[0.32em]" : ""
              }`}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>

        {showInlineDots && (
          <UpcomingSynchronizedDots
            multicolor={{ ...mc, enabled: useColorSync }}
            typography={ty}
            standalone={false}
          />
        )}
      </h1>
    </div>
  );
}
