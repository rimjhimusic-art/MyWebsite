import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe,
  TrendingUp,
  Video,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  AnimatedStatBubbles,
  ContactFormSection,
  FeaturedArtistsSection,
  HeroBackgroundVideo,
} from "@/components/HomeInteractive";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsSiteData();
  const seo = cms.seoMap["home"];
  if (!seo) return {};
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    openGraph: {
      title: seo.ogTitle || seo.metaTitle,
      description: seo.ogDescription || seo.metaDescription,
      images: seo.ogImageUrl ? [seo.ogImageUrl] : undefined,
    },
  };
}

function splitHighlightTitle(title: string, blueLastWord = true) {
  const trimmed = title.trim();
  if (!trimmed.includes(" ")) return { lead: trimmed, accent: "" };
  const parts = trimmed.split(" ");
  if (blueLastWord) {
    const last = parts.pop() || "";
    return { lead: parts.join(" "), accent: last };
  }
  return { lead: parts[0], accent: parts.slice(1).join(" ") };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const previewRequested = sp.preview === "1";

  const [user, cms] = await Promise.all([
    getCurrentUser(),
    getCmsSiteData({ preview: previewRequested }),
  ]);

  const homeMap = cms.sectionMap["home"] || {};
  const heroSec = homeMap["hero"];
  const pricingSec = homeMap["pricing_banner"];
  const storesSec = homeMap["stores"];
  const revSec = homeMap["revolution"];
  const vevoSec = homeMap["vevo"];
  const whatSec = homeMap["what_is_onetab"];
  const seoSec = homeMap["seo_article"];
  const contactSec = homeMap["contact"];

  const marqueeStores = cms.stores.filter((s) => s.showInMarquee);
  const storeTrack = [...marqueeStores, ...marqueeStores, ...marqueeStores];

  const heroTitleParts = splitHighlightTitle(
    heroSec?.title || "Sell Your Music Worldwide.",
    true
  );

  let vevoStats = { viewsStat: "2B+", videosStat: "500K+" };
  if (vevoSec?.extraJson) {
    try {
      vevoStats = { ...vevoStats, ...JSON.parse(vevoSec.extraJson) };
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar
        user={user}
        settings={cms.settings}
        navItems={cms.headerNav}
        previewActive={cms.previewActive}
      />

      {/* 1. HERO SECTION + FEATURED TALENT */}
      {(!heroSec || heroSec.enabled !== false) && (
        <section
          className="min-h-screen flex flex-col items-center justify-center relative pt-[150px] pb-[80px] px-5 text-center overflow-hidden"
          style={heroSec?.bgColor ? { backgroundColor: heroSec.bgColor } : undefined}
        >
          <HeroBackgroundVideo videoUrl={heroSec?.mediaUrl} />

          <div
            className="absolute inset-0 z-[1]"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(15,15,15,0.4), rgba(15,15,15,0.9))",
            }}
          />
          <div
            className="absolute inset-0 z-[2] pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 0)",
              backgroundSize: "3px 3px",
            }}
          />

          <div className="max-w-[900px] z-[3] mb-[60px] relative">
            <h1 className="text-[2.6rem] sm:text-[3.5rem] lg:text-[4.5rem] leading-[1.1] mb-5 font-extrabold tracking-[-2px] text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
              {heroTitleParts.lead} <br />
              {heroTitleParts.accent && (
                <span className="text-[#3b82f6] drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                  {heroTitleParts.accent}
                </span>
              )}
            </h1>
            <p className="text-[1.05rem] sm:text-[1.2rem] text-[#b0b0b8] mx-auto mb-[30px] leading-[1.6] max-w-[600px] drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
              {heroSec?.subtitle ||
                "Upload your tracks to Spotify, Apple Music, TikTok, and 150+ digital stores. Keep 100% of your rights and receive monthly payouts."}
            </p>
            <div className="flex flex-col sm:flex-row gap-[15px] justify-center items-center">
              <Link
                href={heroSec?.ctaHref || "/signup"}
                className="w-full sm:w-auto px-[35px] py-[14px] bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-full font-bold text-base inline-flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_35px_rgba(59,130,246,0.5)]"
              >
                <span>{heroSec?.ctaLabel || "Distribute Now"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={heroSec?.cta2Href || "#plans"}
                className="w-full sm:w-auto px-[35px] py-[14px] bg-[#18181b]/50 hover:bg-white/10 text-white border border-[#2a2a2a] hover:border-white rounded-full font-semibold text-base inline-flex items-center justify-center transition-all"
              >
                {heroSec?.cta2Label || "View Plans"}
              </a>
            </div>
          </div>

          <FeaturedArtistsSection
            artists={cms.artists}
            sectionLabel={heroSec?.badgeText || "Featured Talent"}
          />
        </section>
      )}

      {/* 2. PRICING BANNER */}
      {(!pricingSec || pricingSec.enabled !== false) && (
        <section
          id="plans"
          className="bg-[#121212] py-[80px] px-5 text-center border-t border-[#2a2a2a] relative z-[4]"
          style={pricingSec?.bgColor ? { backgroundColor: pricingSec.bgColor } : undefined}
        >
          <h2 className="text-[1.9rem] sm:text-[2.8rem] font-extrabold text-white mb-[25px] tracking-[-0.5px]">
            {pricingSec?.title ? (
              pricingSec.title.includes("Unlimited Distribution") ? (
                <>
                  <span className="text-[#3b82f6]">Unlimited Distribution</span>{" "}
                  {pricingSec.title.replace("Unlimited Distribution", "").trim()}
                </>
              ) : (
                pricingSec.title
              )
            ) : (
              <>
                <span className="text-[#3b82f6]">Unlimited Distribution</span> Starting
                at ₹0*/year
              </>
            )}
          </h2>
          <p className="text-[#b0b0b8] text-[1.1rem] max-w-[850px] mx-auto mb-3 leading-[1.6]">
            {pricingSec?.subtitle ||
              "Increase the reach of your music across the most popular stores & platforms like Spotify, Apple Music, YouTube and many more."}
          </p>
          {(pricingSec?.bodyHtml ||
            "Empower yourself with unlimited distribution opportunities, and get your music heard by a global audience.\nKeep 100% ownership of your music, maintaining creative control and authority in your music career.")
            .split("\n")
            .filter(Boolean)
            .map((line, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "text-[#b0b0b8] text-[1.1rem] max-w-[850px] mx-auto mb-3 leading-[1.6]"
                    : "mt-[25px] text-base text-[#71717a] max-w-[850px] mx-auto"
                }
              >
                {line}
              </p>
            ))}
        </section>
      )}

      {/* 3. DIGITAL MUSIC STORE LOGO MARQUEE */}
      {(!storesSec || storesSec.enabled !== false) && (
        <div
          className="py-[60px] overflow-hidden relative z-[3] border-y border-white/5 text-center"
          style={{
            backgroundColor: storesSec?.bgColor || undefined,
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            maskImage:
              "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
          }}
        >
          <div className="marquee-track">
            {storeTrack.map((store, idx) => (
              <img
                key={`${store.id}-${idx}`}
                src={store.logoUrl}
                alt={store.altText || store.name}
                title={store.name}
                className="h-[36px] sm:h-[45px] w-auto max-w-[160px] object-contain transition-all duration-400 brightness-0 invert opacity-50 hover:brightness-100 hover:invert-0 hover:opacity-100 hover:scale-110 shrink-0"
              />
            ))}
          </div>
          <p className="text-[#71717a] text-[0.85rem] font-semibold mt-[30px] tracking-[3px] uppercase opacity-70">
            {storesSec?.subtitle ? (
              storesSec.subtitle
            ) : (
              <>
                and <span className="text-white font-extrabold">150+</span> Digital
                Stores Available
              </>
            )}
          </p>
        </div>
      )}

      {/* 4. #ONETABREVOLUTION + INDIA MAP */}
      {(!revSec || revSec.enabled !== false) && (
        <section
          className="py-[100px] px-5 sm:px-10 bg-[#0f0f0f] relative overflow-hidden z-[4]"
          style={revSec?.bgColor ? { backgroundColor: revSec.bgColor } : undefined}
        >
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2 w-[60%] h-[80%] pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
            }}
          />
          <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-[40px] lg:gap-[60px] relative">
            <div className="flex-1 text-center lg:text-left z-[5]">
              <h2 className="text-[2.4rem] sm:text-[3.5rem] font-extrabold text-white mb-[25px] leading-[1.1]">
                {revSec?.title?.includes("#OneTabRevolution") ? (
                  <>
                    Join the <br />
                    <span className="text-[#3b82f6]">#OneTabRevolution</span>
                  </>
                ) : (
                  revSec?.title || (
                    <>
                      Join the <br />
                      <span className="text-[#3b82f6]">#OneTabRevolution</span>
                    </>
                  )
                )}
              </h2>
              <p className="text-[#b0b0b8] text-[1.1rem] leading-[1.7] max-w-[90%] mx-auto lg:mx-0">
                {revSec?.subtitle ||
                  "Why join any label if you can be your own boss! Kick start your journey in the entertainment industry with OneTab's reliable all-in-one distribution solution to manage and sell your content to digital platforms directly. Just Upload, and we'll do the rest for you at no extra cost. Join #OneTabRevolution and spread the sound of independent music with OneTab now."}
              </p>
            </div>

            <div className="map-visual-wrapper">
              <img
                src={revSec?.mediaUrl || "/ref/in.svg"}
                alt="India Map"
                className="india-map-base"
              />

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
                <span className="cm-label">Assam</span>
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
          </div>
        </section>
      )}

      {/* 5. VEVO DISTRIBUTION SECTION */}
      {(!vevoSec || vevoSec.enabled !== false) && (
        <section
          className="bg-[#141414] py-[80px] px-5 relative overflow-hidden z-[4] border-t border-[#2a2a2a]"
          style={vevoSec?.bgColor ? { backgroundColor: vevoSec.bgColor } : undefined}
        >
          <div
            className="absolute top-1/2 right-0 w-1/2 h-[70%] pointer-events-none blur-[80px] -translate-y-1/2"
            style={{
              background:
                "radial-gradient(circle, rgba(227, 0, 27, 0.08) 0%, transparent 70%)",
            }}
          />
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-[40px] lg:gap-[50px] items-center relative z-[1]">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#E3001B]/15 border border-[#E3001B]/30 text-[#ff4d4d] text-[0.8rem] font-bold rounded-[30px] uppercase tracking-[1px] mb-5">
                <Video className="w-3.5 h-3.5" /> {vevoSec?.badgeText || "VEVO Distribution"}
              </span>
              <h2 className="text-[2.2rem] sm:text-[2.8rem] font-extrabold leading-[1.1] mb-5 text-white">
                Official <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(45deg, #E3001B, #ff4d4d)",
                  }}
                >
                  {vevoSec?.title?.replace("Official", "").trim() || "VEVO Channel"}
                </span>
              </h2>
              <p className="text-[1.05rem] text-[#b0b0b8] leading-[1.6] mb-[35px] max-w-[550px] mx-auto lg:mx-0">
                {vevoSec?.subtitle ||
                  "Distribute your music videos on VEVO and reach a global audience. Join the world's leading premium music video network."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left max-w-[550px] mx-auto lg:mx-0">
                <div className="bg-white/[0.03] border border-transparent hover:border-[#E3001B]/30 hover:bg-[#E3001B]/5 hover:-translate-y-1 p-5 rounded-[16px] transition-all flex items-start gap-[15px]">
                  <CheckCircle2 className="w-5 h-5 text-[#4cd964] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Official Channel</h4>
                    <p className="text-[0.85rem] text-[#71717a] leading-[1.4]">
                      Get verified VEVO channel.
                    </p>
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-transparent hover:border-[#E3001B]/30 hover:bg-[#E3001B]/5 hover:-translate-y-1 p-5 rounded-[16px] transition-all flex items-start gap-[15px]">
                  <TrendingUp className="w-5 h-5 text-[#ffcc00] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Higher Revenue</h4>
                    <p className="text-[0.85rem] text-[#71717a] leading-[1.4]">
                      Premium ad rates.
                    </p>
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-transparent hover:border-[#E3001B]/30 hover:bg-[#E3001B]/5 hover:-translate-y-1 p-5 rounded-[16px] transition-all flex items-start gap-[15px]">
                  <Globe className="w-5 h-5 text-[#3b82f6] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Global Reach</h4>
                    <p className="text-[0.85rem] text-[#71717a] leading-[1.4]">
                      Millions of viewers.
                    </p>
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-transparent hover:border-[#E3001B]/30 hover:bg-[#E3001B]/5 hover:-translate-y-1 p-5 rounded-[16px] transition-all flex items-start gap-[15px]">
                  <BarChart3 className="w-5 h-5 text-[#ff4d4d] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Analytics</h4>
                    <p className="text-[0.85rem] text-[#71717a] leading-[1.4]">
                      Deep audience insights.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href={vevoSec?.ctaHref || "/signup"}
                className="mt-10 px-[35px] py-[14px] bg-[#E3001B] hover:bg-[#ff1a35] text-white rounded-full font-bold text-base inline-flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 shadow-[0_10px_25px_rgba(227,0,27,0.3)] hover:shadow-[0_15px_35px_rgba(227,0,27,0.5)] w-full sm:w-auto"
              >
                <span>{vevoSec?.ctaLabel || "Start VEVO Distribution"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div
              className="rounded-[25px] border border-[#330000] p-[40px_30px] text-center relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
              style={{
                background: "linear-gradient(145deg, #220505, #0a0a0a)",
              }}
            >
              <div
                className="absolute top-0 left-0 w-full h-1"
                style={{
                  background: "linear-gradient(90deg, #E3001B, #ff4d4d)",
                }}
              />
              <img
                src={vevoSec?.mediaUrl || "/ref/vevo-logo.png"}
                alt="VEVO Logo"
                className="h-[35px] w-auto mx-auto mb-[25px] brightness-0 invert"
              />
              <h3 className="text-[1.8rem] font-extrabold text-white mb-2.5 leading-[1.2]">
                Get Your <br />
                Official Channel
              </h3>
              <p className="text-[0.9rem] text-[#71717a] mb-[30px] uppercase tracking-[1px]">
                Global Video Distribution
              </p>
              <div className="flex justify-center items-center gap-[30px] sm:gap-[40px] border-t border-white/10 pt-[25px]">
                <div>
                  <h3 className="text-[1.6rem] font-extrabold text-white mb-1">
                    {vevoStats.viewsStat}
                  </h3>
                  <p className="text-[0.75rem] text-[#71717a] uppercase font-bold">
                    Views
                  </p>
                </div>
                <div className="text-2xl font-bold text-white">$</div>
                <div>
                  <h3 className="text-[1.6rem] font-extrabold text-white mb-1">
                    {vevoStats.videosStat}
                  </h3>
                  <p className="text-[0.75rem] text-[#71717a] uppercase font-bold">
                    Videos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. WHAT IS ONETAB? */}
      {(!whatSec || whatSec.enabled !== false) && (
        <section
          className="py-[120px] px-5 relative z-[4] bg-[#0f0f0f] overflow-hidden flex justify-center border-t border-[#2a2a2a]"
          style={whatSec?.bgColor ? { backgroundColor: whatSec.bgColor } : undefined}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
            }}
          />
          <div className="max-w-[1000px] w-full bg-white/[0.02] border border-white/5 backdrop-blur-[20px] px-6 sm:px-[50px] py-[50px] sm:py-[70px] rounded-[30px] text-center relative z-[1] shadow-[0_30px_60px_rgba(0,0,0,0.3)]">
            <h2 className="text-[2.3rem] sm:text-[3rem] font-extrabold mb-[15px] text-white tracking-[-1px]">
              {whatSec?.title && whatSec.title !== "What is OneTab?" ? (
                whatSec.title
              ) : (
                <>
                  What is{" "}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(to right, #3b82f6, #60a5fa)",
                    }}
                  >
                    OneTab?
                  </span>
                </>
              )}
            </h2>
            <div className="text-[0.95rem] text-white font-bold uppercase mb-[45px] tracking-[3px] opacity-90 inline-block border-b-2 border-[#3b82f6] pb-2">
              {whatSec?.subtitle || "Your Independent Music & Media Partner"}
            </div>

            {(whatSec?.bodyHtml ||
              "OneTab Media Network is a next-generation ecosystem empowering independent artists and creators to build sustainable careers. Powered by Vydia, we provide elite access to global music distribution, advanced content protection, and rights management technology usually reserved for major labels.\nAs a pioneer in the creator economy, OneTab offers a transparent 90% Revenue Share model with Zero Upfront Fees. We are dedicated to making music distribution accessible, allowing you to keep 100% ownership of your masters while maximizing your reach across 150+ streaming platforms worldwide.")
              .split("\n")
              .filter(Boolean)
              .map((para, i) => (
                <p
                  key={i}
                  className="text-[1.05rem] sm:text-[1.15rem] leading-[1.8] text-[#b0b0b8] mb-[25px] max-w-[850px] mx-auto"
                >
                  {para}
                </p>
              ))}

            <Link
              href={whatSec?.ctaHref || "/plan"}
              className="mt-10 px-[45px] py-[16px] text-white font-bold rounded-full inline-block uppercase tracking-[1px] border border-white/10 shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:-translate-y-1 hover:scale-105 hover:border-white transition-all"
              style={{
                background: "linear-gradient(90deg, #3b82f6, #2563eb)",
              }}
            >
              {whatSec?.ctaLabel || "See Our Distribution Plans"}
            </Link>
          </div>
        </section>
      )}

      {/* 7. EXACT SEO CONTENT SECTION */}
      {(!seoSec || seoSec.enabled !== false) && (
        <section
          id="seo-article"
          className="py-[80px] px-5 bg-[#0d0d0d] border-t border-[#2a2a2a] relative z-[3]"
        >
          <div className="max-w-[900px] mx-auto text-[#b0b0b8]">
            <h2 className="text-[1.6rem] sm:text-[2rem] text-white mb-[30px] font-extrabold">
              {seoSec?.title ||
                "Music Distribution: How Can You Distribute Music With OneTab Media Network?"}
            </h2>
            {seoSec?.bodyHtml ? (
              <div className="space-y-4 text-[1.05rem] leading-[1.8] whitespace-pre-line">
                {seoSec.bodyHtml}
              </div>
            ) : (
              <>
                <p className="text-[1.05rem] leading-[1.8] mb-5">
                  <strong className="text-[#3b82f6]">Music distribution</strong> is one
                  of the hottest topics for independent artists today. Most artists
                  find themselves looking for a music distributor where they can
                  distribute their music and cover songs to famous platforms around the
                  world. Music distribution plays an important role in the music
                  industry. Artists will get profit and fame through the distribution
                  of their releases. A great song is not the only thing that artists
                  need to be successful; music distribution is vital. Choosing a
                  service that can help you distribute your music to the audience is
                  the best choice for artists, especially young artists who are on the
                  way to find more awareness from the public.
                </p>

                <h3 className="text-[1.3rem] sm:text-[1.5rem] text-white mt-10 mb-[15px] font-bold">
                  How to Distribute Music Online?
                </h3>
                <p className="text-[1.05rem] leading-[1.8] mb-5">
                  Are you an artist who is seeking a way to bring your release to the
                  audience?{" "}
                  <strong className="text-[#3b82f6]">Digital music distribution</strong>{" "}
                  can be the best way to lead you there. Don&apos;t stop reading here;
                  we will reveal many things about music distribution, how to
                  distribute your music, and how free music distribution services
                  work! First of all, music distribution is known as a process where
                  music from many types (mixed and ready to go) is sent to music
                  providers (major streaming services like Spotify, JioSaavn, Wynk,
                  radio channels, etc.) to reach listeners who may become your fanbase
                  later.
                </p>
                <p className="text-[1.05rem] leading-[1.8] mb-5">
                  Distribution can be a great tool to appeal to listeners to enjoy and
                  fall in love with your great music. You may join this music industry
                  for a while but still keep wondering how to distribute your songs to
                  more countries and platforms; OneTab Media Network is the answer.
                </p>

                <h3 className="text-[1.3rem] sm:text-[1.5rem] text-white mt-10 mb-[15px] font-bold">
                  Why Digital Music Distribution is Essential?
                </h3>
                <p className="text-[1.05rem] leading-[1.8] mb-5">
                  The music distribution trends have changed swiftly, and everyone has
                  been astonished by the changes. Digital distribution via online
                  markets (streaming and download) has now surpassed physical sales in
                  brick-and-mortar stores, even for those wishing to sell physical
                  copies. Digital distributors are the way to go for budding musicians
                  looking for independent music distribution.
                </p>
                <p className="text-[1.05rem] leading-[1.8] mb-5">
                  One thing for sure is that it is one of the cheapest ways to bring
                  music to the audience, cheaper than using a record label that will
                  take a chunky cut from your royalties or will demand a crippling
                  exclusivity deal. If you have a record label, the label is usually
                  responsible for distribution. It&apos;s a large part of why you might
                  sign a record contract.
                </p>

                <div className="bg-blue-500/5 border-l-4 border-[#3b82f6] p-5 my-[30px] rounded-[4px]">
                  <h4 className="font-bold text-white mb-2">
                    Best Music Distribution Services in India
                  </h4>
                  <p className="text-[1.05rem] leading-[1.8]">
                    As an artist, you should remember this one thing: the biggest
                    target when you work and distribute your release is to keep as
                    much as possible with your royalties. You need to deal to get more
                    and more up to 100%. In the past of record company dominance, this
                    would have been a luxury dream. However, it is worth checking the
                    details of different packages. Some distribution packages might
                    have a split, but at{" "}
                    <strong className="text-[#3b82f6]">OneTab Media Network</strong>, we
                    offer a transparent model where you keep 100% of your rights.
                  </p>
                </div>

                <h3 className="text-[1.3rem] sm:text-[1.5rem] text-white mt-10 mb-[15px] font-bold">
                  Is OneTab Media Network The Best Music Distribution Service For
                  Independent Artists?
                </h3>
                <p className="text-[1.05rem] leading-[1.8] mb-5">
                  We could be biased, but we believe it! In recent years, the music
                  distribution industry has altered considerably. And in ways, we could
                  never have predicted, democratized the musical environment. If
                  musicians are wise, music distributors will increasingly prioritize
                  artists. When deciding on the finest music distribution service for
                  you, there are several variables to consider.
                </p>
                <p className="text-[1.05rem] leading-[1.8] mb-5">
                  As an independent artist, you must determine whether or not you wish
                  to pay for digital distribution, pay upfront fees, and/or pay
                  royalties. Don&apos;t panic if the answer is no; there are still
                  options accessible! We recognize that we aren&apos;t quite objective
                  &ndash; of course, we believe{" "}
                  <strong className="text-[#3b82f6]">OneTab Media Network</strong> is
                  the best music distribution service available! Only a few companies
                  will charge you no upfront costs and vow not to charge you royalties
                  in the future. However, it is up to you to decide whether or not you
                  agree with us. What do you have to lose? Try it out right now!
                </p>
              </>
            )}

            <p className="mt-[30px] text-sm">
              <em>
                {seoSec?.subtitle ||
                  "#MusicDistributionService #FreeMusicDistribution #OneTabMedia #SellMusicOnline"}
              </em>
            </p>
          </div>
        </section>
      )}

      {/* 8. CONTACT SECTION */}
      {(!contactSec || contactSec.enabled !== false) && (
        <ContactFormSection
          title={contactSec?.title || "Get In Touch"}
          subtitle={
            contactSec?.subtitle ||
            "Send a message to inquire about our products and services! We are committed to bringing customer satisfaction by providing quality services."
          }
          contactEmail={cms.settings.contactEmail}
        />
      )}

      <Footer settings={cms.settings} footerNav={cms.footerNav} />
    </div>
  );
}
