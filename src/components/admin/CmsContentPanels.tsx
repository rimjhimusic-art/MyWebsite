"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export interface CmsPageSectionRow {
  id: string;
  pageSlug: string;
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  badgeText: string | null;
  bodyHtml: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  cta2Label: string | null;
  cta2Href: string | null;
  mediaUrl: string | null;
  mediaType?: string | null;
  extraJson?: string;
  bgColor: string | null;
  textColor: string | null;
  enabled: boolean;
  sortOrder: number;
}

export interface CmsNavRow {
  id: string;
  location: string;
  label: string;
  href: string;
  isButton: boolean;
  openNewTab: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface CmsWebsiteSettingsRow {
  siteName: string;
  tagline: string;
  headerLogoUrl: string;
  headerLogoWidth: number;
  headerLogoHeight: number;
  footerLogoUrl: string;
  footerLogoWidth: number;
  footerLogoHeight: number;
  faviconUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  instagramUrl: string;
  facebookUrl: string;
  whatsappUrl: string;
  youtubeUrl: string;
  instagramEnabled?: boolean;
  facebookEnabled?: boolean;
  whatsappEnabled?: boolean;
  youtubeEnabled?: boolean;
  socialOrderJson?: string;
  whatsappUsePhone?: boolean;
  copyrightCompanyName?: string;
  copyrightYear?: number;
  copyrightText: string;
  showNewUpdatesBadge?: boolean;
  newUpdatesBadgeText?: string;
  newUpdatesBadgePulse?: boolean;
}

export interface CmsSeoRow {
  id: string;
  pageSlug: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
}

export function PagesSectionsPanel({
  sections,
  onSaveSection,
  onPickMedia,
}: {
  sections: CmsPageSectionRow[];
  onSaveSection: (payload: Partial<CmsPageSectionRow> & { id: string }, mode: "draft" | "publish") => Promise<void>;
  onPickMedia: (cb: (url: string) => void, folder?: string) => void;
}) {
  const pageSlugs = Array.from(new Set(sections.map((s) => s.pageSlug)));
  const [selectedPage, setSelectedPage] = useState(pageSlugs[0] || "home");
  const filtered = sections.filter((s) => s.pageSlug === selectedPage);
  const [editing, setEditing] = useState<CmsPageSectionRow | null>(filtered[0] || null);

  useEffect(() => {
    const first = sections.find((s) => s.pageSlug === selectedPage) || null;
    setEditing(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {pageSlugs.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => setSelectedPage(slug)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer ${
              selectedPage === slug
                ? "bg-[#3b82f6] text-white"
                : "bg-[#18181b] border border-[#2a2a2a] text-[#b0b0b8] hover:text-white"
            }`}
          >
            {slug}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-2">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setEditing(s)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                editing?.id === s.id
                  ? "bg-blue-500/15 border-[#3b82f6] text-white"
                  : "bg-[#18181b] border-[#2a2a2a] text-[#b0b0b8] hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#3b82f6]">
                  {s.sectionKey}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10">
                  {s.enabled ? "Enabled" : "Hidden"}
                </span>
              </div>
              <div className="text-sm font-semibold text-white truncate mt-1">
                {s.title || s.sectionKey}
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
          {!editing ? (
            <p className="text-sm text-[#71717a]">Select a section to edit.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white">
                  Editing Section: {editing.pageSlug}.{editing.sectionKey}
                </h3>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.enabled}
                    onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                  />
                  Section Enabled
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#b0b0b8] mb-1">Heading / Title</label>
                  <input
                    type="text"
                    value={editing.title || ""}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#b0b0b8] mb-1">Badge / Highlight Label</label>
                  <input
                    type="text"
                    value={editing.badgeText || ""}
                    onChange={(e) => setEditing({ ...editing, badgeText: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#b0b0b8] mb-1">Subtitle / Intro Copy</label>
                <textarea
                  rows={2}
                  value={editing.subtitle || ""}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#b0b0b8] mb-1">Body Copy / Content</label>
                <textarea
                  rows={4}
                  value={editing.bodyHtml || ""}
                  onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Primary CTA Label"
                  value={editing.ctaLabel || ""}
                  onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })}
                  className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <input
                  type="text"
                  placeholder="Primary CTA URL"
                  value={editing.ctaHref || ""}
                  onChange={(e) => setEditing({ ...editing, ctaHref: e.target.value })}
                  className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <input
                  type="text"
                  placeholder="Background Hex Color (e.g. #0f0f0f)"
                  value={editing.bgColor || ""}
                  onChange={(e) => setEditing({ ...editing, bgColor: e.target.value })}
                  className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Media Image/Video URL"
                    value={editing.mediaUrl || ""}
                    onChange={(e) => setEditing({ ...editing, mediaUrl: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => onPickMedia((u) => setEditing({ ...editing, mediaUrl: u }), "general")}
                    className="px-3 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Pick
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onSaveSection(editing, "draft")}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Draft (Preview with ?preview=1)
                </button>
                <button
                  type="button"
                  onClick={() => onSaveSection(editing, "publish")}
                  className="px-5 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save &amp; Publish Live
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function NavigationManagerPanel({
  items,
  onCreate,
  onSave,
  onReorder,
  onDelete,
}: {
  items: CmsNavRow[];
  onCreate: (payload: Partial<CmsNavRow>, mode: "draft" | "publish") => Promise<void>;
  onSave: (payload: Partial<CmsNavRow> & { id: string }, mode: "draft" | "publish") => Promise<void>;
  onReorder: (ids: string[]) => Promise<void>;
  onDelete: (id: string, label: string) => void;
}) {
  const [location, setLocation] = useState<"HEADER" | "FOOTER_QUICK">("HEADER");
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("/");
  const [isButton, setIsButton] = useState(false);

  const filtered = items.filter((n) => n.location === location);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...filtered];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onReorder(next.map((x) => x.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setLocation("HEADER")}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            location === "HEADER" ? "bg-[#3b82f6] text-white" : "bg-[#18181b] text-[#b0b0b8]"
          }`}
        >
          Header Navigation ({items.filter((i) => i.location === "HEADER").length})
        </button>
        <button
          type="button"
          onClick={() => setLocation("FOOTER_QUICK")}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            location === "FOOTER_QUICK" ? "bg-[#3b82f6] text-white" : "bg-[#18181b] text-[#b0b0b8]"
          }`}
        >
          Footer Quick Links ({items.filter((i) => i.location === "FOOTER_QUICK").length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
          <h3 className="font-bold text-sm text-white">Add {location === "HEADER" ? "Header" : "Footer"} Link</h3>
          <input
            type="text"
            placeholder="Menu Label*"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="text"
            placeholder="URL Path (e.g. /services)*"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={isButton} onChange={(e) => setIsButton(e.target.checked)} />
            Highlight as Action Button
          </label>
          <button
            type="button"
            onClick={async () => {
              await onCreate({ location, label, href, isButton, enabled: true }, "publish");
              setLabel("");
            }}
            className="w-full py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Menu Link
          </button>
        </div>

        <div className="lg:col-span-8 space-y-2.5">
          {filtered.map((n, idx) => (
            <div
              key={n.id}
              className="rounded-xl bg-[#18181b] border border-[#2a2a2a] p-3.5 flex items-center justify-between gap-3"
            >
              <div>
                <div className="font-bold text-sm text-white">
                  {n.label} {n.isButton && <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 ml-1">CTA</span>}
                </div>
                <div className="text-xs text-[#71717a]">{n.href}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSave({ id: n.id, enabled: !n.enabled }, "publish")}
                  className="px-2.5 py-1 rounded bg-white/5 text-xs cursor-pointer"
                >
                  {n.enabled ? "Disable" : "Enable"}
                </button>
                <button type="button" onClick={() => move(idx, -1)} className="p-1.5 rounded bg-white/5 cursor-pointer">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => move(idx, 1)} className="p-1.5 rounded bg-white/5 cursor-pointer">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(n.id, n.label)}
                  className="p-1.5 rounded bg-red-500/15 text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsBrandingPanel({
  settings,
  onSave,
  onPickMedia,
}: {
  settings: CmsWebsiteSettingsRow;
  onSave: (payload: CmsWebsiteSettingsRow, mode: "draft" | "publish") => Promise<void>;
  onPickMedia: (cb: (url: string) => void, folder?: string) => void;
}) {
  const [form, setForm] = useState<CmsWebsiteSettingsRow>(settings);
  useEffect(() => setForm(settings), [settings]);

  return (
    <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-5">
      <h2 className="text-base font-bold text-white">Logos, Branding, Footer &amp; Social Links</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Website / Brand Name</label>
          <input
            type="text"
            value={form.siteName}
            onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Copyright Company Name</label>
          <input
            type="text"
            value={form.copyrightCompanyName || "Goldex Media Network Private Limited"}
            onChange={(e) => {
              const company = e.target.value;
              const year = form.copyrightYear || 2026;
              setForm({
                ...form,
                copyrightCompanyName: company,
                copyrightText: `© ${year} ${company.trim() || "Goldex Media Network Private Limited"} All Right Reserved`,
              });
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Copyright Year</label>
          <input
            type="number"
            min={2000}
            max={2100}
            value={form.copyrightYear || 2026}
            onChange={(e) => {
              const year = Number(e.target.value) || 2026;
              const company = form.copyrightCompanyName || "Goldex Media Network Private Limited";
              setForm({
                ...form,
                copyrightYear: year,
                copyrightText: `© ${year} ${company.trim()} All Right Reserved`,
              });
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#b0b0b8] mb-1">Footer Brand Tagline</label>
        <textarea
          rows={2}
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-2">
          <div className="text-xs font-bold text-white">Header Logo</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.headerLogoUrl}
              onChange={(e) => setForm({ ...form, headerLogoUrl: e.target.value })}
              className="flex-1 px-2.5 py-1.5 rounded bg-[#18181b] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() => onPickMedia((u) => setForm({ ...form, headerLogoUrl: u }), "branding")}
              className="px-2.5 py-1.5 rounded bg-white/10 text-xs cursor-pointer"
            >
              Pick
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <input
              type="number"
              value={form.headerLogoWidth}
              onChange={(e) => setForm({ ...form, headerLogoWidth: Number(e.target.value) || 118 })}
              placeholder="Width px"
              className="px-2 py-1 rounded bg-[#18181b] border border-[#2a2a2a]"
            />
            <input
              type="number"
              value={form.headerLogoHeight}
              onChange={(e) => setForm({ ...form, headerLogoHeight: Number(e.target.value) || 40 })}
              placeholder="Height px"
              className="px-2 py-1 rounded bg-[#18181b] border border-[#2a2a2a]"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-2">
          <div className="text-xs font-bold text-white">Footer Logo</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.footerLogoUrl}
              onChange={(e) => setForm({ ...form, footerLogoUrl: e.target.value })}
              className="flex-1 px-2.5 py-1.5 rounded bg-[#18181b] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() => onPickMedia((u) => setForm({ ...form, footerLogoUrl: u }), "branding")}
              className="px-2.5 py-1.5 rounded bg-white/10 text-xs cursor-pointer"
            >
              Pick
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <input
              type="number"
              value={form.footerLogoWidth}
              onChange={(e) => setForm({ ...form, footerLogoWidth: Number(e.target.value) || 118 })}
              placeholder="Width px"
              className="px-2 py-1 rounded bg-[#18181b] border border-[#2a2a2a]"
            />
            <input
              type="number"
              value={form.footerLogoHeight}
              onChange={(e) => setForm({ ...form, footerLogoHeight: Number(e.target.value) || 40 })}
              placeholder="Height px"
              className="px-2 py-1 rounded bg-[#18181b] border border-[#2a2a2a]"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-2">
          <div className="text-xs font-bold text-white">Favicon URL</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.faviconUrl}
              onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
              className="flex-1 px-2.5 py-1.5 rounded bg-[#18181b] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() => onPickMedia((u) => setForm({ ...form, faviconUrl: u }), "branding")}
              className="px-2.5 py-1.5 rounded bg-white/10 text-xs cursor-pointer"
            >
              Pick
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="email"
          placeholder="Support Email"
          value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
        />
        <input
          type="text"
          placeholder="Contact Phone / WhatsApp"
          value={form.contactPhone}
          onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
        />
        <input
          type="text"
          placeholder="Office Address"
          value={form.contactAddress}
          onChange={(e) => setForm({ ...form, contactAddress: e.target.value })}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
        />
        <input
          type="url"
          placeholder="Instagram URL"
          value={form.instagramUrl}
          onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
        />
        <input
          type="url"
          placeholder="Facebook URL"
          value={form.facebookUrl}
          onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
        />
        <input
          type="url"
          placeholder="WhatsApp URL"
          value={form.whatsappUrl}
          onChange={(e) => setForm({ ...form, whatsappUrl: e.target.value })}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
        />
        <input
          type="url"
          placeholder="YouTube URL"
          value={form.youtubeUrl}
          onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
          className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
        />
      </div>

      <p className="text-[11px] text-[#71717a]">
        For individual social icon toggles, ordering, WhatsApp phone sync, and live link preview, use{" "}
        <a href="/admin/contact-settings" className="text-[#60a5fa] underline">
          Contact &amp; Social Settings
        </a>
        .
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onSave(form, "draft")}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => onSave(form, "publish")}
          className="px-5 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold cursor-pointer"
        >
          Save &amp; Publish Branding
        </button>
      </div>
    </div>
  );
}

export function MediaLibraryPanel() {
  const { showToast } = useToast();
  const [assets, setAssets] = useState<Array<{ id: string; url: string; title: string; folder: string; kind: string; isStatic: boolean }>>([]);
  const [folder, setFolder] = useState("ALL");
  const [uploadFolder, setUploadFolder] = useState("branding");

  const load = async () => {
    const res = await fetch(`/api/admin/cms/media${folder !== "ALL" ? `?folder=${folder}` : ""}`);
    if (res.ok) {
      const d = await res.json();
      setAssets(d.assets || []);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", uploadFolder);
    fd.append("title", file.name);
    const res = await fetch("/api/admin/cms/media", { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Upload failed", "error");
      return;
    }
    showToast("Media asset uploaded!", "success");
    load();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/cms/media?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const d = await res.json();
    if (res.status === 409) {
      showToast(d.error || "In use by CMS.", "error");
      return;
    }
    if (res.ok) {
      showToast("Media asset removed.", "success");
      load();
    } else {
      showToast(d.error || "Failed to delete asset.", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["ALL", "branding", "artists", "stores", "team", "brand", "videos", "general"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFolder(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase cursor-pointer ${
                folder === f ? "bg-[#3b82f6] text-white" : "bg-[#0f0f0f] text-[#b0b0b8]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
          >
            <option value="branding">Folder: branding</option>
            <option value="artists">Folder: artists</option>
            <option value="stores">Folder: stores</option>
            <option value="team">Folder: team</option>
            <option value="videos">Folder: videos</option>
            <option value="general">Folder: general</option>
          </select>
          <label className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Upload Image / SVG / Video
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.svg,.mp4,.webm,.mov,.ico"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {assets.map((a) => (
          <div key={a.id} className="rounded-xl bg-[#18181b] border border-[#2a2a2a] p-2.5 space-y-2">
            <div className="h-24 rounded-lg bg-[#0f0f0f] flex items-center justify-center overflow-hidden">
              {a.kind === "CMS_VIDEO" ? (
                <video src={a.url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={a.url} alt={a.title} className="max-h-full max-w-full object-contain p-1" />
              )}
            </div>
            <div className="text-xs font-semibold text-white truncate">{a.title}</div>
            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(a.url);
                  showToast(`Copied: ${a.url}`, "success");
                }}
                className="inline-flex items-center gap-1 text-[#3b82f6] cursor-pointer"
              >
                <Copy className="w-3 h-3" /> URL
              </button>
              {!a.isStatic && (
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="text-red-400 hover:underline cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeoBackupPanel({
  seoList,
  revisions,
  onSaveSeo,
  onRestoreBackup,
}: {
  seoList: CmsSeoRow[];
  revisions: Array<{ id: string; summary: string; createdAt: string }>;
  onSaveSeo: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onRestoreBackup: (jsonObj: unknown) => Promise<void>;
}) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<CmsSeoRow | null>(seoList[0] || null);
  const [restoreText, setRestoreText] = useState("");

  useEffect(() => {
    if (!selected && seoList[0]) setSelected(seoList[0]);
  }, [seoList, selected]);

  const downloadBackup = async () => {
    const res = await fetch("/api/admin/cms/backup");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `goldex-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CMS JSON backup downloaded.", "success");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
        <h3 className="font-bold text-sm text-white">SEO Settings per Page</h3>
        <div className="flex flex-wrap gap-1.5">
          {seoList.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase cursor-pointer ${
                selected?.id === s.id ? "bg-[#3b82f6] text-white" : "bg-[#0f0f0f] text-[#b0b0b8]"
              }`}
            >
              {s.pageSlug}
            </button>
          ))}
        </div>
        {selected && (
          <div className="space-y-3 pt-2">
            <input
              type="text"
              value={selected.metaTitle}
              onChange={(e) => setSelected({ ...selected, metaTitle: e.target.value })}
              placeholder="Meta Title"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <textarea
              rows={3}
              value={selected.metaDescription}
              onChange={(e) => setSelected({ ...selected, metaDescription: e.target.value })}
              placeholder="Meta Description"
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
            />
            <button
              type="button"
              onClick={() => onSaveSeo(selected as unknown as Record<string, unknown>, "publish")}
              className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
            >
              Save SEO Metadata
            </button>
          </div>
        )}
      </div>

      <div className="lg:col-span-6 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">JSON Backup &amp; Publish History</h3>
          <button
            type="button"
            onClick={downloadBackup}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON Backup
          </button>
        </div>

        <div className="space-y-2">
          <textarea
            rows={4}
            placeholder="Paste exported CMS JSON backup here to restore..."
            value={restoreText}
            onChange={(e) => setRestoreText(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs font-mono"
          />
          <button
            type="button"
            onClick={() => {
              try {
                const parsed = JSON.parse(restoreText);
                onRestoreBackup(parsed);
              } catch {
                showToast("Invalid JSON format.", "error");
              }
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
          >
            Restore from Backup JSON
          </button>
        </div>

        <div className="border-t border-[#2a2a2a] pt-3 space-y-1.5">
          <div className="text-xs font-bold text-[#b0b0b8]">Recent Publish Revisions</div>
          {revisions.length === 0 ? (
            <p className="text-xs text-[#71717a]">No publish snapshots yet.</p>
          ) : (
            revisions.map((r) => (
              <div key={r.id} className="text-xs bg-[#0f0f0f] px-3 py-2 rounded-lg flex justify-between">
                <span className="text-zinc-200">{r.summary}</span>
                <span className="text-[#71717a]">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
