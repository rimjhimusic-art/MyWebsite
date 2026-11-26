import React from "react";
import Link from "next/link";
import { BookOpen, LifeBuoy, Mail, FileCheck2, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default async function HelpSupportPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar user={user} />

      <section className="pt-32 pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#3b82f6] bg-blue-500/10 border border-blue-500/25 px-3.5 py-1.5 rounded-full mb-4">
            <LifeBuoy className="w-3.5 h-3.5" /> Help &amp; Support Center
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold">
            How Can We Help You?
          </h1>
          <p className="mt-3 text-[#b0b0b8] max-w-2xl mx-auto">
            Access distribution guides, troubleshoot release rejections, or open
            a support ticket tracked directly inside your dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6">
            <FileCheck2 className="w-8 h-8 text-[#3b82f6] mb-4" />
            <h2 className="text-xl font-bold mb-2">Release &amp; QC Guidelines</h2>
            <p className="text-sm text-[#b0b0b8] leading-relaxed mb-4">
              Audio must be stereo WAV, FLAC, or MP3. Cover art must be 1:1
              square JPG/PNG (minimum 1400x1400px, 3000x3000px recommended)
              without store logos, URLs, or blurry upscales.
            </p>
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3b82f6] hover:underline"
            >
              Read Full FAQ <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6">
            <BookOpen className="w-8 h-8 text-emerald-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Dashboard Support Tickets</h2>
            <p className="text-sm text-[#b0b0b8] leading-relaxed mb-4">
              Registered artists and labels can submit priority support tickets,
              track status updates, and communicate directly with Content &amp;
              Finance managers.
            </p>
            <Link
              href={user ? "/dashboard/support" : "/login"}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:underline"
            >
              {user ? "Open Support Tickets" : "Log In to Open a Ticket"}{" "}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Mail className="w-8 h-8 text-[#3b82f6] shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold">Direct Support Desk</h3>
              <p className="text-sm text-[#b0b0b8]">
                Email support@onetabmedia.in or use our contact form for
                account recovery, DMCA notices, or onboarding questions.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="shrink-0 px-6 py-3 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm"
          >
            Contact Us
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
