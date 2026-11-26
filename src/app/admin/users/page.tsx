"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, UserPlus, Sliders, Trash2, Lock, X, Check } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import {
  ADMIN_PRESETS,
  CMS_EDITABLE_SECTIONS,
  PERMISSION_MATRIX_GROUPS,
  type Permission,
} from "@/lib/permissions";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  country: string;
  adminPreset: string | null;
  permissions: Permission[];
  allowedSections: string[] | null;
  createdAt: string;
  _count: {
    releases: number;
    ownedLabels: number;
    artists: number;
    activities?: number;
    royaltyBatches?: number;
    mediaAssets?: number;
  };
}

const ASSIGNABLE_ROLES = [
  "ADMIN",
  "EDITOR",
  "CONTENT_MANAGER",
  "FINANCE_MANAGER",
  "LABEL_OWNER",
  "LABEL_MANAGER",
  "ARTIST",
];

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPermsUser, setEditingPermsUser] = useState<UserRow | null>(null);
  const [permSelection, setPermSelection] = useState<Permission[]>([]);
  const [presetSelection, setPresetSelection] = useState<string>("CUSTOM_ADMIN");
  const [sectionsSelection, setSectionsSelection] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EDITOR",
    adminPreset: "CONTENT_EDITOR",
    permissions: ADMIN_PRESETS.find((p) => p.key === "CONTENT_EDITOR")?.permissions || ([] as Permission[]),
    allowedSections: [] as string[],
  });

  const load = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users || []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateUser = async (
    userId: string,
    patch: {
      role?: string;
      status?: string;
      adminPreset?: string | null;
      permissions?: Permission[] | null;
      allowedSections?: string[] | null;
    }
  ) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Update failed.", "error");
      return false;
    }
    showToast("User & permissions updated!", "success");
    await load();
    return true;
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Failed to create admin user.", "error");
      return;
    }
    showToast(`Created ${createForm.adminPreset} account for ${createForm.email}!`, "success");
    setShowCreate(false);
    setCreateForm({
      name: "",
      email: "",
      password: "",
      role: "EDITOR",
      adminPreset: "CONTENT_EDITOR",
      permissions: ADMIN_PRESETS.find((p) => p.key === "CONTENT_EDITOR")?.permissions || [],
      allowedSections: [],
    });
    load();
  };

  const handleDeleteUser = async (u: UserRow) => {
    if (!window.confirm(`Delete account "${u.email}" (${u.role})? Linked admin activity records, if any, will be migrated to the Primary Super Admin.`)) {
      return;
    }
    const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(u.id)}&migrate=true`, {
      method: "DELETE",
    });
    const d = await res.json();
    if (!res.ok) {
      showToast(d.error || "Delete failed.", "error");
      return;
    }
    showToast(`Deleted user ${u.email}.`, "success");
    load();
  };

  const openPermEditor = (u: UserRow) => {
    setEditingPermsUser(u);
    setPermSelection(u.permissions || []);
    setPresetSelection(u.adminPreset || "CUSTOM_ADMIN");
    setSectionsSelection(u.allowedSections || []);
  };

  const applyPreset = (
    presetKey: string,
    target: "create" | "edit"
  ) => {
    const spec = ADMIN_PRESETS.find((p) => p.key === presetKey);
    if (!spec) return;
    if (target === "create") {
      setCreateForm((prev) => ({
        ...prev,
        adminPreset: spec.key,
        role: spec.role,
        permissions: [...spec.permissions],
        allowedSections: spec.key === "WEBSITE_EDITOR" ? ["home"] : [],
      }));
    } else {
      setPresetSelection(spec.key);
      setPermSelection([...spec.permissions]);
      if (spec.key === "WEBSITE_EDITOR" && sectionsSelection.length === 0) {
        setSectionsSelection(["home"]);
      } else if (spec.key !== "WEBSITE_EDITOR") {
        setSectionsSelection([]);
      }
    }
  };

  const togglePerm = (list: Permission[], setList: (v: Permission[]) => void, key: Permission) => {
    setList(list.includes(key) ? list.filter((p) => p !== key) : [...list, key]);
  };

  const toggleSection = (list: string[], setList: (v: string[]) => void, slug: string) => {
    setList(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Users, Roles &amp; Granular Permissions</h1>
          <p className="text-sm text-[#b0b0b8]">
            Manage Admin sub-accounts, custom View/Add/Edit/Delete/Publish permissions, and creator approvals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((p) => !p)}
          data-testid="toggle-create-admin-btn"
          className="px-4 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Create Sub-Admin / Role Account
        </button>
      </div>

      {/* Create Sub-Admin Modal / Card */}
      {showCreate && (
        <form
          onSubmit={handleCreateAdmin}
          className="rounded-2xl bg-[#18181b] border border-[#3b82f6]/50 p-6 space-y-5 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3b82f6]" /> Create New Admin / Team Login
            </h2>
            <button type="button" onClick={() => setShowCreate(false)} className="text-[#71717a] hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Full Name*"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <input
              type="email"
              required
              placeholder="Login Email*"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (min 8 chars)*"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="px-3.5 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#b0b0b8] uppercase tracking-wider mb-2">
              1. Pick a Role Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ADMIN_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyPreset(preset.key, "create")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    createForm.adminPreset === preset.key
                      ? "bg-blue-500/15 border-[#3b82f6] text-white"
                      : "bg-[#0f0f0f] border-[#2a2a2a] text-[#b0b0b8] hover:border-zinc-600"
                  }`}
                >
                  <div className="font-bold text-xs text-white">{preset.label}</div>
                  <div className="text-[11px] text-[#71717a] mt-0.5">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#b0b0b8] uppercase tracking-wider mb-2">
              2. Fine-Tune Module Permissions (Enforced Server-Side)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PERMISSION_MATRIX_GROUPS.map((grp) => (
                <div key={grp.module} className="p-3.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-2">
                  <div className="text-xs font-bold text-white">{grp.module}</div>
                  <div className="flex flex-wrap gap-2">
                    {grp.actions.map((act) => {
                      const checked = createForm.permissions.includes(act.key);
                      return (
                        <button
                          key={act.key}
                          type="button"
                          onClick={() =>
                            togglePerm(
                              createForm.permissions,
                              (perms) => setCreateForm({ ...createForm, permissions: perms, adminPreset: "CUSTOM_ADMIN" }),
                              act.key
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 border cursor-pointer ${
                            checked
                              ? "bg-[#3b82f6]/20 border-[#3b82f6] text-blue-300"
                              : "bg-[#18181b] border-[#2a2a2a] text-[#71717a]"
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                          {act.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#b0b0b8] uppercase tracking-wider mb-2">
              3. Optional Section Restriction (Leave empty for all CMS pages)
            </label>
            <div className="flex flex-wrap gap-2">
              {CMS_EDITABLE_SECTIONS.map((sec) => {
                const selected = createForm.allowedSections.includes(sec.slug);
                return (
                  <button
                    key={sec.slug}
                    type="button"
                    onClick={() =>
                      toggleSection(
                        createForm.allowedSections,
                        (secs) => setCreateForm({ ...createForm, allowedSections: secs }),
                        sec.slug
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                      selected
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                        : "bg-[#0f0f0f] border-[#2a2a2a] text-[#71717a]"
                    }`}
                  >
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer">
              Create Admin Account
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#2a2a2a] text-xs uppercase text-[#71717a]">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Role / Preset</th>
              <th className="p-4">Permissions</th>
              <th className="p-4">Account Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => {
              const isSuperAdmin = u.role === "SUPER_ADMIN";
              return (
                <tr key={u.id}>
                  <td className="p-4">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {isSuperAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                          <Lock className="w-2.5 h-2.5" /> Primary Super Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#b0b0b8]">{u.email} &bull; {u.country}</div>
                    <div className="text-[11px] text-[#71717a]">
                      {u._count.releases} release(s) &bull; {u._count.ownedLabels} label(s)
                    </div>
                  </td>

                  <td className="p-4">
                    {isSuperAdmin ? (
                      <span className="text-xs font-bold text-amber-300">SUPER_ADMIN</span>
                    ) : (
                      <div className="space-y-1">
                        <select
                          value={u.role}
                          onChange={(e) => updateUser(u.id, { role: e.target.value })}
                          className="px-3 py-1.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        {u.adminPreset && (
                          <div className="text-[10px] text-[#3b82f6] font-semibold">
                            Preset: {u.adminPreset}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="p-4 text-xs text-[#b0b0b8]">
                    {isSuperAdmin ? (
                      <span className="text-emerald-300 font-semibold">Unrestricted Full Access</span>
                    ) : (
                      <div className="space-y-1">
                        <div>{u.permissions?.length || 0} permission(s)</div>
                        {u.allowedSections && u.allowedSections.length > 0 && (
                          <div className="text-[10px] text-emerald-400">
                            Sections: {u.allowedSections.join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="p-4">
                    {isSuperAdmin ? (
                      <span className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-emerald-500/10 border-emerald-500/30 text-emerald-300 inline-block">
                        APPROVED (Protected)
                      </span>
                    ) : (
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
                        <option value="SUSPENDED">DISABLED / SUSPENDED</option>
                      </select>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    {!isSuperAdmin && (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPermEditor(u)}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" /> Permissions
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 cursor-pointer"
                          title="Delete User"
                          aria-label={`Delete ${u.email}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Permissions Modal */}
      {editingPermsUser && (
        <div
          className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingPermsUser(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">
                  Edit Permissions: {editingPermsUser.name} ({editingPermsUser.email})
                </h3>
                <p className="text-xs text-[#b0b0b8]">Changes apply immediately and are enforced server-side.</p>
              </div>
              <button type="button" onClick={() => setEditingPermsUser(null)} className="text-[#71717a] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {ADMIN_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key, "edit")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                    presetSelection === p.key
                      ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                      : "bg-[#0f0f0f] border-[#2a2a2a] text-[#b0b0b8]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PERMISSION_MATRIX_GROUPS.map((grp) => (
                <div key={grp.module} className="p-3.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] space-y-2">
                  <div className="text-xs font-bold text-white">{grp.module}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {grp.actions.map((act) => {
                      const checked = permSelection.includes(act.key);
                      return (
                        <button
                          key={act.key}
                          type="button"
                          onClick={() => togglePerm(permSelection, setPermSelection, act.key)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 border cursor-pointer ${
                            checked
                              ? "bg-[#3b82f6]/20 border-[#3b82f6] text-blue-300"
                              : "bg-[#18181b] border-[#2a2a2a] text-[#71717a]"
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                          {act.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs font-bold text-[#b0b0b8] mb-2">Allowed CMS Sections (Optional):</div>
              <div className="flex flex-wrap gap-2">
                {CMS_EDITABLE_SECTIONS.map((sec) => {
                  const selected = sectionsSelection.includes(sec.slug);
                  return (
                    <button
                      key={sec.slug}
                      type="button"
                      onClick={() => toggleSection(sectionsSelection, setSectionsSelection, sec.slug)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        selected
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                          : "bg-[#0f0f0f] border-[#2a2a2a] text-[#71717a]"
                      }`}
                    >
                      {sec.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPermsUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await updateUser(editingPermsUser.id, {
                    adminPreset: presetSelection,
                    permissions: permSelection,
                    allowedSections: sectionsSelection.length > 0 ? sectionsSelection : null,
                  });
                  if (ok) setEditingPermsUser(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-bold cursor-pointer"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
