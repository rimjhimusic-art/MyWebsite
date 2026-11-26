import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ShieldCheck,
  Sliders,
  Disc3,
  BadgeDollarSign,
  Globe,
  Tv,
  ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsSiteData();
  const seo = cms.seoMap["control"];
  return {
    title: seo?.metaTitle || `Distribution Control - ${cms.settings.siteName}`,
    description: seo?.metaDescription || "Rights management and catalog ownership control.",
  };
}

function getControlIcon(iconKey: string) {
  switch (iconKey) {
    case "disc":
      return Disc3;
    case "dollar":
      return BadgeDollarSign;
    case "sliders":
      return Sliders;
    case "tv":
      return Tv;
    case "globe":
      return Globe;
    default:
      return ShieldCheck;
  }
}

export default async function ControlPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const [user, cms] = await Promise.all([
    getCurrentUser(),
    getCmsSiteData({ preview: sp.preview === "1" }),
  ]);

  const heroSec = cms.sectionMap["control"]?.["hero"];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar
        user={user}
        settings={cms.settings}
        navItems={cms.headerNav}
        previewActive={cms.previewActive}
      />

      <section className="pt-[150px] pb-[60px] px-5 text-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)]">
        <div className="max-w-[900px] mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-[2px] text-[#3b82f6] mb-4">
            {heroSec?.badgeText || "100% Creative & Rights Authority"}
          </span>
          <h1 className="text-[2.4rem] sm:text-[3.5rem] font-extrabold leading-[1.1]">
            {heroSec?.title && heroSec.title !== "Total Distribution Control" ? (
              heroSec.title
            ) : (
              <>
                Total <span className="text-[#3b82f6]">Distribution Control</span>
              </>
            )}
          </h1>
          <p className="mt-4 text-[#b0b0b8] text-[1.05rem] sm:text-[1.15rem] max-w-[750px] mx-auto leading-[1.7]">
            {heroSec?.subtitle ||
              "Keep 100% ownership of your music, maintaining creative control and authority across catalog releases, DSP territories, revenue splits, and copyright protection."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={user ? heroSec?.ctaHref || "/dashboard" : "/login"}
              className="px-8 py-3.5 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm inline-flex items-center gap-2 transition-all"
            >
              <span>{user ? heroSec?.ctaLabel || "Open Control Dashboard" : "Login to Control Center"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={heroSec?.cta2Href || "/signup"}
              className="px-8 py-3.5 rounded-full border border-[#2a2a2a] hover:border-white text-white font-semibold text-sm transition-all"
            >
              {heroSec?.cta2Label || "Create Account"}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-[70px] px-5 max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cms.controls.map((c) => {
          const Icon = getControlIcon(c.iconKey);
          return (
            <div
              key={c.id}
              className="rounded-[20px] bg-[#18181b] border border-[#2a2a2a] hover:border-[#3b82f6] p-7 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/15 text-[#3b82f6] flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2.5">{c.title}</h2>
                <p className="text-sm text-[#b0b0b8] leading-[1.6]">{c.description}</p>
              </div>
              {c.ctaLabel && (
                <Link
                  href={user ? c.ctaHref || "/dashboard" : "/login"}
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3b82f6] hover:underline"
                >
                  <span>{c.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          );
        })}
      </section>

      <Footer settings={cms.settings} footerNav={cms.footerNav} />
    </div>
  );
}
