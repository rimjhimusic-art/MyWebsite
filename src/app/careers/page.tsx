"use client";

import React, { useState } from "react";
import { Briefcase, MapPin, Send, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/components/ToastProvider";

const OPEN_ROLES = [
  {
    title: "Catalog & Metadata Operations Specialist",
    location: "West Bengal / Remote (India)",
    type: "Full-Time",
    desc: "Review incoming artist & label releases, validate DDEX metadata, audio/artwork specs, and ISRC/UPC assignments.",
  },
  {
    title: "YouTube CMS & Rights Manager",
    location: "Kolkata / Hybrid",
    type: "Full-Time",
    desc: "Manage Content ID claims, Official Artist Channel (OAC) escalations, and VEVO music video compliance.",
  },
  {
    title: "Artist & Label Relations Executive",
    location: "Mumbai / Remote",
    type: "Full-Time",
    desc: "Onboard independent labels, coordinate brand sync opportunities, and support creator growth.",
  },
];

export default function CareersPage() {
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState(OPEN_ROLES[0].title);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    portfolioUrl: "",
    coverNote: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, roleTitle: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to submit application.", "error");
        return;
      }
      setSubmitted(true);
      showToast(data.message, "success");
      setForm({
        fullName: "",
        email: "",
        phone: "",
        portfolioUrl: "",
        coverNote: "",
      });
    } catch {
      showToast("Network error submitting application.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar />

      <section className="pt-32 pb-14 px-4 sm:px-6 text-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_55%)]">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#3b82f6] bg-blue-500/10 border border-blue-500/25 px-3.5 py-1.5 rounded-full mb-4">
            <Briefcase className="w-3.5 h-3.5" /> Careers at OneTab
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold">
            Build the Future of{" "}
            <span className="text-[#3b82f6]">Independent Music</span>
          </h1>
          <p className="mt-4 text-[#b0b0b8] text-base">
            Join our music operations, rights management, and technology teams.
          </p>
        </div>
      </section>

      <section className="pb-24 px-4 sm:px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-xl font-bold mb-2">Open Positions</h2>
          {OPEN_ROLES.map((role) => (
            <button
              key={role.title}
              type="button"
              onClick={() => setSelectedRole(role.title)}
              className={`w-full text-left p-6 rounded-2xl border transition-all cursor-pointer ${
                selectedRole === role.title
                  ? "bg-blue-500/10 border-[#3b82f6]"
                  : "bg-[#18181b] border-[#2a2a2a] hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-white">{role.title}</h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-zinc-200 shrink-0">
                  {role.type}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#3b82f6] mt-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{role.location}</span>
              </div>
              <p className="mt-3 text-sm text-[#b0b0b8]">{role.desc}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-white">Apply Now</h2>
            <p className="text-xs text-[#3b82f6] font-semibold mt-1 mb-6">
              Selected Role: {selectedRole}
            </p>

            {submitted && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Application received and saved!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Full Name*"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="email"
                  required
                  placeholder="Email Address*"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
                />
              </div>
              <input
                type="url"
                placeholder="LinkedIn / Portfolio / Resume URL"
                value={form.portfolioUrl}
                onChange={(e) =>
                  setForm({ ...form, portfolioUrl: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
              />
              <textarea
                required
                rows={4}
                placeholder="Tell us about your music industry or technical background*"
                value={form.coverNote}
                onChange={(e) => setForm({ ...form, coverNote: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6] resize-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
              >
                <span>{submitting ? "Submitting..." : "Submit Application"}</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
