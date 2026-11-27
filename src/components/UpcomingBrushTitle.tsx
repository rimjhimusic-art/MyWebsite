"use client";

import React, { useEffect, useRef } from "react";

interface UpcomingBrushTitleProps {
  text: string;
  animationEnabled?: boolean;
  glowColor?: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function UpcomingBrushTitle({
  text,
  animationEnabled = true,
  glowColor,
}: UpcomingBrushTitleProps) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const finePointerRef = useRef(false);
  const reducedMotionRef = useRef(false);

  const cleanText = (text || "UPCOMING").trim();
  const letters = Array.from(cleanText);

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
    if (!animationEnabled || !finePointerRef.current || reducedMotionRef.current) return;
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
        const ty = clamp((-7.5 * proximity) + (normY - 0.5) * 9 * ambientFactor, -9, 6);
        const tz = Math.round(proximity * 22);
        const rotY = clamp(deltaX * 16 * proximity, -11, 11);
        const rotX = clamp((0.5 - normY) * 14 * proximity, -9, 9);
        const scale = 1 + proximity * 0.08;

        el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, ${tz}px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      });
    });
  };

  return (
    <div className="relative inline-flex items-center justify-center px-2 py-1">
      {animationEnabled && (
        <span
          aria-hidden="true"
          data-testid="updates-hero-glow"
          className="goldex-red-hero-glow pointer-events-none absolute left-1/2 top-1/2 w-[125%] h-[155%] rounded-full blur-2xl -z-10"
          style={{
            background: `radial-gradient(circle, rgba(246,211,101,0.34) 0%, ${
              glowColor || "rgba(251,191,36,0.18)"
            }44 46%, transparent 76%)`,
          }}
        />
      )}

      <h1
        ref={containerRef}
        data-testid="updates-hero-heading"
        aria-label={cleanText}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetLetters}
        style={{ perspective: "700px" }}
        className={`font-brush text-5xl sm:text-7xl lg:text-[5rem] font-normal tracking-[0.06em] uppercase leading-[1.08] select-none inline-flex items-baseline justify-center ${
          animationEnabled ? "goldex-upcoming-breath" : ""
        }`}
      >
        <span
          className={`inline-flex items-baseline ${
            animationEnabled ? "goldex-upcoming-color" : "text-[#f6d365]"
          }`}
        >
          {letters.map((char, idx) => (
            <span
              key={`${char}-${idx}`}
              ref={(el) => {
                letterRefs.current[idx] = el;
              }}
              data-testid="upcoming-letter"
              style={
                animationEnabled
                  ? { animationDelay: `${(idx * 0.14).toFixed(2)}s` }
                  : undefined
              }
              className={`goldex-upcoming-letter ${char === " " ? "w-[0.32em]" : ""}`}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>

        {/* Animated Sequential Three Dots (1 -> 2 -> 3 -> 1 -> 2 -> 3) */}
        <span
          aria-hidden="true"
          className="inline-flex items-baseline gap-[0.09em] ml-[0.14em]"
        >
          <span
            data-testid="upcoming-dot-1"
            className={`inline-block text-[#f6d365] ${
              animationEnabled ? "goldex-upcoming-color goldex-upcoming-dot-1" : ""
            }`}
          >
            .
          </span>
          <span
            data-testid="upcoming-dot-2"
            className={`inline-block text-[#f6d365] ${
              animationEnabled ? "goldex-upcoming-color goldex-upcoming-dot-2" : ""
            }`}
          >
            .
          </span>
          <span
            data-testid="upcoming-dot-3"
            className={`inline-block text-[#f6d365] ${
              animationEnabled ? "goldex-upcoming-color goldex-upcoming-dot-3" : ""
            }`}
          >
            .
          </span>
        </span>
      </h1>
    </div>
  );
}
