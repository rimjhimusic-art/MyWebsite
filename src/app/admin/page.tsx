"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Disc3,
  Clock,
  DollarSign,
  LifeBuoy,
  ShieldAlert,
  Video,
  Tv,
  ArrowRight,
} from "lucide-react";

interface AdminOverview {
  stats: {
    totalUsers: number;
    totalArtists: number;
    totalLabels: number;
    totalReleases: number;
    pendingReleases: number;
    liveReleases: number;
    openTickets: number;
    pendingPayouts: number;
    totalStreams: number;
    totalNetRevenue: number;
    openClaims: number;
    pendingVevo: number;
    pendingYoutube: number;
  };
  recentLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    actor: { name: string; role: string } | null;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => setData(d));
  }, []);

  const s = data?.stats;
  const cards = [
    { label: "Total Users", value: s?.totalUsers ?? 0, icon: Users, href: "/admin/users" },
    { label: "Artists / Labels", value: `${s?.totalArtists ?? 0} / ${s?.totalLabels ?? 0}`, icon: Users, href: "/admin/users" },
    { label: "Pending Releases", value: s?.pendingReleases ?? 0, icon: Clock, href: "/admin/releases" },
    { label: "Total / Live Releases", value: `${s?.totalReleases ?? 0} / ${s?.liveReleases ?? 0}`, icon: Disc3, href: "/admin/releases" },
    { label: "Net Royalties Ledger", value: `$${(s?.totalNetRevenue ?? 0).toFixed(2)}`, icon: DollarSign, href: "/admin/royalties" },
    { label: "Pending Payouts", value: s?.pendingPayouts ?? 0, icon: DollarSign, href: "/admin/royalties" },
    { label: "Open Rights Claims", value: s?.openClaims ?? 0, icon: ShieldAlert, href: "/admin/services" },
    { label: "VEVO / YouTube Queue", value: `${s?.pendingVevo ?? 0} / ${s?.pendingYoutube ?? 0}`, icon: Video, href: "/admin/services" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">Super Admin Control Center</h1>
        <p className="text-sm text-[#b0b0b8]">
          Platform-wide catalog approvals, RBAC management, verified royalty imports, and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] hover:border-[#3b82f6] p-5 flex items-start justify-between transition-colors"
            >
              <div>
                <p className="text-xs text-[#71717a]">{c.label}</p>
                <p className="text-2xl font-extrabold mt-2">{c.value}</p>
              </div>
              <Icon className="w-5 h-5 text-[#3b82f6]" />
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">Recent Platform Audit Logs</h2>
            <Link href="/admin/settings" className="text-xs text-[#3b82f6] flex items-center gap-1">
              Full Logs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {data?.recentLogs?.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-[#111114] border border-white/5 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-white">{log.action}</span>
                <span className="text-[#71717a]"> &bull; {log.entityType}</span>
                {log.actor && (
                  <span className="text-[#3b82f6]"> by {log.actor.name}</span>
                )}
              </div>
              <span className="text-[#71717a]">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3">
          <h2 className="font-bold text-base">Operational Queues</h2>
          <Link
            href="/admin/releases"
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#111114] hover:border-[#3b82f6] border border-white/5 text-sm"
          >
            <span className="flex items-center gap-2"><Disc3 className="w-4 h-4 text-[#3b82f6]" /> Review Pending Releases</span>
            <span className="font-bold text-amber-300">{s?.pendingReleases ?? 0}</span>
          </Link>
          <Link
            href="/admin/support"
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#111114] hover:border-[#3b82f6] border border-white/5 text-sm"
          >
            <span className="flex items-center gap-2"><LifeBuoy className="w-4 h-4 text-emerald-400" /> Open Support Tickets</span>
            <span className="font-bold text-emerald-300">{s?.openTickets ?? 0}</span>
          </Link>
          <Link
            href="/admin/services"
            className="flex items-center justify-between p-3.5 rounded-xl bg-[#111114] hover:border-[#3b82f6] border border-white/5 text-sm"
          >
            <span className="flex items-center gap-2"><Tv className="w-4 h-4 text-red-400" /> YouTube &amp; VEVO Reviews</span>
            <span className="font-bold text-red-300">{(s?.pendingVevo ?? 0) + (s?.pendingYoutube ?? 0)}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
