import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactFormSection } from "@/components/HomeInteractive";

export const dynamic = "force-dynamic";

export default async function ContactPage({
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
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar
        user={user}
        settings={cms.settings}
        navItems={cms.headerNav}
        previewActive={cms.previewActive}
      />
      <div className="pt-28 pb-8 px-4 sm:px-6 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold">Contact Us</h1>
        <p className="mt-3 text-[#b0b0b8] text-base">
          Reach the {cms.settings.siteName} artist onboarding, label relations, or copyright support team.
        </p>
      </div>
      <ContactFormSection
        contactEmail={cms.settings.contactEmail}
        contactPhone={cms.settings.contactPhone}
        contactAddress={cms.settings.contactAddress}
      />
      <Footer settings={cms.settings} footerNav={cms.footerNav} />
    </div>
  );
}
