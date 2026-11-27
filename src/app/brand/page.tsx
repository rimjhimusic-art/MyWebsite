import React from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { BrandClient } from "@/components/BrandClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsSiteData();
  const seo = cms.seoMap["brand"];
  return {
    title: seo?.metaTitle || `Brand Solutions - ${cms.settings.siteName}`,
    description: seo?.metaDescription || "Brand Solutions & Creator Campaigns.",
  };
}

export default async function BrandSolutionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const [user, cms] = await Promise.all([
    getCurrentUser(),
    getCmsSiteData({ preview: sp.preview === "1" }),
  ]);

  const heroSec = cms.sectionMap["brand"]?.["hero"];
  const formSec = cms.sectionMap["brand"]?.["brand_form"];
  let extra: {
    rightTitle?: string;
    rightSubtitle?: string;
    rightImages?: string[];
    formSuccessMessage?: string;
  } = {};
  if (formSec?.extraJson) {
    try {
      extra = JSON.parse(formSec.extraJson);
    } catch {
      extra = {};
    }
  }

  return (
    <BrandClient
      user={user}
      creators={cms.brandCreators}
      videos={cms.brandVideos}
      heroTitle={heroSec?.title || "Boost your brand by our Creators!"}
      heroSubtitle={heroSec?.subtitle || "India's top artists, musicians, and digital storytellers."}
      videosSectionTitle={heroSec?.badgeText || "Brand Campaign Videos"}
      videosSectionSubtitle={
        heroSec?.bodyHtml || "Watch our creators in action across real brand collaborations."
      }
      formTitle={formSec?.title || "Let's Talk!"}
      formSubtitle={
        formSec?.subtitle ||
        "Leave your details below and a member of our team will get back to you within 24 hours."
      }
      formSubmitLabel={formSec?.ctaLabel || "Submit"}
      formSuccessMessage={
        extra.formSuccessMessage ||
        "Thank you! A Brand Manager will reach out within 24 hours."
      }
      formBgColor={formSec?.bgColor || "#fff0e5"}
      formTextColor={formSec?.textColor || "#d93025"}
      rightTitle={extra.rightTitle || "Brand Managers"}
      rightSubtitle={extra.rightSubtitle || "Our expert team is here to help."}
      rightImages={extra.rightImages}
      settings={cms.settings}
      headerNav={cms.headerNav}
      footerNav={cms.footerNav}
      previewActive={cms.previewActive}
    />
  );
}
