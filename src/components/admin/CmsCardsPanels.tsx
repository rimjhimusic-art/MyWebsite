"use client";

import React, { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Image as ImageIcon, Save, CheckCircle2 } from "lucide-react";

export interface CmsArtistRow {
  id: string;
  name: string;
  roleBadge: string;
  bio: string;
  imageUrl: string;
  verified: boolean;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  websiteUrl?: string | null;
  otherSocialsJson?: string | null;
  published: boolean;
  sortOrder: number;
}

export interface CmsStoreRow {
  id: string;
  name: string;
  logoUrl: string;
  altText?: string | null;
  websiteUrl?: string | null;
  showInMarquee: boolean;
  showOnSignup: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface CmsServiceRow {
  id: string;
  title: string;
  shortDesc: string;
  detailsJson: string;
  iconKey: string;
  accentTheme: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  published: boolean;
  sortOrder: number;
}

export interface CmsTeamRow {
  id: string;
  name: string;
  role: string;
  bio?: string | null;
  imageUrl: string;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  websiteUrl?: string | null;
  published: boolean;
  sortOrder: number;
}

export function ArtistsManagerPanel({
  items,
  onSave,
  onCreate,
  onReorder,
  onDelete,
  onPickMedia,
}: {
  items: CmsArtistRow[];
  onSave: (payload: Partial<CmsArtistRow> & { id: string }, mode: "draft" | "publish") => Promise<void>;
  onCreate: (payload: Omit<CmsArtistRow, "id" | "sortOrder">, mode: "draft" | "publish") => Promise<void>;
  onReorder: (ids: string[]) => Promise<void>;
  onDelete: (id: string, label: string) => void;
  onPickMedia: (cb: (url: string) => void, folder?: string) => void;
}) {
  const [editing, setEditing] = useState<CmsArtistRow | null>(null);
  const [newForm, setNewForm] = useState({
    name: "",
    roleBadge: "Independent Artist",
    bio: "",
    imageUrl: "/ref/abir.jpg",
    verified: true,
    facebookUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    spotifyUrl: "",
    appleMusicUrl: "",
    websiteUrl: "",
    otherSocialsJson: "",
    published: true,
  });

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onReorder(next.map((x) => x.id));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Featured Artists ({items.length})</h2>
          <p className="text-xs text-[#b0b0b8]">
            {items.filter((i) => i.published).length > 3
              ? "4+ published artists active — Homepage automatically displays the smooth horizontal Carousel."
              : "1–3 published artists active — Add a 4th artist to automatically enable Homepage Carousel mode."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
          <h3 className="font-bold text-sm text-white">
            {editing ? `Edit Artist: ${editing.name}` : "Add New Featured Artist"}
          </h3>

          <input
            type="text"
            placeholder="Artist Name*"
            value={editing ? editing.name : newForm.name}
            onChange={(e) =>
              editing
                ? setEditing({ ...editing, name: e.target.value })
                : setNewForm({ ...newForm, name: e.target.value })
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="text"
            placeholder="Role Badge (e.g. Independent Artist)"
            value={editing ? editing.roleBadge : newForm.roleBadge}
            onChange={(e) =>
              editing
                ? setEditing({ ...editing, roleBadge: e.target.value })
                : setNewForm({ ...newForm, roleBadge: e.target.value })
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Portrait Image URL*"
              value={editing ? editing.imageUrl : newForm.imageUrl}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, imageUrl: e.target.value })
                  : setNewForm({ ...newForm, imageUrl: e.target.value })
              }
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() =>
                onPickMedia(
                  (url) =>
                    editing
                      ? setEditing({ ...editing, imageUrl: url })
                      : setNewForm({ ...newForm, imageUrl: url }),
                  "artists"
                )
              }
              className="px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Pick
            </button>
          </div>

          <textarea
            rows={3}
            placeholder="Artist Bio*"
            value={editing ? editing.bio : newForm.bio}
            onChange={(e) =>
              editing
                ? setEditing({ ...editing, bio: e.target.value })
                : setNewForm({ ...newForm, bio: e.target.value })
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="url"
              placeholder="Facebook URL"
              value={(editing ? editing.facebookUrl : newForm.facebookUrl) || ""}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, facebookUrl: e.target.value })
                  : setNewForm({ ...newForm, facebookUrl: e.target.value })
              }
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="url"
              placeholder="Instagram URL"
              value={(editing ? editing.instagramUrl : newForm.instagramUrl) || ""}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, instagramUrl: e.target.value })
                  : setNewForm({ ...newForm, instagramUrl: e.target.value })
              }
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="url"
              placeholder="YouTube URL"
              value={(editing ? editing.youtubeUrl : newForm.youtubeUrl) || ""}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, youtubeUrl: e.target.value })
                  : setNewForm({ ...newForm, youtubeUrl: e.target.value })
              }
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="url"
              placeholder="Spotify URL (optional)"
              value={(editing ? editing.spotifyUrl : newForm.spotifyUrl) || ""}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, spotifyUrl: e.target.value })
                  : setNewForm({ ...newForm, spotifyUrl: e.target.value })
              }
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="url"
              placeholder="Apple Music URL (optional)"
              value={(editing ? editing.appleMusicUrl : newForm.appleMusicUrl) || ""}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, appleMusicUrl: e.target.value })
                  : setNewForm({ ...newForm, appleMusicUrl: e.target.value })
              }
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="url"
              placeholder="Website / Other URL (optional)"
              value={(editing ? editing.websiteUrl : newForm.websiteUrl) || ""}
              onChange={(e) =>
                editing
                  ? setEditing({ ...editing, websiteUrl: e.target.value })
                  : setNewForm({ ...newForm, websiteUrl: e.target.value })
              }
              className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
          </div>

          <div className="flex items-center gap-4 text-xs pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={editing ? editing.verified : newForm.verified}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, verified: e.target.checked })
                    : setNewForm({ ...newForm, verified: e.target.checked })
                }
              />
              Verified Badge
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={editing ? editing.published : newForm.published}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, published: e.target.checked })
                    : setNewForm({ ...newForm, published: e.target.checked })
                }
              />
              Published
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await onSave(editing, "draft");
                    setEditing(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Draft
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onSave(editing, "publish");
                    setEditing(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save &amp; Publish
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-3 py-2.5 rounded-xl bg-white/10 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await onCreate(newForm, "draft");
                    setNewForm({
                      name: "",
                      roleBadge: "Independent Artist",
                      bio: "",
                      imageUrl: "/ref/abir.jpg",
                      verified: true,
                      facebookUrl: "",
                      instagramUrl: "",
                      youtubeUrl: "",
                      spotifyUrl: "",
                      appleMusicUrl: "",
                      websiteUrl: "",
                      otherSocialsJson: "",
                      published: true,
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add as Draft
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onCreate(newForm, "publish");
                    setNewForm({
                      name: "",
                      roleBadge: "Independent Artist",
                      bio: "",
                      imageUrl: "/ref/abir.jpg",
                      verified: true,
                      facebookUrl: "",
                      instagramUrl: "",
                      youtubeUrl: "",
                      spotifyUrl: "",
                      appleMusicUrl: "",
                      websiteUrl: "",
                      otherSocialsJson: "",
                      published: true,
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Add &amp; Publish
                </button>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-3">
          {items.map((a, idx) => (
            <div
              key={a.id}
              className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex items-center gap-4"
            >
              <img
                src={a.imageUrl}
                alt={a.name}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white truncate">{a.name}</div>
                <div className="text-xs text-[#3b82f6]">{a.roleBadge}</div>
                <div className="text-[11px] text-[#71717a] truncate mt-0.5">{a.bio}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  aria-label="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                  aria-label="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(a.id, a.name)}
                  className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
                  aria-label="Delete artist"
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

export function StoresManagerPanel({
  items,
  onSave,
  onCreate,
  onReorder,
  onDelete,
  onPickMedia,
}: {
  items: CmsStoreRow[];
  onSave: (payload: Partial<CmsStoreRow> & { id: string }, mode: "draft" | "publish") => Promise<void>;
  onCreate: (payload: Omit<CmsStoreRow, "id" | "sortOrder">, mode: "draft" | "publish") => Promise<void>;
  onReorder: (ids: string[]) => Promise<void>;
  onDelete: (id: string, label: string) => void;
  onPickMedia: (cb: (url: string) => void, folder?: string) => void;
}) {
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("/ref/stores/spotify.png");
  const [showInMarquee, setShowInMarquee] = useState(true);
  const [showOnSignup, setShowOnSignup] = useState(false);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onReorder(next.map((x) => x.id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
        <h3 className="font-bold text-sm text-white">Add Digital Store / Partner Logo</h3>
        <input
          type="text"
          placeholder="Store Name*"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Logo URL*"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
          />
          <button
            type="button"
            onClick={() => onPickMedia((u) => setLogoUrl(u), "stores")}
            className="px-3 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
          >
            Pick
          </button>
        </div>
        <div className="flex gap-4 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={showInMarquee}
              onChange={(e) => setShowInMarquee(e.target.checked)}
            />
            Homepage Marquee
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={showOnSignup}
              onChange={(e) => setShowOnSignup(e.target.checked)}
            />
            Signup Brand Panel
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              await onCreate(
                { name, logoUrl, altText: name, websiteUrl: "", showInMarquee, showOnSignup, enabled: true },
                "draft"
              );
              setName("");
            }}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={async () => {
              await onCreate(
                { name, logoUrl, altText: name, websiteUrl: "", showInMarquee, showOnSignup, enabled: true },
                "publish"
              );
              setName("");
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
          >
            Add &amp; Publish
          </button>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-2.5">
        {items.map((st, idx) => (
          <div
            key={st.id}
            className="rounded-xl bg-[#18181b] border border-[#2a2a2a] p-3.5 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-20 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                <img src={st.logoUrl} alt={st.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <div className="font-bold text-sm text-white">{st.name}</div>
                <div className="text-[11px] text-[#71717a]">
                  {st.showInMarquee ? "Marquee • " : ""}
                  {st.showOnSignup ? "Signup Panel • " : ""}
                  {st.enabled ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSave({ id: st.id, enabled: !st.enabled }, "publish")}
                className="px-2.5 py-1 rounded-lg bg-white/5 text-xs cursor-pointer"
              >
                {st.enabled ? "Disable" : "Enable"}
              </button>
              <button type="button" onClick={() => move(idx, -1)} className="p-1.5 rounded bg-white/5 cursor-pointer">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => move(idx, 1)} className="p-1.5 rounded bg-white/5 cursor-pointer">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(st.id, st.name)}
                className="p-1.5 rounded bg-red-500/15 text-red-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServicesManagerPanel({
  items,
  onSave,
  onCreate,
  onDelete,
}: {
  items: CmsServiceRow[];
  onSave: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onCreate: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onDelete: (id: string, label: string) => void;
}) {
  const [editing, setEditing] = useState<CmsServiceRow | null>(null);
  const [title, setTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [accentTheme, setAccentTheme] = useState("blue");
  const [iconKey, setIconKey] = useState("music");
  const [detailsText, setDetailsText] = useState("");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
        <h3 className="font-bold text-sm text-white">
          {editing ? `Edit Service: ${editing.title}` : "Add Service Card"}
        </h3>
        <input
          type="text"
          placeholder="Service Title*"
          value={editing ? editing.title : title}
          onChange={(e) =>
            editing ? setEditing({ ...editing, title: e.target.value }) : setTitle(e.target.value)
          }
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
        />
        <textarea
          rows={2}
          placeholder="Short description"
          value={editing ? editing.shortDesc : shortDesc}
          onChange={(e) =>
            editing
              ? setEditing({ ...editing, shortDesc: e.target.value })
              : setShortDesc(e.target.value)
          }
          className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <select
            value={editing ? editing.accentTheme : accentTheme}
            onChange={(e) =>
              editing
                ? setEditing({ ...editing, accentTheme: e.target.value })
                : setAccentTheme(e.target.value)
            }
            className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
          >
            <option value="blue">Blue Icon Badge</option>
            <option value="red">Red Icon Badge</option>
            <option value="green">Green Icon Badge</option>
            <option value="yellow">Yellow Icon Badge</option>
          </select>
          <select
            value={editing ? editing.iconKey : iconKey}
            onChange={(e) =>
              editing
                ? setEditing({ ...editing, iconKey: e.target.value })
                : setIconKey(e.target.value)
            }
            className="px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
          >
            <option value="music">Music Note</option>
            <option value="youtube">Official YouTube</option>
            <option value="shield-halved">Shield / Rights</option>
            <option value="file-invoice-dollar">Royalty / Finance</option>
            <option value="star">Star</option>
            <option value="pen-nib">Publishing Pen</option>
            <option value="bullhorn">Megaphone</option>
            <option value="chart-line">Analytics</option>
            <option value="compact-disc">Physical Disc</option>
            <option value="shirt">Merch</option>
            <option value="sitemap">Label Sitemap</option>
            <option value="lock">Lock Protection</option>
          </select>
        </div>
        <textarea
          rows={4}
          placeholder="Bullet items (one per line)"
          value={
            editing
              ? (() => {
                  try {
                    return JSON.parse(editing.detailsJson).join("\n");
                  } catch {
                    return "";
                  }
                })()
              : detailsText
          }
          onChange={(e) =>
            editing
              ? setEditing({
                  ...editing,
                  detailsJson: JSON.stringify(
                    e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                  ),
                })
              : setDetailsText(e.target.value)
          }
          className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
        />
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={async () => {
                  await onSave(editing as unknown as Record<string, unknown>, "draft");
                  setEditing(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onSave(editing as unknown as Record<string, unknown>, "publish");
                  setEditing(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
              >
                Save &amp; Publish
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-3 py-2.5 rounded-xl bg-white/10 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await onCreate(
                  {
                    title,
                    shortDesc,
                    accentTheme,
                    iconKey,
                    details: detailsText.split("\n").map((s) => s.trim()).filter(Boolean),
                  },
                  "publish"
                );
                setTitle("");
                setShortDesc("");
                setDetailsText("");
              }}
              className="w-full py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
            >
              Add Service
            </button>
          )}
        </div>
      </div>

      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((sv) => (
          <div key={sv.id} className="rounded-xl bg-[#18181b] border border-[#2a2a2a] p-4 flex flex-col justify-between gap-2">
            <div>
              <div className="text-xs uppercase font-bold text-[#3b82f6]">{sv.accentTheme} &bull; {sv.iconKey}</div>
              <div className="font-bold text-sm text-white mt-0.5">{sv.title}</div>
              <div className="text-xs text-[#71717a] mt-1 line-clamp-2">{sv.shortDesc}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(sv)}
                className="px-3 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(sv.id, sv.title)}
                className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamManagerPanel({
  items,
  onSave,
  onCreate,
  onReorder,
  onDelete,
  onPickMedia,
}: {
  items: CmsTeamRow[];
  onSave: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onCreate: (payload: Record<string, unknown>, mode: "draft" | "publish") => Promise<void>;
  onReorder: (ids: string[]) => Promise<void>;
  onDelete: (id: string, label: string) => void;
  onPickMedia: (cb: (url: string) => void, folder?: string) => void;
}) {
  const [editing, setEditing] = useState<CmsTeamRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    role: "",
    bio: "",
    imageUrl: "/ref/team/sujoy.png",
    linkedinUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    youtubeUrl: "",
    websiteUrl: "",
    published: true,
  });

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onReorder(next.map((x) => x.id));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="font-bold text-white text-sm">
          Leadership &amp; Team Members ({items.length})
        </div>
        <div className="text-[#b0b0b8]">
          {items.filter((m) => m.published).length} published &bull; Each member is stored individually in the database; adding one never removes existing members.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3 h-fit">
          <h3 className="font-bold text-sm text-white">{editing ? `Edit ${editing.name}` : "Add Team Member"}</h3>
          <input
            type="text"
            placeholder="Name*"
            value={editing ? editing.name : form.name}
            onChange={(e) => editing ? setEditing({ ...editing, name: e.target.value }) : setForm({ ...form, name: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="text"
            placeholder="Designation / Role*"
            value={editing ? editing.role : form.role}
            onChange={(e) => editing ? setEditing({ ...editing, role: e.target.value }) : setForm({ ...form, role: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Photo URL*"
              value={editing ? editing.imageUrl : form.imageUrl}
              onChange={(e) => editing ? setEditing({ ...editing, imageUrl: e.target.value }) : setForm({ ...form, imageUrl: e.target.value })}
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <button
              type="button"
              onClick={() => onPickMedia((u) => editing ? setEditing({ ...editing, imageUrl: u }) : setForm({ ...form, imageUrl: u }), "team")}
              className="px-3 rounded-xl bg-white/10 text-xs font-semibold cursor-pointer"
            >
              Pick
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="url"
              placeholder="Instagram URL"
              value={(editing ? editing.instagramUrl : form.instagramUrl) || ""}
              onChange={(e) => editing ? setEditing({ ...editing, instagramUrl: e.target.value }) : setForm({ ...form, instagramUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="url"
              placeholder="Facebook URL"
              value={(editing ? editing.facebookUrl : form.facebookUrl) || ""}
              onChange={(e) => editing ? setEditing({ ...editing, facebookUrl: e.target.value }) : setForm({ ...form, facebookUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="url"
              placeholder="YouTube URL"
              value={(editing ? editing.youtubeUrl : form.youtubeUrl) || ""}
              onChange={(e) => editing ? setEditing({ ...editing, youtubeUrl: e.target.value }) : setForm({ ...form, youtubeUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="url"
              placeholder="LinkedIn URL"
              value={(editing ? editing.linkedinUrl : form.linkedinUrl) || ""}
              onChange={(e) => editing ? setEditing({ ...editing, linkedinUrl: e.target.value }) : setForm({ ...form, linkedinUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
            <input
              type="url"
              placeholder="Twitter / Website URL"
              value={(editing ? editing.websiteUrl : form.websiteUrl) || ""}
              onChange={(e) => editing ? setEditing({ ...editing, websiteUrl: e.target.value }) : setForm({ ...form, websiteUrl: e.target.value })}
              className="sm:col-span-2 w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
            />
          </div>
          <textarea
            rows={3}
            placeholder="Short Biography"
            value={(editing ? editing.bio : form.bio) || ""}
            onChange={(e) => editing ? setEditing({ ...editing, bio: e.target.value }) : setForm({ ...form, bio: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs resize-none"
          />
          <label className="flex items-center gap-2 text-xs text-[#b0b0b8] cursor-pointer">
            <input
              type="checkbox"
              checked={editing ? editing.published : form.published}
              onChange={(e) => editing ? setEditing({ ...editing, published: e.target.checked }) : setForm({ ...form, published: e.target.checked })}
            />
            Published on Public Website
          </label>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button type="button" onClick={async () => { await onSave(editing as unknown as Record<string, unknown>, "draft"); setEditing(null); }} className="flex-1 py-2.5 rounded-xl bg-amber-600 text-xs font-bold cursor-pointer">Save Draft</button>
                <button type="button" onClick={async () => { await onSave(editing as unknown as Record<string, unknown>, "publish"); setEditing(null); }} className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-xs font-bold cursor-pointer">Save &amp; Publish</button>
                <button type="button" onClick={() => setEditing(null)} className="px-3 rounded-xl bg-white/10 text-xs cursor-pointer">Cancel</button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await onCreate(form, "draft");
                    setForm({ name: "", role: "", bio: "", imageUrl: "/ref/team/sujoy.png", linkedinUrl: "", instagramUrl: "", facebookUrl: "", youtubeUrl: "", websiteUrl: "", published: true });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onCreate(form, "publish");
                    setForm({ name: "", role: "", bio: "", imageUrl: "/ref/team/sujoy.png", linkedinUrl: "", instagramUrl: "", facebookUrl: "", youtubeUrl: "", websiteUrl: "", published: true });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
                >
                  Add &amp; Publish
                </button>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3 h-fit">
          {items.map((m, idx) => (
            <div key={m.id} className="rounded-xl bg-[#18181b] border border-[#2a2a2a] p-3.5 flex items-center gap-3">
              <img src={m.imageUrl} alt={m.name} className="w-14 h-14 rounded-xl object-cover object-top shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="font-bold text-sm text-white truncate">{m.name}</div>
                  {!m.published && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">Hidden</span>
                  )}
                </div>
                <div className="text-xs text-[#3b82f6] truncate">{m.role}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => move(idx, -1)} className="p-1 rounded bg-white/5 hover:bg-white/10 cursor-pointer" aria-label="Move team member up"><ArrowUp className="w-3 h-3" /></button>
                <button type="button" onClick={() => move(idx, 1)} className="p-1 rounded bg-white/5 hover:bg-white/10 cursor-pointer" aria-label="Move team member down"><ArrowDown className="w-3 h-3" /></button>
                <button type="button" onClick={() => setEditing(m)} className="px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-bold cursor-pointer">Edit</button>
                <button type="button" onClick={() => onDelete(m.id, m.name)} className="p-1.5 rounded-lg bg-red-500/15 text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
