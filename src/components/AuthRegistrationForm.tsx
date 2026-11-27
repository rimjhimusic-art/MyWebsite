"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Bangladesh",
  "United Arab Emirates",
  "Germany",
  "France",
  "Singapore",
  "Japan",
  "Brazil",
  "Other",
];

export interface SignupPlatformLogo {
  id: string;
  name: string;
  logoUrl: string;
  altText?: string | null;
}

const DEFAULT_SIGNUP_LOGOS: SignupPlatformLogo[] = [
  { id: "spotify", name: "Spotify", logoUrl: "/ref/stores/spotify.png", altText: "Spotify" },
  { id: "apple", name: "Apple Music", logoUrl: "/ref/stores/apple.png", altText: "Apple Music" },
  { id: "amazon", name: "Amazon Music", logoUrl: "/ref/stores/amazon.png", altText: "Amazon Music" },
  { id: "ytmusic", name: "YouTube Music", logoUrl: "/ref/stores/ytmusic.svg", altText: "YouTube Music" },
  { id: "tiktok", name: "TikTok", logoUrl: "/ref/stores/tiktok.svg", altText: "TikTok" },
  { id: "soundcloud", name: "SoundCloud", logoUrl: "/ref/stores/soundcloud.webp", altText: "SoundCloud" },
];

export function AuthRegistrationForm({
  accountType,
  logoUrl = "/ref/goldex-logo.svg",
  siteName = "Goldex Media Network",
  heroTitle = "Music Distribution Simplified.",
  heroSubtitle = "Upload your music, keep 100% of your earnings, and get heard across all major platforms globally.",
  copyrightText = "Copyright 2026 Goldex Media Network Private Limited. All rights reserved.",
  platformLogos,
}: {
  accountType: "ARTIST" | "LABEL";
  logoUrl?: string;
  siteName?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  copyrightText?: string;
  platformLogos?: SignupPlatformLogo[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    stageOrLabelName: "",
    email: "",
    country: "India",
    phone: "",
    website: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });

  const isLabel = accountType === "LABEL";
  const logos =
    platformLogos && platformLogos.length > 0 ? platformLogos : DEFAULT_SIGNUP_LOGOS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          name: form.name,
          stageOrLabelName: form.stageOrLabelName || undefined,
          email: form.email,
          country: form.country,
          phone: form.phone || undefined,
          website: form.website || undefined,
          password: form.password,
          termsAccepted: form.termsAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Registration failed.", "error");
        return;
      }

      showToast("Account created! Redirecting to dashboard...", "success");
      if (data.verifyUrl) {
        setVerifyUrl(data.verifyUrl);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1200);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      showToast("Network error during registration.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1e293b]">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left Royal Blue Brand Panel */}
        <div className="bg-[#0052cc] text-white p-8 sm:p-14 flex flex-col justify-center items-start">
          <div className="max-w-lg w-full mx-auto lg:mx-0">
            <Link href="/" className="inline-block mb-8">
              <img
                src={logoUrl}
                alt={siteName}
                className="h-[52px] w-auto object-contain"
              />
            </Link>

            <h1 className="text-[2.3rem] sm:text-[2.85rem] font-extrabold leading-[1.12] tracking-tight text-white">
              {isLabel ? "Manage Labels At Scale." : heroTitle}
            </h1>

            <p className="mt-4 text-blue-100 text-[1.02rem] leading-[1.6] max-w-[440px]">
              {isLabel
                ? "Onboard multiple artists, manage sub-labels, configure 100%-accurate revenue splits, and deliver catalogs to 150+ digital stores."
                : heroSubtitle}
            </p>

            {/* Official Platform Logos underneath heading */}
            <div
              className="mt-8 flex flex-wrap items-center gap-3"
              data-testid="signup-platform-logos"
            >
              {logos.map((logo) => {
                const displaySrc =
                  logo.logoUrl === "/ref/stores/ytmusic.svg"
                    ? "/ref/stores/ytmusic-pill.svg"
                    : logo.logoUrl === "/ref/stores/tiktok.svg"
                    ? "/ref/stores/tiktok-pill.svg"
                    : logo.logoUrl;
                return (
                  <div
                    key={logo.id}
                    title={logo.name}
                    className="bg-white/95 hover:bg-white rounded-xl px-3.5 py-2 shadow-sm flex items-center justify-center h-[44px] transition-transform hover:-translate-y-0.5"
                  >
                    <img
                      src={displaySrc}
                      alt={logo.altText || logo.name}
                      className="h-[22px] w-auto max-w-[115px] object-contain"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Crisp White Form Panel */}
        <div className="bg-white text-[#111827] p-6 sm:p-14 flex flex-col justify-center relative">
          <div className="max-w-md w-full mx-auto">
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] hover:text-[#0f172a]"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Website
              </Link>
              <Link
                href={isLabel ? "/signup" : "/register/label"}
                className="text-xs font-bold text-[#0052cc] hover:underline"
              >
                {isLabel ? "Register as Artist instead" : "Register a Record Label"}
              </Link>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-[1.9rem] font-extrabold text-[#1e293b]">
                {isLabel ? "Create Label Account" : "Create Account"}
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Get started with {siteName} today.
              </p>
            </div>

            {verifyUrl && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Account created!
                </div>
                <p>
                  Local email verification preview:{" "}
                  <Link href={verifyUrl} className="underline font-semibold">
                    Verify Email Now
                  </Link>
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white border border-[#cbd5e1] text-sm text-[#0f172a] placeholder:text-[#64748b] outline-none focus:border-[#0052cc]"
              />

              <input
                type="text"
                placeholder={
                  isLabel
                    ? "Record Label / Imprint Name*"
                    : "Artist / Stage Name (optional)"
                }
                required={isLabel}
                value={form.stageOrLabelName}
                onChange={(e) =>
                  setForm({ ...form, stageOrLabelName: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg bg-white border border-[#cbd5e1] text-sm text-[#0f172a] placeholder:text-[#64748b] outline-none focus:border-[#0052cc]"
              />

              <input
                type="email"
                required
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white border border-[#cbd5e1] text-sm text-[#0f172a] placeholder:text-[#64748b] outline-none focus:border-[#0052cc]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#cbd5e1] text-sm text-[#0f172a] outline-none focus:border-[#0052cc]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#cbd5e1] text-sm text-[#0f172a] placeholder:text-[#64748b] outline-none focus:border-[#0052cc]"
                />
              </div>

              {isLabel && (
                <input
                  type="url"
                  placeholder="Label Website (optional)"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-[#cbd5e1] text-sm text-[#0f172a] placeholder:text-[#64748b] outline-none focus:border-[#0052cc]"
                />
              )}

              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Password (8+ chars)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 pr-11 rounded-lg bg-white border border-[#cbd5e1] text-sm text-[#0f172a] placeholder:text-[#64748b] outline-none focus:border-[#0052cc]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a] cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 pr-11 rounded-lg bg-white border border-[#cbd5e1] text-sm text-[#0f172a] placeholder:text-[#64748b] outline-none focus:border-[#0052cc]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a] cursor-pointer"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[#475569] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={(e) =>
                    setForm({ ...form, termsAccepted: e.target.checked })
                  }
                  className="mt-0.5 accent-[#0052cc]"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#0052cc] font-semibold hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#0052cc] font-semibold hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-lg bg-[#0052cc] hover:bg-[#0041a8] text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-[#475569]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#0052cc] font-bold hover:underline"
              >
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom dark footer bar matching reference signup */}
      <footer className="bg-[#232b38] text-zinc-300 text-xs py-5 px-4 text-center space-y-2">
        <p>{copyrightText}</p>
        <div className="flex justify-center items-center gap-3">
          <Link href="/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          <span className="text-zinc-500">|</span>
          <Link href="/terms" className="hover:text-white">
            Terms of Service
          </Link>
          <span className="text-zinc-500">|</span>
          <Link href="/contact" className="hover:text-white">
            Contact Us
          </Link>
        </div>
      </footer>
    </div>
  );
}
