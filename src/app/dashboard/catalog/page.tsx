import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { getAccessibleLabelIds } from "@/lib/labels";

export default async function CatalogPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAdmin = isAdminRole(user.role);
  const labelIds = await getAccessibleLabelIds(user.id);

  const tracks = await prisma.track.findMany({
    where: isAdmin
      ? {}
      : {
          release: {
            OR: [
              { ownerUserId: user.id },
              ...(labelIds.length > 0 ? [{ labelId: { in: labelIds } }] : []),
            ],
          },
        },
    include: {
      release: {
        select: { id: true, title: true, releaseType: true, upc: true, status: true },
      },
      audioAsset: { select: { id: true, originalName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Music Catalog</h1>
        <p className="text-sm text-[#b0b0b8]">
          Track-level ISRC/UPC registry and playable audio masters.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-[#18181b] border border-[#2a2a2a]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2a2a2a] text-xs uppercase text-[#71717a]">
            <tr>
              <th className="p-4">Track Title</th>
              <th className="p-4">Release</th>
              <th className="p-4">ISRC</th>
              <th className="p-4">UPC</th>
              <th className="p-4">Status</th>
              <th className="p-4">Audio Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tracks.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#71717a]">
                  No tracks in catalog yet.{" "}
                  <Link href="/dashboard/upload" className="text-[#3b82f6] underline">
                    Upload your first release
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              tracks.map((t) => (
                <tr key={t.id}>
                  <td className="p-4">
                    <div className="font-bold text-white">{t.title}</div>
                    <div className="text-xs text-[#b0b0b8]">{t.primaryArtist}</div>
                  </td>
                  <td className="p-4 text-xs text-[#b0b0b8]">
                    {t.release.title} ({t.release.releaseType})
                  </td>
                  <td className="p-4 text-xs font-mono text-zinc-300">
                    {t.isrc || "Pending"}
                  </td>
                  <td className="p-4 text-xs font-mono text-[#71717a]">
                    {t.release.upc || "-"}
                  </td>
                  <td className="p-4">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-[#3b82f6]">
                      {t.release.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {t.audioAsset ? (
                      <audio controls src={`/api/files/${t.audioAsset.id}`} className="h-8 w-44" />
                    ) : (
                      <span className="text-xs text-[#71717a]">No audio file</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
