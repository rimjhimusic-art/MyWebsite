import React from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { ServicesClient } from "@/components/ServicesClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsSiteData();
  const seo = cms.seoMap["services"];
  return {
    title: seo?.metaTitle || `Services - ${cms.settings.siteName}`,
    description: seo?.metaDescription || "Digital music distribution, VEVO, and rights management services.",
  };
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const [user, cms] = await Promise.all([
    getCurrentUser(),
    getCmsSiteData({ preview: sp.preview === "1" }),
  ]);

  const secHero = cms.sectionMap["services"]?.["hero"];
  const secCta = cms.sectionMap["services"]?.["cta"];

  return (
    <ServicesClient
      user={user}
      services={cms.services}
      heroTitle={secHero?.title || "Premium Global Network"}
      heroSubtitle={
        secHero?.subtitle ||
        "A powerhouse infrastructure connecting independent artists and labels to the world's biggest digital platforms."
      }
      heroBg={secHero?.bgColor || "#1a73e8"}
      ctaTitle={secCta?.title || "Ready to Amplify Your Reach?"}
      ctaSubtitle={
        secCta?.subtitle ||
        "Join the fastest-growing distribution network and get your music heard globally."
      }
      ctaLabel={secCta?.ctaLabel || "Start Distributing Now"}
      ctaHref={secCta?.ctaHref || "/signup"}
      settings={cms.settings}
      headerNav={cms.headerNav}
      footerNav={cms.footerNav}
      previewActive={cms.previewActive}
    />
  );
}
