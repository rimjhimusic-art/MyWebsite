"use client";

import React, { useEffect, useState } from "react";
import { Download, Printer, BarChart3 } from "lucide-react";

interface AnalyticsData {
  totalStreams: number;
  totalRevenue: number;
  topTracks: Array<{ title: string; streams: number; revenue: number }>;
  platforms: Array<{ name: string; streams: number; revenue: number }>;
  countries: Array<{ country: string; streams: number; revenue: number }>;
  timeline: Array<{ date: string; streams: number; revenue: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const res = await fetch(`/api/analytics?${qs.toString()}`);
    const d = await res.json();
    setData(d);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxPlatformStreams = Math.max(
    1,
    ...(data?.platforms.map((p) => p.streams) || [1])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#3b82f6]" /> Performance Analytics
          </h1>
          <p className="text-sm text-[#b0b0b8]">
            Interactive streams, revenue trends, top tracks, platforms, and countries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs"
          />
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-[#3b82f6] text-xs font-bold text-white cursor-pointer"
          >
            Apply Range
          </button>
          <a
            href={`/api/analytics?format=csv${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6">
          <p className="text-xs text-[#71717a]">Filtered Total Streams</p>
          <p className="text-3xl font-extrabold mt-1">
            {(data?.totalStreams ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6">
          <p className="text-xs text-[#71717a]">Filtered Net Revenue</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-1">
            ${(data?.totalRevenue ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4">
          <h2 className="font-bold text-base">Platform Performance</h2>
          {!data?.platforms.length ? (
            <p className="text-sm text-[#71717a]">No platform data in selected range.</p>
          ) : (
            <div className="space-y-3">
              {data.platforms.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-white">{p.name}</span>
                    <span className="text-[#b0b0b8]">
                      {p.streams.toLocaleString()} streams &bull; ${p.revenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#111114] overflow-hidden">
                    <div
                      className="h-full bg-[#3b82f6] rounded-full"
                      style={{
                        width: `${Math.max(4, (p.streams / maxPlatformStreams) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4">
          <h2 className="font-bold text-base">Top-Performing Tracks &amp; Countries</h2>
          <div className="space-y-2.5">
            {data?.topTracks.map((t) => (
              <div
                key={t.title}
                className="flex justify-between p-3 rounded-xl bg-[#111114] text-xs"
              >
                <span className="font-bold text-white">{t.title}</span>
                <span className="text-emerald-400">
                  {t.streams.toLocaleString()} streams (${t.revenue.toFixed(2)})
                </span>
              </div>
            ))}
            {data?.countries.map((c) => (
              <div
                key={c.country}
                className="flex justify-between p-3 rounded-xl bg-[#111114] text-xs"
              >
                <span className="text-[#b0b0b8]">Country: {c.country}</span>
                <span className="text-[#3b82f6]">
                  {c.streams.toLocaleString()} streams
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
