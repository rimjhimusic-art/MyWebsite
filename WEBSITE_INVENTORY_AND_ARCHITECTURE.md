# OneTab-Style Music Distribution & Label Management Platform
## Phase 1: Complete Reference Website Inspection & Inventory

**Reference Website:** `https://www.onetabmedianetwork.com/`  
**Inspection Method:** Full HTTP/HTML/CSS/JS crawl across all sitemap URLs, navigation links, and common endpoints.

### 1. Public Route & Status Inventory (Observed)
| Reference URL | HTTP Status | Observed Title / Behavior | Independent Platform Route |
|---|---|---|---|
| `/` | 200 | `OneTab Media Network \| Music Distribution Services` | `/` |
| `/about` | 200 | `About - OneTab Media Network` | `/about` |
| `/brand` | 200 | `Brand Solutions - OneTab Media Network` | `/brand` |
| `/services` | 200 | `Services - OneTab Media Network` | `/services` |
| `/login` | 200 | `Login - OneTab Media Network` (Email/Password form) | `/login` |
| `/signup` / `/signup.php` | 200 | `Sign Up - OneTab Media Network` (Name, Email, Country, Password, Confirm, Terms) | `/register/artist` & `/signup` (redirect/alias), `/register/label` |
| `/terms.html` | 200 | `Terms and Conditions - OneTab Media Network` | `/terms` (plus `/terms.html` route) |
| `/privacy` | 200 | `Privacy Policy \| OneTab Media` | `/privacy` (plus `/privacy.html` route) |
| `/join-now` | **404** | Broken link on `/about` (`Join & Distribute` button) | Fixed -> `/register/artist` |
| `/careers`, `/contact`, `/faq`, `/help`, `/plans` | **404** (or `#` placeholder in footer) | Footer `#` links on `/services` (`Careers`, `Privacy`, `Terms`) | Implemented as full working pages: `/careers`, `/contact`, `/faq`, `/help`, `/plans` |
| `/chat.php?message=...` | 200 JSON | Floating AI/FAQ chatbot widget (`System Busy` error on live site due to expired API key) | `/api/chat` backed by DB `FaqItem` knowledge base + smart intent matcher |

### 2. Visual Design System (Extracted from Computed CSS)
- **Font Family:** `'Outfit', sans-serif` (weights 300–800)
- **Theme Tokens:**
  - Background: `#0f0f0f` (`--dark-bg`), `#0a0a0a` (footer), `#0d0d0d` (editorial), `#121212` (pricing banner)
  - Card Surface: `#18181b` (`--card-bg`)
  - Borders: `#2a2a2a` (`--border-color`)
  - Primary Accent: `#3b82f6` (`--primary`), Hover: `#2563eb`
  - VEVO Brand Red: `#E3001B` (`--vevo-red`)
  - Contact Section Navy: `#0f172a` / `#1e293b` with white form card `#ffffff` and `#ea580c` submit CTA
  - Text Colors: `#ffffff` (headings), `#b0b0b8` (body), `#71717a` (muted)
- **Responsive Breakpoints:** `900px` (mobile navbar drawer, stacked grids), `768px`, `600px` (compact navbar & stacked hero CTAs).

### 3. Homepage Section Inventory
1. **Fixed Translucent Navbar:** Logo, Nav Links (`Home`, `About`, `Brand Solutions`, `Services`, `Plans`, `Contact`), `Login / Sign Up` pill button, Mobile drawer toggle.
2. **Hero Section:** Animated dark ambient background, Headline `Sell Your Music Worldwide.`, Subtitle (150+ stores, 100% rights, monthly payouts), `Distribute Now` primary CTA, `View Plans` outline CTA.
3. **Featured Talent Showcase:** 3 interactive artist cards (`Abir Biswas`, `Keshab Dey`, `Raj Barman`) with verified checkmark, hover zoom, click triggers `canvas-confetti` + Artist Bio Modal with social links.
4. **Pricing Banner (`#plans`):** `Unlimited Distribution Starting at ₹0*/year` + transparent plan tier breakdown.
5. **Digital Music Store Logo Strip:** Infinite horizontal marquee (`Spotify`, `Apple Music`, `Wynk`, `JioSaavn`, `Gaana`, `Amazon Music`, `SoundCloud`, `YouTube Music`, `Deezer`, `TikTok`, `Instagram`, `Facebook`) + `and 150+ Digital Stores Available`.
6. **Distribution Network Section (`#OneTabRevolution`):** Promotional copy + India/Global distribution network SVG map with pulsing city markers (`New Delhi`, `Patna`, `Assam`, `Kolkata`, `Mumbai`, `Bengaluru`) and 4 floating glass stat pills (`1L+ Tracks`, `10M+ Plays`, `10K+ Artists`, `150+ Stores`).
7. **VEVO Distribution Section:** `Official VEVO Channel` badge, 4 feature cards (`Official Channel`, `Higher Revenue`, `Global Reach`, `Analytics`), `Start VEVO Distribution` CTA, and VEVO visual stats card (`2B+ Views`, `500K+ Videos`).
8. **Company Introduction ("What is OneTab?"):** Glass card highlighting Vydia-architecture partner model, `90% Revenue Share`, `Zero Upfront Fees`, `100% Master Ownership`, CTA to Distribution Plans.
9. **Music Distribution Guide (SEO Editorial Section):** Detailed guide on digital music distribution, independent artist rights, and royalty transparency.
10. **Contact Form Section (`#contact`):** Deep navy info card (`support@onetabmedia.in`) + white contact form (Name, Email, Phone, Message) submitting to `POST /api/contact`.
11. **Footer:** Brand description, Social icons, Quick Links (all working routes), Contact info, Copyright.
12. **Cookie Consent Banner & Floating Support Chatbot (`OneTab Assistant`):** Bottom-left cookie choice banner + bottom-right floating chatbot trigger opening interactive FAQ assistant window.

---

## Phase 2: System Architecture & Database Design

### Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 + custom Outfit theme tokens
- **Backend:** Next.js Route Handlers (REST API `/api/**`) with `zod` validation, rate limiting, CSRF/origin checks, and server-side RBAC
- **Database:** Prisma ORM (`prisma/schema.prisma`) running SQLite (`dev.db`) locally with zero external daemon dependencies, plus `prisma/schema.postgresql.prisma` for production PostgreSQL deployment
- **File Storage:** Pluggable S3-compatible Object Storage adapter (`src/lib/storage.ts`) supporting AWS S3 / R2 / MinIO when `S3_*` env vars are provided, falling back to local S3-style object storage under `./storage/` served securely via authenticated `/api/files/[...key]`
- **Integrations:** Pluggable partner adapters (`Vydia`, `Spotify`, `Apple Music`, `YouTube`, `Payment`, `Email`) with honest `PENDING_CREDENTIALS` / `INTERNAL_REVIEW` states when external API credentials are absent.
