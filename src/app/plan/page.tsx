import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsSiteData();
  const seo = cms.seoMap["plan"];
  return {
    title: seo?.metaTitle || `Distribution Plans - ${cms.settings.siteName}`,
    description: seo?.metaDescription || "Music distribution plans starting at ₹0*/year.",
  };
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const [user, cms] = await Promise.all([
    getCurrentUser(),
    getCmsSiteData({ preview: sp.preview === "1" }),
  ]);

  const heroSec = cms.sectionMap["plan"]?.["hero"];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar
        user={user}
        settings={cms.settings}
        navItems={cms.headerNav}
        previewActive={cms.previewActive}
      />

      <section className="pt-[150px] pb-[70px] px-5 text-center bg-[#121212] border-b border-[#2a2a2a]">
        <div className="max-w-[900px] mx-auto">
          <h1 className="text-[2.2rem] sm:text-[3.2rem] font-extrabold tracking-[-0.5px] mb-5">
            {heroSec?.title && heroSec.title !== "Unlimited Distribution Starting at ₹0*/year" ? (
              heroSec.title
            ) : (
              <>
                <span className="text-[#3b82f6]">Unlimited Distribution</span>{" "}
                Starting at ₹0*/year
              </>
            )}
          </h1>
          <p className="text-[#b0b0b8] text-[1.1rem] leading-[1.6] max-w-[800px] mx-auto">
            {heroSec?.subtitle ||
              "Increase the reach of your music across the most popular stores & platforms like Spotify, Apple Music, YouTube and many more. Keep 100% ownership of your music, maintaining creative control and authority in your music career."}
          </p>
        </div>
      </section>

      <section className="py-[80px] px-5 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {cms.plans.map((plan) => {
            let features: string[] = [];
            try {
              const parsed = JSON.parse(plan.featuresJson);
              if (Array.isArray(parsed)) features = parsed.map(String);
            } catch {
              features = [];
            }

            return (
              <div
                key={plan.id}
                className={`rounded-[24px] p-8 flex flex-col border transition-all ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-[#172554]/50 to-[#18181b] border-[#3b82f6] shadow-[0_20px_50px_rgba(59,130,246,0.18)]"
                    : "bg-[#18181b] border-[#2a2a2a]"
                }`}
              >
                <h2 className="text-xl font-extrabold text-white">{plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    {plan.priceLabel}
                  </span>
                  <span className="text-sm text-[#71717a]">{plan.billingCycle}</span>
                </div>
                {plan.badgeText && (
                  <p className="mt-2 text-xs font-semibold text-[#3b82f6]">
                    {plan.badgeText}
                  </p>
                )}

                <ul className="mt-6 space-y-3 flex-1">
                  {features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-[#b0b0b8]"
                    >
                      <Check className="w-4 h-4 text-[#3b82f6] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={`mt-8 w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-full font-bold text-sm transition-all ${
                    plan.highlighted
                      ? "bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  <span>{plan.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <Footer settings={cms.settings} footerNav={cms.footerNav} />
    </div>
  );
}
