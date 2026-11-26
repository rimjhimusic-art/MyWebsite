import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "/tmp/local_shots";
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    console.log("1. Testing Home Page & Part 1 Logo/Icon Fixes...");
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "home_top.png") });

    // Check Header logo & Distribute Now CTA href
    const homeCheck = await page.evaluate(() => {
      const headerImg = document.querySelector("header img");
      const footerEl = document.querySelector("footer");
      const footerText = footerEl?.textContent || "";
      const footerSvgs = footerEl?.querySelectorAll("a svg").length || 0;
      const distLink = Array.from(document.querySelectorAll("a")).find((a) =>
        a.textContent?.includes("Distribute Now")
      );
      return {
        headerLogoLoaded: Boolean(headerImg && headerImg.naturalWidth > 0),
        footerSvgs,
        hasRawIgFbWa:
          /\bIG\b|\bFB\b|\bWA\b/.test(footerText),
        distHref: distLink?.getAttribute("href"),
      };
    });
    assert.equal(homeCheck.headerLogoLoaded, true, "Header logo must load");
    assert.equal(homeCheck.hasRawIgFbWa, false, "Footer must NOT show raw IG/FB/WA text");
    assert.ok(homeCheck.footerSvgs >= 3, "Footer must render real SVG social icons");
    assert.equal(homeCheck.distHref, "/signup", "Hero Distribute Now CTA must link to /signup");

    // Capture Footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, "home_footer.png") });

    // Scroll to Featured Talent & Open Modal
    await page.evaluate(() => window.scrollTo(0, 620));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "home_talent.png") });

    const artistCards = page.locator('[data-testid="featured-artist-card"]');
    assert.equal(await artistCards.count(), 3, "Expected 3 seeded featured artists");
    await artistCards.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "home_artist_modal.png") });

    const modalCheck = await page.evaluate(() => {
      const socialLinks = Array.from(
        document.querySelectorAll('[data-testid="artist-modal-socials"] a')
      );
      return {
        count: socialLinks.length,
        hasSvgIcons: socialLinks.every((a) => a.querySelectorAll("svg").length > 0),
        allOpenNewTab: socialLinks.every((a) => a.getAttribute("target") === "_blank"),
        hrefs: socialLinks.map((a) => a.getAttribute("href")),
        rawText: socialLinks.map((a) => (a.textContent || "").trim()).filter(Boolean),
      };
    });
    assert.ok(modalCheck.count >= 3, "Artist modal must show artist social icons");
    assert.equal(modalCheck.hasSvgIcons, true, "Artist modal social links must contain SVGs");
    assert.equal(modalCheck.allOpenNewTab, true, "Artist social links must open in new tab");
    assert.equal(modalCheck.rawText.length, 0, "Artist modal must not display FB/IG/YT text");
    assert.ok(
      modalCheck.hrefs.some((h) => h && h.includes("abirbiswaslife")),
      "Modal social link must use artist's actual URL"
    );

    // Close modal
    await page.locator('button[aria-label="Close modal"]').click();

    console.log("2. Testing /signup Hero CTA Destination & 6 Official Logos...");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('a:has-text("Distribute Now")').click();
    await page.waitForURL("**/signup");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "signup_top.png") });

    const signupCheck = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.textContent?.trim() || "";
      const imgs = Array.from(
        document.querySelectorAll('[data-testid="signup-platform-logos"] img')
      );
      return {
        h1,
        logoCount: imgs.length,
        allLoaded: imgs.every((img) => img.naturalWidth > 0),
        alts: imgs.map((img) => img.getAttribute("alt")),
      };
    });
    assert.equal(signupCheck.h1, "Music Distribution Simplified.");
    assert.equal(signupCheck.logoCount, 6, "Must display all 6 signup platform logos");
    assert.equal(signupCheck.allLoaded, true, "All 6 signup logos must load cleanly");

    console.log("3. Testing /services Icons, Accordions & Colors...");
    await page.goto(`${BASE_URL}/services`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "services_top.png") });
    await page.screenshot({ path: path.join(OUT_DIR, "services_full.png"), fullPage: true });
    const serviceCards = page.locator('[data-testid="service-accordion-card"]');
    assert.equal(await serviceCards.count(), 12, "Services page must render 12 cards");
    await serviceCards.nth(1).click();
    await page.waitForTimeout(200);
    const expandedText = await serviceCards.nth(1).textContent();
    assert.ok(expandedText?.includes("Official Artist Channel management"));

    console.log("4. Testing /about and /brand...");
    await page.goto(`${BASE_URL}/about`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "about_top.png") });

    await page.goto(`${BASE_URL}/brand`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, "brand_top.png") });

    console.log("5. Testing Mobile Viewport...");
    const mCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    const mPage = await mCtx.newPage();
    await mPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await mPage.waitForTimeout(500);
    await mPage.screenshot({ path: path.join(OUT_DIR, "home_mobile.png") });
    await mCtx.close();

    console.log("6. Testing Auth Guard & CMS Admin Studio Workflow (Draft -> Preview -> Publish -> Carousel -> Cleanup)...");
    await page.goto(`${BASE_URL}/admin/cms`, { waitUntil: "networkidle" });
    assert.ok(page.url().includes("/admin/login"), "Unauthenticated /admin/cms must redirect to /admin/login");

    const adminEmail = process.env.TEST_ADMIN_EMAIL || "";
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || "";
    if (!adminEmail || !adminPassword) {
      throw new Error("TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD env vars are required.");
    }
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.includes("/login"), {
      timeout: 15000,
    });
    await page.goto(`${BASE_URL}/admin/cms`, { waitUntil: "load" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, "admin_cms.png") });

    // Edit hero subtitle as DRAFT via UI
    const originalSubtitle =
      "Upload your tracks to Spotify, Apple Music, TikTok, and 150+ digital stores. Keep 100% of your rights and receive monthly payouts.";
    // Ensure clean baseline first
    await page.locator("textarea").first().fill(originalSubtitle);
    await page.click('button:has-text("Save & Publish Live")');
    await page.waitForTimeout(500);

    const draftSubtitle = "DRAFT TEST: Upload your tracks to 150+ stores worldwide with CMS preview active.";
    await page.locator("textarea").first().fill(draftSubtitle);
    await page.click('button:has-text("Save Draft (Preview with ?preview=1)")');
    await page.waitForTimeout(500);

    // Public visitor route (live) MUST STILL show originalSubtitle
    const liveRes = await page.request.get(`${BASE_URL}/`);
    const liveHtml = await liveRes.text();
    assert.ok(liveHtml.includes("Keep 100% of your rights"), "Live site must stay untouched while in Draft");
    assert.ok(!liveHtml.includes("DRAFT TEST:"), "Live site must NOT leak unpublished drafts");

    // Authenticated Preview (?preview=1) MUST show draftSubtitle
    await page.goto(`${BASE_URL}/?preview=1`, { waitUntil: "load" });
    const previewBody = await page.textContent("body");
    assert.ok(previewBody?.includes("DRAFT TEST:"), "Preview mode must show saved draft");

    // Now return to /admin/cms and Publish Changes Live, verify live reflects edit, then restore original!
    await page.goto(`${BASE_URL}/admin/cms`, { waitUntil: "load" });
    await page.waitForTimeout(600);
    await page.click('[data-testid="cms-publish-all-btn"]');
    await page.waitForTimeout(600);

    await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
    const afterPublishBody = await page.textContent("body");
    assert.ok(afterPublishBody?.includes("DRAFT TEST:"), "Published CMS change must appear live on /");

    // Restore original subtitle via API and test adding a 4th featured artist -> triggers Carousel!
    await page.goto(`${BASE_URL}/admin/cms`, { waitUntil: "load" });
    await page.waitForTimeout(600);
    await page.locator("textarea").first().fill(originalSubtitle);
    await page.click('button:has-text("Save & Publish Live")');
    await page.waitForTimeout(500);

    // Test adding 4th Featured Artist -> Automatic Carousel on /
    const addRes = await page.request.post(`${BASE_URL}/api/admin/cms/artists`, {
      data: {
        name: "Test Carousel Artist",
        roleBadge: "Indie Singer",
        bio: "Added dynamically via CMS E2E verification.",
        imageUrl: "/ref/abir.jpg",
        instagramUrl: "https://instagram.com/onetab.media",
        published: true,
        mode: "publish",
      },
    });
    assert.equal(addRes.status(), 201, "4th artist creation must return 201");
    const added = await addRes.json();

    await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
    const carouselCount = await page.locator('[data-testid="featured-artist-carousel"]').count();
    assert.equal(carouselCount, 1, "Adding a 4th featured artist must activate carousel mode on Homepage");

    // Clean up 4th artist so homepage restores clean 3-card parity
    const delRes = await page.request.delete(
      `${BASE_URL}/api/admin/cms/artists?id=${added.item.id}&mode=publish`
    );
    assert.equal(delRes.status(), 200, "Deleting test artist must succeed");

    await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
    const carouselCountAfter = await page.locator('[data-testid="featured-artist-carousel"]').count();
    assert.equal(carouselCountAfter, 0, "Removing 4th artist restores 3-card grid");

    // Test JSON Backup Export endpoint
    const backupRes = await page.request.get(`${BASE_URL}/api/admin/cms/backup`);
    assert.equal(backupRes.status(), 200);
    const backupJson = await backupRes.json();
    assert.ok(Array.isArray(backupJson.data?.artists) && backupJson.data.artists.length === 3);

    console.log("ALL E2E ASSERTIONS PASSED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("E2E verification failed:", err);
  process.exit(1);
});
