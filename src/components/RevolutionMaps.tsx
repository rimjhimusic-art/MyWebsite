"use client";

import React from "react";
import { ASSAM_SVG_PATH } from "@/lib/assam-map-path";
import { AnimatedStatBubbles } from "@/components/HomeInteractive";

// Geographically faithful Nepal border polygon (Mahakali NW -> Humla -> Mustang -> Sagarmatha -> Taplejung NE -> Mechi -> Tarai -> Dhangadhi)
const NEPAL_SVG_PATH =
  "M12 18 L28 11 L49 12 L63 23 L84 26 L98 40 L114 34 L134 45 L154 68 L175 73 L197 82 L219 82 L239 90 L246 106 L243 132 L226 138 L194 134 L168 128 L143 127 L122 117 L101 108 L80 103 L58 95 L38 82 L21 75 L15 54 L9 36 Z";

// Geographically faithful Bangladesh border polygon (Panchagarh -> Kurigram -> Jamalpur -> Sunamganj -> Sylhet -> Tripura indent -> Feni -> Chittagong Hill Tracts -> Teknaf -> Sundarbans delta -> Padma/Rajshahi)
const BANGLADESH_SVG_PATH =
  "M28 9 L44 12 L58 20 L63 40 L84 53 L114 61 L148 64 L173 71 L179 86 L165 103 L146 108 L136 122 L144 148 L158 153 L172 152 L183 173 L184 202 L175 225 L170 242 L162 238 L158 212 L152 192 L139 175 L125 182 L114 198 L98 197 L84 192 L69 194 L55 190 L47 170 L42 146 L31 124 L19 109 L11 94 L24 76 L31 54 L19 31 Z";

export function RevolutionMaps({ mediaUrl }: { mediaUrl?: string | null }) {
  return (
    <div
      className="flex-1 w-full flex flex-col sm:flex-row items-center justify-center gap-6 lg:gap-7"
      data-testid="regional-maps-container"
    >
      {/* MAIN INDIA MAP WITH SPECIAL ASSAM BIHU & GAMUSA THEME */}
      <div className="map-visual-wrapper" data-testid="india-map-panel">
        <img
          src={mediaUrl || "/ref/in.svg"}
          alt="India Map"
          className="india-map-base"
        />

        {/* Pixel-locked Assam Overlay clipped strictly to #INAS exact border from in.svg */}
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          data-testid="assam-gamusa-overlay"
          className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
        >
          <defs>
            <clipPath id="goldex-assam-clip">
              <path d={ASSAM_SVG_PATH} />
            </clipPath>
            <pattern
              id="goldex-assam-gamusa-pattern"
              width="26"
              height="26"
              patternUnits="userSpaceOnUse"
            >
              {/* Pure crisp Assamese white base */}
              <rect width="26" height="26" fill="#ffffff" />
              {/* Traditional woven Gamusa crimson borders */}
              <rect x="0" y="1" width="26" height="2.2" fill="#b91c1c" />
              <rect x="0" y="22.8" width="26" height="2.2" fill="#b91c1c" />
              <line x1="0" y1="4.5" x2="26" y2="4.5" stroke="#ef4444" strokeWidth="0.7" />
              <line x1="0" y1="21.5" x2="26" y2="21.5" stroke="#ef4444" strokeWidth="0.7" />
              {/* Handloom stepped teeth border motifs */}
              <path d="M0 7 L3 7 L3 9 L5 9 M26 7 L23 7 L23 9 L21 9" stroke="#dc2626" strokeWidth="0.9" fill="none" />
              <path d="M0 19 L3 19 L3 17 L5 17 M26 19 L23 19 L23 17 L21 17" stroke="#dc2626" strokeWidth="0.9" fill="none" />
              {/* Traditional Bihu / Gamusa Phul woven floral diamond */}
              <path
                d="M13 6.5 L16.2 9.8 L19.5 13 L16.2 16.2 L13 19.5 L9.8 16.2 L6.5 13 L9.8 9.8 Z"
                fill="#dc2626"
              />
              <path
                d="M13 9.2 L15 13 L13 16.8 L11 13 Z M9.2 13 L13 11 L16.8 13 L13 15 Z"
                fill="#ffffff"
              />
              <circle cx="13" cy="13" r="1.4" fill="#b91c1c" />
              <circle cx="2.5" cy="13" r="1.1" fill="#dc2626" />
              <circle cx="23.5" cy="13" r="1.1" fill="#dc2626" />
            </pattern>
          </defs>

          <g clipPath="url(#goldex-assam-clip)">
            <path d={ASSAM_SVG_PATH} fill="#ffffff" />
            <rect
              x="685"
              y="338"
              width="184"
              height="126"
              fill="url(#goldex-assam-gamusa-pattern)"
            />
          </g>
          <path
            d={ASSAM_SVG_PATH}
            fill="none"
            stroke="#b91c1c"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>

        {/* Existing 6 Blue Location Pointers on India Map */}
        <div className="city-marker" id="city-delhi">
          <span className="cm-label">New Delhi</span>
          <div className="cm-dot" />
        </div>
        <div className="city-marker" id="city-patna">
          <div className="cm-dot" />
          <span className="cm-label">Patna</span>
        </div>
        <div className="city-marker" id="city-assam">
          <div className="cm-dot" />
          <span className="cm-label bg-[#0f0f0f]/80 px-1.5 py-0.5 rounded">
            Assam
          </span>
        </div>
        <div className="city-marker" id="city-kolkata">
          <div className="cm-dot" />
          <span className="cm-label">Kolkata</span>
        </div>
        <div className="city-marker" id="city-mumbai">
          <span className="cm-label">Mumbai</span>
          <div className="cm-dot" />
        </div>
        <div className="city-marker" id="city-bengaluru">
          <span className="cm-label">Bengaluru</span>
          <div className="cm-dot" />
        </div>

        <AnimatedStatBubbles />
      </div>

      {/* NEPAL & BANGLADESH COMPANION GREEN COUNTRY MAPS WITH BLUE POINTERS */}
      <div
        className="w-full sm:w-[190px] lg:w-[200px] shrink-0 grid grid-cols-2 sm:grid-cols-1 gap-4"
        data-testid="neighbor-maps-column"
      >
        {/* NEPAL MAP */}
        <div
          data-testid="nepal-map-panel"
          className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex flex-col items-center justify-between shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
        >
          <span className="text-[11px] font-extrabold uppercase tracking-[1.4px] text-emerald-400 mb-2">
            Nepal
          </span>
          <div className="relative w-full aspect-[26/15] flex items-center justify-center">
            <svg
              viewBox="0 0 260 150"
              role="img"
              aria-label="Nepal Map"
              className="w-full h-full drop-shadow-[0_0_10px_rgba(34,197,94,0.22)]"
            >
              <path
                d={NEPAL_SVG_PATH}
                fill="#16a34a"
                stroke="#ffffff"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="city-marker"
              style={{ top: "61%", left: "60%" }}
              data-testid="nepal-blue-pointer"
            >
              <div className="cm-dot" />
              <span className="cm-label !text-[10px]">Kathmandu</span>
            </div>
          </div>
        </div>

        {/* BANGLADESH MAP */}
        <div
          data-testid="bangladesh-map-panel"
          className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex flex-col items-center justify-between shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
        >
          <span className="text-[11px] font-extrabold uppercase tracking-[1.4px] text-emerald-400 mb-2">
            Bangladesh
          </span>
          <div className="relative w-full max-w-[140px] aspect-[21/25] flex items-center justify-center">
            <svg
              viewBox="0 0 210 250"
              role="img"
              aria-label="Bangladesh Map"
              className="w-full h-full drop-shadow-[0_0_10px_rgba(34,197,94,0.22)]"
            >
              <path
                d={BANGLADESH_SVG_PATH}
                fill="#16a34a"
                stroke="#ffffff"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="city-marker"
              style={{ top: "46%", left: "48%" }}
              data-testid="bangladesh-blue-pointer"
            >
              <div className="cm-dot" />
              <span className="cm-label !text-[10px]">Dhaka</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
