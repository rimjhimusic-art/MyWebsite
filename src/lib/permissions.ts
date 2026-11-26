import type { UserRole } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "release:create"
  | "release:edit_own"
  | "release:submit"
  | "release:review"
  | "release:approve"
  | "release:takedown"
  | "label:manage_own"
  | "label:manage_all"
  | "artist:manage_own"
  | "artist:manage_all"
  | "royalties:view_own"
  | "royalties:view_all"
  | "royalties:import"
  | "royalties:manage_splits"
  | "payments:request"
  | "payments:process"
  | "youtube:manage_own"
  | "youtube:review"
  | "vevo:submit"
  | "vevo:review"
  | "rights:manage_own"
  | "rights:resolve"
  | "tickets:create"
  | "tickets:manage_all"
  | "users:manage"
  | "cms:manage"
  | "integrations:manage"
  | "audit:view"
  | "settings:manage";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "dashboard:view",
    "release:create",
    "release:edit_own",
    "release:submit",
    "release:review",
    "release:approve",
    "release:takedown",
    "label:manage_own",
    "label:manage_all",
    "artist:manage_own",
    "artist:manage_all",
    "royalties:view_own",
    "royalties:view_all",
    "royalties:import",
    "royalties:manage_splits",
    "payments:request",
    "payments:process",
    "youtube:manage_own",
    "youtube:review",
    "vevo:submit",
    "vevo:review",
    "rights:manage_own",
    "rights:resolve",
    "tickets:create",
    "tickets:manage_all",
    "users:manage",
    "cms:manage",
    "integrations:manage",
    "audit:view",
    "settings:manage",
  ],
  ADMIN: [
    "dashboard:view",
    "release:review",
    "release:approve",
    "release:takedown",
    "label:manage_all",
    "artist:manage_all",
    "royalties:view_all",
    "royalties:import",
    "royalties:manage_splits",
    "payments:process",
    "youtube:review",
    "vevo:review",
    "rights:resolve",
    "tickets:manage_all",
    "users:manage",
    "cms:manage",
    "audit:view",
  ],
  LABEL_OWNER: [
    "dashboard:view",
    "release:create",
    "release:edit_own",
    "release:submit",
    "label:manage_own",
    "artist:manage_own",
    "royalties:view_own",
    "royalties:manage_splits",
    "payments:request",
    "youtube:manage_own",
    "vevo:submit",
    "rights:manage_own",
    "tickets:create",
  ],
  LABEL_MANAGER: [
    "dashboard:view",
    "release:create",
    "release:edit_own",
    "release:submit",
    "label:manage_own",
    "artist:manage_own",
    "royalties:view_own",
    "youtube:manage_own",
    "vevo:submit",
    "rights:manage_own",
    "tickets:create",
  ],
  ARTIST: [
    "dashboard:view",
    "release:create",
    "release:edit_own",
    "release:submit",
    "artist:manage_own",
    "royalties:view_own",
    "royalties:manage_splits",
    "payments:request",
    "youtube:manage_own",
    "vevo:submit",
    "rights:manage_own",
    "tickets:create",
  ],
  FINANCE_MANAGER: [
    "dashboard:view",
    "royalties:view_all",
    "royalties:import",
    "royalties:manage_splits",
    "payments:process",
    "tickets:manage_all",
    "audit:view",
  ],
  CONTENT_MANAGER: [
    "dashboard:view",
    "release:review",
    "release:approve",
    "release:takedown",
    "youtube:review",
    "vevo:review",
    "rights:resolve",
    "cms:manage",
    "tickets:manage_all",
  ],
  EDITOR: [
    "dashboard:view",
    "cms:manage",
    "tickets:manage_all",
  ],
};

export const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR",
  "FINANCE_MANAGER",
  "CONTENT_MANAGER",
];

export const CMS_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR",
  "CONTENT_MANAGER",
];

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  EDITOR: "CMS Editor",
  LABEL_OWNER: "Label Owner",
  LABEL_MANAGER: "Label Manager",
  ARTIST: "Artist",
  FINANCE_MANAGER: "Finance Manager",
  CONTENT_MANAGER: "Content Manager",
};
