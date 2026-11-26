"use client";

import React, { useState } from "react";
import { Search, ChevronDown } from "lucide-react";

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export function FaqClient({ faqs }: { faqs: Faq[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  const categories = ["All", ...Array.from(new Set(faqs.map((f) => f.category)))];

  const filtered = faqs.filter((f) => {
    const matchCat = category === "All" || f.category === category;
    const q = query.trim().toLowerCase();
    const matchText =
      !q ||
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q);
    return matchCat && matchText;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#71717a] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#18181b] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#3b82f6]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                category === cat
                  ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                  : "bg-[#18181b] border-[#2a2a2a] text-[#b0b0b8] hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#18181b] border border-[#2a2a2a] text-center text-sm text-[#71717a]">
            No matching questions found.
          </div>
        ) : (
          filtered.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl bg-[#18181b] border border-[#2a2a2a] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#3b82f6]">
                      {faq.category}
                    </span>
                    <h3 className="font-bold text-base text-white mt-0.5">
                      {faq.question}
                    </h3>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[#71717a] shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-[#3b82f6]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-[#b0b0b8] leading-relaxed border-t border-white/5">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
