"use client";

import React from "react";

interface BubbleSpec {
  id: number;
  left: string;
  size: number;
  duration: string;
  delay: string;
  driftX: string;
  tone: "gold" | "silver" | "blue";
  opacity: number;
}

const BUBBLE_SPECS: BubbleSpec[] = [
  { id: 1, left: "4%", size: 12, duration: "19s", delay: "-4s", driftX: "18px", tone: "gold", opacity: 0.24 },
  { id: 2, left: "9%", size: 22, duration: "25s", delay: "-14s", driftX: "-14px", tone: "silver", opacity: 0.16 },
  { id: 3, left: "15%", size: 9, duration: "16s", delay: "-8s", driftX: "12px", tone: "blue", opacity: 0.22 },
  { id: 4, left: "21%", size: 28, duration: "28s", delay: "-20s", driftX: "-20px", tone: "gold", opacity: 0.14 },
  { id: 5, left: "27%", size: 14, duration: "21s", delay: "-3s", driftX: "16px", tone: "silver", opacity: 0.2 },
  { id: 6, left: "34%", size: 18, duration: "24s", delay: "-11s", driftX: "-12px", tone: "gold", opacity: 0.18 },
  { id: 7, left: "41%", size: 10, duration: "17s", delay: "-6s", driftX: "10px", tone: "blue", opacity: 0.24 },
  { id: 8, left: "48%", size: 24, duration: "27s", delay: "-17s", driftX: "-16px", tone: "silver", opacity: 0.14 },
  { id: 9, left: "54%", size: 13, duration: "20s", delay: "-2s", driftX: "14px", tone: "gold", opacity: 0.22 },
  { id: 10, left: "61%", size: 20, duration: "23s", delay: "-12s", driftX: "-14px", tone: "blue", opacity: 0.16 },
  { id: 11, left: "68%", size: 11, duration: "18s", delay: "-9s", driftX: "18px", tone: "silver", opacity: 0.22 },
  { id: 12, left: "74%", size: 26, duration: "29s", delay: "-22s", driftX: "-18px", tone: "gold", opacity: 0.15 },
  { id: 13, left: "81%", size: 15, duration: "22s", delay: "-7s", driftX: "12px", tone: "silver", opacity: 0.2 },
  { id: 14, left: "88%", size: 10, duration: "16.5s", delay: "-13s", driftX: "-10px", tone: "gold", opacity: 0.24 },
  { id: 15, left: "93%", size: 19, duration: "24.5s", delay: "-19s", driftX: "-15px", tone: "blue", opacity: 0.17 },
  { id: 16, left: "97%", size: 12, duration: "18.5s", delay: "-5s", driftX: "-12px", tone: "silver", opacity: 0.21 },
];

export function GlobalBubbleBackground() {
  return (
    <div
      aria-hidden="true"
      data-testid="global-live-bubbles"
      className="goldex-bubbles-layer fixed inset-0 overflow-hidden pointer-events-none select-none z-[25]"
    >
      {BUBBLE_SPECS.map((b) => (
        <span
          key={b.id}
          className={`goldex-bubble goldex-bubble--${b.tone}`}
          style={
            {
              left: b.left,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animationDuration: b.duration,
              animationDelay: b.delay,
              "--bubble-drift": b.driftX,
              "--bubble-opacity": String(b.opacity),
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
