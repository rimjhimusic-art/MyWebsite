"use client";

import React, { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { ChevronLeft, ChevronRight, Globe, Send, X } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import {
  AppleMusicIcon,
  FacebookIcon,
  InstagramIcon,
  SpotifyIcon,
  VerifiedBadgeIcon,
  YouTubeIcon,
} from "@/components/BrandIcons";

export interface FeaturedArtistItem {
  id: string;
  name: string;
  roleBadge: string;
  bio: string;
  imageUrl: string;
  verified: boolean;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  websiteUrl?: string | null;
  otherSocialsJson?: string | null;
}

const DEFAULT_HERO_VIDEOS = [
  "/ref/video/hero-studio-perform.mp4",
  "/ref/video/hero-singer-mic.mp4",
  "/ref/video/hero-guitar-studio.mp4",
];

export function HeroBackgroundVideo({ videoUrl }: { videoUrl?: string | null }) {
  const videos =
    videoUrl && videoUrl.trim() && !DEFAULT_HERO_VIDEOS.includes(videoUrl)
      ? [videoUrl]
      : DEFAULT_HERO_VIDEOS;

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (videos.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % videos.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [videos.length]);

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-[#0f0f0f]">
      {videos.map((src, idx) => (
        <video
          key={src}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            idx === activeIdx ? "opacity-100" : "opacity-0"
          }`}
          style={{
            filter: "brightness(0.78) contrast(1.15) saturate(0.88)",
          }}
        />
      ))}
    </div>
  );
}

export function FeaturedArtistsSection({
  artists,
  sectionLabel = "Featured Talent",
}: {
  artists: FeaturedArtistItem[];
  sectionLabel?: string;
}) {
  const [selected, setSelected] = useState<FeaturedArtistItem | null>(null);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const isCarousel = artists.length > 3;

  const handleCardClick = (
    e: React.MouseEvent<HTMLDivElement>,
    artist: FeaturedArtistItem
  ) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    try {
      confetti({
        particleCount: 140,
        spread: 95,
        origin: { x, y },
        colors: ["#3b82f6", "#22c55e", "#ffffff", "#E3001B"],
        disableForReducedMotion: true,
      });
    } catch {
      // ignore confetti errors
    }
    setSelected(artist);
  };

  const scrollCarousel = (dir: number) => {
    if (!trackRef.current) return;
    const step = 360 * dir;
    trackRef.current.scrollBy({ left: step, behavior: "smooth" });
  };

  const renderCard = (artist: FeaturedArtistItem, keySuffix = "") => (
    <div
      key={`${artist.id}${keySuffix}`}
      onClick={(e) => handleCardClick(e, artist)}
      data-testid="featured-artist-card"
      className={`group relative h-[320px] rounded-[20px] bg-[#18181b] border border-[#2a2a2a] overflow-hidden cursor-pointer text-left transition-all duration-400 hover:-translate-y-2.5 hover:border-[#3b82f6] hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] ${
        isCarousel ? "w-[290px] sm:w-[340px] shrink-0" : "w-full"
      }`}
    >
      <div className="w-full h-full absolute inset-0">
        <img
          src={artist.imageUrl || "/ref/abir.jpg"}
          alt={artist.name}
          className="w-full h-full object-cover object-top transition-all duration-500 grayscale-[20%] group-hover:scale-110 group-hover:grayscale-0"
        />
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            background:
              "linear-gradient(to top, #18181b 10%, rgba(0,0,0,0.45) 60%, transparent)",
          }}
        />
      </div>
      <div className="absolute bottom-5 left-5 z-[2]">
        <div className="text-[1.4rem] font-bold text-white mb-1 flex items-center gap-1.5">
          <span>{artist.name}</span>
          {artist.verified && <VerifiedBadgeIcon className="w-[18px] h-[18px] shrink-0" />}
        </div>
        <div className="text-[0.75rem] text-[#b0b0b8] uppercase tracking-[1px]">
          {artist.roleBadge || "Independent Artist"}
        </div>
      </div>
    </div>
  );

  const configuredSocials = selected
    ? (() => {
        const extraLinks: Array<{ label: string; url: string }> = (() => {
          if (!selected.otherSocialsJson) return [];
          try {
            const parsed = JSON.parse(selected.otherSocialsJson);
            return Array.isArray(parsed)
              ? parsed.filter((x) => x && typeof x.url === "string" && x.url.trim().length > 0)
              : [];
          } catch {
            return [];
          }
        })();

        const base = [
          {
            key: "facebook",
            url: selected.facebookUrl,
            label: "Facebook",
            hoverClass: "hover:bg-[#1877F2]/25 hover:border-[#1877F2]",
            icon: <FacebookIcon className="w-[18px] h-[18px]" color="#1877F2" />,
          },
          {
            key: "instagram",
            url: selected.instagramUrl,
            label: "Instagram",
            hoverClass: "hover:bg-[#E1306C]/25 hover:border-[#E1306C]",
            icon: <InstagramIcon className="w-[18px] h-[18px]" color="#E1306C" />,
          },
          {
            key: "youtube",
            url: selected.youtubeUrl,
            label: "YouTube",
            hoverClass: "hover:bg-[#FF0000]/25 hover:border-[#FF0000]",
            icon: <YouTubeIcon className="w-[18px] h-[18px]" color="#FF0000" />,
          },
          {
            key: "spotify",
            url: selected.spotifyUrl,
            label: "Spotify",
            hoverClass: "hover:bg-[#1DB954]/25 hover:border-[#1DB954]",
            icon: <SpotifyIcon className="w-[18px] h-[18px]" color="#1DB954" />,
          },
          {
            key: "apple_music",
            url: selected.appleMusicUrl,
            label: "Apple Music",
            hoverClass: "hover:bg-[#FA243C]/25 hover:border-[#FA243C]",
            icon: <AppleMusicIcon className="w-[18px] h-[18px]" color="#FA243C" />,
          },
          {
            key: "website",
            url: selected.websiteUrl,
            label: "Website",
            hoverClass: "hover:bg-[#3b82f6]/25 hover:border-[#3b82f6]",
            icon: <Globe className="w-[18px] h-[18px] text-[#60a5fa]" />,
          },
          ...extraLinks.map((extra, idx) => ({
            key: `extra-${idx}`,
            url: extra.url,
            label: extra.label || "Link",
            hoverClass: "hover:bg-white/20 hover:border-white/50",
            icon: <Globe className="w-[18px] h-[18px] text-white" />,
          })),
        ];

        return base.filter((s) => Boolean(s.url && s.url.trim()));
      })()
    : [];

  return (
    <>
      <div className="w-full max-w-[1100px] z-[3] relative mx-auto">
        <span className="text-[0.8rem] font-bold text-[#3b82f6] uppercase tracking-[2px] mb-5 block text-center">
          {sectionLabel}
        </span>

        {isCarousel ? (
          <div
            className="relative group/carousel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={(e) => {
              setPaused(true);
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const endX = e.changedTouches[0]?.clientX ?? null;
              if (touchStartX.current !== null && endX !== null) {
                const diff = touchStartX.current - endX;
                if (Math.abs(diff) > 30) scrollCarousel(diff > 0 ? 1 : -1);
              }
              setTimeout(() => setPaused(false), 1500);
            }}
          >
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              aria-label="Previous featured artists"
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/75 border border-white/20 text-white items-center justify-center hover:bg-[#3b82f6] hover:border-[#3b82f6] transition-all cursor-pointer shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              aria-label="Next featured artists"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/75 border border-white/20 text-white items-center justify-center hover:bg-[#3b82f6] hover:border-[#3b82f6] transition-all cursor-pointer shadow-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div
              ref={trackRef}
              className="overflow-x-auto no-scrollbar rounded-[20px]"
              data-testid="featured-artist-carousel"
            >
              <div
                className={`artist-marquee-track flex gap-5 w-max py-2 ${
                  paused ? "artist-marquee-paused" : ""
                }`}
              >
                {artists.map((a) => renderCard(a, "-a"))}
                {artists.map((a) => renderCard(a, "-b"))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-5 max-w-[400px] md:max-w-none mx-auto ${
              artists.length === 1
                ? "grid-cols-1 max-w-[360px]"
                : artists.length === 2
                ? "grid-cols-1 md:grid-cols-2 max-w-[740px]"
                : "grid-cols-1 md:grid-cols-3"
            }`}
          >
            {artists.map((artist) => renderCard(artist))}
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
          onClick={() => setSelected(null)}
        >
          <div
            data-testid="artist-profile-popup"
            className="relative w-full max-w-[540px] min-h-[470px] sm:min-h-[540px] max-h-[90vh] rounded-[26px] border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden bg-black flex flex-col justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full Artist Portrait Background with responsive face-safe framing */}
            <img
              src={selected.imageUrl || "/ref/abir.jpg"}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-top scale-105 blur-lg opacity-40"
            />
            <img
              src={selected.imageUrl || "/ref/abir.jpg"}
              alt={selected.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />

            {/* Subtle dark cinematic gradient + light transparent black glass overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.32) 48%, rgba(0,0,0,0.72) 100%)",
              }}
            />

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/45 hover:bg-[#E3001B] backdrop-blur-md border border-white/20 text-white flex items-center justify-center z-20 cursor-pointer transition-all hover:rotate-90"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Clear breathing room above so artist face stays unobstructed */}
            <div className="h-[190px] sm:h-[240px] shrink-0 pointer-events-none" />

            {/* Glassmorphism Overlay Content Card */}
            <div className="relative z-10 m-3 sm:m-5 rounded-[20px] bg-black/45 backdrop-blur-md border border-white/15 p-5 sm:p-6 text-left shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-y-auto max-h-[55vh]">
              <h3 className="text-[1.6rem] sm:text-[2rem] font-extrabold text-white mb-1 flex items-center gap-2 leading-tight">
                <span>{selected.name}</span>
                {selected.verified && <VerifiedBadgeIcon className="w-5 h-5 shrink-0" />}
              </h3>
              <div className="text-[#60a5fa] text-xs sm:text-[0.82rem] font-bold uppercase mb-3 tracking-[1.2px]">
                {selected.roleBadge || "Independent Artist"}
              </div>
              <p className="text-sm sm:text-[0.95rem] text-zinc-100/90 leading-[1.65] mb-4">
                {selected.bio}
              </p>

              {configuredSocials.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1" data-testid="artist-modal-socials">
                  {configuredSocials.map((s) => (
                    <a
                      key={s.key}
                      href={s.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      title={s.label}
                      className={`w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 ${s.hoverClass} hover:-translate-y-0.5 flex items-center justify-center transition-all`}
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AnimatedStatBubbles() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [counts, setCounts] = useState({ t: 0, p: 0, a: 0, s: 0 });
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          let step = 0;
          const totalSteps = 30;
          const timer = setInterval(() => {
            step += 1;
            const prog = step / totalSteps;
            setCounts({
              t: Math.round(1 * prog),
              p: Math.round(10 * prog),
              a: Math.round(10 * prog),
              s: Math.round(150 * prog),
            });
            if (step >= totalSteps) clearInterval(timer);
          }, 30);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="contents">
      <div className="stat-bubble sb-1">
        <div className="sb-number">{counts.t || 1}L+</div>
        <div className="sb-label">Tracks</div>
      </div>
      <div className="stat-bubble sb-2">
        <div className="sb-number">{counts.p || 10}M+</div>
        <div className="sb-label">Plays</div>
      </div>
      <div className="stat-bubble sb-3">
        <div className="sb-number">{counts.a || 10}K+</div>
        <div className="sb-label">Artists</div>
      </div>
      <div className="stat-bubble sb-4">
        <div className="sb-number">{counts.s || 150}+</div>
        <div className="sb-label">Stores</div>
      </div>
    </div>
  );
}

export function ContactFormSection({
  title = "Get In Touch",
  subtitle = "Send a message to inquire about our products and services! We are committed to bringing customer satisfaction by providing quality services.",
  contactEmail = "support@goldexmedianetwork.com",
  contactPhone = "+918724804659",
  contactAddress = "Assam, Guwahati, India",
}: {
  title?: string;
  subtitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = React.useRef(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || submitting) return;

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedMessage = form.message.trim();
    if (trimmedName.length < 2) {
      const msg = "Name must be at least 2 characters.";
      setErrorMessage(msg);
      showToast(msg, "error");
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      const msg = "Please enter a valid email address.";
      setErrorMessage(msg);
      showToast(msg, "error");
      return;
    }
    if (trimmedMessage.length < 5) {
      const msg = "Message must be at least 5 characters.";
      setErrorMessage(msg);
      showToast(msg, "error");
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setSentMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        const errText = data?.error || "Failed to send message. Please try again.";
        setErrorMessage(errText);
        showToast(errText, "error");
        return;
      }
      setSentMessage("Successfully Sent!");
      showToast("Successfully Sent!", "success");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      const netErr = "Network error while sending message. Please try again.";
      setErrorMessage(netErr);
      showToast(netErr, "error");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  // Suppress unused-prop warning cleanly while keeping signature backwards-compatible
  void contactEmail;
  void contactPhone;
  void contactAddress;

  return (
    <section
      id="contact"
      className="bg-[#0f172a] flex justify-center items-center py-[80px] px-5 relative z-[5] border-t border-[#2a2a2a]"
    >
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] rounded-[10px] overflow-hidden shadow-2xl">
        <div
          className="p-10 sm:p-[50px] text-white flex flex-col justify-center"
          style={{
            background: "radial-gradient(circle at top left, #1e293b, #0f172a)",
          }}
        >
          <h2 className="text-[2.2rem] sm:text-[2.5rem] font-bold mb-5">
            {title}
          </h2>
          <p className="text-[1.1rem] leading-[1.6] text-[#cbd5e1] mb-[30px]">
            {subtitle}
          </p>
          <div
            data-testid="contact-mailbox-showcase"
            className="bg-white/10 border border-white/10 px-6 py-8 rounded-[12px] flex flex-col items-center justify-center text-center shadow-[0_12px_32px_rgba(0,0,0,0.25)]"
          >
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 via-blue-500/15 to-amber-500/25 border border-amber-300/35 flex items-center justify-center shadow-[0_0_28px_rgba(245,158,11,0.2)] goldex-mailbox-float">
              <svg
                viewBox="0 0 64 64"
                className="w-11 h-11"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="goldexMailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="55%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                </defs>
                <path
                  d="M10 24L32 10L54 24V48C54 50.2091 52.2091 52 50 52H14C11.7909 52 10 50.2091 10 48V24Z"
                  fill="rgba(255,255,255,0.08)"
                  stroke="url(#goldexMailGrad)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 21H47V34L32 43L17 34V21Z"
                  fill="rgba(255,255,255,0.92)"
                />
                <path
                  d="M23 26H41M23 30.5H35"
                  stroke="#0f172a"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M10 25L32 39L54 25"
                  stroke="url(#goldexMailGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[1.5px] text-amber-300">
              Goldex Media Network Desk
            </span>
          </div>
        </div>

        <div className="bg-white p-8 sm:p-[50px] text-[#333]">
          <h3 className="text-[1.8rem] font-bold mb-[30px] text-[#0f172a]">
            Ask us any questions you have.
          </h3>

          {sentMessage && (
            <div
              role="status"
              data-testid="contact-success-banner"
              className="mb-5 p-3.5 rounded-[5px] bg-[#dcfce7] text-[#166534] border border-[#22c55e] text-sm font-bold text-center"
            >
              {sentMessage}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              data-testid="contact-error-banner"
              className="mb-5 p-3.5 rounded-[5px] bg-[#fee2e2] text-[#991b1b] border border-[#ef4444] text-sm font-semibold text-center"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <input
                type="text"
                name="name"
                required
                placeholder="Your Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-[15px] border border-[#e2e8f0] rounded-[5px] text-[0.95rem] bg-[#f8fafc] text-[#333] outline-none focus:border-[#ef4444] focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-5 mb-5">
              <input
                type="email"
                name="email"
                required
                placeholder="Enter your email*"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-[15px] border border-[#e2e8f0] rounded-[5px] text-[0.95rem] bg-[#f8fafc] text-[#333] outline-none focus:border-[#ef4444] focus:bg-white transition-all"
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone #"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full p-[15px] border border-[#e2e8f0] rounded-[5px] text-[0.95rem] bg-[#f8fafc] text-[#333] outline-none focus:border-[#ef4444] focus:bg-white transition-all"
              />
            </div>

            <div className="mb-6">
              <textarea
                name="message"
                required
                placeholder="Write your message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full p-[15px] border border-[#e2e8f0] rounded-[5px] text-[0.95rem] bg-[#f8fafc] text-[#333] outline-none focus:border-[#ef4444] focus:bg-white transition-all resize-none h-[120px]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-[35px] py-[14px] rounded-[5px] text-base font-bold cursor-pointer transition-all hover:-translate-y-0.5 inline-flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{submitting ? "Sending..." : "Send Message"}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
