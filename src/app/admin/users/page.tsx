"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  country: string;
  createdAt: string;
  _count: { releases: number; ownedLabels: number; artists: number };
}

const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "LABEL_OWNER",
  "LABEL_MANAGER",
  "ARTIST",
  "FINANCE_MANAGER",
  "CONTENT_MANAGER",
];

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/users");
    const d = await res.json();
    setUsers(d.users || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateUser = async (userId: string, patch: { role?: string; status?: string }) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Update failed.", "error");
      return;
    }
    showToast("User updated!", "success");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Users, Roles &amp; Account Approvals</h1>
        <p className="text-sm text-[#b0b0b8]">
          Assign RBAC roles, approve accounts, or suspend non-compliant accounts.
        </p>
      </div>

      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2a2a2a] text-xs uppercase text-[#71717a]">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Catalog</th>
              <th className="p-4">Role</th>
              <th className="p-4">Account Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-4">
                  <div className="font-bold text-white">{u.name}</div>
                  <div className="text-xs text-[#b0b0b8]">{u.email} &bull; {u.country}</div>
                </td>
                <td className="p-4 text-xs text-[#b0b0b8]">
                  {u._count.releases} release(s) &bull; {u._count.ownedLabels} label(s)
                </td>
                <td className="p-4">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    className="px-3 py-1.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <select
                    value={u.status}
                    onChange={(e) => updateUser(u.id, { status: e.target.value })}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                      u.status === "APPROVED"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : u.status === "SUSPENDED"
                        ? "bg-red-500/10 border-red-500/30 text-red-300"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
