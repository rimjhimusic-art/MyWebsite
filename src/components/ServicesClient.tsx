"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Music,
  Shield,
  Receipt,
  Star,
  PenTool,
  Megaphone,
  TrendingUp,
  Disc,
  Shirt,
  Network,
  Lock,
  Check,
  ArrowRight,
  Globe,
  Tv,
} from "lucide-react";
import { Navbar, type CmsBrandHeaderSettings, type CmsNavLink } from "@/components/Navbar";
import { Footer, type CmsFooterLink, type CmsFooterSettings } from "@/components/Footer";
import { YouTubeIcon } from "@/components/BrandIcons";
import { GOLDEX_12_SERVICES } from "@/lib/goldex-services";

export interface CmsServiceCardItem {
  id: string;
  title: string;
  shortDesc: string;
  detailsJson: string;
  iconKey: string;
  accentTheme: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
}

const ACCENT_MAP: Record<string, { idle: string; hover: string }> = {
  blue: {
    idle: "bg-[#e8f0fe] text-[#1a73e8]",
    hover: "group-hover:bg-[#1a73e8] group-hover:text-white",
  },
  red: {
    idle: "bg-[#fce8e6] text-[#ea4335]",
    hover: "group-hover:bg-[#ea4335] group-hover:text-white",
  },
  green: {
    idle: "bg-[#e6f4ea] text-[#34a853]",
    hover: "group-hover:bg-[#34a853] group-hover:text-white",
  },
  yellow: {
    idle: "bg-[#fef7e0] text-[#fbbc04]",
    hover: "group-hover:bg-[#fbbc04] group-hover:text-white",
  },
};

function renderServiceIcon(iconKey: string, isYoutubeRed = false) {
  switch (iconKey) {
    case "youtube":
      return (
        <YouTubeIcon
          className="w-[22px] h-[22px]"
          color={isYoutubeRed ? "#ea4335" : "currentColor"}
        />
      );
    case "shield-halved":
    case "shield":
      return <Shield className="w-5 h-5" />;
    case "file-invoice-dollar":
    case "dollar":
      return <Receipt className="w-5 h-5" />;
    case "star":
      return <Star className="w-5 h-5 fill-current" />;
    case "pen-nib":
      return <PenTool className="w-5 h-5" />;
    case "bullhorn":
      return <Megaphone className="w-5 h-5" />;
    case "chart-line":
      return <TrendingUp className="w-5 h-5" />;
    case "compact-disc":
      return <Disc className="w-5 h-5" />;
    case "shirt":
      return <Shirt className="w-5 h-5" />;
    case "sitemap":
      return <Network className="w-5 h-5" />;
    case "lock":
      return <Lock className="w-5 h-5" />;
    case "globe":
      return <Globe className="w-5 h-5" />;
    case "tv":
      return <Tv className="w-5 h-5" />;
    default:
      return <Music className="w-5 h-5" />;
  }
}

export function ServicesClient({
  user,
  services,
  heroTitle = "Premium Global Network",
  heroSubtitle = "A powerhouse infrastructure connecting independent artists and labels to the world's biggest digital platforms.",
  heroBg = "#1a73e8",
  ctaTitle = "Ready to Amplify Your Reach?",
  ctaSubtitle = "Join the fastest-growing distribution network and get your music heard globally.",
  ctaLabel = "Start Distributing Now",
  ctaHref = "/signup",
  settings,
  headerNav,
  footerNav,
  previewActive = false,
}: {
  user?: { name: string; role: string } | null;
  services: CmsServiceCardItem[];
  heroTitle?: string;
  heroSubtitle?: string;
  heroBg?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  settings?: Partial<CmsBrandHeaderSettings & CmsFooterSettings>;
  headerNav?: CmsNavLink[];
  footerNav?: CmsFooterLink[];
  previewActive?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Merge live CMS services with canonical 12-service catalog so all 12 categories and CTA links
  // are always present and cleanly ordered, while preserving any CMS customizations.
  const effectiveServices = useMemo<CmsServiceCardItem[]>(() => {
    const byTitle = new Map(
      services.map((s) => [s.title.trim().toLowerCase(), s])
    );

    const canonical: CmsServiceCardItem[] = GOLDEX_12_SERVICES.map((def, idx) => {
      const existing = byTitle.get(def.title.toLowerCase());
      if (existing) {
        return {
          ...existing,
          ctaLabel: existing.ctaLabel || def.ctaLabel,
          ctaHref: existing.ctaHref || def.ctaHref,
        };
      }
      return {
        id: `goldex-service-${idx + 1}`,
        title: def.title,
        shortDesc: def.shortDesc,
        detailsJson: JSON.stringify(def.details),
        iconKey: def.iconKey,
        accentTheme: def.accentTheme,
        ctaLabel: def.ctaLabel,
        ctaHref: def.ctaHref,
      };
    });

    // Include any extra custom CMS categories created beyond the 12 core ones
    const canonicalTitles = new Set(GOLDEX_12_SERVICES.map((d) => d.title.toLowerCase()));
    const legacyCombinedTitles = new Set([
      "rights management & content protection",
      "royalty, splits & payout management",
    ]);
    const extras = services.filter((s) => {
      const lower = s.title.trim().toLowerCase();
      return !canonicalTitles.has(lower) && !legacyCombinedTitles.has(lower);
    });

    return [...canonical, ...extras];
  }, [services]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124]">
      <Navbar
        user={user}
        variant="light-header"
        settings={settings}
        navItems={headerNav}
        previewActive={previewActive}
      />

      {/* Curved Blue Hero Header */}
      <section
        className="pt-[150px] pb-[90px] px-5 text-center text-white relative"
        style={{
          backgroundColor: heroBg,
          borderBottomLeftRadius: "50% 48px",
          borderBottomRightRadius: "50% 48px",
        }}
      >
        <div className="max-w-[780px] mx-auto">
          <h1 className="text-[2.2rem] sm:text-[3.2rem] font-extrabold mb-3.5 tracking-tight">
            {heroTitle}
          </h1>
          <p className="text-base sm:text-[1.15rem] text-white/95 leading-[1.6]">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* 12 Interactive Services Accordion Grid */}
      <section
        className="py-[70px] px-5 max-w-[1250px] mx-auto"
        style={{
          backgroundImage: "radial-gradient(#e0e6ed 1.25px, transparent 1.25px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"
          data-testid="services-accordion-grid"
        >
          {effectiveServices.map((service) => {
            const isOpen = openId === service.id;
            const panelId = `service-panel-${service.id}`;
            const accent = ACCENT_MAP[service.accentTheme] || ACCENT_MAP.blue;

            let details: string[] = [];
            try {
              const parsed = JSON.parse(service.detailsJson);
              if (Array.isArray(parsed)) details = parsed.map(String);
            } catch {
              details = [];
            }

            return (
              <div
                key={service.id}
                data-testid="service-accordion-card"
                data-open={isOpen ? "true" : "false"}
                className={`group bg-white rounded-[16px] px-6 py-5 border transition-all duration-300 shadow-[0_8px_28px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(26,115,232,0.12)] ${
                  isOpen
                    ? "border-2 border-[#1a73e8] shadow-[0_14px_34px_rgba(26,115,232,0.12)]"
                    : "border-[#f1f3f4] hover:border-[#e8f0fe]"
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenId(isOpen ? null : service.id)}
                  className="w-full flex items-center justify-between gap-3 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] rounded-lg"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-[44px] h-[44px] rounded-[12px] flex items-center justify-center shrink-0 transition-colors duration-300 ${
                        isOpen
                          ? accent.idle.replace(/bg-\[#[^\]]+\]\s*/, "bg-[#1a73e8] text-white ")
                          : `${accent.idle} ${accent.hover}`
                      }`}
                    >
                      {renderServiceIcon(
                        service.iconKey,
                        !isOpen && service.iconKey === "youtube"
                      )}
                    </div>
                    <h2 className="text-[1.03rem] font-semibold text-[#202124] leading-snug">
                      {service.title}
                    </h2>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 shrink-0 ${
                      isOpen
                        ? "rotate-180 text-[#1a73e8]"
                        : "text-[#9aa0a6] group-hover:text-[#1a73e8]"
                    }`}
                  />
                </button>

                <div
                  id={panelId}
                  aria-hidden={!isOpen}
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100 mt-4 pt-3.5 border-t border-[#f1f3f4]"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-3">
                      {service.imageUrl && (
                        <img
                          src={service.imageUrl}
                          alt={service.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      {service.shortDesc && (
                        <p className="text-xs text-[#5f6368] leading-relaxed">
                          {service.shortDesc}
                        </p>
                      )}
                      {details.length > 0 && (
                        <ul className="space-y-2">
                          {details.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2 text-[0.88rem] text-[#5f6368]"
                            >
                              <Check className="w-4 h-4 text-[#34a853] shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {service.ctaLabel && service.ctaHref && (
                        <div className="pt-1">
                          <Link
                            href={service.ctaHref}
                            tabIndex={isOpen ? 0 : -1}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#1a73e8] hover:underline"
                          >
                            <span>{service.ctaLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Strip */}
      <section
        className="py-[75px] px-5 text-center text-white mt-8 relative"
        style={{ backgroundColor: heroBg }}
      >
        <div className="max-w-[700px] mx-auto relative z-10">
          <h2 className="text-[2rem] sm:text-[2.4rem] font-extrabold mb-3">
            {ctaTitle}
          </h2>
          <p className="text-white/90 text-base mb-8">{ctaSubtitle}</p>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 bg-white text-[#1a73e8] font-bold text-sm px-8 py-3.5 rounded-full shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer settings={settings} footerNav={footerNav} />
    </div>
  );
}
