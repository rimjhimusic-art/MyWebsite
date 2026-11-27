"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Save,
  Star,
  Trash2,
  Video,
  Wand2,
} from "lucide-react";
import type { CmsPageSectionRow } from "@/components/admin/CmsContentPanels";
import { useToast } from "@/components/ToastProvider";

export interface CmsBrandCreatorRow {
  id: string;
  name: string;
  handle: string | null;
  category: string | null;
  bio?: string | null;
  description?: string | null;
  imageUrl: string;
  videoUrl: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  spotifyUrl?: string | null;
  websiteUrl?: string | null;
  published: boolean;
  sortOrder: number;
}

export interface CmsBrandVideoRow {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string;
  creatorName: string | null;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

export interface CmsAboutSlideRow {
  id: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
}

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
  videos,
  sections,
  onCreateCreator,
  onSaveCreator,
  onReorderCreators,
  onDeleteCreator,
  onCreateVideo,
  onSaveVideo,
  onReorderVideos,
  onDeleteVideo,
  onSaveSection,
  onPickMedia,
}: {
  creators: CmsBrandCreatorRow[];
  videos: CmsBrandVideoRow[];
  sections: CmsPageSectionRow[];
  onCreateCreator: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onSaveCreator: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onReorderCreators: (ids: string[]) => Promise<void>;
  onDeleteCreator: (id: string, label: string) => void;
  onCreateVideo: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onSaveVideo: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onReorderVideos: (ids: string[]) => Promise<void>;
  onDeleteVideo: (id: string, label: string) => void;
  onSaveSection: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onPickMedia: (cb: (url: string) => void, folder?: string) => void;
}) {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<"artists" | "videos" | "layout">("artists");

  // --- Creator / Artist State ---
  const [editingCreator, setEditingCreator] = useState<CmsBrandCreatorRow | null>(null);
  const [creatorForm, setCreatorForm] = useState({
    name: "",
    handle: "",
    category: "Creator",
    bio: "",
    description: "",
    imageUrl: "/ref/influencers/1770471884_img.jpg",
    videoUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
    spotifyUrl: "",
    websiteUrl: "",
    published: true,
  });
  const [dragCreatorIdx, setDragCreatorIdx] = useState<number | null>(null);

  // --- Video State ---
  const [editingVideo, setEditingVideo] = useState<CmsBrandVideoRow | null>(null);
  const [videoForm, setVideoForm] = useState({
    title: "",
    description: "",
    creatorName: "",
    videoUrl: "",
    thumbnailUrl: "/ref/influencers/1770471884_img.jpg",
    featured: false,
    published: true,
  });
  const [dragVideoIdx, setDragVideoIdx] = useState<number | null>(null);
  const [fetchingYt, setFetchingYt] = useState(false);

  // --- Hero & Form Sections State ---
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
  const [videosSectionTitle, setVideosSectionTitle] = useState(
    brandHeroSec?.badgeText || "Brand Campaign Videos"
  );
  const [videosSectionSubtitle, setVideosSectionSubtitle] = useState(
    brandHeroSec?.bodyHtml || "Watch our creators in action across real brand collaborations."
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
    formSuccessMessage?: string;
  }>(brandFormSec?.extraJson, {});

  const [formSuccessMessage, setFormSuccessMessage] = useState(
    parsedFormExtra.formSuccessMessage ||
      "Thank you! A Brand Manager will reach out within 24 hours."
  );
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
    setVideosSectionTitle(brandHeroSec?.badgeText || "Brand Campaign Videos");
    setVideosSectionSubtitle(
      brandHeroSec?.bodyHtml || "Watch our creators in action across real brand collaborations."
    );
  }, [brandHeroSec]);

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
      formSuccessMessage?: string;
    }>(brandFormSec?.extraJson, {});
    setRightTitle(ext.rightTitle || "Brand Managers");
    setRightSubtitle(ext.rightSubtitle || "Our expert team is here to help.");
    setFormSuccessMessage(
      ext.formSuccessMessage ||
        "Thank you! A Brand Manager will reach out within 24 hours."
    );
    if (Array.isArray(ext.rightImages) && ext.rightImages.length > 0) {
      setRightImages(ext.rightImages);
    }
  }, [brandFormSec]);

  const moveCreator = (from: number, to: number) => {
    if (to < 0 || to >= creators.length || from === to) return;
    const next = [...creators];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorderCreators(next.map((c) => c.id));
  };

  const moveVideo = (from: number, to: number) => {
    if (to < 0 || to >= videos.length || from === to) return;
    const next = [...videos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorderVideos(next.map((v) => v.id));
  };

  const fetchYoutubeVideoMeta = async (rawUrl: string) => {
    if (!rawUrl.trim()) {
      showToast("Paste a YouTube video URL first.", "error");
      return;
    }
    setFetchingYt(true);
    try {
      const res = await fetch("/api/admin/updates/fetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "youtube", url: rawUrl }),
      });
      const json = await res.json();
      if (!res.ok || !json.metadata) {
        showToast(json.error || "Not a YouTube URL (MP4 links work directly).", "error");
        return;
      }
      if (editingVideo) {
        setEditingVideo({
          ...editingVideo,
          videoUrl: json.metadata.canonicalUrl || editingVideo.videoUrl,
          title: json.metadata.title || editingVideo.title,
          description: json.metadata.description || editingVideo.description,
          thumbnailUrl: json.metadata.thumbnailUrl || editingVideo.thumbnailUrl,
          creatorName: json.metadata.channelName || editingVideo.creatorName,
        });
      } else {
        setVideoForm((p) => ({
          ...p,
          videoUrl: json.metadata.canonicalUrl || p.videoUrl,
          title: json.metadata.title || p.title,
          description: json.metadata.description || p.description,
          thumbnailUrl: json.metadata.thumbnailUrl || p.thumbnailUrl,
          creatorName: json.metadata.channelName || p.creatorName,
        }));
      }
      showToast("Fetched YouTube title & thumbnail cleanly!", "success");
    } finally {
      setFetchingYt(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">
            Brand Solutions Complete CMS ({creators.length} Artists &bull; {videos.length} Videos)
          </h2>
          <p className="text-xs text-[#b0b0b8]">
            Manage every artist/creator, bio, social link, photograph, Brand Solutions video, thumbnail, featured status, and page layout on{" "}
            <a href="/brand" target="_blank" className="text-[#60a5fa] underline">
              /brand
            </a>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab("artists")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              subTab === "artists"
                ? "bg-[#3b82f6] text-white"
                : "bg-[#0f0f0f] border border-[#2a2a2a] text-[#b0b0b8]"
            }`}
          >
            Artists &amp; Creators ({creators.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("videos")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              subTab === "videos"
                ? "bg-[#3b82f6] text-white"
                : "bg-[#0f0f0f] border border-[#2a2a2a] text-[#b0b0b8]"
            }`}
          >
            Brand Videos ({videos.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("layout")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              subTab === "layout"
                ? "bg-[#3b82f6] text-white"
                : "bg-[#0f0f0f] border border-[#2a2a2a] text-[#b0b0b8]"
            }`}
          >
            Headlines, Form &amp; Managers
          </button>
        </div>
      </div>

      {/* SUBTAB 1: ARTISTS & CREATORS */}
      {subTab === "artists" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
            <h3 className="font-bold text-sm text-white">
              {editingCreator ? `Edit Artist: ${editingCreator.name}` : "Add New Brand Solutions Artist"}
            </h3>

            <input
              type="text"
              placeholder="Artist / Creator Name*"
              value={editingCreator ? editingCreator.name : creatorForm.name}
              onChange={(e) =>
                editingCreator
                  ? setEditingCreator({ ...editingCreator, name: e.target.value })
                  : setCreatorForm({ ...creatorForm, name: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Handle (e.g. @artist)"
                value={(editingCreator ? editingCreator.handle : creatorForm.handle) || ""}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, handle: e.target.value })
                    : setCreatorForm({ ...creatorForm, handle: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <input
                type="text"
                placeholder="Category"
                value={(editingCreator ? editingCreator.category : creatorForm.category) || ""}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, category: e.target.value })
                    : setCreatorForm({ ...creatorForm, category: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>

            <textarea
              rows={2}
              placeholder="Artist Biography"
              value={(editingCreator ? editingCreator.bio : creatorForm.bio) || ""}
              onChange={(e) =>
                editingCreator
                  ? setEditingCreator({ ...editingCreator, bio: e.target.value })
                  : setCreatorForm({ ...creatorForm, bio: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
            />

            <textarea
              rows={2}
              placeholder="Short Card Description"
              value={(editingCreator ? editingCreator.description : creatorForm.description) || ""}
              onChange={(e) =>
                editingCreator
                  ? setEditingCreator({ ...editingCreator, description: e.target.value })
                  : setCreatorForm({ ...creatorForm, description: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
            />

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Artist Photo URL*"
                value={editingCreator ? editingCreator.imageUrl : creatorForm.imageUrl}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, imageUrl: e.target.value })
                    : setCreatorForm({ ...creatorForm, imageUrl: e.target.value })
                }
                className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  onPickMedia(
                    (u) =>
                      editingCreator
                        ? setEditingCreator({ ...editingCreator, imageUrl: u })
                        : setCreatorForm({ ...creatorForm, imageUrl: u }),
                    "brand"
                  )
                }
                className="px-3 rounded-xl bg-white/10 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Photo
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Slider Looping Video URL (.mp4 optional)"
                value={(editingCreator ? editingCreator.videoUrl : creatorForm.videoUrl) || ""}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, videoUrl: e.target.value })
                    : setCreatorForm({ ...creatorForm, videoUrl: e.target.value })
                }
                className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  onPickMedia(
                    (u) =>
                      editingCreator
                        ? setEditingCreator({ ...editingCreator, videoUrl: u })
                        : setCreatorForm({ ...creatorForm, videoUrl: u }),
                    "brand"
                  )
                }
                className="px-3 rounded-xl bg-white/10 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" /> Video
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <input
                type="url"
                placeholder="Instagram URL"
                value={(editingCreator ? editingCreator.instagramUrl : creatorForm.instagramUrl) || ""}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, instagramUrl: e.target.value })
                    : setCreatorForm({ ...creatorForm, instagramUrl: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <input
                type="url"
                placeholder="Facebook URL"
                value={(editingCreator ? editingCreator.facebookUrl : creatorForm.facebookUrl) || ""}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, facebookUrl: e.target.value })
                    : setCreatorForm({ ...creatorForm, facebookUrl: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <input
                type="url"
                placeholder="YouTube URL"
                value={(editingCreator ? editingCreator.youtubeUrl : creatorForm.youtubeUrl) || ""}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, youtubeUrl: e.target.value })
                    : setCreatorForm({ ...creatorForm, youtubeUrl: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <input
                type="url"
                placeholder="Spotify URL"
                value={(editingCreator ? editingCreator.spotifyUrl : creatorForm.spotifyUrl) || ""}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, spotifyUrl: e.target.value })
                    : setCreatorForm({ ...creatorForm, spotifyUrl: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <input
                type="url"
                placeholder="Website / Other URL"
                value={(editingCreator ? editingCreator.websiteUrl : creatorForm.websiteUrl) || ""}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, websiteUrl: e.target.value })
                    : setCreatorForm({ ...creatorForm, websiteUrl: e.target.value })
                }
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-[#b0b0b8] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={editingCreator ? editingCreator.published : creatorForm.published}
                onChange={(e) =>
                  editingCreator
                    ? setEditingCreator({ ...editingCreator, published: e.target.checked })
                    : setCreatorForm({ ...creatorForm, published: e.target.checked })
                }
              />
              Published on Brand Solutions Page
            </label>

            <div className="flex gap-2 pt-2">
              {editingCreator ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await onSaveCreator(editingCreator as unknown as Record<string, unknown>, "draft");
                      setEditingCreator(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onSaveCreator(editingCreator as unknown as Record<string, unknown>, "publish");
                      setEditingCreator(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
                  >
                    Save &amp; Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCreator(null)}
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
                      await onCreateCreator(creatorForm, "draft");
                      setCreatorForm({
                        name: "",
                        handle: "",
                        category: "Creator",
                        bio: "",
                        description: "",
                        imageUrl: "/ref/influencers/1770471884_img.jpg",
                        videoUrl: "",
                        instagramUrl: "",
                        facebookUrl: "",
                        youtubeUrl: "",
                        spotifyUrl: "",
                        websiteUrl: "",
                        published: true,
                      });
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onCreateCreator(creatorForm, "publish");
                      setCreatorForm({
                        name: "",
                        handle: "",
                        category: "Creator",
                        bio: "",
                        description: "",
                        imageUrl: "/ref/influencers/1770471884_img.jpg",
                        videoUrl: "",
                        instagramUrl: "",
                        facebookUrl: "",
                        youtubeUrl: "",
                        spotifyUrl: "",
                        websiteUrl: "",
                        published: true,
                      });
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add &amp; Publish
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-2.5">
            {creators.map((c, idx) => (
              <div
                key={c.id}
                draggable
                onDragStart={() => setDragCreatorIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragCreatorIdx !== null) moveCreator(dragCreatorIdx, idx);
                  setDragCreatorIdx(null);
                }}
                className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-3.5 flex items-center gap-3 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-4 h-4 text-zinc-500 shrink-0" />
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="w-14 h-14 rounded-xl object-cover object-top shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">{c.name}</span>
                    {!c.published && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                        Unpublished
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#60a5fa] truncate">
                    {c.handle || c.category}
                  </div>
                  {(c.description || c.bio) && (
                    <div className="text-[11px] text-[#71717a] truncate mt-0.5">
                      {c.description || c.bio}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSaveCreator({ id: c.id, published: !c.published }, "publish")}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer"
                    title={c.published ? "Unpublish" : "Publish"}
                  >
                    {c.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCreator(idx, idx - 1)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                    aria-label="Move creator up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCreator(idx, idx + 1)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                    aria-label="Move creator down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCreator(c)}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCreator(c.id, c.name)}
                    className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: BRAND SOLUTIONS VIDEOS */}
      {subTab === "videos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
            <h3 className="font-bold text-sm text-white">
              {editingVideo ? `Edit Video: ${editingVideo.title}` : "Add Brand Solutions Video"}
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="YouTube URL or MP4 Video URL*"
                value={editingVideo ? editingVideo.videoUrl : videoForm.videoUrl}
                onChange={(e) =>
                  editingVideo
                    ? setEditingVideo({ ...editingVideo, videoUrl: e.target.value })
                    : setVideoForm({ ...videoForm, videoUrl: e.target.value })
                }
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                disabled={fetchingYt}
                onClick={() =>
                  fetchYoutubeVideoMeta(
                    editingVideo ? editingVideo.videoUrl : videoForm.videoUrl
                  )
                }
                className="px-2.5 rounded-xl bg-[#E3001B] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                title="Auto-Fetch YouTube Metadata"
              >
                <Wand2 className="w-3.5 h-3.5" /> Fetch YT
              </button>
              <button
                type="button"
                onClick={() =>
                  onPickMedia(
                    (u) =>
                      editingVideo
                        ? setEditingVideo({ ...editingVideo, videoUrl: u })
                        : setVideoForm({ ...videoForm, videoUrl: u }),
                    "brand"
                  )
                }
                className="px-2.5 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
              >
                Pick MP4
              </button>
            </div>

            <input
              type="text"
              placeholder="Video Title*"
              value={editingVideo ? editingVideo.title : videoForm.title}
              onChange={(e) =>
                editingVideo
                  ? setEditingVideo({ ...editingVideo, title: e.target.value })
                  : setVideoForm({ ...videoForm, title: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />

            <input
              type="text"
              placeholder="Creator / Artist Name (optional)"
              value={(editingVideo ? editingVideo.creatorName : videoForm.creatorName) || ""}
              onChange={(e) =>
                editingVideo
                  ? setEditingVideo({ ...editingVideo, creatorName: e.target.value })
                  : setVideoForm({ ...videoForm, creatorName: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Thumbnail Image URL*"
                value={editingVideo ? editingVideo.thumbnailUrl : videoForm.thumbnailUrl}
                onChange={(e) =>
                  editingVideo
                    ? setEditingVideo({ ...editingVideo, thumbnailUrl: e.target.value })
                    : setVideoForm({ ...videoForm, thumbnailUrl: e.target.value })
                }
                className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  onPickMedia(
                    (u) =>
                      editingVideo
                        ? setEditingVideo({ ...editingVideo, thumbnailUrl: u })
                        : setVideoForm({ ...videoForm, thumbnailUrl: u }),
                    "brand"
                  )
                }
                className="px-3 rounded-xl bg-white/10 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Thumb
              </button>
            </div>

            <textarea
              rows={2}
              placeholder="Video Description"
              value={(editingVideo ? editingVideo.description : videoForm.description) || ""}
              onChange={(e) =>
                editingVideo
                  ? setEditingVideo({ ...editingVideo, description: e.target.value })
                  : setVideoForm({ ...videoForm, description: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
            />

            <div className="flex gap-4 text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingVideo ? editingVideo.featured : videoForm.featured}
                  onChange={(e) =>
                    editingVideo
                      ? setEditingVideo({ ...editingVideo, featured: e.target.checked })
                      : setVideoForm({ ...videoForm, featured: e.target.checked })
                  }
                />
                Featured Video
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingVideo ? editingVideo.published : videoForm.published}
                  onChange={(e) =>
                    editingVideo
                      ? setEditingVideo({ ...editingVideo, published: e.target.checked })
                      : setVideoForm({ ...videoForm, published: e.target.checked })
                  }
                />
                Published
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              {editingVideo ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await onSaveVideo(editingVideo as unknown as Record<string, unknown>, "publish");
                      setEditingVideo(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
                  >
                    Save &amp; Publish Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingVideo(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await onCreateVideo(videoForm, "publish");
                    setVideoForm({
                      title: "",
                      description: "",
                      creatorName: "",
                      videoUrl: "",
                      thumbnailUrl: "/ref/influencers/1770471884_img.jpg",
                      featured: false,
                      published: true,
                    });
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add &amp; Publish Brand Video
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-2.5">
            {videos.map((v, idx) => (
              <div
                key={v.id}
                draggable
                onDragStart={() => setDragVideoIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragVideoIdx !== null) moveVideo(dragVideoIdx, idx);
                  setDragVideoIdx(null);
                }}
                className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-3.5 flex items-center gap-3 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-4 h-4 text-zinc-500 shrink-0" />
                <img
                  src={v.thumbnailUrl}
                  alt={v.title}
                  className="w-20 aspect-video rounded-xl object-cover object-top shrink-0 bg-black"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white truncate">{v.title}</span>
                    {v.featured && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        Featured
                      </span>
                    )}
                    {!v.published && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#60a5fa] truncate">
                    {v.creatorName || "Brand Collaboration"}
                  </div>
                  <div className="text-[11px] text-[#71717a] truncate">{v.videoUrl}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSaveVideo({ id: v.id, featured: !v.featured }, "publish")}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      v.featured ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-zinc-400"
                    }`}
                    title="Toggle Featured"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveVideo({ id: v.id, published: !v.published }, "publish")}
                    className="p-1.5 rounded-lg bg-white/5 text-zinc-300 cursor-pointer"
                    title={v.published ? "Unpublish" : "Publish"}
                  >
                    {v.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveVideo(idx, idx - 1)}
                    className="p-1.5 rounded-lg bg-white/5 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveVideo(idx, idx + 1)}
                    className="p-1.5 rounded-lg bg-white/5 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingVideo(v)}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteVideo(v.id, v.title)}
                    className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: HEADLINES, FORM & MANAGERS SHOWCASE */}
      {subTab === "layout" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
            <h3 className="font-bold text-sm text-white">
              Brand Page &amp; Video Section Headlines
            </h3>
            <input
              type="text"
              placeholder="Top Slider Headline"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <input
              type="text"
              placeholder="Top Slider Subtitle"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="text"
              placeholder="Videos Section Heading"
              value={videosSectionTitle}
              onChange={(e) => setVideosSectionTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="text"
              placeholder="Videos Section Subtitle"
              value={videosSectionSubtitle}
              onChange={(e) => setVideosSectionSubtitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() =>
                onSaveSection(
                  {
                    pageSlug: "brand",
                    sectionKey: "hero",
                    title: heroTitle,
                    subtitle: heroSubtitle,
                    badgeText: videosSectionTitle,
                    bodyHtml: videosSectionSubtitle,
                    enabled: true,
                  },
                  "publish"
                )
              }
              className="px-4 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save &amp; Publish Headlines
            </button>
          </div>

          <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
            <h3 className="font-bold text-sm text-white">
              Inquiry Form &amp; Brand Managers Carousel
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Form Title"
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
            <input
              type="text"
              placeholder="Form Success Confirmation Message"
              value={formSuccessMessage}
              onChange={(e) => setFormSuccessMessage(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
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
                Brand Managers Photos ({rightImages.length})
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
                      formSuccessMessage,
                    }),
                    enabled: true,
                  },
                  "publish"
                )
              }
              className="px-4 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Publish Form Showcase
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AboutManagerPanel({
  sections,
  slides,
  onSaveSection,
  onCreateSlide,
  onSaveSlide,
  onReorderSlides,
  onDeleteSlide,
  onPickMedia,
  onGoToTeamTab,
}: {
  sections: CmsPageSectionRow[];
  slides: CmsAboutSlideRow[];
  onSaveSection: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onCreateSlide: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onSaveSlide: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onReorderSlides: (ids: string[]) => Promise<void>;
  onDeleteSlide: (id: string, label: string) => void;
  onPickMedia: (cb: (url: string) => void, folder?: string) => void;
  onGoToTeamTab: () => void;
}) {
  const heroSec = sections.find(
    (s) => s.pageSlug === "about" && s.sectionKey === "hero"
  );
  const storySec = sections.find(
    (s) => s.pageSlug === "about" && s.sectionKey === "story"
  );

  // Intro & Slider Display Settings
  const initialHeroExtra = safeJsonParse<{
    sliderEnabled?: boolean;
    sliderAutoplay?: boolean;
    sliderSpeedSeconds?: number;
    sliderPauseOnHover?: boolean;
    sliderShowCaptions?: boolean;
  }>(heroSec?.extraJson, {});

  const [heroTitle, setHeroTitle] = useState(
    heroSec?.title || "About Goldex Media Network"
  );
  const [heroSubtitle, setHeroSubtitle] = useState(heroSec?.subtitle || "");
  const [heroMission, setHeroMission] = useState(heroSec?.badgeText || "");
  const [heroMediaUrl, setHeroMediaUrl] = useState(
    heroSec?.mediaUrl || "/ref/video/about-bg.mp4"
  );
  const [heroMediaType, setHeroMediaType] = useState(heroSec?.mediaType || "video");

  const [sliderEnabled, setSliderEnabled] = useState(
    initialHeroExtra.sliderEnabled ?? true
  );
  const [sliderAutoplay, setSliderAutoplay] = useState(
    initialHeroExtra.sliderAutoplay ?? true
  );
  const [sliderSpeedSeconds, setSliderSpeedSeconds] = useState(
    initialHeroExtra.sliderSpeedSeconds ?? 45
  );
  const [sliderPauseOnHover, setSliderPauseOnHover] = useState(
    initialHeroExtra.sliderPauseOnHover ?? true
  );
  const [sliderShowCaptions, setSliderShowCaptions] = useState(
    initialHeroExtra.sliderShowCaptions ?? true
  );

  // Slider Images CRUD
  const [editingSlide, setEditingSlide] = useState<CmsAboutSlideRow | null>(null);
  const [slideForm, setSlideForm] = useState({
    imageUrl: "",
    title: "",
    description: "",
    enabled: true,
  });
  const [dragSlideIdx, setDragSlideIdx] = useState<number | null>(null);

  // Story & Partner Logos & Right Card
  const initialStoryExtra = safeJsonParse<{
    partnerCompanyName?: string;
    partnerLogos?: Array<{ name: string; logoUrl: string; websiteUrl?: string }>;
    artistImageUrl?: string;
    artistImagePosition?: string;
    teamHeading?: string;
    pillars?: Array<{ title: string; description: string }>;
  }>(storySec?.extraJson, {});

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
  const [teamHeading, setTeamHeading] = useState(
    initialStoryExtra.teamHeading || ""
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
    setHeroMediaType(heroSec.mediaType || "video");
    const ext = safeJsonParse<{
      sliderEnabled?: boolean;
      sliderAutoplay?: boolean;
      sliderSpeedSeconds?: number;
      sliderPauseOnHover?: boolean;
      sliderShowCaptions?: boolean;
    }>(heroSec.extraJson, {});
    setSliderEnabled(ext.sliderEnabled ?? true);
    setSliderAutoplay(ext.sliderAutoplay ?? true);
    setSliderSpeedSeconds(ext.sliderSpeedSeconds ?? 45);
    setSliderPauseOnHover(ext.sliderPauseOnHover ?? true);
    setSliderShowCaptions(ext.sliderShowCaptions ?? true);
  }, [heroSec]);

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length || from === to) return;
    const next = [...slides];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorderSlides(next.map((s) => s.id));
  };

  const saveIntroAndSliderSettings = async (mode: "draft" | "publish") => {
    const existingExtra = safeJsonParse<Record<string, unknown>>(heroSec?.extraJson, {});
    await onSaveSection(
      {
        pageSlug: "about",
        sectionKey: "hero",
        title: heroTitle,
        subtitle: heroSubtitle,
        badgeText: heroMission,
        mediaUrl: heroMediaUrl,
        mediaType: heroMediaType,
        extraJson: JSON.stringify({
          ...existingExtra,
          sliderEnabled,
          sliderAutoplay,
          sliderSpeedSeconds: Math.min(180, Math.max(8, Number(sliderSpeedSeconds || 45))),
          sliderPauseOnHover,
          sliderShowCaptions,
        }),
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
          teamHeading: teamHeading.trim() || undefined,
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
            Complete About Section &amp; Top Slider CMS ({slides.length} Slider Images)
          </h2>
          <p className="text-xs text-[#b0b0b8]">
            Manage the top scrolling image slider (images, titles, descriptions, enable/disable, drag reorder, autoplay/speed), About intro, Exclusive Licensing multi-logos, Join Network card, and Leadership Team on{" "}
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
          Manage Leadership &amp; Team &rarr;
        </button>
      </div>

      {/* SECTION 1: TOP IMAGE SLIDER CMS */}
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-white">
            About Top Image Slider Manager ({slides.filter((s) => s.enabled).length} enabled of {slides.length})
          </h3>
        </div>

        {/* Slider Controls */}
        <div className="rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] p-4 space-y-3">
          <div className="text-xs font-bold uppercase text-[#9ca3af]">
            Slider Autoplay, Speed &amp; Display Settings
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sliderEnabled}
                onChange={(e) => setSliderEnabled(e.target.checked)}
              />
              Display Top Slider on /about
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sliderAutoplay}
                onChange={(e) => setSliderAutoplay(e.target.checked)}
              />
              Autoplay Scroll
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sliderPauseOnHover}
                onChange={(e) => setSliderPauseOnHover(e.target.checked)}
              />
              Pause on Hover
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sliderShowCaptions}
                onChange={(e) => setSliderShowCaptions(e.target.checked)}
              />
              Show Slide Titles &amp; Descriptions
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[#9ca3af]">Cycle Speed (seconds):</span>
              <input
                type="number"
                min={8}
                max={180}
                value={sliderSpeedSeconds}
                onChange={(e) => setSliderSpeedSeconds(Number(e.target.value || 45))}
                className="w-20 px-2.5 py-1 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-xs"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => saveIntroAndSliderSettings("publish")}
            className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save &amp; Publish Slider &amp; Intro Settings
          </button>
        </div>

        {/* Add / Edit Slider Image + List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] p-4 space-y-3 h-fit">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">
              {editingSlide ? `Edit Slide: ${editingSlide.title || "Image"}` : "Add New Slider Image"}
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Slider Image URL*"
                value={editingSlide ? editingSlide.imageUrl : slideForm.imageUrl}
                onChange={(e) =>
                  editingSlide
                    ? setEditingSlide({ ...editingSlide, imageUrl: e.target.value })
                    : setSlideForm({ ...slideForm, imageUrl: e.target.value })
                }
                className="flex-1 px-3 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  onPickMedia(
                    (u) =>
                      editingSlide
                        ? setEditingSlide({ ...editingSlide, imageUrl: u })
                        : setSlideForm({ ...slideForm, imageUrl: u }),
                    "about"
                  )
                }
                className="px-3 rounded-xl bg-white/10 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Upload / Pick
              </button>
            </div>
            <input
              type="text"
              placeholder="Image Title (optional)"
              value={(editingSlide ? editingSlide.title : slideForm.title) || ""}
              onChange={(e) =>
                editingSlide
                  ? setEditingSlide({ ...editingSlide, title: e.target.value })
                  : setSlideForm({ ...slideForm, title: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs"
            />
            <textarea
              rows={2}
              placeholder="Image Description (optional)"
              value={(editingSlide ? editingSlide.description : slideForm.description) || ""}
              onChange={(e) =>
                editingSlide
                  ? setEditingSlide({ ...editingSlide, description: e.target.value })
                  : setSlideForm({ ...slideForm, description: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs resize-none"
            />
            <label className="flex items-center gap-2 text-xs text-[#b0b0b8] cursor-pointer">
              <input
                type="checkbox"
                checked={editingSlide ? editingSlide.enabled : slideForm.enabled}
                onChange={(e) =>
                  editingSlide
                    ? setEditingSlide({ ...editingSlide, enabled: e.target.checked })
                    : setSlideForm({ ...slideForm, enabled: e.target.checked })
                }
              />
              Enabled in Public About Slider
            </label>

            <div className="flex gap-2">
              {editingSlide ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await onSaveSlide(editingSlide as unknown as Record<string, unknown>, "publish");
                      setEditingSlide(null);
                    }}
                    className="flex-1 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
                  >
                    Save &amp; Publish Slide
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSlide(null)}
                    className="px-3 py-2 rounded-xl bg-white/10 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await onCreateSlide(slideForm, "publish");
                    setSlideForm({ imageUrl: "", title: "", description: "", enabled: true });
                  }}
                  className="w-full py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add &amp; Publish Slide
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-2">
            {slides.map((sl, idx) => (
              <div
                key={sl.id}
                draggable
                onDragStart={() => setDragSlideIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragSlideIdx !== null) moveSlide(dragSlideIdx, idx);
                  setDragSlideIdx(null);
                }}
                className="rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] p-2.5 flex items-center gap-3 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-4 h-4 text-zinc-500 shrink-0" />
                <img
                  src={sl.imageUrl}
                  alt={sl.title || `Slide ${idx + 1}`}
                  className="w-12 h-12 rounded-lg object-cover object-top shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">
                      {sl.title || `Slider Photo ${idx + 1}`}
                    </span>
                    {!sl.enabled && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#71717a] truncate">
                    {sl.description || sl.imageUrl}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSaveSlide({ id: sl.id, enabled: !sl.enabled }, "publish")}
                    className="p-1.5 rounded-lg bg-white/5 text-zinc-300 cursor-pointer"
                    title={sl.enabled ? "Disable Slide" : "Enable Slide"}
                  >
                    {sl.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(idx, idx - 1)}
                    className="p-1.5 rounded-lg bg-white/5 cursor-pointer"
                    aria-label="Move slide up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(idx, idx + 1)}
                    className="p-1.5 rounded-lg bg-white/5 cursor-pointer"
                    aria-label="Move slide down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSlide(sl)}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSlide(sl.id, sl.title || sl.imageUrl)}
                    className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
                    aria-label="Delete slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: ABOUT INTRODUCTION BANNER */}
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-4">
        <h3 className="font-bold text-sm text-white">About Introduction Banner</h3>
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => saveIntroAndSliderSettings("draft")}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => saveIntroAndSliderSettings("publish")}
            className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
          >
            Publish Intro Banner
          </button>
        </div>
      </div>

      {/* SECTION 3: EXCLUSIVE LICENSING & JOIN NETWORK RIGHT CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
          <h3 className="font-bold text-sm text-white">
            Exclusive Licensing &amp; Multiple Company Logos
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
            placeholder="Supporting Text"
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
            Join Network Right-Side Image, CTA &amp; Section Headings
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

          <input
            type="text"
            placeholder="Leadership Section Heading (optional override)"
            value={teamHeading}
            onChange={(e) => setTeamHeading(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
          />

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
