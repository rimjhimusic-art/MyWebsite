"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Navbar, type CmsBrandHeaderSettings, type CmsNavLink } from "@/components/Navbar";
import { Footer, type CmsFooterLink, type CmsFooterSettings } from "@/components/Footer";
import { useToast } from "@/components/ToastProvider";

export interface BrandCreatorItem {
  id: string;
  name: string;
  handle: string | null;
  category?: string | null;
  description?: string | null;
  imageUrl: string;
  videoUrl: string | null;
}

const DEFAULT_BM_IMAGES = [
  "/ref/brand/bm1.jpeg",
  "/ref/brand/bm2.jpeg",
  "/ref/brand/bm3.jpeg",
  "/ref/brand/bm4.jpeg",
];

export function BrandClient({
  user,
  creators,
  formTitle = "Let's Talk!",
  formSubtitle = "Leave your details below and a member of our team will get back to you within 24 hours.",
  formSubmitLabel = "Submit",
  formBgColor = "#fff0e5",
  formTextColor = "#d93025",
  rightTitle = "Brand Managers",
  rightSubtitle = "Our expert team is here to help.",
  rightImages = DEFAULT_BM_IMAGES,
  settings,
  headerNav,
  footerNav,
  previewActive = false,
}: {
  user?: { name: string; role: string } | null;
  creators: BrandCreatorItem[];
  formTitle?: string;
  formSubtitle?: string;
  formSubmitLabel?: string;
  formBgColor?: string;
  formTextColor?: string;
  rightTitle?: string;
  rightSubtitle?: string;
  rightImages?: string[];
  settings?: Partial<CmsBrandHeaderSettings & CmsFooterSettings>;
  headerNav?: CmsNavLink[];
  footerNav?: CmsFooterLink[];
  previewActive?: boolean;
}) {
  const { showToast } = useToast();
  const safeCreators = creators.length > 0 ? creators : [];
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(3, Math.max(0, safeCreators.length - 1))
  );
  const [bmIndex, setBmIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    businessName: "",
    message: "",
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (safeCreators.length <= 1) return;
    const t = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % safeCreators.length);
    }, 5000);
    return () => clearInterval(t);
  }, [safeCreators.length]);

  useEffect(() => {
    if (rightImages.length <= 1) return;
    const t = setInterval(() => {
      setBmIndex((prev) => (prev + 1) % rightImages.length);
    }, 5000);
    return () => clearInterval(t);
  }, [rightImages.length]);

  const move = (dir: number) => {
    if (safeCreators.length === 0) return;
    setCurrentIndex((prev) => (prev + dir + safeCreators.length) % safeCreators.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitted(false);
    try {
      const res = await fetch("/api/brand-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to submit inquiry.", "error");
        return;
      }
      setSubmitted(true);
      showToast(data.message, "success");
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        businessName: "",
        message: "",
      });
    } catch {
      showToast("Network error submitting brand inquiry.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const cardW = isMobile ? 180 : 240;
  const activeW = isMobile ? 240 : 320;
  const gap = isMobile ? 20 : 40;
  const safeIndex = Math.min(currentIndex, Math.max(0, safeCreators.length - 1));
  const transformValue = -(safeIndex * (cardW + gap) + activeW / 2);
  const activeCreator = safeCreators[safeIndex];

  return (
    <div className="min-h-screen bg-[#050505] text-white relative">
      {activeCreator && (
        <div
          className="fixed inset-[-50px] z-0 bg-cover bg-center transition-all duration-500 pointer-events-none"
          style={{
            backgroundImage: `url('${activeCreator.imageUrl}')`,
            filter: "blur(80px) brightness(0.3)",
          }}
        />
      )}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle, transparent 0%, #000 90%)",
        }}
      />

      <Navbar
        user={user}
        settings={settings}
        navItems={headerNav}
        previewActive={previewActive}
      />

      {/* INFLUENCER SLIDER STAGE */}
      <div className="w-full h-screen flex items-center overflow-hidden relative z-10">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Previous creator"
          className="absolute left-4 sm:left-10 top-1/2 -translate-y-1/2 w-[50px] h-[50px] sm:w-[55px] sm:h-[55px] rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer z-[100] text-white border border-white/10 hover:bg-white hover:text-black transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Next creator"
          className="absolute right-4 sm:right-10 top-1/2 -translate-y-1/2 w-[50px] h-[50px] sm:w-[55px] sm:h-[55px] rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer z-[100] text-white border border-white/10 hover:bg-white hover:text-black transition-all"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <div
          className="flex items-center absolute left-0 pl-[50vw] transition-transform duration-600"
          style={{
            gap: `${gap}px`,
            transform: `translateX(${transformValue}px)`,
          }}
        >
          {safeCreators.map((item, i) => {
            const isActive = i === safeIndex;
            return (
              <div
                key={item.id}
                onClick={() => setCurrentIndex(i)}
                style={{
                  width: isActive ? `${activeW}px` : `${cardW}px`,
                  height: isActive
                    ? isMobile
                      ? "390px"
                      : "520px"
                    : isMobile
                    ? "300px"
                    : "400px",
                }}
                className={`relative shrink-0 rounded-[20px] bg-[#111] overflow-hidden cursor-pointer transition-all duration-500 ${
                  isActive
                    ? "opacity-100 scale-100 border border-white/30 shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-10"
                    : "opacity-40 scale-90 border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {isActive && item.videoUrl && (
                  <video
                    src={item.videoUrl}
                    muted
                    loop
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div
                  className={`absolute bottom-0 left-0 w-full h-[180px] flex flex-col justify-end p-[25px] transition-all duration-500 ${
                    isActive
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-5"
                  }`}
                  style={{
                    background: "linear-gradient(to top, #000 10%, transparent)",
                  }}
                >
                  <div
                    className={`rounded-full border-[#3b82f6] overflow-hidden absolute shadow-lg transition-all duration-500 ${
                      isActive
                        ? "w-[85px] h-[85px] border-[3px] left-1/2 -translate-x-1/2 bottom-[90px]"
                        : "w-[50px] h-[50px] border-2 left-[25px] bottom-[85px]"
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center mt-auto">
                    <h2 className="text-[1.3rem] font-extrabold text-white">
                      {item.name}
                    </h2>
                    {item.handle && (
                      <p className="text-[#aaa] text-[0.9rem] mt-1">
                        {item.handle}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-zinc-300 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PEACH / RED CONTACT SECTION */}
      <section
        className="py-[80px] px-5 sm:px-10 min-h-screen flex justify-center items-center relative z-20"
        style={{ backgroundColor: formBgColor, color: formTextColor }}
      >
        <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-2 gap-[50px] lg:gap-[80px] items-center">
          <div>
            <h1
              className="text-[2.6rem] sm:text-[3.5rem] mb-5 font-extrabold"
              style={{ color: formTextColor }}
            >
              {formTitle}
            </h1>
            <p
              className="mb-[40px] sm:mb-[50px] text-base leading-[1.6] max-w-[90%]"
              style={{ color: formTextColor }}
            >
              {formSubtitle}
            </p>

            {submitted && (
              <div className="mb-6 p-3.5 rounded bg-emerald-100 border border-emerald-400 text-emerald-900 text-sm font-semibold">
                Thank you! A Brand Manager will reach out within 24 hours.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10 mb-8 sm:mb-10">
                <input
                  type="text"
                  required
                  placeholder="First Name*"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  className="w-full bg-transparent border-0 border-b-[1.5px] border-[#eab8b8] focus:border-[#d93025] py-2.5 text-[0.95rem] text-[#333] placeholder:text-[#eab8b8] placeholder:font-medium outline-none transition-colors"
                />
                <input
                  type="text"
                  required
                  placeholder="Last Name*"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  className="w-full bg-transparent border-0 border-b-[1.5px] border-[#eab8b8] focus:border-[#d93025] py-2.5 text-[0.95rem] text-[#333] placeholder:text-[#eab8b8] placeholder:font-medium outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10 mb-8 sm:mb-10">
                <input
                  type="tel"
                  required
                  placeholder="Phone Number*"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-[1.5px] border-[#eab8b8] focus:border-[#d93025] py-2.5 text-[0.95rem] text-[#333] placeholder:text-[#eab8b8] placeholder:font-medium outline-none transition-colors"
                />
                <input
                  type="email"
                  required
                  placeholder="Email Address*"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-transparent border-0 border-b-[1.5px] border-[#eab8b8] focus:border-[#d93025] py-2.5 text-[0.95rem] text-[#333] placeholder:text-[#eab8b8] placeholder:font-medium outline-none transition-colors"
                />
              </div>

              <div className="mb-10">
                <input
                  type="text"
                  required
                  placeholder="Business/Organization name*"
                  value={form.businessName}
                  onChange={(e) =>
                    setForm({ ...form, businessName: e.target.value })
                  }
                  className="w-full bg-transparent border-0 border-b-[1.5px] border-[#eab8b8] focus:border-[#d93025] py-2.5 text-[0.95rem] text-[#333] placeholder:text-[#eab8b8] placeholder:font-medium outline-none transition-colors"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Tell us how we can help?"
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="w-full bg-transparent border-0 border-b-[1.5px] border-[#eab8b8] focus:border-[#d93025] pt-2.5 pb-5 text-[0.95rem] text-[#333] placeholder:text-[#eab8b8] placeholder:font-medium outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#d93025] hover:bg-[#b91c1c] text-white px-10 py-3 rounded-full text-base font-semibold cursor-pointer block mx-auto mt-[30px] shadow-[0_5px_15px_rgba(217,48,37,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-60"
              >
                {submitting ? "Submitting..." : formSubmitLabel}
              </button>
            </form>
          </div>

          <div
            className="relative w-full h-[460px] sm:h-[600px] rounded-[20px] bg-black overflow-hidden"
            style={{ boxShadow: "25px 25px 0px #faccc5" }}
          >
            {rightImages.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt="Brand Manager"
                className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-1000 ${
                  idx === bmIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
                }`}
              />
            ))}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.7), transparent 40%)",
              }}
            />
            <div className="absolute bottom-[30px] left-[30px] z-[5] text-white">
              <h3 className="text-[1.8rem] font-bold m-0">{rightTitle}</h3>
              <p className="text-[0.95rem] opacity-90 mt-1">{rightSubtitle}</p>
            </div>
          </div>
        </div>
      </section>

      <Footer settings={settings} footerNav={footerNav} />
    </div>
  );
}
