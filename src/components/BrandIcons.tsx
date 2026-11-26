import React from "react";

export function InstagramIcon({ className = "w-5 h-5", color = "#E1306C" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke={color} strokeWidth="2.1" />
      <circle cx="12" cy="12" r="4.2" stroke={color} strokeWidth="2.1" />
      <circle cx="17.5" cy="6.5" r="1.3" fill={color} />
    </svg>
  );
}

export function FacebookIcon({ className = "w-5 h-5", color = "#1877F2" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ color }} aria-hidden="true">
      <path d="M22.675 0h-21.35C.595 0 0 .593 0 1.326v21.348C0 23.407.595 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.894-4.788 4.66-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.405 24 24 23.407 24 22.674V1.326C24 .593 23.405 0 22.675 0z" />
    </svg>
  );
}

export function WhatsAppIcon({ className = "w-5 h-5", color = "#25D366" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ color }} aria-hidden="true">
      <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.391c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.422-.516.078-1.172.109-1.891-.125-.438-.141-.984-.328-1.688-.641-2.969-1.281-4.906-4.297-5.047-4.484-.141-.203-1.203-1.594-1.203-3.047s.75-2.172 1.031-2.469c.266-.297.578-.375.781-.375h.563c.188 0 .422-.063.656.516.25.609.844 2.047.922 2.203.078.156.125.328.031.531-.094.203-.156.328-.297.5-.156.172-.313.391-.453.516-.156.156-.313.313-.141.625.188.313.813 1.344 1.734 2.172 1.188 1.063 2.188 1.391 2.5 1.547.313.156.5.125.688-.078.188-.219.797-.922 1.016-1.234.219-.313.422-.266.719-.156.297.109 1.875.891 2.203 1.047.313.156.531.234.609.375.078.125.078.75-.172 1.453z" />
    </svg>
  );
}

export function YouTubeIcon({ className = "w-5 h-5", color = "#FF0000" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ color }} aria-hidden="true">
      <path d="M23.498 6.186a2.999 2.999 0 0 0-2.111-2.122C19.524 3.563 12 3.563 12 3.563s-7.524 0-9.387.501A2.999 2.999 0 0 0 .502 6.186C0 8.062 0 12 0 12s0 3.938.502 5.814a2.999 2.999 0 0 0 2.111 2.122C4.476 20.437 12 20.437 12 20.437s7.524 0 9.387-.501a2.999 2.999 0 0 0 2.111-2.122C24 15.938 24 12 24 12s0-3.938-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function SpotifyIcon({ className = "w-5 h-5", color = "#1DB954" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ color }} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.306a.748.748 0 0 1-1.028.248c-2.815-1.72-6.357-2.109-10.529-1.155a.749.749 0 1 1-.335-1.46c4.565-1.044 8.481-.594 11.644 1.34.353.215.464.675.248 1.027zm1.468-3.266a.937.937 0 0 1-1.287.308c-3.221-1.979-8.133-2.553-11.943-1.396a.937.937 0 0 1-.545-1.793c4.354-1.321 9.768-.681 13.467 1.593a.937.937 0 0 1 .308 1.288zm.126-3.401C15.235 8.346 8.864 8.135 5.177 9.254a1.123 1.123 0 1 1-.651-2.15c4.234-1.285 11.273-1.036 15.724 1.606a1.124 1.124 0 0 1-1.153 1.929z" />
    </svg>
  );
}

export function VerifiedBadgeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="Verified">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" />
      <path d="M8.5 12.2l2.3 2.3 4.8-5.1" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
