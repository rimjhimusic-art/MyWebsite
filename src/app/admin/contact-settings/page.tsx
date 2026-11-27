"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  Share2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from "@/components/BrandIcons";

interface ContactSettingsForm {
  siteName: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  copyrightCompanyName: string;
  copyrightYear: number;
  instagramUrl: string;
  facebookUrl: string;
  whatsappUrl: string;
  youtubeUrl: string;
  instagramEnabled: boolean;
  facebookEnabled: boolean;
  whatsappEnabled: boolean;
  youtubeEnabled: boolean;
  whatsappUsePhone: boolean;
  socialOrder: string[];
}

const DEFAULT_ORDER = ["instagram", "facebook", "whatsapp", "youtube"];

export default function AdminContactSettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState(0);
  const [form, setForm] = useState<ContactSettingsForm>({
    siteName: "Goldex Media Network",
    contactAddress: "Assam, Guwahati, India",
    contactPhone: "+918724804659",
    contactEmail: "support@goldexmedianetwork.com",
    copyrightCompanyName: "Goldex Media Network Private Limited",
    copyrightYear: 2026,
    instagramUrl: "https://www.instagram.com/goldexmedianetwork/",
    facebookUrl: "https://www.facebook.com/goldexmedianetwork/",
    whatsappUrl: "https://wa.me/918724804659",
    youtubeUrl: "https://www.youtube.com/@GoldexMediaNetwork",
    instagramEnabled: true,
    facebookEnabled: true,
    whatsappEnabled: true,
    youtubeEnabled: true,
    whatsappUsePhone: true,
    socialOrder: DEFAULT_ORDER,
  });

  const load = async () => {
    try {
      const res = await fetch("/api/admin/cms/settings");
      if (!res.ok) return;
      const d = await res.json();
      setPendingDrafts(d.pendingDrafts || 0);
      if (d.settings) {
        let parsedOrder = DEFAULT_ORDER;
        try {
          const arr = JSON.parse(d.settings.socialOrderJson || "[]");
          if (Array.isArray(arr) && arr.length > 0) parsedOrder = arr;
        } catch {
          parsedOrder = DEFAULT_ORDER;
        }
        setForm({
          siteName: d.settings.siteName || "Goldex Media Network",
          contactAddress: d.settings.contactAddress || "Assam, Guwahati, India",
          contactPhone: d.settings.contactPhone || "+918724804659",
          contactEmail: d.settings.contactEmail || "support@goldexmedianetwork.com",
          copyrightCompanyName:
            d.settings.copyrightCompanyName || "Goldex Media Network Private Limited",
          copyrightYear: Number(d.settings.copyrightYear) || 2026,
          instagramUrl: d.settings.instagramUrl || "",
          facebookUrl: d.settings.facebookUrl || "",
          whatsappUrl: d.settings.whatsappUrl || "",
          youtubeUrl: d.settings.youtubeUrl || "",
          instagramEnabled: d.settings.instagramEnabled ?? true,
          facebookEnabled: d.settings.facebookEnabled ?? true,
          whatsappEnabled: d.settings.whatsappEnabled ?? true,
          youtubeEnabled: d.settings.youtubeEnabled ?? true,
          whatsappUsePhone: d.settings.whatsappUsePhone ?? true,
          socialOrder: parsedOrder,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const computedWhatsappUrl =
    form.whatsappUsePhone && form.contactPhone.replace(/\D/g, "").length >= 7
      ? `https://wa.me/${form.contactPhone.replace(/\D/g, "")}`
      : form.whatsappUrl;

  const computedCopyright = `© ${form.copyrightYear} ${form.copyrightCompanyName} All Right Reserved`;

  const moveSocial = (idx: number, dir: -1 | 1) => {
    const next = [...form.socialOrder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setForm({ ...form, socialOrder: next });
  };

  const handleSave = async (mode: "draft" | "publish") => {
    setSaving(true);
    try {
      const payload = {
        mode,
        siteName: form.siteName,
        contactAddress: form.contactAddress,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        copyrightCompanyName: form.copyrightCompanyName,
        copyrightYear: Number(form.copyrightYear) || 2026,
        instagramUrl: form.instagramUrl,
        facebookUrl: form.facebookUrl,
        whatsappUrl: computedWhatsappUrl,
        youtubeUrl: form.youtubeUrl,
        instagramEnabled: form.instagramEnabled,
        facebookEnabled: form.facebookEnabled,
        whatsappEnabled: form.whatsappEnabled,
        youtubeEnabled: form.youtubeEnabled,
        whatsappUsePhone: form.whatsappUsePhone,
        socialOrderJson: JSON.stringify(form.socialOrder),
      };

      const res = await fetch("/api/admin/cms/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || "Failed to save Contact & Social Settings.", "error");
        return;
      }
      setPendingDrafts(d.pendingDrafts || 0);
      showToast(
        mode === "publish"
          ? "Contact & Social Settings published live across the website!"
          : "Draft saved! Use Preview to verify before publishing.",
        "success"
      );
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-[#b0b0b8]">
        Loading Contact &amp; Social Media Settings...
      </div>
    );
  }

  const socialRows = [
    {
      key: "instagram",
      label: "Instagram",
      url: form.instagramUrl,
      enabled: form.instagramEnabled,
      setUrl: (v: string) => setForm({ ...form, instagramUrl: v }),
      setEnabled: (v: boolean) => setForm({ ...form, instagramEnabled: v }),
      icon: <InstagramIcon className="w-4 h-4" color="#E1306C" />,
    },
    {
      key: "facebook",
      label: "Facebook",
      url: form.facebookUrl,
      enabled: form.facebookEnabled,
      setUrl: (v: string) => setForm({ ...form, facebookUrl: v }),
      setEnabled: (v: boolean) => setForm({ ...form, facebookEnabled: v }),
      icon: <FacebookIcon className="w-4 h-4" color="#1877F2" />,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      url: computedWhatsappUrl,
      enabled: form.whatsappEnabled,
      setUrl: (v: string) => setForm({ ...form, whatsappUrl: v, whatsappUsePhone: false }),
      setEnabled: (v: boolean) => setForm({ ...form, whatsappEnabled: v }),
      icon: <WhatsAppIcon className="w-4 h-4" color="#25D366" />,
    },
    {
      key: "youtube",
      label: "YouTube",
      url: form.youtubeUrl,
      enabled: form.youtubeEnabled,
      setUrl: (v: string) => setForm({ ...form, youtubeUrl: v }),
      setEnabled: (v: boolean) => setForm({ ...form, youtubeEnabled: v }),
      icon: <YouTubeIcon className="w-4 h-4" color="#FF0000" />,
    },
  ];

  const orderedSocialRows = form.socialOrder
    .map((k) => socialRows.find((r) => r.key === k))
    .filter((x): x is (typeof socialRows)[number] => Boolean(x));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Contact &amp; Social Media Settings
            </h1>
            {pendingDrafts > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {pendingDrafts} Pending Drafts
              </span>
            )}
          </div>
          <p className="text-xs text-[#b0b0b8] mt-1">
            Manage company contact info, dynamic copyright year, and social icon links/order synced to Footer, Contact cards, and SEO.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/?preview=1"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-amber-300" /> Preview Website
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("draft")}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("publish")}
            data-testid="publish-contact-settings-btn"
            className="px-5 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Globe className="w-3.5 h-3.5" /> Publish Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COMPANY DETAILS */}
        <div className="lg:col-span-6 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4">
          <h2 className="font-bold text-base text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#3b82f6]" />
            <span>Company &amp; Copyright Details</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#b0b0b8] mb-1">Company Name</label>
              <input
                type="text"
                value={form.siteName}
                onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#b0b0b8] mb-1">Company Location</label>
              <input
                type="text"
                value={form.contactAddress}
                onChange={(e) => setForm({ ...form, contactAddress: e.target.value })}
                placeholder="Assam, Guwahati, India"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  placeholder="+918724804659"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Support Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="support@goldexmedianetwork.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#b0b0b8] mb-1">Copyright Company Name</label>
                <input
                  type="text"
                  value={form.copyrightCompanyName}
                  onChange={(e) => setForm({ ...form, copyrightCompanyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#b0b0b8] mb-1">Copyright Year</label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.copyrightYear}
                  onChange={(e) =>
                    setForm({ ...form, copyrightYear: Number.parseInt(e.target.value, 10) || 2026 })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SOCIAL MEDIA SETTINGS */}
        <div className="lg:col-span-6 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#3b82f6]" />
              <span>Social Media Links &amp; Ordering</span>
            </h2>
            <label className="flex items-center gap-1.5 text-xs text-[#b0b0b8] cursor-pointer">
              <input
                type="checkbox"
                checked={form.whatsappUsePhone}
                onChange={(e) => setForm({ ...form, whatsappUsePhone: e.target.checked })}
              />
              Auto-sync WhatsApp from Phone
            </label>
          </div>

          <div className="space-y-3 text-xs">
            {orderedSocialRows.map((row, idx) => (
              <div
                key={row.key}
                className="p-3.5 rounded-xl bg-[#111114] border border-white/5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    {row.icon}
                    <span>{row.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#b0b0b8]">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => row.setEnabled(e.target.checked)}
                      />
                      Enabled
                    </label>
                    <button
                      type="button"
                      onClick={() => moveSocial(idx, -1)}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                      aria-label={`Move ${row.label} up`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSocial(idx, 1)}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                      aria-label={`Move ${row.label} down`}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={row.url}
                    disabled={row.key === "whatsapp" && form.whatsappUsePhone}
                    onChange={(e) => row.setUrl(e.target.value)}
                    placeholder={`https://... (${row.label} URL)`}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-xs disabled:opacity-75"
                  />
                  {row.url && (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-1"
                      title={`Preview ${row.label} link`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LIVE FOOTER & CONTACT PREVIEW */}
      <div className="rounded-2xl bg-[#0a0a0a] border border-[#2a2a2a] p-6 space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#3b82f6]">
          Live Footer &amp; Contact Preview
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2.5">
            <div className="font-bold text-white">{form.siteName}</div>
            <div className="flex items-center gap-2 text-[#b0b0b8]">
              <MapPin className="w-4 h-4 text-[#ef4444]" />
              <span>{form.contactAddress}</span>
            </div>
            <div className="flex items-center gap-2 text-[#b0b0b8]">
              <Phone className="w-4 h-4 text-[#25D366]" />
              <a href={`tel:${form.contactPhone.replace(/[^+\d]/g, "")}`} className="underline">
                {form.contactPhone}
              </a>
            </div>
            <div className="flex items-center gap-2 text-[#b0b0b8]">
              <Mail className="w-4 h-4 text-white" />
              <a href={`mailto:${form.contactEmail}`} className="underline">
                {form.contactEmail}
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-[#71717a]">Enabled Social Icons (in display order):</div>
            <div className="flex gap-3">
              {orderedSocialRows
                .filter((r) => r.enabled && r.url)
                .map((r) => (
                  <a
                    key={r.key}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"
                    title={r.label}
                  >
                    {r.icon}
                  </a>
                ))}
            </div>
            <div className="text-xs text-[#71717a] pt-2 border-t border-white/10">
              {computedCopyright}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
