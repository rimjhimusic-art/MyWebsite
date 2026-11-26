import React from "react";
import Link from "next/link";
import { ExternalLink, Link2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleLabelIds } from "@/lib/labels";

export default async function SmartLinksPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const labelIds = await getAccessibleLabelIds(user.id);
  const releases = await prisma.release.findMany({
    where: {
      smartLinkSlug: { not: null },
      OR: [
        { ownerUserId: user.id },
        ...(labelIds.length > 0 ? [{ labelId: { in: labelIds } }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Smart Links</h1>
        <p className="text-sm text-[#b0b0b8]">
          Shareable DSP landing pages for your releases across Spotify, Apple Music, YouTube, and JioSaavn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {releases.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-white">
                <Link2 className="w-4 h-4 text-[#3b82f6]" />
                <span>{r.title}</span>
              </div>
              <p className="text-xs text-[#b0b0b8] mt-1">
                {r.primaryArtist} &bull; /release/{r.smartLinkSlug}
              </p>
            </div>
            <Link
              href={`/release/${r.smartLinkSlug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3b82f6] text-xs font-bold text-white shrink-0"
            >
              <span>Open Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
