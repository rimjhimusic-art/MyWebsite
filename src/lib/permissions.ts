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
  | "users:view"
  | "users:add"
  | "users:edit"
  | "users:delete"
  | "users:manage"
  | "cms:view"
  | "cms:add"
  | "cms:edit"
  | "cms:delete"
  | "cms:publish"
  | "cms:manage"
  | "media:view"
  | "media:add"
  | "media:edit"
  | "media:delete"
  | "media:manage"
  | "music:view"
  | "music:add"
  | "music:edit"
  | "music:delete"
  | "music:publish"
  | "music:manage"
  | "settings:view"
  | "settings:edit"
  | "settings:manage"
  | "integrations:manage"
  | "audit:view";

export const ALL_PERMISSIONS: Permission[] = [
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
  "users:view",
  "users:add",
  "users:edit",
  "users:delete",
  "users:manage",
  "cms:view",
  "cms:add",
  "cms:edit",
  "cms:delete",
  "cms:publish",
  "cms:manage",
  "media:view",
  "media:add",
  "media:edit",
  "media:delete",
  "media:manage",
  "music:view",
  "music:add",
  "music:edit",
  "music:delete",
  "music:publish",
  "music:manage",
  "settings:view",
  "settings:edit",
  "settings:manage",
  "integrations:manage",
  "audit:view",
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
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
    "users:view",
    "users:add",
    "users:edit",
    "users:delete",
    "users:manage",
    "cms:view",
    "cms:add",
    "cms:edit",
    "cms:delete",
    "cms:publish",
    "cms:manage",
    "media:view",
    "media:add",
    "media:edit",
    "media:delete",
    "media:manage",
    "music:view",
    "music:add",
    "music:edit",
    "music:delete",
    "music:publish",
    "music:manage",
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
    "music:view",
    "music:edit",
    "music:publish",
    "cms:view",
    "cms:add",
    "cms:edit",
    "cms:delete",
    "cms:publish",
    "cms:manage",
    "tickets:manage_all",
  ],
  EDITOR: [
    "dashboard:view",
    "cms:view",
    "cms:add",
    "cms:edit",
    "cms:delete",
    "cms:publish",
    "cms:manage",
    "media:view",
    "media:add",
    "media:edit",
    "media:delete",
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

export interface AdminPresetSpec {
  key: string;
  label: string;
  description: string;
  role: UserRole;
  permissions: Permission[];
}

export const ADMIN_PRESETS: AdminPresetSpec[] = [
  {
    key: "MUSIC_MANAGER",
    label: "Music Manager",
    description: "Can view, review, edit, and publish songs, releases, artists, and VEVO/YouTube items.",
    role: "CONTENT_MANAGER",
    permissions: [
      "dashboard:view",
      "music:view",
      "music:add",
      "music:edit",
      "music:publish",
      "release:review",
      "release:approve",
      "artist:manage_all",
      "youtube:review",
      "vevo:review",
    ],
  },
  {
    key: "CONTENT_EDITOR",
    label: "Content Editor",
    description: "Can view, add, and edit website text, pages, artists, services, and navigation (drafts).",
    role: "EDITOR",
    permissions: ["dashboard:view", "cms:view", "cms:add", "cms:edit", "media:view"],
  },
  {
    key: "MEDIA_MANAGER",
    label: "Media Manager",
    description: "Can view, upload, update, and manage images, banners, videos, and store logos.",
    role: "EDITOR",
    permissions: ["dashboard:view", "media:view", "media:add", "media:edit", "media:delete", "media:manage"],
  },
  {
    key: "WEBSITE_EDITOR",
    label: "Website Editor (Section-Scoped)",
    description: "Can view and edit only the specific website pages/sections assigned below.",
    role: "EDITOR",
    permissions: ["dashboard:view", "cms:view", "cms:edit", "media:view"],
  },
  {
    key: "FULL_ADMIN",
    label: "General Admin",
    description: "Full operational admin access across CMS, Releases, Royalties, and Users (cannot alter Super Admin).",
    role: "ADMIN",
    permissions: ROLE_PERMISSIONS.ADMIN,
  },
  {
    key: "CUSTOM_ADMIN",
    label: "Custom Admin",
    description: "Pick custom View, Add, Edit, Delete, Publish, and Manage permissions manually.",
    role: "EDITOR",
    permissions: ["dashboard:view"],
  },
];

export const PERMISSION_MATRIX_GROUPS: Array<{
  module: string;
  actions: Array<{ key: Permission; label: string }>;
}> = [
    {
      module: "Website Pages & CMS Content",
      actions: [
        { key: "cms:view", label: "View" },
        { key: "cms:add", label: "Add" },
        { key: "cms:edit", label: "Edit" },
        { key: "cms:delete", label: "Delete" },
        { key: "cms:publish", label: "Publish" },
        { key: "cms:manage", label: "Manage All" },
      ],
    },
    {
      module: "Logos, Banners & Media Library",
      actions: [
        { key: "media:view", label: "View" },
        { key: "media:add", label: "Add" },
        { key: "media:edit", label: "Edit" },
        { key: "media:delete", label: "Delete" },
        { key: "media:manage", label: "Manage All" },
      ],
    },
    {
      module: "Songs, Releases, Artists & DSPs",
      actions: [
        { key: "music:view", label: "View" },
        { key: "music:add", label: "Add" },
        { key: "music:edit", label: "Edit" },
        { key: "music:delete", label: "Delete" },
        { key: "music:publish", label: "Publish" },
        { key: "music:manage", label: "Manage All" },
      ],
    },
    {
      module: "Website Settings & Configuration",
      actions: [
        { key: "settings:view", label: "View" },
        { key: "settings:edit", label: "Edit" },
        { key: "settings:manage", label: "Manage All" },
      ],
    },
    {
      module: "Admin Users & Permissions",
      actions: [
        { key: "users:view", label: "View" },
        { key: "users:add", label: "Add" },
        { key: "users:edit", label: "Edit" },
        { key: "users:delete", label: "Delete" },
        { key: "users:manage", label: "Manage All" },
      ],
    },
    {
      module: "Operations, Finance & Audit",
      actions: [
        { key: "release:review", label: "Review Releases" },
        { key: "release:approve", label: "Approve Releases" },
        { key: "royalties:view_all", label: "View Royalties" },
        { key: "payments:process", label: "Process Payouts" },
        { key: "tickets:manage_all", label: "Manage Tickets" },
        { key: "audit:view", label: "View Audit Logs" },
      ],
    },
  ];

export const CMS_EDITABLE_SECTIONS = [
  { slug: "home", label: "Homepage (home)" },
  { slug: "about", label: "About Page (about)" },
  { slug: "brand", label: "Brand Solutions (brand)" },
  { slug: "services", label: "Services Page (services)" },
  { slug: "plan", label: "Distribution Plans (plan)" },
  { slug: "control", label: "Control Page (control)" },
  { slug: "signup", label: "Signup Banner (signup)" },
];

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function resolveUserPermissions(user: {
  role: UserRole;
  customPermissionsJson?: string | null;
}): Permission[] {
  if (user.role === "SUPER_ADMIN") {
    return ALL_PERMISSIONS;
  }
  if (user.customPermissionsJson) {
    try {
      const parsed = JSON.parse(user.customPermissionsJson);
      if (Array.isArray(parsed)) {
        const validSet = new Set<string>(ALL_PERMISSIONS);
        const filtered = parsed.filter(
          (item): item is Permission => typeof item === "string" && validSet.has(item)
        );
        return Array.from(new Set(filtered));
      }
    } catch {
      // Fallback to role defaults
    }
  }
  return ROLE_PERMISSIONS[user.role] || [];
}

export function expandImpliedPermissions(perms: Permission[]): Set<Permission> {
  const set = new Set<Permission>(perms);
  if (set.has("cms:manage")) {
    set.add("cms:view");
    set.add("cms:add");
    set.add("cms:edit");
    set.add("cms:delete");
    set.add("cms:publish");
    set.add("media:view");
    set.add("media:add");
    set.add("media:edit");
    set.add("media:delete");
    set.add("media:manage");
    set.add("settings:view");
    set.add("settings:edit");
  }
  if (set.has("media:manage")) {
    set.add("media:view");
    set.add("media:add");
    set.add("media:edit");
    set.add("media:delete");
  }
  if (set.has("music:manage")) {
    set.add("music:view");
    set.add("music:add");
    set.add("music:edit");
    set.add("music:delete");
    set.add("music:publish");
    set.add("release:review");
    set.add("release:approve");
    set.add("release:takedown");
    set.add("artist:manage_all");
    set.add("label:manage_all");
  }
  if (set.has("music:edit")) {
    set.add("music:view");
    set.add("release:review");
  }
  if (set.has("music:publish")) {
    set.add("music:view");
    set.add("release:review");
    set.add("release:approve");
  }
  if (set.has("settings:manage")) {
    set.add("settings:view");
    set.add("settings:edit");
  }
  if (set.has("users:manage")) {
    set.add("users:view");
    set.add("users:add");
    set.add("users:edit");
    set.add("users:delete");
  }
  return set;
}

export function userHasPermission(
  user: { role: UserRole; customPermissionsJson?: string | null },
  permission: Permission
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  const effective = expandImpliedPermissions(resolveUserPermissions(user));
  return effective.has(permission);
}

export function userHasAnyPermission(
  user: { role: UserRole; customPermissionsJson?: string | null },
  permissions: Permission[]
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  const effective = expandImpliedPermissions(resolveUserPermissions(user));
  return permissions.some((p) => effective.has(p));
}

export function parseAllowedSections(allowedSectionsJson?: string | null): string[] | null {
  if (!allowedSectionsJson) return null;
  try {
    const parsed = JSON.parse(allowedSectionsJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // ignore
  }
  return null;
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
