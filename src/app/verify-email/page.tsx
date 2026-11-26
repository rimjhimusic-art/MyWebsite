"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Mail } from "lucide-react";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    token ? "verifying" : "idle"
  );
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [resendUrl, setResendUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", token }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok) {
          setStatus("success");
          setMessage(d.message || "Email verified!");
        } else {
          setStatus("error");
          setMessage(d.error || "Invalid or expired verification token.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Unable to verify email.");
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend", email }),
    });
    const data = await res.json();
    setMessage(data.message || "Verification link generated.");
    if (data.verifyUrl) setResendUrl(data.verifyUrl);
  };

  return (
    <div className="w-full max-w-md rounded-3xl bg-[#18181b] border border-[#2a2a2a] p-8 text-center">
      <img src="/ref/logo.png" alt="OneTab" className="h-9 mx-auto mb-6" />
      <h1 className="text-2xl font-extrabold mb-2">Email Verification</h1>

      {status === "verifying" && (
        <p className="text-sm text-[#b0b0b8]">Verifying your email token...</p>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <p className="text-sm text-emerald-300 font-semibold">{message}</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 rounded-full bg-[#3b82f6] text-white font-bold text-sm"
          >
            Go to Dashboard
          </Link>
        </div>
      )}

      {(status === "error" || status === "idle") && (
        <div className="space-y-4">
          {status === "error" && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-center gap-2 justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>{message}</span>
            </div>
          )}
          <p className="text-sm text-[#b0b0b8]">
            Need a new verification link? Enter your email below.
          </p>
          <form onSubmit={handleResend} className="space-y-3 text-left">
            <div className="relative">
              <Mail className="w-4 h-4 text-[#71717a] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm cursor-pointer"
            >
              Resend Verification Email
            </button>
          </form>
          {resendUrl && (
            <p className="text-xs text-emerald-300">
              Preview link:{" "}
              <Link href={resendUrl} className="underline">
                Click to Verify
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-[#71717a]">Loading...</div>}>
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
