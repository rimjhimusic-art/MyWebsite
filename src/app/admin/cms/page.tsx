"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  RotateCcw,
  Globe,
  FileText,
  Users,
  Disc3,
  Layers,
  Image as ImageIcon,
  Settings,
  Search,
  Menu as MenuIcon,
  MessageSquare,
  Sparkles,
  Megaphone,
  Info,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { CmsConfirmModal } from "@/components/admin/CmsConfirmModal";
import { CmsMediaPickerModal } from "@/components/admin/CmsMediaPickerModal";
import {
  AboutManagerPanel,
  BrandSolutionsManagerPanel,
  type CmsBrandCreatorRow,
} from "@/components/admin/BrandAboutPanels";
import {
  ArtistsManagerPanel,
  ServicesManagerPanel,
  StoresManagerPanel,
  TeamManagerPanel,
  type CmsArtistRow,
  type CmsServiceRow,
  type CmsStoreRow,
  type CmsTeamRow,
} from "@/components/admin/CmsCardsPanels";
import {
  MediaLibraryPanel,
  NavigationManagerPanel,
  PagesSectionsPanel,
  SeoBackupPanel,
  SettingsBrandingPanel,
  type CmsNavRow,
  type CmsPageSectionRow,
  type CmsSeoRow,
  type CmsWebsiteSettingsRow,
} from "@/components/admin/CmsContentPanels";

interface CmsOverviewPayload {
  settings: CmsWebsiteSettingsRow;
  headerNav: CmsNavRow[];
  footerNav: CmsNavRow[];
  sections: CmsPageSectionRow[];
  artists: CmsArtistRow[];
  stores: CmsStoreRow[];
  services: CmsServiceRow[];
  team: CmsTeamRow[];
  brandCreators: CmsBrandCreatorRow[];
  seoMap: Record<string, CmsSeoRow>;
  pendingDrafts: number;
  revisions: Array<{ id: string; summary: string; createdAt: string }>;
}

interface LegacyServicePayload {
  faqs: Array<{ id: string; question: string; answer: string; category: string }>;
  contactInquiries: Array<{ id: string; name: string; email: string; message: string }>;
  brandInquiries: Array<{ id: string; firstName: string; lastName: string; businessName: string; email: string }>;
  careerApplications: Array<{ id: string; roleTitle: string; fullName: string; email: string }>;
}

const TABS = [
  { key: "pages", label: "Pages & Sections", icon: FileText },
  { key: "about", label: "About Section CMS", icon: Info },
  { key: "brand", label: "Brand Solutions CMS", icon: Megaphone },
  { key: "artists", label: "Featured Artists", icon: Users },
  { key: "stores", label: "Digital Stores", icon: Disc3 },
  { key: "services", label: "Services Cards", icon: Layers },
  { key: "team", label: "Leadership & Team", icon: Users },
  { key: "navigation", label: "Header & Footer Nav", icon: MenuIcon },
  { key: "branding", label: "Logos & Footer", icon: Settings },
  { key: "media", label: "Media Library", icon: ImageIcon },
  { key: "seo", label: "SEO & Backup", icon: Search },
  { key: "inquiries", label: "FAQs & Inquiries", icon: MessageSquare },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminCmsStudioPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabKey>("pages");
  const [cms, setCms] = useState<CmsOverviewPayload | null>(null);
  const [legacy, setLegacy] = useState<LegacyServicePayload | null>(null);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "Distribution", keywords: "" });
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", confirmLabel: "Confirm", onConfirm: () => {} });
  const [mediaPicker, setMediaPicker] = useState<{
    open: boolean;
    folder: string;
    callback: ((url: string) => void) | null;
  }>({ open: false, folder: "general", callback: null });

  const loadAll = async () => {
    const [cmsRes, legRes] = await Promise.all([
      fetch("/api/admin/cms/overview"),
      fetch("/api/admin/services"),
    ]);
    if (cmsRes.ok) setCms(await cmsRes.json());
    if (legRes.ok) setLegacy(await legRes.json());
  };

  useEffect(() => {
    loadAll();
  }, []);

  const callCms = async (endpoint: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) => {
    const res = await fetch(endpoint, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "CMS update failed.", "error");
      return false;
    }
    await loadAll();
    return true;
  };

  const handlePublish = async (action: "publish" | "discard") => {
    const ok = await callCms("/api/admin/cms/publish", "POST", { action });
    if (ok) {
      showToast(
        action === "publish"
          ? "All CMS changes published live across the public website!"
          : "Unpublished CMS drafts discarded.",
        "success"
      );
    }
  };

  const confirmDelete = (endpointWithQuery: string, label: string) => {
    setConfirmState({
      open: true,
      title: `Delete "${label}"?`,
      description: "This removes the item from your CMS catalog. Remember to click Publish Changes to update live visitors.",
      confirmLabel: "Delete Item",
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        const ok = await callCms(endpointWithQuery, "DELETE");
        if (ok) showToast(`Removed "${label}".`, "success");
      },
    });
  };

  if (!cms) {
    return (
      <div className="p-8 text-sm text-[#b0b0b8]">Loading Website CMS Studio...</div>
    );
  }

  const allNav = [...cms.headerNav, ...cms.footerNav];
  const seoList = Object.values(cms.seoMap);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#18181b] via-[#172554]/40 to-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Website CMS Studio</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                cms.pendingDrafts > 0
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
              data-testid="cms-draft-counter"
            >
              {cms.pendingDrafts > 0
                ? `${cms.pendingDrafts} Pending Drafts`
                : "All Changes Published"}
            </span>
          </div>
          <p className="text-xs text-[#b0b0b8] mt-1">
            Edit public pages, featured artists, digital store logos, services, team members, navigation, branding, SEO, and media assets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/updates"
            className="px-4 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/35 text-blue-300 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> New Updates Manager
          </Link>
          <Link
            href="/?preview=1"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-amber-300" /> Preview Drafts
          </Link>
          <button
            type="button"
            onClick={() =>
              setConfirmState({
                open: true,
                title: "Discard all unpublished drafts?",
                description: "All pending draft edits across CMS tables will revert to the last published live state.",
                confirmLabel: "Discard Drafts",
                onConfirm: () => {
                  setConfirmState((p) => ({ ...p, open: false }));
                  handlePublish("discard");
                },
              })
            }
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-300 hover:text-red-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Discard Drafts
          </button>
          <button
            type="button"
            onClick={() => handlePublish("publish")}
            data-testid="cms-publish-all-btn"
            className="px-5 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/25"
          >
            <Globe className="w-3.5 h-3.5" /> Publish Changes Live
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
                active
                  ? "bg-[#3b82f6] text-white shadow-md"
                  : "bg-[#18181b] border border-[#2a2a2a] text-[#b0b0b8] hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "pages" && (
        <PagesSectionsPanel
          sections={cms.sections}
          onSaveSection={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/pages", "PATCH", { ...payload, mode });
            if (ok) showToast(mode === "publish" ? "Section published!" : "Section draft saved.", "success");
          }}
          onPickMedia={(cb, folder = "general") => setMediaPicker({ open: true, folder, callback: cb })}
        />
      )}

      {tab === "about" && (
        <AboutManagerPanel
          sections={cms.sections}
          onSaveSection={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/pages", "PATCH", { ...payload, mode });
            if (ok) showToast(mode === "publish" ? "About section published live!" : "About section draft saved.", "success");
          }}
          onPickMedia={(cb, folder = "about") => setMediaPicker({ open: true, folder, callback: cb })}
          onGoToTeamTab={() => setTab("team")}
        />
      )}

      {tab === "brand" && (
        <BrandSolutionsManagerPanel
          creators={cms.brandCreators || []}
          sections={cms.sections}
          onCreateCreator={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/collections?type=brand", "POST", { ...payload, mode });
            if (ok) showToast("Brand Solutions creator added!", "success");
          }}
          onSaveCreator={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/collections?type=brand", "PATCH", { ...payload, mode });
            if (ok) showToast("Brand Solutions creator updated!", "success");
          }}
          onReorderCreators={async (ids) => {
            await callCms("/api/admin/cms/collections?type=brand", "PATCH", { action: "reorder", ids, mode: "publish" });
            showToast("Creators display order updated.", "success");
          }}
          onDeleteCreator={(id, label) => confirmDelete(`/api/admin/cms/collections?type=brand&id=${id}&mode=publish`, label)}
          onSaveSection={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/pages", "PATCH", { ...payload, mode });
            if (ok) showToast("Brand Solutions page section saved!", "success");
          }}
          onPickMedia={(cb, folder = "brand") => setMediaPicker({ open: true, folder, callback: cb })}
        />
      )}

      {tab === "artists" && (
        <ArtistsManagerPanel
          items={cms.artists}
          onCreate={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/artists", "POST", { ...payload, mode });
            if (ok) showToast(mode === "publish" ? "Artist added & published!" : "Artist saved as draft.", "success");
          }}
          onSave={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/artists", "PATCH", { ...payload, mode });
            if (ok) showToast(mode === "publish" ? "Artist updated & published!" : "Artist draft saved.", "success");
          }}
          onReorder={async (ids) => {
            await callCms("/api/admin/cms/artists", "PATCH", { action: "reorder", ids, mode: "publish" });
            showToast("Featured artists order updated.", "success");
          }}
          onDelete={(id, label) => confirmDelete(`/api/admin/cms/artists?id=${id}&mode=publish`, label)}
          onPickMedia={(cb, folder = "artists") => setMediaPicker({ open: true, folder, callback: cb })}
        />
      )}

      {tab === "stores" && (
        <StoresManagerPanel
          items={cms.stores}
          onCreate={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/stores", "POST", { ...payload, mode });
            if (ok) showToast("Store logo added!", "success");
          }}
          onSave={async (payload, mode) => {
            await callCms("/api/admin/cms/stores", "PATCH", { ...payload, mode });
          }}
          onReorder={async (ids) => {
            await callCms("/api/admin/cms/stores", "PATCH", { action: "reorder", ids, mode: "publish" });
          }}
          onDelete={(id, label) => confirmDelete(`/api/admin/cms/stores?id=${id}&mode=publish`, label)}
          onPickMedia={(cb, folder = "stores") => setMediaPicker({ open: true, folder, callback: cb })}
        />
      )}

      {tab === "services" && (
        <ServicesManagerPanel
          items={cms.services}
          onCreate={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/services", "POST", { ...payload, mode });
            if (ok) showToast("Service card added!", "success");
          }}
          onSave={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/services", "PATCH", { ...payload, mode });
            if (ok) showToast("Service card updated!", "success");
          }}
          onDelete={(id, label) => confirmDelete(`/api/admin/cms/services?id=${id}&mode=publish`, label)}
        />
      )}

      {tab === "team" && (
        <TeamManagerPanel
          items={cms.team}
          onCreate={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/team", "POST", { ...payload, mode });
            if (ok) showToast(mode === "publish" ? "Team member added & published!" : "Team member draft saved.", "success");
          }}
          onSave={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/team", "PATCH", { ...payload, mode });
            if (ok) showToast(mode === "publish" ? "Team member updated & published!" : "Team member draft saved.", "success");
          }}
          onReorder={async (ids) => {
            await callCms("/api/admin/cms/team", "PATCH", { action: "reorder", ids, mode: "publish" });
            showToast("Team display order updated.", "success");
          }}
          onDelete={(id, label) => confirmDelete(`/api/admin/cms/team?id=${id}&mode=publish`, label)}
          onPickMedia={(cb, folder = "team") => setMediaPicker({ open: true, folder, callback: cb })}
        />
      )}

      {tab === "navigation" && (
        <NavigationManagerPanel
          items={allNav}
          onCreate={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/navigation", "POST", { ...payload, mode });
            if (ok) showToast("Navigation item added!", "success");
          }}
          onSave={async (payload, mode) => {
            await callCms("/api/admin/cms/navigation", "PATCH", { ...payload, mode });
          }}
          onReorder={async (ids) => {
            await callCms("/api/admin/cms/navigation", "PATCH", { action: "reorder", ids, mode: "publish" });
          }}
          onDelete={(id, label) => confirmDelete(`/api/admin/cms/navigation?id=${id}&mode=publish`, label)}
        />
      )}

      {tab === "branding" && (
        <SettingsBrandingPanel
          settings={cms.settings}
          onSave={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/settings", "PATCH", { ...payload, mode });
            if (ok) showToast(mode === "publish" ? "Branding published live!" : "Branding draft saved.", "success");
          }}
          onPickMedia={(cb, folder = "branding") => setMediaPicker({ open: true, folder, callback: cb })}
        />
      )}

      {tab === "media" && <MediaLibraryPanel />}

      {tab === "seo" && (
        <SeoBackupPanel
          seoList={seoList}
          revisions={cms.revisions || []}
          onSaveSeo={async (payload, mode) => {
            const ok = await callCms("/api/admin/cms/collections?type=seo", "PATCH", { ...payload, mode });
            if (ok) showToast("SEO settings updated!", "success");
          }}
          onRestoreBackup={async (jsonObj) => {
            setConfirmState({
              open: true,
              title: "Restore CMS from Backup JSON?",
              description: "This overwrites current CMS configuration, pages, artists, stores, services, team, and SEO entries with the uploaded snapshot.",
              confirmLabel: "Restore Backup",
              onConfirm: async () => {
                setConfirmState((p) => ({ ...p, open: false }));
                const ok = await callCms("/api/admin/cms/backup", "POST", jsonObj);
                if (ok) showToast("CMS backup restored live!", "success");
              },
            });
          }}
        />
      )}

      {tab === "inquiries" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await callCms("/api/admin/services", "PATCH", {
                module: "faq",
                create: true,
                ...faqForm,
              });
              if (ok) {
                showToast("FAQ added!", "success");
                setFaqForm({ question: "", answer: "", category: "Distribution", keywords: "" });
              }
            }}
            className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3 h-fit"
          >
            <h2 className="font-bold text-base">Add Configurable FAQ / Chatbot Entry</h2>
            <input
              type="text"
              required
              placeholder="Question*"
              value={faqForm.question}
              onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <input
              type="text"
              placeholder="Category"
              value={faqForm.category}
              onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <input
              type="text"
              placeholder="Chatbot Keywords"
              value={faqForm.keywords}
              onChange={(e) => setFaqForm({ ...faqForm, keywords: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <textarea
              required
              rows={3}
              placeholder="Answer*"
              value={faqForm.answer}
              onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
            />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer">
              Publish FAQ Entry
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
            <h2 className="font-bold text-base">Contact, Brand &amp; Career Inquiries</h2>
            {!legacy?.contactInquiries.length && !legacy?.brandInquiries.length && !legacy?.careerApplications.length ? (
              <p className="text-xs text-[#71717a]">No website inquiries received yet.</p>
            ) : (
              <>
                {legacy?.contactInquiries.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-[#111114] text-xs">
                    <div className="font-bold text-white">Contact: {c.name} ({c.email})</div>
                    <div className="text-[#b0b0b8] mt-0.5">{c.message}</div>
                  </div>
                ))}
                {legacy?.brandInquiries.map((b) => (
                  <div key={b.id} className="p-3 rounded-xl bg-[#111114] text-xs">
                    <div className="font-bold text-[#3b82f6]">
                      Brand Inquiry: {b.businessName} ({b.firstName} {b.lastName} &bull; {b.email})
                    </div>
                  </div>
                ))}
                {legacy?.careerApplications.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-[#111114] text-xs">
                    <div className="font-bold text-emerald-400">
                      Career: {a.roleTitle} &mdash; {a.fullName} ({a.email})
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <CmsConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((p) => ({ ...p, open: false }))}
      />

      <CmsMediaPickerModal
        open={mediaPicker.open}
        defaultFolder={mediaPicker.folder}
        onClose={() => setMediaPicker({ open: false, folder: "general", callback: null })}
        onSelect={(url) => {
          if (mediaPicker.callback) mediaPicker.callback(url);
        }}
      />
    </div>
  );
}
