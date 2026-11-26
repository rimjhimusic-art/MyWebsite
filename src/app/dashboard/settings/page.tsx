"use client";

import React, { useEffect, useState } from "react";
import { Save, KeyRound } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export default function ProfileSettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    country: "India",
    phone: "",
    bio: "",
    payoutMethod: "BANK_TRANSFER",
    payoutDetails: "",
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setForm((prev) => ({
            ...prev,
            name: d.user.name || "",
            email: d.user.email || "",
            country: d.user.country || "India",
            phone: d.user.phone || "",
            bio: d.user.bio || "",
            payoutMethod: d.user.payoutMethod || "BANK_TRANSFER",
            payoutDetails: d.user.payoutDetails || "",
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          country: form.country,
          phone: form.phone,
          bio: form.bio,
          payoutMethod: form.payoutMethod,
          payoutDetails: form.payoutDetails,
          ...(form.newPassword
            ? {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to update profile.", "error");
        return;
      }
      showToast("Profile settings updated!", "success");
      setForm((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-[#71717a]">Loading profile...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Profile Settings</h1>
        <p className="text-sm text-[#b0b0b8]">
          Update your creator profile, payout preferences, and account password.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#b0b0b8] mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#b0b0b8] mb-1.5">Email Address</label>
            <input
              type="email"
              disabled
              value={form.email}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111114] border border-[#2a2a2a] text-sm text-[#71717a]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#b0b0b8] mb-1.5">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#b0b0b8] mb-1.5">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[#b0b0b8] mb-1.5">Bio</label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
          <div>
            <label className="block text-xs text-[#b0b0b8] mb-1.5">Default Payout Method</label>
            <select
              value={form.payoutMethod}
              onChange={(e) => setForm({ ...form, payoutMethod: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="PAYPAL">PayPal</option>
              <option value="WIRE">International Wire</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#b0b0b8] mb-1.5">Payout Account Details</label>
            <input
              type="text"
              placeholder="Account / UPI / PayPal ID"
              value={form.payoutDetails}
              onChange={(e) => setForm({ ...form, payoutDetails: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
          <div>
            <label className="block text-xs text-[#b0b0b8] mb-1.5 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> Current Password (optional)
            </label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#b0b0b8] mb-1.5">New Password (8+ chars)</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving..." : "Save Profile Settings"}</span>
        </button>
      </form>
    </div>
  );
}
