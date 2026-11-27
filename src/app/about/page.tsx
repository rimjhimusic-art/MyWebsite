import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AboutDualSlider, TeamCardDeck } from "@/components/AboutInteractive";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsSiteData();
  const seo = cms.seoMap["about"];
  return {
    title: seo?.metaTitle || `About - ${cms.settings.siteName}`,
    description: seo?.metaDescription || "About Goldex Media Network.",
  };
}

export default async function AboutPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const [user, cms] = await Promise.all([
    getCurrentUser(),
    getCmsSiteData({ preview: sp.preview === "1" }),
  ]);

  const heroSec = cms.sectionMap["about"]?.["hero"];
  const storySec = cms.sectionMap["about"]?.["story"];

  let heroExtra: { galleryImages?: string[] } = {};
  if (heroSec?.extraJson) {
    try {
      heroExtra = JSON.parse(heroSec.extraJson);
    } catch {
      heroExtra = {};
    }
  }

  let storyExtra: {
    partnerCompanyName?: string;
    partnerLogos?: Array<{ name: string; logoUrl: string; websiteUrl?: string }>;
    artistImageUrl?: string;
    artistImagePosition?: string;
    pillars?: Array<{ title: string; description: string }>;
  } = {};
  if (storySec?.extraJson) {
    try {
      storyExtra = JSON.parse(storySec.extraJson);
    } catch {
      storyExtra = {};
    }
  }

  const galleryImages =
    Array.isArray(heroExtra.galleryImages) && heroExtra.galleryImages.length > 0
      ? heroExtra.galleryImages
      : undefined;

  const partnerCompanyName = storyExtra.partnerCompanyName || "Vydia Inc.";
  const partnerLogos =
    Array.isArray(storyExtra.partnerLogos) && storyExtra.partnerLogos.length > 0
      ? storyExtra.partnerLogos
      : [
          {
            name: partnerCompanyName,
            logoUrl: storySec?.mediaUrl || "/ref/vydia-logo.png",
            websiteUrl: "",
          },
        ];

  const pillars =
    Array.isArray(storyExtra.pillars) && storyExtra.pillars.length > 0
      ? storyExtra.pillars
      : [
          {
            title: "Artist-First Economy",
            description:
              "Leading 90% revenue share model, ensuring earnings stay with the artist.",
          },
          {
            title: "Cultural Preservation",
            description:
              "Digitizing regional genres like Baul and Folk music for a global platform.",
          },
          {
            title: "Transparency & Trust",
            description:
              "No hidden fees. Crystal clear reporting and consistent monthly payouts.",
          },
        ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar
        user={user}
        settings={cms.settings}
        navItems={cms.headerNav}
        previewActive={cms.previewActive}
      />

      {/* INTRO BANNER WITH FULL-WIDTH VIDEO OR IMAGE */}
      {(!heroSec || heroSec.enabled !== false) && (
        <section className="w-full h-[60vh] min-h-[500px] relative overflow-hidden flex justify-center items-center bg-black">
          {heroSec?.mediaType === "image" && heroSec?.mediaUrl ? (
            <img
              src={heroSec.mediaUrl}
              alt={heroSec.title || "About Goldex Media Network"}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-60"
            />
          ) : (
            <video
              src={heroSec?.mediaUrl || "/ref/video/about-bg.mp4"}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}
          <div className="relative z-10 text-center px-6 sm:px-10 max-w-[900px]">
            <h1 className="text-[2.2rem] sm:text-[3.5rem] font-extrabold mb-5 text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] leading-[1.1]">
              {heroSec?.title &&
              heroSec.title !== "About OneTab Media" &&
              heroSec.title !== "About Goldex Media Network" ? (
                heroSec.title
              ) : (
                <>
                  About <span className="text-[#3b82f6]">{cms.settings.siteName}</span>{" "}
                  <span className="inline-block animate-bounce">🎵</span>
                </>
              )}
            </h1>
            <p className="text-[1.05rem] sm:text-[1.15rem] text-[#e2e8f0] leading-[1.6] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {heroSec?.subtitle ||
                "Goldex Media Network Private Limited is a dynamic digital media and music distribution company dedicated to empowering creators, artists, and record labels. We specialize in comprehensive CMS management, licensing operations, and DRM."}
            </p>
            <p className="text-[1.05rem] sm:text-[1.15rem] leading-[1.6] mt-4 font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {heroSec?.badgeText ||
                "Our Mission: To empower independent creators with a transparent, technology-driven ecosystem for global reach and monetization. 🚀"}
            </p>
          </div>
        </section>
      )}

      {/* INDIAN FLAG DUAL-TRACK RIBBON GALLERY SLIDER */}
      <AboutDualSlider images={galleryImages} />

      {/* EXCLUSIVE LICENSING & JOIN NETWORK PARTNER CANVAS */}
      {(!storySec || storySec.enabled !== false) && (
        <div
          className="py-[50px] px-5 flex justify-center"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10% 20%, rgba(193, 159, 98, 0.08) 0%, transparent 50%)",
          }}
        >
          <div className="flex flex-col lg:flex-row w-full max-w-[1200px] gap-6">
            <div className="flex-1 bg-[#141414]/60 backdrop-blur-xl border border-white/10 hover:border-[#c19f62]/30 rounded-[24px] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all">
              <div
                className="absolute top-0 left-0 w-full h-1 opacity-70"
                style={{
                  background: "linear-gradient(90deg, #c19f62, transparent)",
                }}
              />
              <div>
                <p className="text-[1.25rem] font-semibold text-white mb-4">
                  {storySec?.title ? (
                    storySec.title
                  ) : (
                    <>
                      Exclusive licensing &amp; royalty agreement with{" "}
                      <span className="text-[#c19f62]">{partnerCompanyName}</span>
                    </>
                  )}
                </p>
                <p className="text-[#94a3b8] leading-[1.6]">
                  {storySec?.subtitle ||
                    "This strategic partnership empowers Goldex Media Network with elite-level tools—advanced analytics, rights management, and direct supply chain access to major DSPs."}
                </p>
                {storySec?.bodyHtml && (
                  <p className="text-xs text-[#cbd5e1] mt-3 leading-relaxed opacity-90">
                    {storySec.bodyHtml}
                  </p>
                )}
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-[16px] p-5 mt-[30px] flex flex-wrap items-center justify-center gap-6">
                {partnerLogos.map((partner, idx) => {
                  const content = (
                    <div className="flex flex-col items-center gap-1.5 group">
                      <img
                        src={partner.logoUrl}
                        alt={partner.name || "Partner Logo"}
                        className="max-h-[72px] w-auto object-contain transition-transform group-hover:scale-105"
                      />
                      {partner.name && partnerLogos.length > 1 && (
                        <span className="text-[11px] text-[#b0b0b8] font-medium">
                          {partner.name}
                        </span>
                      )}
                    </div>
                  );
                  return partner.websiteUrl ? (
                    <a
                      key={`${partner.name}-${idx}`}
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-90 transition-opacity"
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={`${partner.name}-${idx}`}>{content}</div>
                  );
                })}
              </div>
            </div>

            <div className="flex-[1.3] bg-[#141414]/60 backdrop-blur-xl border border-white/10 hover:border-[#c19f62]/30 rounded-[24px] p-8 sm:p-10 flex flex-col md:flex-row gap-8 items-center shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all">
              <div className="w-full md:w-[220px] h-[280px] md:h-full min-h-[280px] rounded-[16px] overflow-hidden shrink-0 bg-black/50">
                <img
                  src={storyExtra.artistImageUrl || "/ref/about-artist.jpg"}
                  alt="Independent Artist"
                  style={{
                    objectPosition: storyExtra.artistImagePosition || "center top",
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-5 text-left">
                {pillars.map((pillar, idx) => (
                  <div key={`${pillar.title}-${idx}`}>
                    <span className="block text-base font-bold text-[#c19f62] mb-1">
                      {pillar.title}
                    </span>
                    <span className="text-sm text-[#94a3b8] leading-relaxed">
                      {pillar.description}
                    </span>
                  </div>
                ))}
                <Link
                  href={storySec?.ctaHref || "/signup"}
                  className="inline-block mt-2 px-7 py-3 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm transition-all"
                >
                  {storySec?.ctaLabel || "Join & Distribute"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEADERSHIP & TEAM CARD DECK */}
      <TeamCardDeck members={cms.team} />

      <Footer settings={cms.settings} footerNav={cms.footerNav} />
    </div>
  );
}
