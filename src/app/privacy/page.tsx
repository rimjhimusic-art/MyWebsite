import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const [user, cms] = await Promise.all([getCurrentUser(), getCmsSiteData()]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar user={user} settings={cms.settings} navItems={cms.headerNav} />
      <main className="pt-32 pb-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-6 text-[#b0b0b8] leading-relaxed">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#71717a]">
          Last Updated: {cms.settings.copyrightYear} &bull; {cms.settings.copyrightCompanyName}
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            1. Information We Collect
          </h2>
          <p>
            We collect account details (name, email, phone, country), release
            metadata (titles, ISRCs, UPCs, artwork, audio), and payout details
            for processing verified royalty distributions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            2. How We Use Information
          </h2>
          <p>
            Your information is used strictly to deliver releases to selected
            DSPs, calculate and disburse royalties, enforce rights protection,
            and provide customer support.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">3. Data Sharing</h2>
          <p>
            We never sell personal data. Release metadata and media assets are
            transmitted only to selected music stores and authorized supply-chain
            partners when enabled.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">4. Security</h2>
          <p>
            Passwords are salted and hashed with bcrypt, sessions are signed
            with HTTP-only cookies and tracked server-side, and uploaded assets
            are access-controlled.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-white">5. Contact Us</h2>
          <p>
            Questions regarding privacy or data deletion may be sent to{" "}
            <a
              href={`mailto:${cms.settings.contactEmail}`}
              className="text-[#3b82f6] underline"
            >
              {cms.settings.contactEmail}
            </a>{" "}
            or by calling{" "}
            <a
              href={`tel:${cms.settings.contactPhone.replace(/[^+\d]/g, "")}`}
              className="text-[#3b82f6] underline"
            >
              {cms.settings.contactPhone}
            </a>
            . Office: {cms.settings.contactAddress}.
          </p>
        </section>
      </main>
      <Footer settings={cms.settings} footerNav={cms.footerNav} />
    </div>
  );
}
