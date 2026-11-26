"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Send } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  method: string;
  accountSummary: string;
  referenceNumber: string | null;
  status: string;
  createdAt: string;
}

export default function PaymentsPage() {
  const { showToast } = useToast();
  const [balance, setBalance] = useState(0);
  const [earned, setEarned] = useState(0);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [accountSummary, setAccountSummary] = useState("");

  const load = async () => {
    const res = await fetch("/api/payments");
    const d = await res.json();
    setBalance(d.availableBalance || 0);
    setEarned(d.earnedTotal || 0);
    setPayments(d.payments || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        method,
        accountSummary,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Failed to request payout.", "error");
      return;
    }
    showToast("Payout request submitted to Finance team!", "success");
    setAmount("");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Payments &amp; Withdrawals</h1>
        <p className="text-sm text-[#b0b0b8]">
          Withdraw verified royalty earnings and inspect payout status.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6">
          <p className="text-xs text-[#71717a]">Total Verified Royalties</p>
          <p className="text-3xl font-extrabold text-white mt-1">${earned.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl bg-[#18181b] border border-emerald-500/30 p-6">
          <p className="text-xs text-[#71717a]">Available for Payout</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-1">
            ${balance.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleRequest}
          className="lg:col-span-4 rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-3 h-fit"
        >
          <h2 className="font-bold text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#3b82f6]" /> Request Payout
          </h2>
          <input
            type="number"
            step="0.01"
            min="1"
            required
            placeholder="Amount (USD)*"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          >
            <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS/ACH)</option>
            <option value="UPI">UPI</option>
            <option value="PAYPAL">PayPal</option>
            <option value="WIRE">International Wire</option>
          </select>
          <input
            type="text"
            required
            placeholder="Account / UPI / PayPal Details*"
            value={accountSummary}
            onChange={(e) => setAccountSummary(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
          />
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Request Withdrawal
          </button>
        </form>

        <div className="lg:col-span-8 rounded-2xl bg-[#18181b] border border-[#2a2a2a] overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#2a2a2a] text-xs uppercase text-[#71717a]">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Method</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#71717a]">
                    No payout requests yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4 text-xs text-[#b0b0b8]">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-xs">
                      <div className="font-semibold text-white">{p.method}</div>
                      <div className="text-[#71717a]">{p.accountSummary}</div>
                    </td>
                    <td className="p-4 font-bold text-white">${p.amount.toFixed(2)}</td>
                    <td className="p-4 text-xs font-mono text-[#71717a]">
                      {p.referenceNumber || "-"}
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-[#3b82f6]">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
