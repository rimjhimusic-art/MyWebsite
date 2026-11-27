"use client";

import React, { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import {
  InstagramIcon,
  FacebookIcon,
  YouTubeIcon,
  LinkedInIcon,
} from "@/components/BrandIcons";

const GALLERY_IMAGES = Array.from(
  { length: 8 },
  (_, i) => `/ref/flag/about-${i + 1}.png`
);

export const TEAM_MEMBERS = [
  {
    name: "Sujoy Debnath",
    role: "Director",
    img: "/ref/team/sujoy.png",
    desc: "Architecting the future of music monetization and global strategy.",
  },
  {
    name: "Pampa Bhowmick",
    role: "Head of Operations",
    img: "/ref/team/pampa.jpg",
    desc: "Orchestrating daily workflows and strategic planning for seamless operations.",
  },
  {
    name: "Subho Saha",
    role: "Head of CMS",
    img: "/ref/team/subho.png",
    desc: "Leading rights management and maximizing asset monetization strategies.",
  },
  {
    name: "Sayantani Saha",
    role: "Label Manager",
    img: "/ref/team/sayantani.png",
    desc: "Managing artist relationships and distribution catalogs globally.",
  },
  {
    name: "Priyanka Saha",
    role: "Head of Influencer Mkt.",
    img: "/ref/team/priyanka.jpg",
    desc: "Connecting brands with top-tier creators for high-impact campaigns.",
  },
  {
    name: "Akash Chattaraj",
    role: "Brand Manager",
    img: "/ref/team/akash.jpeg",
    desc: "Helping brands grow through strategic influencer collaborations.",
  },
  {
    name: "Rajkumar",
    role: "Executive",
    img: "/ref/team/rajkumar.jpg",
    desc: "Supporting teams and ensuring efficient client communications.",
  },
];

export interface AboutSliderSlideItem {
  id: string;
  imageUrl: string;
  title?: string | null;
  description?: string | null;
  enabled?: boolean;
}

export interface AboutSliderSettings {
  enabled?: boolean;
  autoplay?: boolean;
  speedSeconds?: number;
  pauseOnHover?: boolean;
  showCaptions?: boolean;
}

export function AboutDualSlider({
  slides,
  images,
  sliderSettings,
}: {
  slides?: AboutSliderSlideItem[];
  images?: string[];
  sliderSettings?: AboutSliderSettings;
}) {
  const [backZ, setBackZ] = useState(1);
  const [hovered, setHovered] = useState(false);

  if (sliderSettings?.enabled === false) return null;

  const activeSlides: AboutSliderSlideItem[] =
    slides && slides.length > 0
      ? slides.filter((s) => s.enabled !== false)
      : (images && images.length > 0 ? images : GALLERY_IMAGES).map((src, i) => ({
          id: `legacy-${i}`,
          imageUrl: src,
          title: null,
          description: null,
          enabled: true,
        }));

  if (activeSlides.length === 0) return null;

  const doubled = [...activeSlides, ...activeSlides];
  const autoplay = sliderSettings?.autoplay !== false;
  const pauseOnHover = sliderSettings?.pauseOnHover !== false;
  const showCaptions = sliderSettings?.showCaptions !== false;
  const durationSec = Math.min(180, Math.max(8, Number(sliderSettings?.speedSeconds || 45)));

  const trackStyle: React.CSSProperties = {
    animationName: autoplay ? "smoothScroll" : "none",
    animationDuration: `${durationSec}s`,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationPlayState:
      !autoplay || (pauseOnHover && hovered) ? "paused" : "running",
  };

  const renderCard = (slide: AboutSliderSlideItem, key: string) => (
    <div key={key} className="gallery-card group">
      <img src={slide.imageUrl} alt={slide.title || "Goldex Team Gallery"} />
      {showCaptions && (slide.title || slide.description) && (
        <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-left">
          {slide.title && (
            <div className="text-xs font-bold text-white truncate">{slide.title}</div>
          )}
          {slide.description && (
            <div className="text-[11px] text-zinc-300 line-clamp-2 mt-0.5">
              {slide.description}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="clean-slider"
      data-testid="about-top-slider"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="slider-track track-back"
        style={{ ...trackStyle, zIndex: backZ }}
        onMouseOver={() => setBackZ(30)}
        onMouseOut={() => setBackZ(1)}
      >
        {doubled.map((slide, i) => renderCard(slide, `b-${slide.id}-${i}`))}
      </div>

      <div className="ribbon-container">
        <svg className="ribbon-wave line-top" viewBox="0 0 1200 160" preserveAspectRatio="none">
          <path d="M0,50 C200,20 400,80 600,50 C800,20 1000,80 1200,50 C1400,20 1600,80 1800,50" />
        </svg>
        <svg className="ribbon-wave line-mid" viewBox="0 0 1200 160" preserveAspectRatio="none">
          <path d="M0,50 C200,20 400,80 600,50 C800,20 1000,80 1200,50 C1400,20 1600,80 1800,50" />
        </svg>
        <svg className="ribbon-wave line-bottom" viewBox="0 0 1200 160" preserveAspectRatio="none">
          <path d="M0,50 C200,20 400,80 600,50 C800,20 1000,80 1200,50 C1400,20 1600,80 1800,50" />
        </svg>
      </div>

      <div className="slider-track track-front" style={trackStyle}>
        {doubled.map((slide, i) => renderCard(slide, `f-${slide.id}-${i}`))}
      </div>
    </div>
  );
}

export interface CmsTeamMemberItem {
  id?: string;
  name: string;
  role: string;
  bio?: string | null;
  imageUrl?: string;
  img?: string;
  desc?: string;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  websiteUrl?: string | null;
}

export function TeamCardDeck({
  members,
  heading,
}: {
  members?: CmsTeamMemberItem[];
  heading?: string;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [dealt, setDealt] = useState(false);

  const list =
    members && members.length > 0
      ? members.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          img: m.imageUrl || m.img || "/ref/team/sujoy.png",
          desc: m.bio ?? m.desc ?? "",
          linkedinUrl: m.linkedinUrl,
          instagramUrl: m.instagramUrl,
          facebookUrl: m.facebookUrl,
          youtubeUrl: m.youtubeUrl,
          websiteUrl: m.websiteUrl,
        }))
      : TEAM_MEMBERS.map((m, idx) => ({
          ...m,
          id: `fallback-${idx}`,
          linkedinUrl: null,
          instagramUrl: null,
          facebookUrl: null,
          youtubeUrl: null,
          websiteUrl: null,
        }));

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setDealt(true);
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      id="teamSection"
      className="py-[100px] px-5 sm:px-10 text-center bg-[#080808] border-t border-white/5"
    >
      <h2 className="text-[2.2rem] sm:text-[3rem] font-extrabold mb-[60px] text-white">
        {heading || (
          <>
            Our <span className="text-[#3b82f6]">Leadership &amp; Team</span>
          </>
        )}
      </h2>

      <div className="flex flex-wrap justify-center gap-[30px] max-w-[1400px] mx-auto">
        {list.map((member, index) => {
          const socials = [
            { key: "instagram", url: member.instagramUrl, label: "Instagram", icon: <InstagramIcon className="w-3.5 h-3.5" color="#E1306C" /> },
            { key: "facebook", url: member.facebookUrl, label: "Facebook", icon: <FacebookIcon className="w-3.5 h-3.5" color="#1877F2" /> },
            { key: "youtube", url: member.youtubeUrl, label: "YouTube", icon: <YouTubeIcon className="w-3.5 h-3.5" color="#FF0000" /> },
            { key: "linkedin", url: member.linkedinUrl, label: "LinkedIn", icon: <LinkedInIcon className="w-3.5 h-3.5" color="#0A66C2" /> },
            { key: "website", url: member.websiteUrl, label: "Website / X", icon: <Globe className="w-3.5 h-3.5 text-[#60a5fa]" /> },
          ].filter((s) => Boolean(s.url && s.url.trim()));

          return (
            <div
              key={member.id || `${member.name}-${index}`}
              style={{
                transitionDelay: `${index * 120}ms`,
              }}
              className={`w-full max-w-[350px] sm:w-[300px] rounded-[20px] bg-[#111] border border-[#222] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-700 hover:-translate-y-3 hover:border-[#3b82f6] hover:shadow-[0_20px_50px_rgba(59,130,246,0.2)] group ${
                dealt
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-12 scale-95"
              }`}
            >
              <div className="w-full h-[300px] sm:h-[320px] relative bg-gradient-to-t from-black to-transparent overflow-hidden">
                <img
                  src={member.img}
                  alt={member.name}
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-[25px] text-left bg-[#111] border-t border-[#222]">
                <div className="text-[1.4rem] font-bold text-white mb-1">
                  {member.name}
                </div>
                <span className="text-[0.75rem] text-[#3b82f6] uppercase tracking-[1px] font-semibold block mb-3">
                  {member.role}
                </span>
                <div className="text-[0.85rem] text-[#9ca3af] leading-[1.5]">
                  {member.desc}
                </div>
                {socials.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/10">
                    {socials.map((s) => (
                      <a
                        key={s.key}
                        href={s.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} ${s.label}`}
                        title={s.label}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        {s.icon}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
