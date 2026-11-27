import React from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { CareersClient } from "@/components/CareersClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsSiteData();
  return {
    title: `Careers - ${cms.settings.siteName}`,
    description: `Explore music operations, rights management, and creator relations roles at ${cms.settings.siteName}.`,
  };
}

export default async function CareersPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const [user, cms] = await Promise.all([
    getCurrentUser(),
    getCmsSiteData({ preview: sp.preview === "1" }),
  ]);

  return (
    <CareersClient
      user={user}
      settings={cms.settings}
      headerNav={cms.headerNav}
      footerNav={cms.footerNav}
      previewActive={cms.previewActive}
    />
  );
}
