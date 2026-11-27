"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Invalid administrator credentials.", "error");
        return;
      }
      if (!["SUPER_ADMIN", "ADMIN", "EDITOR", "FINANCE_MANAGER", "CONTENT_MANAGER"].includes(data.user?.role)) {
        showToast("This portal is restricted to Admin and Editor accounts.", "error");
        return;
      }
      showToast(`Signed in as ${data.user.name}`, "success");
      router.push(nextPath.startsWith("/admin") ? nextPath : "/admin");
      router.refresh();
    } catch {
      showToast("Network error while logging in.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white relative flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-semibold text-[#b0b0b8] hover:text-white bg-[#18181b] border border-[#2a2a2a] px-4 py-2 rounded-full"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Website
      </Link>

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-[#18181b]/95 border border-[#2a2a2a] p-8 sm:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <img
            src="/ref/goldex-logo.svg"
            alt="Goldex Media Network"
            className="h-11 mx-auto mb-4"
          />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> CMS &amp; Admin Console
          </div>
          <h1 className="text-2xl font-extrabold text-white">Administrator Sign In</h1>
          <p className="text-xs text-[#b0b0b8] mt-1.5">
            Authorized Super Admins, Admins &amp; CMS Editors only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#b0b0b8] mb-1.5">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#71717a] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="support@goldexmedianetwork.com"
                className="w-full rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] pl-10 pr-4 py-3 text-sm text-white focus:border-[#3b82f6] outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#b0b0b8]">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#3b82f6] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#71717a] absolute left-3.5 top-3.5" />
              <input
                type={showPass ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter administrator password"
                className="w-full rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] pl-10 pr-10 py-3 text-sm text-white focus:border-[#3b82f6] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-3 text-[#71717a] hover:text-white cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#b0b0b8] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded accent-[#3b82f6]"
            />
            Remember my session (30 days)
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Verifying Access..." : "Sign In to Admin Panel"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-[#71717a]">
          <Link href="/login" className="hover:text-white">
            Creator / Artist Login
          </Link>
          <Link href="/admin/setup" className="text-[#3b82f6] hover:underline">
            Initial Admin Setup
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b]" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
