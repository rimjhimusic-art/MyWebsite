import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const [user, cms] = await Promise.all([getCurrentUser(), getCmsSiteData()]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar user={user} settings={cms.settings} navItems={cms.headerNav} />
      <main className="pt-32 pb-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-6 text-[#b0b0b8] leading-relaxed">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
          Terms and Conditions
        </h1>
        <p className="text-xs text-[#71717a]">
          {cms.settings.copyrightCompanyName} &bull; Effective {cms.settings.copyrightYear}
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            1. {cms.settings.siteName} Terms
          </h2>
          <p>
            By accessing or using our music distribution and label management
            platform, you agree to comply with these Terms and Conditions and
            all applicable copyright and digital distribution laws.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">2. Eligibility</h2>
          <p>
            You must be at least 18 years old or have legal parental/guardian
            consent and hold valid rights to every master recording, artwork,
            and video you upload.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            3. User Content &amp; Rights
          </h2>
          <p>
            You retain 100% ownership of your masters and compositions. You
            grant {cms.settings.siteName} a non-exclusive license strictly required
            to deliver, monetize, and administer your releases across selected
            Digital Service Providers (DSPs) per your instructions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">4. Prohibited Uses</h2>
          <p>
            Uploading unauthorized copyrighted material, artificial streaming,
            metadata spam, or duplicate fraudulent ISRCs will result in immediate
            takedown and account suspension.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            5. Copyright Compliance &amp; DMCA
          </h2>
          <p>
            Rights holders may submit copyright or takedown claims via our
            Rights Management desk or by contacting{" "}
            <a href={`mailto:${cms.settings.contactEmail}`} className="text-[#3b82f6] underline">
              {cms.settings.contactEmail}
            </a>
            .
          </p>
        </section>
      </main>
      <Footer settings={cms.settings} footerNav={cms.footerNav} />
    </div>
  );
}
