"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Eye, ArrowLeft } from "lucide-react";

export interface CmsNavLink {
  id?: string;
  label: string;
  href: string;
  isButton?: boolean;
  openNewTab?: boolean;
}

export interface CmsBrandHeaderSettings {
  siteName: string;
  headerLogoUrl: string;
  headerLogoWidth: number;
  headerLogoHeight: number;
  showNewUpdatesBadge?: boolean;
  newUpdatesBadgeText?: string;
  newUpdatesBadgePulse?: boolean;
}

const DEFAULT_NAV: CmsNavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/updates", label: "New Updates" },
  { href: "/brand", label: "Brand Solutions" },
  { href: "/services", label: "Services" },
  { href: "/plan", label: "Plan" },
  { href: "/control", label: "Control" },
  { href: "/login", label: "Login / Sign Up", isButton: true },
];

export function Navbar({
  user,
  variant = "dark",
  settings,
  navItems,
  previewActive = false,
}: {
  user?: { name: string; role: string } | null;
  variant?: "dark" | "light-header";
  settings?: Partial<CmsBrandHeaderSettings>;
  navItems?: CmsNavLink[];
  previewActive?: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAdmin =
    user &&
    ["SUPER_ADMIN", "ADMIN", "EDITOR", "FINANCE_MANAGER", "CONTENT_MANAGER"].includes(
      user.role
    );
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";

  const logoUrl = settings?.headerLogoUrl || "/ref/goldex-logo.svg";
  const logoHeight = settings?.headerLogoHeight || 40;
  const logoWidth = settings?.headerLogoWidth || 210;
  const siteName = settings?.siteName || "Goldex Media Network";

  const items = navItems && navItems.length > 0 ? navItems : DEFAULT_NAV;
  const regularLinks = items.filter((i) => !i.isButton);
  const buttonLink = items.find((i) => i.isButton) || {
    href: "/login",
    label: variant === "light-header" ? "Client Login" : "Login / Sign Up",
    isButton: true,
  };

  const isLightScrolled = variant === "light-header" && scrolled;

  return (
    <>
      {previewActive && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1500] flex items-center gap-3 px-4 py-2 rounded-full bg-amber-500 text-black font-bold text-xs shadow-2xl border border-amber-300">
          <Eye className="w-4 h-4 shrink-0" />
          <span>CMS PREVIEW MODE (Drafts Visible)</span>
          <Link
            href="/admin/cms"
            className="inline-flex items-center gap-1 bg-black text-white px-3 py-1 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Editor
          </Link>
          <Link
            href={pathname || "/"}
            className="bg-white/90 text-black px-3 py-1 rounded-full hover:bg-white transition-colors"
          >
            Exit Preview
          </Link>
        </div>
      )}

      <header
        className={`fixed top-0 left-0 w-full z-[1000] transition-all duration-400 ${
          scrolled
            ? isLightScrolled
              ? "bg-white/95 backdrop-blur-md border-b border-zinc-200 py-3 px-5 lg:px-10 shadow-sm"
              : "bg-black/75 backdrop-blur-xl border-b border-white/10 py-3 px-5 lg:px-10 shadow-lg"
            : "bg-transparent border-b border-transparent py-4 px-5 lg:px-10"
        }`}
      >
        <div className="w-full flex items-center justify-between">
          <Link
            href="/"
            className="shrink-0 mr-auto flex items-center relative overflow-visible py-1"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <span className="goldex-logo-particle w-1.5 h-1.5 left-[8%]" style={{ animationDelay: "0s", animationDuration: "3s" }} />
              <span className="goldex-logo-particle w-2 h-2 left-[24%]" style={{ animationDelay: "-1.1s", animationDuration: "3.6s" }} />
              <span className="goldex-logo-particle w-1 h-1 left-[42%]" style={{ animationDelay: "-2.1s", animationDuration: "2.8s" }} />
              <span className="goldex-logo-particle w-1.5 h-1.5 left-[64%]" style={{ animationDelay: "-0.7s", animationDuration: "3.4s" }} />
              <span className="goldex-logo-particle w-2 h-2 left-[84%]" style={{ animationDelay: "-1.8s", animationDuration: "3.9s" }} />
            </span>
            <img
              src={logoUrl}
              alt={siteName}
              style={{
                height: `${Math.min(Math.max(logoHeight, 24), 68)}px`,
                maxWidth: `${Math.min(Math.max(logoWidth, 60), 280)}px`,
              }}
              className={`relative z-[1] w-auto object-contain transition-all ${
                isLightScrolled ? "brightness-0 opacity-85" : ""
              }`}
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-[18px] xl:gap-[26px] mr-[24px] xl:mr-[32px]">
            {regularLinks.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const isUpdatesItem = item.href === "/updates";
              const showBadge =
                isUpdatesItem && settings?.showNewUpdatesBadge !== false;
              const badgeText = settings?.newUpdatesBadgeText || "NEW";
              const badgePulse = settings?.newUpdatesBadgePulse !== false;
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  target={item.openNewTab ? "_blank" : undefined}
                  rel={item.openNewTab ? "noopener noreferrer" : undefined}
                  className={`relative inline-flex items-center gap-1.5 font-bold text-[0.78rem] xl:text-[0.8rem] uppercase tracking-[1px] transition-colors whitespace-nowrap after:content-[''] after:absolute after:h-[2px] after:left-0 after:bottom-[-5px] after:bg-[#3b82f6] after:transition-all after:duration-300 ${
                    active
                      ? isLightScrolled
                        ? "text-[#1a73e8] after:w-full"
                        : "text-white after:w-full"
                      : isLightScrolled
                      ? "text-[#5f6368] hover:text-[#1a73e8] after:w-0 hover:after:w-full"
                      : "text-[#ddd] hover:text-white after:w-0 hover:after:w-full"
                  }`}
                >
                  <span>{item.label}</span>
                  {showBadge && (
                    <span
                      className={`inline-flex items-center px-1.5 py-[1px] rounded-full text-[9px] font-extrabold tracking-[0.08em] uppercase border backdrop-blur-md ${
                        isLightScrolled
                          ? "bg-blue-600/15 border-blue-600/40 text-blue-700"
                          : "bg-blue-500/25 border-blue-400/50 text-blue-200"
                      } ${badgePulse ? "goldex-new-badge-pulse" : ""}`}
                    >
                      {badgeText}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href={dashboardHref}
                className={`px-4 sm:px-[25px] py-2 sm:py-[10px] rounded-[4px] border font-bold text-xs sm:text-[0.85rem] uppercase tracking-[0.5px] transition-all whitespace-nowrap ${
                  isLightScrolled
                    ? "border-[#dadce0] text-[#5f6368] hover:bg-[#1a73e8] hover:text-white hover:border-[#1a73e8]"
                    : "border-white/50 text-white hover:bg-white hover:text-black hover:border-white"
                }`}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href={buttonLink.href}
                target={buttonLink.openNewTab ? "_blank" : undefined}
                rel={buttonLink.openNewTab ? "noopener noreferrer" : undefined}
                className={`px-4 sm:px-[25px] py-2 sm:py-[10px] rounded-[4px] border font-bold text-xs sm:text-[0.85rem] uppercase tracking-[0.5px] transition-all whitespace-nowrap ${
                  isLightScrolled
                    ? "border-[#dadce0] text-[#5f6368] hover:bg-[#1a73e8] hover:text-white hover:border-[#1a73e8]"
                    : "border-white/50 text-white hover:bg-white hover:text-black hover:border-white"
                }`}
              >
                {buttonLink.label}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className={`lg:hidden p-2 rounded border cursor-pointer ${
                isLightScrolled
                  ? "border-zinc-300 text-zinc-800 bg-white"
                  : "border-white/30 text-white bg-black/40"
              }`}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden mt-3 rounded-xl bg-black/95 backdrop-blur-xl border border-white/10 px-5 py-4 space-y-2.5 shadow-2xl">
            <div className="pb-2 border-b border-white/10">
              <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain" />
            </div>
            {regularLinks.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={`mob-${item.href}-${item.label}`}
                  href={item.href}
                  target={item.openNewTab ? "_blank" : undefined}
                  rel={item.openNewTab ? "noopener noreferrer" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between py-2 text-xs font-bold uppercase tracking-[1px] border-b border-white/10 ${
                    active ? "text-[#3b82f6]" : "text-zinc-200 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.href === "/updates" && settings?.showNewUpdatesBadge !== false && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-[0.08em] uppercase bg-blue-500/25 border border-blue-400/50 text-blue-200 backdrop-blur-md ${
                        settings?.newUpdatesBadgePulse !== false ? "goldex-new-badge-pulse" : ""
                      }`}
                    >
                      {settings?.newUpdatesBadgeText || "NEW"}
                    </span>
                  )}
                </Link>
              );
            })}
            <Link
              href={user ? dashboardHref : buttonLink.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-xs font-bold uppercase tracking-[1px] text-[#3b82f6]"
            >
              {user ? "Open Dashboard" : buttonLink.label}
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
