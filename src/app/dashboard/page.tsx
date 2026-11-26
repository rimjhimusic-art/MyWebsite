"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Disc3,
  Music,
  Play,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  UploadCloud,
  ArrowRight,
  Activity,
} from "lucide-react";

interface OverviewData {
  metrics: {
    totalReleases: number;
    totalTracks: number;
    totalStreams: number;
    totalRevenue: number;
    monthlyRevenue: number;
    monthlyPeriod: string;
    pendingReleases: number;
    approvedReleases: number;
    rejectedReleases: number;
    draftReleases: number;
  };
  latestActivity: Array<{
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    release: { id: string; title: string };
    actor: { name: string; role: string };
  }>;
}

export default function DashboardOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-[#71717a] py-12 text-center">Loading real-time catalog metrics...</div>;
  }

  const m = data?.metrics;

  const cards = [
    { label: "Total Releases", value: m?.totalReleases ?? 0, icon: Disc3, color: "text-blue-400" },
    { label: "Total Tracks", value: m?.totalTracks ?? 0, icon: Music, color: "text-indigo-400" },
    { label: "Total Streams", value: (m?.totalStreams ?? 0).toLocaleString(), icon: Play, color: "text-emerald-400" },
    { label: "Total Revenue", value: `$${(m?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-amber-400" },
    { label: `Monthly Revenue (${m?.monthlyPeriod || "-"})`, value: `$${(m?.monthlyRevenue ?? 0).toFixed(2)}`, icon: Calendar, color: "text-cyan-400" },
    { label: "Pending Releases", value: m?.pendingReleases ?? 0, icon: Clock, color: "text-yellow-400" },
    { label: "Approved / Live", value: m?.approvedReleases ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Rejected Releases", value: m?.rejectedReleases ?? 0, icon: XCircle, color: "text-red-400" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Distribution Overview</h1>
          <p className="text-sm text-[#b0b0b8] mt-1">
            Live metrics computed directly from your releases, tracks, and verified royalty statements.
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload New Music</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 flex items-start justify-between"
            >
              <div>
                <p className="text-xs font-medium text-[#71717a]">{c.label}</p>
                <div className="text-2xl font-extrabold text-white mt-2">
                  {c.value}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl bg-white/5 ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#3b82f6]" /> Latest Activity
            </h2>
            <Link
              href="/dashboard/releases"
              className="text-xs text-[#3b82f6] hover:underline flex items-center gap-1"
            >
              View All Releases <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {!data?.latestActivity?.length ? (
            <div className="py-10 text-center text-sm text-[#71717a]">
              No release activity yet. Create your first release draft to begin!
            </div>
          ) : (
            <div className="space-y-3">
              {data.latestActivity.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl bg-[#111114] border border-white/5 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {act.release.title} &mdash;{" "}
                      <span className="text-[#3b82f6]">{act.action.replaceAll("_", " ")}</span>
                    </div>
                    <p className="text-xs text-[#b0b0b8] mt-0.5">{act.details}</p>
                  </div>
                  <span className="text-[11px] text-[#71717a] shrink-0">
                    {new Date(act.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4">
          <h2 className="text-lg font-bold">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2.5">
            {[
              { href: "/dashboard/upload", title: "Launch 8-Step Release Wizard", desc: "Upload WAV/FLAC audio, 1:1 artwork, metadata & DSPs" },
              { href: "/dashboard/royalties", title: "Configure 100% Revenue Splits", desc: "Manage Label, Artist & Producer percentages" },
              { href: "/dashboard/vevo", title: "Submit Official VEVO Video", desc: "Upload music video & metadata for VEVO review" },
              { href: "/dashboard/youtube", title: "YouTube OAC & Content ID", desc: "Request Official Artist Channel or Content ID protection" },
              { href: "/dashboard/labels", title: "Manage Label & Artists", desc: "Invite artists, approve roster & sub-labels" },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="p-3.5 rounded-xl bg-[#111114] border border-white/5 hover:border-[#3b82f6] transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{q.title}</div>
                  <div className="text-xs text-[#71717a]">{q.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#71717a] shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
