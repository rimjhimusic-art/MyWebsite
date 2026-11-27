"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export default function LoginPage() {
  const router = useRouter();
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
        showToast(data.error || "Invalid credentials.", "error");
        return;
      }
      showToast(`Welcome back, ${data.user.name}!`, "success");
      router.push(data.redirectTo || "/dashboard");
      router.refresh();
    } catch {
      showToast("Network error while logging in.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white relative flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />

      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-semibold text-[#b0b0b8] hover:text-white bg-[#18181b] border border-[#2a2a2a] px-4 py-2 rounded-full"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-[#18181b]/95 border border-[#2a2a2a] p-8 sm:p-10 shadow-2xl">
        <div className="flex justify-center mb-6">
          <img src="/ref/goldex-logo.svg" alt="Goldex Media Network" className="h-11" />
        </div>
        <h1 className="text-2xl font-extrabold text-center">Welcome Back</h1>
        <p className="text-sm text-[#b0b0b8] text-center mt-1 mb-7">
          Login to manage your music distribution dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="w-4 h-4 text-[#71717a] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-[#71717a] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPass ? "text" : "password"}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white"
              aria-label="Toggle password visibility"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-[#b0b0b8] cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-[#3b82f6]"
              />
              <span>Remember me (30 days)</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[#3b82f6] hover:underline font-medium"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Signing In..." : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#b0b0b8] space-y-2">
          <p>
            New artist?{" "}
            <Link
              href="/signup"
              className="text-[#3b82f6] font-semibold hover:underline"
            >
              Artist Sign Up
            </Link>{" "}
            &bull;{" "}
            <Link
              href="/register/label"
              className="text-[#3b82f6] font-semibold hover:underline"
            >
              Label Registration
            </Link>
          </p>
          <p className="pt-2 border-t border-white/10">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-[#71717a] hover:text-white transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span>CMS &amp; Platform Admin Login</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
