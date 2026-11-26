"use client";

import React, { useEffect, useState } from "react";
import { Building2, UserPlus, Users, Check, X } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface LabelItem {
  id: string;
  name: string;
  slug: string;
  country: string;
  defaultRevenueSharePercent: number;
  parentLabel: { name: string } | null;
  subLabels: Array<{ id: string; name: string }>;
  artists: Array<{ id: string; stageName: string; genre: string | null }>;
  members: Array<{ id: string; role: string; user: { name: string; email: string } }>;
  invitations: Array<{ id: string; invitedEmail: string; status: string; revenueSharePercent: number }>;
  _count: { releases: number; artists: number };
}

interface InvitationItem {
  id: string;
  status: string;
  revenueSharePercent: number;
  label: { id: string; name: string; country: string };
}

export default function LabelsPage() {
  const { showToast } = useToast();
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [myInvitations, setMyInvitations] = useState<InvitationItem[]>([]);
  const [subLabelName, setSubLabelName] = useState("");
  const [parentId, setParentId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLabelId, setInviteLabelId] = useState("");
  const [inviteShare, setInviteShare] = useState(80);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("LABEL_MANAGER");

  const load = async () => {
    const res = await fetch("/api/labels");
    const data = await res.json();
    const list = data.labels || [];
    setLabels(list);
    setMyInvitations(data.myInvitations || []);
    if (list[0] && !inviteLabelId) {
      setInviteLabelId(list[0].id);
      setParentId(list[0].id);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callAction = async (payload: Record<string, unknown>, successMsg: string) => {
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Action failed.", "error");
      return;
    }
    showToast(successMsg, "success");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Label &amp; Roster Management</h1>
        <p className="text-sm text-[#b0b0b8]">
          Manage parent labels, sub-labels, artist invitations, and team members.
        </p>
      </div>

      {myInvitations.length > 0 && (
        <div className="rounded-2xl bg-[#18181b] border border-blue-500/30 p-5 space-y-3">
          <h2 className="font-bold text-sm text-[#3b82f6]">
            Pending Label Invitations for You
          </h2>
          {myInvitations.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#111114]"
            >
              <div>
                <div className="font-semibold text-sm">{inv.label.name}</div>
                <div className="text-xs text-[#b0b0b8]">
                  Artist Share: {inv.revenueSharePercent}% &bull; Status: {inv.status}
                </div>
              </div>
              {inv.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      callAction(
                        {
                          action: "respond_invitation",
                          invitationId: inv.id,
                          decision: "ACCEPTED",
                        },
                        "Invitation accepted!"
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      callAction(
                        {
                          action: "respond_invitation",
                          invitationId: inv.id,
                          decision: "DECLINED",
                        },
                        "Invitation declined."
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 font-bold text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {labels.length === 0 ? (
        <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-8 text-center text-sm text-[#71717a]">
          You do not own or manage a record label yet. Register a Label Account or accept an invitation to manage multi-artist rosters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#3b82f6]" /> Create Sub-Label / Imprint
              </h3>
              <input
                type="text"
                placeholder="Sub-label name"
                value={subLabelName}
                onChange={(e) => setSubLabelName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              >
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>
                    Parent: {l.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!subLabelName.trim()) return;
                  callAction(
                    {
                      action: "create_label",
                      name: subLabelName,
                      parentLabelId: parentId || null,
                    },
                    "Sub-label created!"
                  );
                  setSubLabelName("");
                }}
                className="w-full py-2.5 rounded-xl bg-[#3b82f6] text-xs font-bold cursor-pointer"
              >
                Create Sub-Label
              </button>
            </div>

            <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" /> Invite Artist to Roster
              </h3>
              <input
                type="email"
                placeholder="Artist Email*"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={inviteLabelId}
                  onChange={(e) => setInviteLabelId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                >
                  {labels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={inviteShare}
                  onChange={(e) => setInviteShare(Number(e.target.value))}
                  className="w-20 px-2.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!inviteEmail.trim()) return;
                  callAction(
                    {
                      action: "invite_artist",
                      labelId: inviteLabelId,
                      invitedEmail: inviteEmail,
                      revenueSharePercent: inviteShare,
                    },
                    "Artist invitation sent!"
                  );
                  setInviteEmail("");
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer"
              >
                Send Invitation
              </button>
            </div>

            <div className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-5 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" /> Assign Team Member
              </h3>
              <input
                type="email"
                placeholder="Team member email*"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              />
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-sm"
              >
                <option value="LABEL_MANAGER">Label Manager</option>
                <option value="FINANCE_MANAGER">Finance Manager</option>
                <option value="CONTENT_MANAGER">Content Manager</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (!memberEmail.trim()) return;
                  callAction(
                    {
                      action: "add_member",
                      labelId: inviteLabelId,
                      email: memberEmail,
                      role: memberRole,
                    },
                    "Team member assigned!"
                  );
                  setMemberEmail("");
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-black text-xs font-bold cursor-pointer"
              >
                Assign Member
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {labels.map((l) => (
              <div
                key={l.id}
                className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-extrabold">{l.name}</h3>
                    <p className="text-xs text-[#71717a]">
                      {l.parentLabel ? `Sub-label of ${l.parentLabel.name} • ` : ""}
                      {l.country} &bull; {l._count.releases} release(s) &bull; {l._count.artists} artist(s)
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#3b82f6] bg-blue-500/10 px-3 py-1 rounded-full">
                    Default Label Cut: {l.defaultRevenueSharePercent}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#111114] border border-white/5">
                    <div className="font-bold text-white mb-2">Roster Artists</div>
                    {l.artists.length === 0 ? (
                      <p className="text-[#71717a]">No artists linked yet.</p>
                    ) : (
                      l.artists.map((a) => (
                        <div key={a.id} className="py-1 text-[#b0b0b8]">
                          &bull; {a.stageName} ({a.genre || "Indie"})
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#111114] border border-white/5">
                    <div className="font-bold text-white mb-2">Team Members</div>
                    {l.members.length === 0 ? (
                      <p className="text-[#71717a]">No team members assigned.</p>
                    ) : (
                      l.members.map((m) => (
                        <div key={m.id} className="py-1 text-[#b0b0b8]">
                          &bull; {m.user.name} ({m.role})
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#111114] border border-white/5">
                    <div className="font-bold text-white mb-2">Invitations</div>
                    {l.invitations.length === 0 ? (
                      <p className="text-[#71717a]">No invitations sent.</p>
                    ) : (
                      l.invitations.map((inv) => (
                        <div key={inv.id} className="py-1 flex items-center justify-between gap-2 text-[#b0b0b8]">
                          <span className="truncate">{inv.invitedEmail}</span>
                          <span className="text-[10px] font-bold text-[#3b82f6]">{inv.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
