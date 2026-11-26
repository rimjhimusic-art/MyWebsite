"use client";

import React, { useEffect, useState } from "react";
import { Plus, CheckCircle2, User } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface ArtistItem {
  id: string;
  stageName: string;
  legalName: string | null;
  genre: string | null;
  country: string;
  verified: boolean;
  label: { name: string } | null;
  _count: { releases: number };
}

export default function ArtistsPage() {
  const { showToast } = useToast();
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [form, setForm] = useState({
    stageName: "",
    legalName: "",
    genre: "",
    country: "India",
    bio: "",
  });

  const load = async () => {
    const res = await fetch("/api/artists");
    const data = await res.json();
    setArtists(data.artists || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to create artist.", "error");
      return;
    }
    showToast("Artist profile created!", "success");
    setForm({ stageName: "", legalName: "", genre: "", country: "India", bio: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">My Artists</h1>
        <p className="text-sm text-[#b0b0b8]">
          Manage artist profiles and roster members authorized under your account or label.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-4 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3 h-fit"
        >
          <h2 className="font-bold text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#3b82f6]" /> Add Artist Profile
          </h2>
          <input
            type="text"
            required
            placeholder="Stage Name*"
            value={form.stageName}
            onChange={(e) => setForm({ ...form, stageName: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="text"
            placeholder="Legal Name"
            value={form.legalName}
            onChange={(e) => setForm({ ...form, legalName: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="text"
            placeholder="Primary Genre"
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <input
            type="text"
            placeholder="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <textarea
            rows={3}
            placeholder="Artist bio..."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm resize-none"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-xs cursor-pointer"
          >
            Create Artist
          </button>
        </form>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
          {artists.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white">
                  <User className="w-4 h-4 text-[#3b82f6]" />
                  <span>{a.stageName}</span>
                  {a.verified && <CheckCircle2 className="w-4 h-4 text-[#3b82f6]" />}
                </div>
                <span className="text-xs text-[#71717a]">{a._count.releases} release(s)</span>
              </div>
              <p className="text-xs text-[#b0b0b8]">
                {a.genre || "Independent"} &bull; {a.country}
              </p>
              {a.label && (
                <p className="text-xs text-[#3b82f6]">Label: {a.label.name}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
