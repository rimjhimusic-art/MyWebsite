"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Disc3,
  UploadCloud,
  Users,
  Album,
  Music,
  Layers,
  Video,
  Library,
  Building2,
  BarChart3,
  BadgeDollarSign,
  CreditCard,
  FileSpreadsheet,
  Link2,
  Tv,
  ShieldCheck,
  Settings,
  LifeBuoy,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchExact?: boolean;
}

const ADMIN_DEFAULT_NAV: NavItem[] = [
  { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, matchExact: true },
  { href: "/admin/users", label: "Users, Artists & Labels", icon: Users },
  { href: "/admin/releases", label: "Submissions & Releases", icon: Disc3 },
  { href: "/admin/royalties", label: "Royalties & Payments", icon: BadgeDollarSign },
  { href: "/admin/services", label: "YouTube, VEVO, Rights & DSPs", icon: Tv },
  { href: "/admin/support", label: "Support Tickets", icon: LifeBuoy },
  { href: "/admin/cms", label: "Website CMS Studio", icon: FileText },
  { href: "/admin/settings", label: "Integrations & Audit Logs", icon: Settings },
];

const CREATOR_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, matchExact: true },
  { href: "/dashboard/upload", label: "Upload Music", icon: UploadCloud },
  { href: "/dashboard/releases", label: "My Releases", icon: Disc3, matchExact: true },
  { href: "/dashboard/artists", label: "My Artists", icon: Users },
  { href: "/dashboard/releases?type=ALBUM", label: "My Albums", icon: Album },
  { href: "/dashboard/releases?type=SINGLE", label: "Singles", icon: Music },
  { href: "/dashboard/releases?type=EP", label: "EPs", icon: Layers },
  { href: "/dashboard/vevo", label: "Music Videos (VEVO)", icon: Video },
  { href: "/dashboard/catalog", label: "Catalog", icon: Library },
  { href: "/dashboard/labels", label: "Label Management", icon: Building2 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/royalties", label: "Royalties & Splits", icon: BadgeDollarSign },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/statements", label: "Statements", icon: FileSpreadsheet },
  { href: "/dashboard/smart-links", label: "Smart Links", icon: Link2 },
  { href: "/dashboard/youtube", label: "YouTube & Content ID", icon: Tv },
  { href: "/dashboard/rights", label: "Rights Management", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Profile Settings", icon: Settings },
  { href: "/dashboard/support", label: "Support Tickets", icon: LifeBuoy },
];

export interface ShellUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function DashboardShell({
  user,
  children,
  mode = "creator",
  adminNav,
}: {
  user: ShellUser;
  children: React.ReactNode;
  mode?: "creator" | "admin";
  adminNav?: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; isRead: boolean; link: string | null; createdAt: string }>
  >([]);

  const navItems = mode === "admin" ? adminNav || ADMIN_DEFAULT_NAV : CREATOR_NAV;
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "EDITOR", "FINANCE_MANAGER", "CONTENT_MANAGER"].includes(
    user.role
  );

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {});
  }, [pathname]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    showToast("Logged out securely.", "info");
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-68 bg-[#111114] border-r border-[#232329] flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-[#232329] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/ref/logo.png" alt="OneTab" className="h-8" />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[#232329]">
          <div className="p-3 rounded-xl bg-[#18181b] border border-[#2a2a2a]">
            <div className="text-sm font-bold text-white truncate">{user.name}</div>
            <div className="text-[11px] text-[#71717a] truncate">{user.email}</div>
            <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-[#3b82f6] border border-blue-500/30">
              {user.role.replace("_", " ")}
            </span>
          </div>
          {isAdmin && (
            <Link
              href={mode === "admin" ? "/dashboard" : "/admin"}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{mode === "admin" ? "Creator Workspace" : "Open Admin Panel"}</span>
            </Link>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.matchExact
              ? pathname === item.href
              : pathname.startsWith(item.href.split("?")[0]);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#3b82f6] text-white font-semibold shadow-lg shadow-blue-500/20"
                    : "text-[#b0b0b8] hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#232329]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-68 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-[#0f0f0f]/90 backdrop-blur-md border-b border-[#232329] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-[#18181b] border border-[#2a2a2a] text-white"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-[#b0b0b8]">
              {mode === "admin" ? "Super Admin Control Center" : "Music Distribution Studio"}
            </span>
          </div>

          <div className="flex items-center gap-3 relative">
            <Link
              href="/dashboard/upload"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-xs font-bold text-white"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>New Release</span>
            </Link>

            <button
              type="button"
              onClick={() => setNotifOpen((p) => !p)}
              className="relative p-2.5 rounded-full bg-[#18181b] border border-[#2a2a2a] text-zinc-300 hover:text-white cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E3001B] text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#18181b] border border-[#2a2a2a] shadow-2xl p-4 z-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-[11px] text-[#3b82f6] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#71717a] py-4 text-center">
                      No notifications yet.
                    </p>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <Link
                        key={n.id}
                        href={n.link || "/dashboard"}
                        onClick={() => setNotifOpen(false)}
                        className={`block p-2.5 rounded-xl border text-xs ${
                          n.isRead
                            ? "bg-[#111114] border-white/5 text-[#b0b0b8]"
                            : "bg-blue-500/10 border-blue-500/30 text-white"
                        }`}
                      >
                        <div className="font-semibold">{n.title}</div>
                        <div className="text-[11px] text-[#71717a] mt-0.5 line-clamp-2">
                          {n.message}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
