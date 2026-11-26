import React from "react";
import { getCmsSiteData } from "@/lib/cms";
import { AuthRegistrationForm } from "@/components/AuthRegistrationForm";

export const dynamic = "force-dynamic";

export default async function RegisterArtistPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const cms = await getCmsSiteData({ preview: sp.preview === "1" });
  const sec = cms.sectionMap["signup"]?.["hero"];
  const signupLogos = cms.stores.filter((s) => s.showOnSignup);

  return (
    <AuthRegistrationForm
      accountType="ARTIST"
      logoUrl={cms.settings.headerLogoUrl}
      siteName={cms.settings.siteName}
      heroTitle={sec?.title || "Music Distribution Simplified."}
      heroSubtitle={
        sec?.subtitle ||
        "Upload your music, keep 100% of your earnings, and get heard across all major platforms globally."
      }
      copyrightText={cms.settings.copyrightText}
      platformLogos={signupLogos}
    />
  );
}
