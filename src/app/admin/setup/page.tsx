"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft, KeyRound, Mail, User, Lock } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export default function AdminSetupPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [hasSuperAdmin, setHasSuperAdmin] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    setupToken: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/setup")
      .then((r) => r.json())
      .then((d) => setHasSuperAdmin(Boolean(d.hasSuperAdmin)))
      .catch(() => setHasSuperAdmin(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Setup failed.", "error");
        return;
      }
      showToast("Administrator account configured! Redirecting...", "success");
      router.push("/admin/cms");
      router.refresh();
    } catch {
      showToast("Network error during setup.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4">
      <Link
        href="/admin/login"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-xs font-semibold text-[#b0b0b8] hover:text-white bg-[#18181b] border border-[#2a2a2a] px-4 py-2 rounded-full"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Login
      </Link>

      <div className="w-full max-w-md rounded-3xl bg-[#18181b] border border-[#2a2a2a] p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-[#3b82f6] flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold">Initial Super Admin Setup</h1>
          <p className="text-xs text-[#b0b0b8] mt-1.5">
            {hasSuperAdmin
              ? "A Super Admin already exists. Enter a valid ADMIN_SETUP_TOKEN to create an additional Admin/Editor or reset."
              : "Create the primary Super Admin account for Goldex Media Network CMS."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#71717a] absolute left-3.5 top-3.5" />
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Goldex Super Admin"
                className="w-full rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Admin Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#71717a] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="support@goldexmedianetwork.com"
                className="w-full rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Strong Password (8+ chars)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#71717a] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          {hasSuperAdmin && (
            <div>
              <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">
                Setup Authorization Token
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#71717a] absolute left-3.5 top-3.5" />
                <input
                  required
                  type="password"
                  value={form.setupToken}
                  onChange={(e) => setForm({ ...form, setupToken: e.target.value })}
                  placeholder="ADMIN_SETUP_TOKEN from server env"
                  className="w-full rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || hasSuperAdmin === null}
            className="w-full py-3.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Configuring..." : "Complete Admin Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
