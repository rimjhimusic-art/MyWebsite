import React from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCmsSiteData } from "@/lib/cms";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FaqClient } from "@/components/FaqClient";

export const dynamic = "force-dynamic";

export default async function FaqPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const [user, cms, faqs] = await Promise.all([
    getCurrentUser(),
    getCmsSiteData({ preview: sp.preview === "1" }),
    prisma.faqItem.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar
        user={user}
        settings={cms.settings}
        navItems={cms.headerNav}
        previewActive={cms.previewActive}
      />
      <section className="pt-32 pb-20 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#3b82f6]">
            Knowledge Base
          </span>
          <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-[#b0b0b8] text-sm sm:text-base">
            Find answers on audio formats, artwork rules, DSP delivery, royalties,
            and VEVO distribution with {cms.settings.siteName}.
          </p>
        </div>

        <FaqClient faqs={faqs} />
      </section>
      <Footer settings={cms.settings} footerNav={cms.footerNav} />
    </div>
  );
}
