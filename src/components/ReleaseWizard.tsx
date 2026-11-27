"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  Music,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Send,
  Globe,
  Store,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const STEPS = [
  "Release Info",
  "Upload Artwork",
  "Add Tracks",
  "Track Metadata",
  "Select Stores",
  "Territories",
  "Review",
  "Submit",
];

const TERRITORIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "UAE",
  "Singapore",
  "Brazil",
  "Bangladesh",
];

interface TrackDraft {
  id?: string;
  trackNumber: number;
  title: string;
  version: string;
  primaryArtist: string;
  featuringArtists: string;
  isrc: string;
  explicitContent: boolean;
  language: string;
  previewStartSec: number;
  lyrics: string;
  audioAssetId: string | null;
  audioName?: string;
}

interface StoreOption {
  storeId: string;
  selected: boolean;
  store: { id: string; name: string; category: string };
}

export function ReleaseWizard({ releaseId }: { releaseId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [currentId, setCurrentId] = useState<string | undefined>(releaseId);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [uploadingTrackIdx, setUploadingTrackIdx] = useState<number | null>(null);
  const [allStores, setAllStores] = useState<Array<{ id: string; name: string; category: string }>>([]);

  const [meta, setMeta] = useState({
    releaseType: "SINGLE",
    title: "",
    version: "",
    primaryArtist: "",
    featuringArtists: "",
    remixer: "",
    composer: "",
    lyricist: "",
    producer: "",
    arranger: "",
    musicDirector: "",
    recordLabelName: "Goldex Independent",
    genre: "Pop",
    subgenre: "",
    language: "English",
    releaseDate: "",
    originalReleaseDate: "",
    copyrightYear: new Date().getFullYear(),
    copyrightOwner: "",
    phonographicCopyright: "",
    explicitContent: false,
    upc: "",
    cLine: "",
    pLine: "",
  });

  const [artwork, setArtwork] = useState<{
    id: string;
    originalName: string;
    width?: number | null;
    height?: number | null;
  } | null>(null);

  const [tracks, setTracks] = useState<TrackDraft[]>([
    {
      trackNumber: 1,
      title: "",
      version: "",
      primaryArtist: "",
      featuringArtists: "",
      isrc: "",
      explicitContent: false,
      language: "English",
      previewStartSec: 30,
      lyrics: "",
      audioAssetId: null,
    },
  ]);

  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [worldwide, setWorldwide] = useState(true);
  const [territories, setTerritories] = useState<string[]>(["WORLDWIDE"]);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => {
        const list = d.stores || [];
        setAllStores(list);
        if (!releaseId) {
          setSelectedStoreIds(list.map((s: { id: string }) => s.id));
        }
      });

    if (releaseId) {
      fetch(`/api/releases/${releaseId}`)
        .then((r) => r.json())
        .then((d) => {
          const rel = d.release;
          if (!rel) return;
          setMeta({
            releaseType: rel.releaseType,
            title: rel.title || "",
            version: rel.version || "",
            primaryArtist: rel.primaryArtist || "",
            featuringArtists: rel.featuringArtists || "",
            remixer: rel.remixer || "",
            composer: rel.composer || "",
            lyricist: rel.lyricist || "",
            producer: rel.producer || "",
            arranger: rel.arranger || "",
            musicDirector: rel.musicDirector || "",
            recordLabelName: rel.recordLabelName || "Goldex Independent",
            genre: rel.genre || "Pop",
            subgenre: rel.subgenre || "",
            language: rel.language || "English",
            releaseDate: rel.releaseDate ? rel.releaseDate.slice(0, 10) : "",
            originalReleaseDate: rel.originalReleaseDate
              ? rel.originalReleaseDate.slice(0, 10)
              : "",
            copyrightYear: rel.copyrightYear || new Date().getFullYear(),
            copyrightOwner: rel.copyrightOwner || "",
            phonographicCopyright: rel.phonographicCopyright || "",
            explicitContent: Boolean(rel.explicitContent),
            upc: rel.upc || "",
            cLine: rel.cLine || "",
            pLine: rel.pLine || "",
          });
          if (rel.artworkAsset) {
            setArtwork(rel.artworkAsset);
          }
          if (rel.tracks?.length) {
            setTracks(
              rel.tracks.map((t: TrackDraft & { audioAsset?: { originalName: string } }) => ({
                id: t.id,
                trackNumber: t.trackNumber,
                title: t.title,
                version: t.version || "",
                primaryArtist: t.primaryArtist || "",
                featuringArtists: t.featuringArtists || "",
                isrc: t.isrc || "",
                explicitContent: Boolean(t.explicitContent),
                language: t.language || "English",
                previewStartSec: t.previewStartSec || 0,
                lyrics: t.lyrics || "",
                audioAssetId: t.audioAssetId,
                audioName: t.audioAsset?.originalName,
              }))
            );
          }
          if (rel.stores?.length) {
            setSelectedStoreIds(
              (rel.stores as StoreOption[])
                .filter((s) => s.selected)
                .map((s) => s.storeId)
            );
          }
          setWorldwide(Boolean(rel.worldwide));
          try {
            setTerritories(JSON.parse(rel.territoriesJson || '["WORLDWIDE"]'));
          } catch {
            setTerritories(["WORLDWIDE"]);
          }
          setStep(rel.currentWizardStep || 1);
        });
    }
  }, [releaseId]);

  const saveDraft = async (nextStep?: number): Promise<string | null> => {
    if (!meta.title.trim() || !meta.primaryArtist.trim()) {
      showToast("Release Title and Primary Artist are required to save a draft.", "error");
      return null;
    }

    setSaving(true);
    try {
      if (!currentId) {
        const res = await fetch("/api/releases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(meta),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "Failed to create draft.", "error");
          return null;
        }
        setCurrentId(data.release.id);
        showToast("Draft created & auto-saved!", "success");
        return data.release.id;
      }

      const res = await fetch(`/api/releases/${currentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...meta,
          artworkAssetId: artwork?.id ?? null,
          tracks,
          selectedStoreIds,
          worldwide,
          territories: worldwide ? ["WORLDWIDE"] : territories,
          currentWizardStep: nextStep ?? step,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save draft.", "error");
        return null;
      }
      return currentId;
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    const targetStep = Math.min(8, step + 1);
    const id = await saveDraft(targetStep);
    if (id) setStep(targetStep);
  };

  const handleArtworkUpload = async (file: File) => {
    setUploadingArtwork(true);
    try {
      const fd = new FormData();
      fd.append("kind", "ARTWORK");
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Artwork validation failed.", "error");
        return;
      }
      setArtwork(data.asset);
      showToast(`Artwork verified (${data.asset.width}x${data.asset.height}px)!`, "success");
    } finally {
      setUploadingArtwork(false);
    }
  };

  const handleAudioUpload = async (idx: number, file: File) => {
    setUploadingTrackIdx(idx);
    try {
      const fd = new FormData();
      fd.append("kind", "AUDIO");
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Audio validation failed.", "error");
        return;
      }
      setTracks((prev) =>
        prev.map((t, i) =>
          i === idx
            ? {
                ...t,
                audioAssetId: data.asset.id,
                audioName: data.asset.originalName,
                title: t.title || file.name.replace(/\.[^.]+$/, ""),
                primaryArtist: t.primaryArtist || meta.primaryArtist,
              }
            : t
        )
      );
      showToast(`Audio uploaded (${data.asset.validationNotes})`, "success");
    } finally {
      setUploadingTrackIdx(null);
    }
  };

  const moveTrack = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= tracks.length) return;
    const copy = [...tracks];
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item);
    setTracks(copy.map((t, i) => ({ ...t, trackNumber: i + 1 })));
  };

  const handleSubmitRelease = async () => {
    const id = await saveDraft(8);
    if (!id) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/releases/${id}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Submission check failed.", "error");
        return;
      }
      showToast(data.message, "success");
      router.push("/dashboard/releases");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">
            Release Distribution Wizard
          </h1>
          <p className="text-sm text-[#b0b0b8]">
            Step {step} of 8 &mdash; {STEPS[step - 1]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => saveDraft(step)}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] hover:border-[#3b82f6] text-xs font-semibold cursor-pointer"
        >
          <Save className="w-4 h-4 text-[#3b82f6]" />
          <span>{saving ? "Saving Draft..." : "Save Draft"}</span>
        </button>
      </div>

      {/* Step Progress Bar */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {STEPS.map((label, idx) => {
          const num = idx + 1;
          const active = num === step;
          const done = num < step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => (currentId ? setStep(num) : null)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                active
                  ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                  : done
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-[#18181b] border-[#2a2a2a] text-[#71717a]"
              }`}
            >
              <div className="text-[10px] font-bold">STEP {num}</div>
              <div className="text-[11px] font-semibold truncate">{label}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 sm:p-8">
        {/* STEP 1: Release Information */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Step 1: Release Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Release Type*</label>
                <select
                  value={meta.releaseType}
                  onChange={(e) => setMeta({ ...meta, releaseType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                >
                  <option value="SINGLE">Single</option>
                  <option value="EP">EP</option>
                  <option value="ALBUM">Album</option>
                  <option value="COMPILATION">Compilation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Release Title*</label>
                <input
                  type="text"
                  value={meta.title}
                  onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                  placeholder="e.g. Aay Na Phire Aay"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Version / Edition</label>
                <input
                  type="text"
                  value={meta.version}
                  onChange={(e) => setMeta({ ...meta, version: e.target.value })}
                  placeholder="e.g. Acoustic, Remix, Deluxe"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Primary Artist*</label>
                <input
                  type="text"
                  value={meta.primaryArtist}
                  onChange={(e) => setMeta({ ...meta, primaryArtist: e.target.value })}
                  placeholder="Primary artist name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Featuring Artists</label>
                <input
                  type="text"
                  value={meta.featuringArtists}
                  onChange={(e) => setMeta({ ...meta, featuringArtists: e.target.value })}
                  placeholder="Comma-separated"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Record Label*</label>
                <input
                  type="text"
                  value={meta.recordLabelName}
                  onChange={(e) => setMeta({ ...meta, recordLabelName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Composer</label>
                <input
                  type="text"
                  value={meta.composer}
                  onChange={(e) => setMeta({ ...meta, composer: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Lyricist</label>
                <input
                  type="text"
                  value={meta.lyricist}
                  onChange={(e) => setMeta({ ...meta, lyricist: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Producer</label>
                <input
                  type="text"
                  value={meta.producer}
                  onChange={(e) => setMeta({ ...meta, producer: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Remixer</label>
                <input
                  type="text"
                  value={meta.remixer}
                  onChange={(e) => setMeta({ ...meta, remixer: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Arranger</label>
                <input
                  type="text"
                  value={meta.arranger}
                  onChange={(e) => setMeta({ ...meta, arranger: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Music Director</label>
                <input
                  type="text"
                  value={meta.musicDirector}
                  onChange={(e) => setMeta({ ...meta, musicDirector: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Genre*</label>
                <input
                  type="text"
                  value={meta.genre}
                  onChange={(e) => setMeta({ ...meta, genre: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Subgenre</label>
                <input
                  type="text"
                  value={meta.subgenre}
                  onChange={(e) => setMeta({ ...meta, subgenre: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Language*</label>
                <input
                  type="text"
                  value={meta.language}
                  onChange={(e) => setMeta({ ...meta, language: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Release Date</label>
                <input
                  type="date"
                  value={meta.releaseDate}
                  onChange={(e) => setMeta({ ...meta, releaseDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Original Release Date</label>
                <input
                  type="date"
                  value={meta.originalReleaseDate}
                  onChange={(e) =>
                    setMeta({ ...meta, originalReleaseDate: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">UPC (auto-assigned if blank)</label>
                <input
                  type="text"
                  value={meta.upc}
                  onChange={(e) => setMeta({ ...meta, upc: e.target.value })}
                  placeholder="13-digit UPC"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">Copyright Year</label>
                <input
                  type="number"
                  value={meta.copyrightYear}
                  onChange={(e) =>
                    setMeta({ ...meta, copyrightYear: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">C-Line (Copyright Owner)</label>
                <input
                  type="text"
                  value={meta.cLine}
                  onChange={(e) => setMeta({ ...meta, cLine: e.target.value })}
                  placeholder="2026 Artist / Label"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b0b8] mb-1.5">P-Line (Phonographic Copyright)</label>
                <input
                  type="text"
                  value={meta.pLine}
                  onChange={(e) => setMeta({ ...meta, pLine: e.target.value })}
                  placeholder="2026 Label"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-[#b0b0b8] cursor-pointer">
              <input
                type="checkbox"
                checked={meta.explicitContent}
                onChange={(e) =>
                  setMeta({ ...meta, explicitContent: e.target.checked })
                }
                className="accent-[#3b82f6]"
              />
              <span>Explicit Content (Parental Advisory)</span>
            </label>
          </div>
        )}

        {/* STEP 2: Upload Artwork */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Step 2: Upload Cover Artwork</h2>
            <p className="text-sm text-[#b0b0b8]">
              Requirements: Square 1:1 aspect ratio JPG or PNG, minimum 1400x1400px (3000x3000px recommended).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <label className="border-2 border-dashed border-[#2a2a2a] hover:border-[#3b82f6] rounded-2xl p-8 text-center cursor-pointer transition-colors">
                <ImageIcon className="w-10 h-10 text-[#3b82f6] mx-auto mb-3" />
                <p className="text-sm font-semibold text-white">
                  {uploadingArtwork
                    ? "Validating artwork dimensions..."
                    : "Click to select JPG or PNG cover artwork"}
                </p>
                <p className="text-xs text-[#71717a] mt-1">Max 25 MB &bull; 1:1 Square</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleArtworkUpload(f);
                  }}
                />
              </label>

              {artwork ? (
                <div className="p-4 rounded-2xl bg-[#111114] border border-emerald-500/30 flex items-center gap-4">
                  <img
                    src={`/api/files/${artwork.id}`}
                    alt="Release artwork"
                    className="w-28 h-28 rounded-xl object-cover border border-[#2a2a2a]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Verified Artwork
                    </div>
                    <p className="text-sm font-semibold text-white mt-1">
                      {artwork.originalName}
                    </p>
                    {artwork.width && artwork.height && (
                      <p className="text-xs text-[#b0b0b8] mt-0.5">
                        {artwork.width} x {artwork.height} px (1:1)
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#111114] border border-[#2a2a2a] text-sm text-[#71717a] text-center">
                  No artwork uploaded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Add Tracks & Audio Files */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Step 3: Add &amp; Upload Tracks</h2>
                <p className="text-sm text-[#b0b0b8]">
                  Supported formats: WAV, FLAC, or MP3. Reorder or preview uploaded audio.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setTracks((prev) => [
                    ...prev,
                    {
                      trackNumber: prev.length + 1,
                      title: "",
                      version: "",
                      primaryArtist: meta.primaryArtist,
                      featuringArtists: "",
                      isrc: "",
                      explicitContent: false,
                      language: meta.language,
                      previewStartSec: 30,
                      lyrics: "",
                      audioAssetId: null,
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3b82f6] text-xs font-bold text-white cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Track
              </button>
            </div>

            <div className="space-y-4">
              {tracks.map((t, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#111114] border border-[#2a2a2a] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-500/15 text-[#3b82f6] text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Track Title*"
                        value={t.title}
                        onChange={(e) =>
                          setTracks((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, title: e.target.value } : row
                            )
                          )
                        }
                        className="px-3 py-2 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-sm text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveTrack(idx, -1)}
                        className="p-2 rounded-lg bg-[#18181b] text-zinc-400 hover:text-white"
                        aria-label="Move track up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTrack(idx, 1)}
                        className="p-2 rounded-lg bg-[#18181b] text-zinc-400 hover:text-white"
                        aria-label="Move track down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      {tracks.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setTracks((prev) =>
                              prev
                                .filter((_, i) => i !== idx)
                                .map((row, i) => ({ ...row, trackNumber: i + 1 }))
                            )
                          }
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          aria-label="Remove track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] hover:border-[#3b82f6] text-xs font-semibold cursor-pointer">
                      <Music className="w-4 h-4 text-[#3b82f6]" />
                      <span>
                        {uploadingTrackIdx === idx
                          ? "Uploading audio..."
                          : t.audioAssetId
                          ? `Replace Audio (${t.audioName || "Uploaded"})`
                          : "Upload WAV / FLAC / MP3"}
                      </span>
                      <input
                        type="file"
                        accept=".wav,.flac,.mp3,audio/wav,audio/flac,audio/mpeg"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleAudioUpload(idx, f);
                        }}
                      />
                    </label>

                    {t.audioAssetId && (
                      <audio
                        controls
                        src={`/api/files/${t.audioAssetId}`}
                        className="h-9 max-w-xs"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Track Metadata */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Step 4: Track Metadata &amp; ISRC</h2>
            <div className="space-y-4">
              {tracks.map((t, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#111114] border border-[#2a2a2a] space-y-3"
                >
                  <div className="font-bold text-sm text-[#3b82f6]">
                    Track #{idx + 1}: {t.title || "Untitled"}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Primary Artist*"
                      value={t.primaryArtist}
                      onChange={(e) =>
                        setTracks((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, primaryArtist: e.target.value } : row
                          )
                        )
                      }
                      className="px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Featuring Artists"
                      value={t.featuringArtists}
                      onChange={(e) =>
                        setTracks((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, featuringArtists: e.target.value }
                              : row
                          )
                        )
                      }
                      className="px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-sm"
                    />
                    <input
                      type="text"
                      placeholder="ISRC (auto-assigned if blank)"
                      value={t.isrc}
                      onChange={(e) =>
                        setTracks((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, isrc: e.target.value } : row
                          )
                        )
                      }
                      className="px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Language"
                      value={t.language}
                      onChange={(e) =>
                        setTracks((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, language: e.target.value } : row
                          )
                        )
                      }
                      className="px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-sm"
                    />
                    <input
                      type="number"
                      placeholder="TikTok Preview Start (sec)"
                      value={t.previewStartSec}
                      onChange={(e) =>
                        setTracks((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, previewStartSec: Number(e.target.value) }
                              : row
                          )
                        )
                      }
                      className="px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs text-[#b0b0b8] px-2">
                      <input
                        type="checkbox"
                        checked={t.explicitContent}
                        onChange={(e) =>
                          setTracks((prev) =>
                            prev.map((row, i) =>
                              i === idx
                                ? { ...row, explicitContent: e.target.checked }
                                : row
                            )
                          )
                        }
                        className="accent-[#3b82f6]"
                      />
                      Explicit Lyrics
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Select Stores */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Store className="w-5 h-5 text-[#3b82f6]" /> Step 5: Select Digital Stores
              </h2>
              <button
                type="button"
                onClick={() =>
                  setSelectedStoreIds(
                    selectedStoreIds.length === allStores.length
                      ? []
                      : allStores.map((s) => s.id)
                  )
                }
                className="text-xs text-[#3b82f6] font-semibold hover:underline cursor-pointer"
              >
                {selectedStoreIds.length === allStores.length
                  ? "Deselect All"
                  : "Select All Stores"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allStores.map((store) => {
                const checked = selectedStoreIds.includes(store.id);
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() =>
                      setSelectedStoreIds((prev) =>
                        checked
                          ? prev.filter((id) => id !== store.id)
                          : [...prev, store.id]
                      )
                    }
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      checked
                        ? "bg-blue-500/15 border-[#3b82f6] text-white"
                        : "bg-[#111114] border-[#2a2a2a] text-[#b0b0b8]"
                    }`}
                  >
                    <div className="font-bold text-sm">{store.name}</div>
                    <div className="text-[11px] text-[#71717a]">{store.category}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6: Select Territories */}
        {step === 6 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#3b82f6]" /> Step 6: Territory Selection
            </h2>
            <label className="flex items-center gap-2.5 p-4 rounded-xl bg-[#111114] border border-[#2a2a2a] cursor-pointer">
              <input
                type="checkbox"
                checked={worldwide}
                onChange={(e) => setWorldwide(e.target.checked)}
                className="accent-[#3b82f6]"
              />
              <div>
                <div className="text-sm font-bold text-white">
                  Worldwide Distribution (All Supported Countries)
                </div>
                <div className="text-xs text-[#71717a]">
                  Recommended for maximum global reach across 150+ DSPs.
                </div>
              </div>
            </label>

            {!worldwide && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {TERRITORIES.map((country) => {
                  const active = territories.includes(country);
                  return (
                    <button
                      key={country}
                      type="button"
                      onClick={() =>
                        setTerritories((prev) =>
                          active
                            ? prev.filter((c) => c !== country)
                            : [...prev, country]
                        )
                      }
                      className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                        active
                          ? "bg-blue-500/15 border-[#3b82f6] text-white"
                          : "bg-[#111114] border-[#2a2a2a] text-[#b0b0b8]"
                      }`}
                    >
                      {country}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 7: Review Submission */}
        {step === 7 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Step 7: Review Release Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-[#111114] border border-[#2a2a2a] space-y-1.5">
                <div className="text-xs uppercase font-bold text-[#3b82f6]">Release Metadata</div>
                <p><strong>Title:</strong> {meta.title || "-"} {meta.version ? `(${meta.version})` : ""}</p>
                <p><strong>Type:</strong> {meta.releaseType}</p>
                <p><strong>Primary Artist:</strong> {meta.primaryArtist || "-"}</p>
                <p><strong>Label:</strong> {meta.recordLabelName}</p>
                <p><strong>Genre / Language:</strong> {meta.genre} / {meta.language}</p>
                <p><strong>Release Date:</strong> {meta.releaseDate || "As soon as approved"}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#111114] border border-[#2a2a2a] space-y-1.5">
                <div className="text-xs uppercase font-bold text-[#3b82f6]">Assets &amp; Delivery</div>
                <p><strong>Artwork:</strong> {artwork ? `${artwork.originalName} (${artwork.width}x${artwork.height})` : "Missing!"}</p>
                <p><strong>Tracks:</strong> {tracks.length} track(s)</p>
                <p><strong>Selected DSPs:</strong> {selectedStoreIds.length} store(s)</p>
                <p><strong>Territories:</strong> {worldwide ? "Worldwide" : territories.join(", ")}</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: Submit for Approval */}
        {step === 8 && (
          <div className="space-y-5 text-center py-6">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <h2 className="text-2xl font-extrabold">Step 8: Ready to Submit</h2>
            <p className="text-sm text-[#b0b0b8] max-w-lg mx-auto">
              Submitting sends your release to Goldex Quality Control for metadata,
              audio, artwork, and duplicate-asset verification before authorized DSP delivery.
            </p>
            <button
              type="button"
              onClick={handleSubmitRelease}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-sm cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? "Submitting..." : "Submit Release for Approval"}</span>
            </button>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111114] border border-[#2a2a2a] text-xs font-semibold disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          {step < 8 && (
            <button
              type="button"
              onClick={goNext}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              <span>{saving ? "Saving..." : "Save & Continue"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
