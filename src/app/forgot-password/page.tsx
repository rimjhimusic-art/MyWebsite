"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export default function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to send reset link.", "error");
        return;
      }
      setDone(true);
      setResetUrl(data.resetUrl || null);
      showToast(data.message, "success");
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#18181b] border border-[#2a2a2a] p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs text-[#b0b0b8] hover:text-white mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </Link>
        <h1 className="text-2xl font-extrabold">Forgot Password</h1>
        <p className="text-sm text-[#b0b0b8] mt-1 mb-6">
          Enter your registered email to receive a password reset link.
        </p>

        {done && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4" /> Reset request processed
            </div>
            {resetUrl && (
              <p>
                Local email log reset link:{" "}
                <Link href={resetUrl} className="underline font-semibold">
                  Open Reset Password Page
                </Link>
              </p>
            )}
          </div>
        )}

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
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
