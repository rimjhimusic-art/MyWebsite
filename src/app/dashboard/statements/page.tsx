"use client";

import React, { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";

interface StatementItem {
  id: string;
  periodMonth: string;
  totalStreams: number;
  grossAmount: number;
  netAmount: number;
  payableAmount: number;
  currency: string;
  status: string;
  generatedAt: string;
}

export default function StatementsPage() {
  const [statements, setStatements] = useState<StatementItem[]>([]);

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => setStatements(d.statements || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Monthly Royalty Statements</h1>
          <p className="text-sm text-[#b0b0b8]">
            Download itemized CSV reports or print official statements.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/analytics?format=csv"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3b82f6] text-xs font-bold text-white"
          >
            <Download className="w-4 h-4" /> Download Ledger CSV
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-xs font-bold cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2a2a2a] text-xs uppercase text-[#71717a]">
            <tr>
              <th className="p-4">Period</th>
              <th className="p-4">Streams</th>
              <th className="p-4">Gross</th>
              <th className="p-4">Net Payable</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {statements.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#71717a]">
                  Statements are generated automatically when monthly DSP batches are imported. Download the itemized ledger CSV above for existing entries.
                </td>
              </tr>
            ) : (
              statements.map((s) => (
                <tr key={s.id}>
                  <td className="p-4 font-bold">{s.periodMonth}</td>
                  <td className="p-4">{s.totalStreams.toLocaleString()}</td>
                  <td className="p-4">${s.grossAmount.toFixed(2)}</td>
                  <td className="p-4 font-bold text-emerald-400">
                    ${s.payableAmount.toFixed(2)} {s.currency}
                  </td>
                  <td className="p-4">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-[#3b82f6] font-bold">
                      {s.status}
                    </span>
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
