import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disc3, ExternalLink, Music } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function PublicSmartLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const release = await prisma.release.findUnique({
    where: { smartLinkSlug: slug },
    include: {
      artworkAsset: true,
      tracks: { orderBy: { trackNumber: "asc" } },
      stores: { where: { selected: true }, include: { store: true } },
    },
  });

  if (!release) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#18181b] border border-[#2a2a2a] overflow-hidden shadow-2xl">
        <div className="p-6 text-center bg-gradient-to-b from-blue-900/30 to-transparent">
          {release.artworkAsset ? (
            <img
              src={`/api/files/${release.artworkAsset.id}`}
              alt={release.title}
              className="w-48 h-48 mx-auto rounded-2xl object-cover border border-white/10 shadow-xl"
            />
          ) : (
            <div className="w-48 h-48 mx-auto rounded-2xl bg-[#111114] border border-[#2a2a2a] flex items-center justify-center">
              <Disc3 className="w-16 h-16 text-[#3b82f6]" />
            </div>
          )}

          <h1 className="mt-5 text-2xl font-extrabold">{release.title}</h1>
          <p className="text-sm text-[#b0b0b8] mt-1">
            {release.primaryArtist} &bull; {release.releaseType}
          </p>
          <p className="text-xs text-[#71717a] mt-1">
            {release.recordLabelName} &bull; {release.genre}
          </p>
        </div>

        <div className="p-6 pt-2 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#71717a] mb-2">
            Available Digital Stores
          </div>
          {release.stores.map((rs) => (
            <div
              key={rs.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#111114] border border-[#2a2a2a]"
            >
              <div className="flex items-center gap-2.5">
                <Music className="w-4 h-4 text-[#3b82f6]" />
                <span className="text-sm font-semibold">{rs.store.name}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-[#b0b0b8]">
                {rs.deliveryStatus === "LIVE" ? "Listen" : rs.deliveryStatus}
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          ))}

          <div className="pt-4 text-center">
            <Link href="/" className="text-xs text-[#3b82f6] hover:underline">
              Distributed via Goldex Media Network
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
