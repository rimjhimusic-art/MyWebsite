"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
  Video,
} from "lucide-react";
import type { CmsPageSectionRow } from "@/components/admin/CmsContentPanels";

export interface CmsBrandCreatorRow {
  id: string;
  name: string;
  handle: string | null;
  category: string | null;
  description?: string | null;
  imageUrl: string;
  videoUrl: string | null;
  published: boolean;
  sortOrder: number;
}

const DEFAULT_ABOUT_GALLERY = Array.from(
  { length: 8 },
  (_, i) => `/ref/flag/about-${i + 1}.png`
);

const DEFAULT_BM_IMAGES = [
  "/ref/brand/bm1.jpeg",
  "/ref/brand/bm2.jpeg",
  "/ref/brand/bm3.jpeg",
  "/ref/brand/bm4.jpeg",
];

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function BrandSolutionsManagerPanel({
  creators,
  sections,
  onCreateCreator,
  onSaveCreator,
  onReorderCreators,
  onDeleteCreator,
  onSaveSection,
  onPickMedia,
}: {
  creators: CmsBrandCreatorRow[];
  sections: CmsPageSectionRow[];
  onCreateCreator: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onSaveCreator: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onReorderCreators: (ids: string[]) => Promise<void>;
  onDeleteCreator: (id: string, label: string) => void;
  onSaveSection: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onPickMedia: (cb: (url: string) => void, folder?: string) => void;
}) {
  const [editing, setEditing] = useState<CmsBrandCreatorRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    handle: "",
    category: "Creator",
    description: "",
    imageUrl: "/ref/influencers/1770471884_img.jpg",
    videoUrl: "",
    published: true,
  });

  const brandHeroSec = sections.find(
    (s) => s.pageSlug === "brand" && s.sectionKey === "hero"
  );
  const brandFormSec = sections.find(
    (s) => s.pageSlug === "brand" && s.sectionKey === "brand_form"
  );

  const [heroTitle, setHeroTitle] = useState(
    brandHeroSec?.title || "Boost your brand by our Creators!"
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    brandHeroSec?.subtitle || "India's top artists, musicians, and digital storytellers."
  );

  const [formTitle, setFormTitle] = useState(brandFormSec?.title || "Let's Talk!");
  const [formSubtitle, setFormSubtitle] = useState(
    brandFormSec?.subtitle ||
      "Leave your details below and a member of our team will get back to you within 24 hours."
  );
  const [formSubmitLabel, setFormSubmitLabel] = useState(
    brandFormSec?.ctaLabel || "Submit"
  );
  const parsedFormExtra = safeJsonParse<{
    rightTitle?: string;
    rightSubtitle?: string;
    rightImages?: string[];
  }>((brandFormSec as unknown as { extraJson?: string })?.extraJson, {});

  const [rightTitle, setRightTitle] = useState(
    parsedFormExtra.rightTitle || "Brand Managers"
  );
  const [rightSubtitle, setRightSubtitle] = useState(
    parsedFormExtra.rightSubtitle || "Our expert team is here to help."
  );
  const [rightImages, setRightImages] = useState<string[]>(
    Array.isArray(parsedFormExtra.rightImages) && parsedFormExtra.rightImages.length > 0
      ? parsedFormExtra.rightImages
      : DEFAULT_BM_IMAGES
  );
  const [newBmUrl, setNewBmUrl] = useState("");

  useEffect(() => {
    setHeroTitle(brandHeroSec?.title || "Boost your brand by our Creators!");
    setHeroSubtitle(
      brandHeroSec?.subtitle || "India's top artists, musicians, and digital storytellers."
    );
  }, [brandHeroSec?.title, brandHeroSec?.subtitle]);

  useEffect(() => {
    setFormTitle(brandFormSec?.title || "Let's Talk!");
    setFormSubtitle(
      brandFormSec?.subtitle ||
        "Leave your details below and a member of our team will get back to you within 24 hours."
    );
    setFormSubmitLabel(brandFormSec?.ctaLabel || "Submit");
    const ext = safeJsonParse<{
      rightTitle?: string;
      rightSubtitle?: string;
      rightImages?: string[];
    }>((brandFormSec as unknown as { extraJson?: string })?.extraJson, {});
    setRightTitle(ext.rightTitle || "Brand Managers");
    setRightSubtitle(ext.rightSubtitle || "Our expert team is here to help.");
    if (Array.isArray(ext.rightImages) && ext.rightImages.length > 0) {
      setRightImages(ext.rightImages);
    }
  }, [brandFormSec]);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...creators];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onReorderCreators(next.map((c) => c.id));
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">
            Brand Solutions Management ({creators.length} Creators)
          </h2>
          <p className="text-xs text-[#b0b0b8]">
            Manage the Brand Solutions influencer showcase (photos, videos, descriptions, enable/disable, order) plus the Let&apos;s Talk &amp; Brand Managers showcase on{" "}
            <a href="/brand" target="_blank" className="text-[#60a5fa] underline">
              /brand
            </a>
            .
          </p>
        </div>
      </div>

      {/* Creators Form + List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
          <h3 className="font-bold text-sm text-white">
            {editing ? `Edit Creator: ${editing.name}` : "Add Brand Solutions Creator"}
          </h3>

          <input
            type="text"
            placeholder="Creator / Artist Name*"
            value={editing ? editing.name : form.name}
            onChange={(e) =>
              editing
                ? setEditing({ ...editing, name: e.target.value })
                : setForm({ ...form, name: e.target.value })
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="Handle (e.g. @creator)"
              value={(editing ? editing.handle : form.handle) || ""}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, handle: e.target.value })
                  : setForm({ ...form, handle: e.target.value })
              }
              className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="text"
              placeholder="Category (e.g. Music & Lifestyle)"
              value={(editing ? editing.category : form.category) || ""}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, category: e.target.value })
                  : setForm({ ...form, category: e.target.value })
              }
              className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
          </div>

          <textarea
            rows={2}
            placeholder="Creator Description (shown on hover/card)"
            value={(editing ? editing.description : form.description) || ""}
            onChange={(e) =>
              editing
                ? setEditing({ ...editing, description: e.target.value })
                : setForm({ ...form, description: e.target.value })
            }
            className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
          />

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Portrait Photo URL*"
              value={editing ? editing.imageUrl : form.imageUrl}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, imageUrl: e.target.value })
                  : setForm({ ...form, imageUrl: e.target.value })
              }
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() =>
                onPickMedia(
                  (u) =>
                    editing
                      ? setEditing({ ...editing, imageUrl: u })
                      : setForm({ ...form, imageUrl: u }),
                  "brand"
                )
              }
              className="px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Photo
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Looping Video URL (optional .mp4)"
              value={(editing ? editing.videoUrl : form.videoUrl) || ""}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, videoUrl: e.target.value })
                  : setForm({ ...form, videoUrl: e.target.value })
              }
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() =>
                onPickMedia(
                  (u) =>
                    editing
                      ? setEditing({ ...editing, videoUrl: u })
                      : setForm({ ...form, videoUrl: u }),
                  "brand"
                )
              }
              className="px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" /> Video
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#b0b0b8] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={editing ? editing.published : form.published}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, published: e.target.checked })
                  : setForm({ ...form, published: e.target.checked })
              }
            />
            Enabled / Visible on Brand Solutions Page
          </label>

          <div className="flex gap-2 pt-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveCreator(editing as unknown as Record<string, unknown>, "draft");
                    setEditing(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveCreator(editing as unknown as Record<string, unknown>, "publish");
                    setEditing(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
                >
                  Save &amp; Publish
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-3 rounded-xl bg-white/10 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await onCreateCreator(form, "draft");
                    setForm({
                      name: "",
                      handle: "",
                      category: "Creator",
                      description: "",
                      imageUrl: "/ref/influencers/1770471884_img.jpg",
                      videoUrl: "",
                      published: true,
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Draft
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onCreateCreator(form, "publish");
                    setForm({
                      name: "",
                      handle: "",
                      category: "Creator",
                      description: "",
                      imageUrl: "/ref/influencers/1770471884_img.jpg",
                      videoUrl: "",
                      published: true,
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Add &amp; Publish
                </button>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-2.5">
          {creators.map((c, idx) => (
            <div
              key={c.id}
              className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-3.5 flex items-center gap-3.5"
            >
              <img
                src={c.imageUrl}
                alt={c.name}
                className="w-14 h-14 rounded-xl object-cover object-top shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white truncate">{c.name}</span>
                  {c.videoUrl && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                      Video
                    </span>
                  )}
                  {!c.published && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold">
                      Hidden
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#60a5fa] truncate">
                  {c.handle || c.category || "Creator"}
                </div>
                {c.description && (
                  <div className="text-[11px] text-[#71717a] truncate mt-0.5">
                    {c.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onSaveCreator({ id: c.id, published: !c.published }, "publish")
                  }
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer"
                  title={c.published ? "Disable / Hide" : "Enable / Publish"}
                >
                  {c.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  aria-label="Move creator up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  aria-label="Move creator down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCreator(c.id, c.name)}
                  className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
                  aria-label="Delete creator"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Solutions Page Settings & Brand Managers Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
          <h3 className="font-bold text-sm text-white">Brand Hero &amp; Form Heading</h3>
          <input
            type="text"
            placeholder="Hero Headline"
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="text"
            placeholder="Hero Subtitle"
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                onSaveSection(
                  {
                    pageSlug: "brand",
                    sectionKey: "hero",
                    title: heroTitle,
                    subtitle: heroSubtitle,
                    enabled: true,
                  },
                  "publish"
                )
              }
              className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save &amp; Publish Brand Hero
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
          <h3 className="font-bold text-sm text-white">
            Brand Inquiry Form &amp; Brand Managers Images
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="Form Title (e.g. Let's Talk!)"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="text"
              placeholder="Submit Button Label"
              value={formSubmitLabel}
              onChange={(e) => setFormSubmitLabel(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
          </div>
          <input
            type="text"
            placeholder="Form Subtitle"
            value={formSubtitle}
            onChange={(e) => setFormSubtitle(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="Right Overlay Title"
              value={rightTitle}
              onChange={(e) => setRightTitle(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="text"
              placeholder="Right Overlay Subtitle"
              value={rightSubtitle}
              onChange={(e) => setRightSubtitle(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
          </div>

          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-bold uppercase text-[#9ca3af]">
              Brand Managers Carousel Photos ({rightImages.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {rightImages.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="flex items-center gap-1.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-1.5 pr-2"
                >
                  <img
                    src={src}
                    alt={`BM ${i + 1}`}
                    className="w-9 h-9 rounded-lg object-cover object-top"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRightImages((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-red-400 hover:text-red-300 cursor-pointer"
                    aria-label="Remove image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add Manager Photo URL"
                value={newBmUrl}
                onChange={(e) => setNewBmUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  onPickMedia((u) => setRightImages((prev) => [...prev, u]), "brand")
                }
                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
              >
                Pick
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newBmUrl.trim()) return;
                  setRightImages((prev) => [...prev, newBmUrl.trim()]);
                  setNewBmUrl("");
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onSaveSection(
                {
                  pageSlug: "brand",
                  sectionKey: "brand_form",
                  title: formTitle,
                  subtitle: formSubtitle,
                  ctaLabel: formSubmitLabel,
                  extraJson: JSON.stringify({
                    rightTitle,
                    rightSubtitle,
                    rightImages,
                  }),
                  enabled: true,
                },
                "publish"
              )
            }
            className="px-4 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Save &amp; Publish Form Showcase
          </button>
        </div>
      </div>
    </div>
  );
}

export function AboutManagerPanel({
  sections,
  onSaveSection,
  onPickMedia,
  onGoToTeamTab,
}: {
  sections: CmsPageSectionRow[];
  onSaveSection: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onPickMedia: (cb: (url: string) => void, folder?: string) => void;
  onGoToTeamTab: () => void;
}) {
  const heroSec = sections.find(
    (s) => s.pageSlug === "about" && s.sectionKey === "hero"
  );
  const storySec = sections.find(
    (s) => s.pageSlug === "about" && s.sectionKey === "story"
  );

  // Part A: About Intro & Gallery
  const [heroTitle, setHeroTitle] = useState(
    heroSec?.title || "About Goldex Media Network"
  );
  const [heroSubtitle, setHeroSubtitle] = useState(heroSec?.subtitle || "");
  const [heroMission, setHeroMission] = useState(heroSec?.badgeText || "");
  const [heroMediaUrl, setHeroMediaUrl] = useState(
    heroSec?.mediaUrl || "/ref/video/about-bg.mp4"
  );
  const [heroMediaType, setHeroMediaType] = useState(
    (heroSec as unknown as { mediaType?: string })?.mediaType || "video"
  );
  const initialGallery = safeJsonParse<{ galleryImages?: string[] }>(
    (heroSec as unknown as { extraJson?: string })?.extraJson,
    {}
  ).galleryImages;
  const [galleryImages, setGalleryImages] = useState<string[]>(
    Array.isArray(initialGallery) && initialGallery.length > 0
      ? initialGallery
      : DEFAULT_ABOUT_GALLERY
  );
  const [newGalleryUrl, setNewGalleryUrl] = useState("");

  // Part B/C/D: Story (Exclusive Licensing + Multiple Logos + Join Network Right Side)
  const initialStoryExtra = safeJsonParse<{
    partnerCompanyName?: string;
    partnerLogos?: Array<{ name: string; logoUrl: string; websiteUrl?: string }>;
    artistImageUrl?: string;
    artistImagePosition?: string;
    pillars?: Array<{ title: string; description: string }>;
  }>((storySec as unknown as { extraJson?: string })?.extraJson, {});

  const [storyTitle, setStoryTitle] = useState(
    storySec?.title || "Exclusive licensing & royalty agreement with Vydia Inc."
  );
  const [storySubtitle, setStorySubtitle] = useState(storySec?.subtitle || "");
  const [storyBody, setStoryBody] = useState(storySec?.bodyHtml || "");
  const [partnerCompanyName, setPartnerCompanyName] = useState(
    initialStoryExtra.partnerCompanyName || "Vydia Inc."
  );
  const [partnerLogos, setPartnerLogos] = useState<
    Array<{ name: string; logoUrl: string; websiteUrl?: string }>
  >(
    Array.isArray(initialStoryExtra.partnerLogos) &&
      initialStoryExtra.partnerLogos.length > 0
      ? initialStoryExtra.partnerLogos
      : [
          {
            name: "Vydia Inc.",
            logoUrl: storySec?.mediaUrl || "/ref/vydia-logo.png",
            websiteUrl: "https://vydia.com",
          },
        ]
  );

  const [artistImageUrl, setArtistImageUrl] = useState(
    initialStoryExtra.artistImageUrl || "/ref/about-artist.jpg"
  );
  const [artistImagePosition, setArtistImagePosition] = useState(
    initialStoryExtra.artistImagePosition || "center top"
  );
  const [ctaLabel, setCtaLabel] = useState(
    storySec?.ctaLabel || "Join & Distribute"
  );
  const [ctaHref, setCtaHref] = useState(storySec?.ctaHref || "/signup");
  const [pillars, setPillars] = useState<Array<{ title: string; description: string }>>(
    Array.isArray(initialStoryExtra.pillars) && initialStoryExtra.pillars.length > 0
      ? initialStoryExtra.pillars
      : [
          {
            title: "Artist-First Economy",
            description:
              "Leading 90% revenue share model, ensuring earnings stay with the artist.",
          },
          {
            title: "Cultural Preservation",
            description:
              "Digitizing regional genres like Baul and Folk music for a global platform.",
          },
          {
            title: "Transparency & Trust",
            description:
              "No hidden fees. Crystal clear reporting and consistent monthly payouts.",
          },
        ]
  );

  useEffect(() => {
    if (!heroSec) return;
    setHeroTitle(heroSec.title || "");
    setHeroSubtitle(heroSec.subtitle || "");
    setHeroMission(heroSec.badgeText || "");
    setHeroMediaUrl(heroSec.mediaUrl || "/ref/video/about-bg.mp4");
    setHeroMediaType(
      (heroSec as unknown as { mediaType?: string })?.mediaType || "video"
    );
    const ext = safeJsonParse<{ galleryImages?: string[] }>(
      (heroSec as unknown as { extraJson?: string })?.extraJson,
      {}
    );
    if (Array.isArray(ext.galleryImages) && ext.galleryImages.length > 0) {
      setGalleryImages(ext.galleryImages);
    }
  }, [heroSec]);

  const moveGallery = (idx: number, dir: -1 | 1) => {
    const next = [...galleryImages];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setGalleryImages(next);
  };

  const saveIntro = async (mode: "draft" | "publish") => {
    await onSaveSection(
      {
        pageSlug: "about",
        sectionKey: "hero",
        title: heroTitle,
        subtitle: heroSubtitle,
        badgeText: heroMission,
        mediaUrl: heroMediaUrl,
        mediaType: heroMediaType,
        extraJson: JSON.stringify({ galleryImages }),
        enabled: true,
      },
      mode
    );
  };

  const saveStoryAndPartners = async (mode: "draft" | "publish") => {
    const validLogos = partnerLogos.filter((p) => p.logoUrl.trim().length > 0);
    await onSaveSection(
      {
        pageSlug: "about",
        sectionKey: "story",
        title: storyTitle,
        subtitle: storySubtitle,
        bodyHtml: storyBody,
        mediaUrl: validLogos[0]?.logoUrl || "/ref/vydia-logo.png",
        ctaLabel,
        ctaHref,
        extraJson: JSON.stringify({
          partnerCompanyName,
          partnerLogos: validLogos,
          artistImageUrl,
          artistImagePosition,
          pillars,
        }),
        enabled: true,
      },
      mode
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">
            Complete About Section CMS
          </h2>
          <p className="text-xs text-[#b0b0b8]">
            Control About Intro, Dual Ribbon Gallery Photos, Exclusive Licensing &amp; Multiple Company Logos, Join Network image/CTA, and Leadership Team on{" "}
            <a href="/about" target="_blank" className="text-[#60a5fa] underline">
              /about
            </a>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToTeamTab}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
        >
          Manage Leadership &amp; Team Members &rarr;
        </button>
      </div>

      {/* A. About Introduction & Dual-Ribbon Gallery */}
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-4">
        <h3 className="font-bold text-sm text-white">
          A. About Introduction Banner &amp; Ribbon Gallery Photographs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Main Heading"
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <div className="flex gap-2">
            <select
              value={heroMediaType}
              onChange={(e) => setHeroMediaType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            >
              <option value="video">Background Video</option>
              <option value="image">Background Image</option>
            </select>
            <input
              type="text"
              placeholder="Background Video or Image URL"
              value={heroMediaUrl}
              onChange={(e) => setHeroMediaUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() => onPickMedia((u) => setHeroMediaUrl(u), "about")}
              className="px-3 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
            >
              Pick
            </button>
          </div>
        </div>
        <textarea
          rows={2}
          placeholder="Subheading / Description"
          value={heroSubtitle}
          onChange={(e) => setHeroSubtitle(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
        />
        <input
          type="text"
          placeholder="Mission Statement"
          value={heroMission}
          onChange={(e) => setHeroMission(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
        />

        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="text-xs font-bold text-[#9ca3af]">
            Ribbon Gallery Photographs ({galleryImages.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {galleryImages.map((imgUrl, idx) => (
              <div
                key={`${imgUrl}-${idx}`}
                className="rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] p-1.5 space-y-1.5"
              >
                <img
                  src={imgUrl}
                  alt={`Gallery ${idx + 1}`}
                  className="w-full h-20 rounded-lg object-cover"
                />
                <div className="flex justify-between items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveGallery(idx, -1)}
                    className="p-1 rounded bg-white/5 text-xs cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveGallery(idx, 1)}
                    className="p-1 rounded bg-white/5 text-xs cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGalleryImages((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1 rounded bg-red-500/15 text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste image URL to add to ribbon gallery"
              value={newGalleryUrl}
              onChange={(e) => setNewGalleryUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() =>
                onPickMedia((u) => setGalleryImages((prev) => [...prev, u]), "about")
              }
              className="px-3 py-2 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
            >
              Upload / Pick
            </button>
            <button
              type="button"
              onClick={() => {
                if (!newGalleryUrl.trim()) return;
                setGalleryImages((prev) => [...prev, newGalleryUrl.trim()]);
                setNewGalleryUrl("");
              }}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
            >
              Add Image
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => saveIntro("draft")}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => saveIntro("publish")}
            className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
          >
            Save &amp; Publish Intro + Gallery
          </button>
        </div>
      </div>

      {/* C & D. Exclusive Licensing + Multiple Logos + Join Network Right-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
          <h3 className="font-bold text-sm text-white">
            C. Exclusive Licensing &amp; Multiple Company Logos
          </h3>
          <input
            type="text"
            placeholder="Heading"
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <textarea
            rows={2}
            placeholder="Description"
            value={storySubtitle}
            onChange={(e) => setStorySubtitle(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
          />
          <textarea
            rows={2}
            placeholder="Supporting Text (optional)"
            value={storyBody}
            onChange={(e) => setStoryBody(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
          />
          <input
            type="text"
            placeholder="Primary Highlighted Company Name"
            value={partnerCompanyName}
            onChange={(e) => setPartnerCompanyName(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
          />

          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#9ca3af]">
                Partner / Company Logos ({partnerLogos.length})
              </span>
              <button
                type="button"
                onClick={() =>
                  setPartnerLogos((prev) => [
                    ...prev,
                    { name: "Partner", logoUrl: "", websiteUrl: "" },
                  ])
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 text-xs font-bold cursor-pointer"
              >
                + Add Logo
              </button>
            </div>
            {partnerLogos.map((logo, idx) => (
              <div
                key={`logo-${idx}`}
                className="p-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-2"
              >
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={logo.name}
                    onChange={(e) => {
                      const next = [...partnerLogos];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setPartnerLogos(next);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPartnerLogos((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Logo URL"
                    value={logo.logoUrl}
                    onChange={(e) => {
                      const next = [...partnerLogos];
                      next[idx] = { ...next[idx], logoUrl: e.target.value };
                      setPartnerLogos(next);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onPickMedia((u) => {
                        setPartnerLogos((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, logoUrl: u } : item))
                        );
                      }, "about")
                    }
                    className="px-2.5 rounded-lg bg-white/10 text-xs font-semibold cursor-pointer"
                  >
                    Pick
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="External Company Link (optional)"
                  value={logo.websiteUrl || ""}
                  onChange={(e) => {
                    const next = [...partnerLogos];
                    next[idx] = { ...next[idx], websiteUrl: e.target.value };
                    setPartnerLogos(next);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
          <h3 className="font-bold text-sm text-white">
            D. Join Network Right-Side Image, Positioning &amp; Pillars
          </h3>
          <div className="flex gap-2 items-center">
            <img
              src={artistImageUrl || "/ref/about-artist.jpg"}
              alt="About Artist"
              className="w-16 h-16 rounded-xl object-cover object-top shrink-0 border border-white/10"
            />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Right-Side Image URL"
                  value={artistImageUrl}
                  onChange={(e) => setArtistImageUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
                <button
                  type="button"
                  onClick={() => onPickMedia((u) => setArtistImageUrl(u), "about")}
                  className="px-3 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
                >
                  Pick
                </button>
              </div>
              <select
                value={artistImagePosition}
                onChange={(e) => setArtistImagePosition(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              >
                <option value="center top">Position: Top (Face Safe)</option>
                <option value="center center">Position: Center</option>
                <option value="center bottom">Position: Bottom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="CTA Button Label"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="text"
              placeholder="CTA Button URL"
              value={ctaHref}
              onChange={(e) => setCtaHref(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-xs font-bold text-[#9ca3af]">
              Value Pillars ({pillars.length})
            </div>
            {pillars.map((p, idx) => (
              <div
                key={`pillar-${idx}`}
                className="p-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-1.5"
              >
                <input
                  type="text"
                  value={p.title}
                  onChange={(e) => {
                    const next = [...pillars];
                    next[idx] = { ...next[idx], title: e.target.value };
                    setPillars(next);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs font-bold"
                />
                <input
                  type="text"
                  value={p.description}
                  onChange={(e) => {
                    const next = [...pillars];
                    next[idx] = { ...next[idx], description: e.target.value };
                    setPillars(next);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => saveStoryAndPartners("draft")}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Draft
            </button>
            <button
              type="button"
              onClick={() => saveStoryAndPartners("publish")}
              className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Publish Story &amp; Partners
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
