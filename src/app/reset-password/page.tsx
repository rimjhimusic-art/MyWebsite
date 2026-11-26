"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      showToast("Passwords do not match.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to reset password.", "error");
        return;
      }
      showToast(data.message, "success");
      router.push("/login");
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl bg-[#18181b] border border-[#2a2a2a] p-8">
      <h1 className="text-2xl font-extrabold">Set New Password</h1>
      <p className="text-sm text-[#b0b0b8] mt-1 mb-6">
        Enter a strong new password (8+ characters).
      </p>
      {!token ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-200">
          Missing reset token. Request a new link from{" "}
          <Link href="/forgot-password" className="underline font-semibold">
            Forgot Password
          </Link>
          .
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="w-4 h-4 text-[#71717a] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={8}
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#71717a] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Confirm New Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Updating..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-[#71717a]">Loading...</div>}>
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}
