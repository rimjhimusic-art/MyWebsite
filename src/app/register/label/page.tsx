import React from "react";
import { getCmsSiteData } from "@/lib/cms";
import { AuthRegistrationForm } from "@/components/AuthRegistrationForm";

export const dynamic = "force-dynamic";

export default async function RegisterLabelPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const cms = await getCmsSiteData({ preview: sp.preview === "1" });
  const signupLogos = cms.stores.filter((s) => s.showOnSignup);

  return (
    <AuthRegistrationForm
      accountType="LABEL"
      logoUrl={cms.settings.headerLogoUrl}
      siteName={cms.settings.siteName}
      copyrightText={cms.settings.copyrightText}
      platformLogos={signupLogos}
    />
  );
}
