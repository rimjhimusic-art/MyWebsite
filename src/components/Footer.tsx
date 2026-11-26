import React from "react";
import Link from "next/link";
import { MapPin, Mail, Phone } from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from "@/components/BrandIcons";

export interface CmsFooterSettings {
  siteName?: string;
  tagline?: string;
  footerLogoUrl?: string;
  footerLogoWidth?: number;
  footerLogoHeight?: number;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  whatsappUrl?: string;
  youtubeUrl?: string;
  copyrightText?: string;
}

export interface CmsFooterLink {
  id?: string;
  label: string;
  href: string;
  openNewTab?: boolean;
}

const DEFAULT_FOOTER_LINKS: CmsFooterLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/brand", label: "Brand Solutions" },
  { href: "/services", label: "Services" },
  { href: "/plan", label: "Plan" },
  { href: "/control", label: "Control" },
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function Footer({
  settings,
  footerNav,
}: {
  settings?: CmsFooterSettings;
  footerNav?: CmsFooterLink[];
}) {
  const siteName = settings?.siteName || "OneTab Media Network";
  const logoUrl = settings?.footerLogoUrl || "/ref/logo.png";
  const logoHeight = settings?.footerLogoHeight || 38;
  const logoWidth = settings?.footerLogoWidth || 120;
  const tagline =
    settings?.tagline ||
    "India's leading digital music distribution partner empowering independent artists and labels globally with enterprise-grade technology.";
  const email = settings?.contactEmail ?? "support@onetabmedia.in";
  const phone = settings?.contactPhone ?? "+91 70470 13399";
  const address = settings?.contactAddress ?? "West Bengal, India";
  const instagramUrl =
    settings?.instagramUrl !== undefined
      ? settings.instagramUrl
      : "https://www.instagram.com/onetab.media/";
  const facebookUrl =
    settings?.facebookUrl !== undefined
      ? settings.facebookUrl
      : "https://www.facebook.com/onetabmedia/";
  const whatsappUrl =
    settings?.whatsappUrl !== undefined
      ? settings.whatsappUrl
      : "https://wa.me/917047013399";
  const youtubeUrl = settings?.youtubeUrl || "";
  const copyrightText =
    settings?.copyrightText ||
    "© 2026 OneTab Media Network Pvt. Ltd. All Rights Reserved.";

  const links =
    footerNav && footerNav.length > 0 ? footerNav : DEFAULT_FOOTER_LINKS;

  return (
    <footer className="bg-[#0a0a0a] border-t border-[#2a2a2a] pt-[70px] pb-[30px] px-6 sm:px-[40px] relative z-[5]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-[40px] md:gap-[50px] text-center md:text-left">
        <div>
          <img
            src={logoUrl}
            alt={siteName}
            style={{
              height: `${Math.min(Math.max(logoHeight, 24), 68)}px`,
              maxWidth: `${Math.min(Math.max(logoWidth, 60), 260)}px`,
            }}
            className="w-auto object-contain opacity-90 mx-auto md:mx-0"
          />
          <p className="text-[#71717a] mt-5 leading-[1.6] max-w-[340px] text-[0.95rem] mx-auto md:mx-0">
            {tagline}
          </p>

          <div className="mt-6 flex gap-3.5 justify-center md:justify-start items-center">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 hover:border-[#E1306C] hover:bg-[#E1306C]/15 hover:-translate-y-0.5 flex items-center justify-center transition-all"
              >
                <InstagramIcon className="w-[18px] h-[18px]" color="#E1306C" />
              </a>
            )}
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                title="Facebook"
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 hover:border-[#1877F2] hover:bg-[#1877F2]/15 hover:-translate-y-0.5 flex items-center justify-center transition-all"
              >
                <FacebookIcon className="w-[18px] h-[18px]" color="#1877F2" />
              </a>
            )}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                title="WhatsApp"
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 hover:border-[#25D366] hover:bg-[#25D366]/15 hover:-translate-y-0.5 flex items-center justify-center transition-all"
              >
                <WhatsAppIcon className="w-[18px] h-[18px]" color="#25D366" />
              </a>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                title="YouTube"
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 hover:border-[#FF0000] hover:bg-[#FF0000]/15 hover:-translate-y-0.5 flex items-center justify-center transition-all"
              >
                <YouTubeIcon className="w-[18px] h-[18px]" color="#FF0000" />
              </a>
            )}
          </div>
        </div>

        <div>
          <div className="text-[1.1rem] text-white mb-[25px] font-bold">
            Quick Links
          </div>
          <div className="flex flex-col gap-3 text-[0.9rem] text-[#71717a]">
            {links.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                target={item.openNewTab ? "_blank" : undefined}
                rel={item.openNewTab ? "noopener noreferrer" : undefined}
                className="hover:text-[#3b82f6] md:hover:pl-2 transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[1.1rem] text-white mb-[25px] font-bold">
            Contact Us
          </div>
          <div className="space-y-3 text-[0.9rem] text-[#71717a]">
            {address && (
              <p className="flex items-center justify-center md:justify-start gap-2">
                <MapPin className="w-4 h-4 text-[#ef4444] shrink-0" />
                <span>{address}</span>
              </p>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center justify-center md:justify-start gap-2 hover:text-[#3b82f6] transition-colors"
              >
                <Mail className="w-4 h-4 text-white shrink-0" />
                <span>{email}</span>
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="flex items-center justify-center md:justify-start gap-2 hover:text-[#3b82f6] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#25D366] shrink-0" />
                <span>{phone}</span>
              </a>
            )}
            <div className="pt-2 flex flex-col gap-1.5 text-xs">
              <Link href="/help" className="hover:text-[#3b82f6]">
                Help &amp; Support
              </Link>
              <Link href="/careers" className="hover:text-[#3b82f6]">
                Careers
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-[50px] pt-[25px] border-t border-white/5 text-[#71717a] text-[0.85rem]">
        {copyrightText}
      </div>
    </footer>
  );
}
