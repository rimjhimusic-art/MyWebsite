"use client";

import React, { useEffect, useState } from "react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("onetab_cookie_consent") !== "accepted") {
        setVisible(true);
      }
    } catch {
      // ignore storage access issues
    }
  }, []);

  if (!visible) return null;

  const handleClose = (choice: "accepted" | "dismissed") => {
    try {
      localStorage.setItem("onetab_cookie_consent", choice);
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div className="fixed bottom-5 left-5 right-5 sm:right-auto max-w-sm bg-[#18181b] border border-[#2a2a2a] rounded-2xl p-5 shadow-2xl z-40">
      <h4 className="text-base font-bold text-white mb-1.5">
        Your cookies, Your choice!
      </h4>
      <p className="text-xs text-[#b0b0b8] leading-relaxed mb-4">
        This platform uses essential session cookies for secure authentication
        and optional preference cookies to improve your distribution workflow.
      </p>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => handleClose("dismissed")}
          className="px-4 py-2.5 rounded-lg border border-[#2a2a2a] text-xs font-semibold text-white hover:bg-white/5 transition-colors"
        >
          Essential Only
        </button>
        <button
          type="button"
          onClick={() => handleClose("accepted")}
          className="flex-1 px-4 py-2.5 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-xs font-bold uppercase tracking-wide text-white transition-colors"
        >
          Allow All
        </button>
      </div>
    </div>
  );
}
