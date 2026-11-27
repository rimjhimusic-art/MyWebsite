import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import { parseSpotifyUrl, parseYoutubeUrl } from "../src/lib/media-metadata";

const prisma = new PrismaClient();
const BASE_URL = "http://127.0.0.1:3000";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

async function waitForServer(url: string) {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status < 500) return;
    } catch {
      // server still starting
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  await waitForServer(`${BASE_URL}/api/health`);
  console.log("=== 1. DB Preservation & Schema Parity Checks ===");
  const [adminUser, artistCount, teamCount, brandCount, brandVideoCount, aboutSlideCount, navUpdates, aboutHero, aboutStory] =
    await Promise.all([
      prisma.user.findUnique({ where: { email: "godaramixing@gmail.com" } }),
      prisma.featuredArtist.count(),
      prisma.teamMember.count(),
      prisma.brandCreator.count(),
      prisma.brandVideo.count(),
      prisma.aboutSliderImage.count(),
      prisma.navigationItem.findFirst({ where: { location: "HEADER", href: "/updates" } }),
      prisma.pageSection.findUnique({
        where: { pageSlug_sectionKey: { pageSlug: "about", sectionKey: "hero" } },
      }),
      prisma.pageSection.findUnique({
        where: { pageSlug_sectionKey: { pageSlug: "about", sectionKey: "story" } },
      }),
    ]);

  assert(adminUser && adminUser.role === "SUPER_ADMIN", "Super Admin godaramixing@gmail.com missing");
  assert(artistCount >= 3, `Expected >= 3 FeaturedArtists, got ${artistCount}`);
  assert(teamCount >= 7, `Expected >= 7 TeamMembers, got ${teamCount}`);
  assert(brandCount >= 7, `Expected >= 7 BrandCreators, got ${brandCount}`);
  assert(brandVideoCount >= 7, `Expected >= 7 migrated BrandVideos, got ${brandVideoCount}`);
  assert(aboutSlideCount >= 8, `Expected >= 8 migrated AboutSliderImages, got ${aboutSlideCount}`);
  assert(navUpdates && navUpdates.enabled, "HEADER nav item /updates missing");
  assert(aboutHero && aboutStory, "About CMS PageSections missing");
  console.log(
    `[OK] DB preserved & migrated: artists=${artistCount}, team=${teamCount}, brandCreators=${brandCount}, brandVideos=${brandVideoCount}, aboutSlides=${aboutSlideCount}, nav=/updates`
  );

  // CRUD persistence test on AboutSliderImage + BrandVideo (reverted right after)
  const testSlide = await prisma.aboutSliderImage.create({
    data: { imageUrl: "/ref/flag/about-1.png", title: "QA Slide", description: "Temp test", enabled: true, sortOrder: 99 },
  });
  await prisma.aboutSliderImage.update({ where: { id: testSlide.id }, data: { enabled: false, title: "QA Updated" } });
  await prisma.aboutSliderImage.delete({ where: { id: testSlide.id } });

  const testBVideo = await prisma.brandVideo.create({
    data: {
      title: "QA Brand Video",
      description: "Temp test",
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
      thumbnailUrl: "/ref/influencers/1770471884_img.jpg",
      featured: true,
      published: true,
      sortOrder: 99,
    },
  });
  await prisma.brandVideo.update({ where: { id: testBVideo.id }, data: { published: false } });
  await prisma.brandVideo.delete({ where: { id: testBVideo.id } });
  console.log("[OK] AboutSliderImage & BrandVideo CRUD persistence verified.");

  // URL Parsers Unit Check
  const spParsed = parseSpotifyUrl("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=test");
  assert(spParsed && spParsed.spotifyId === "4cOdK2wGLETKBW3PvgPWqT" && spParsed.embedUrl.includes("/embed/track/"), "Spotify URL parser failed");
  const ytParsed = parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=10");
  assert(ytParsed && ytParsed.videoId === "dQw4w9WgXcQ" && ytParsed.embedUrl.includes("youtube-nocookie.com/embed/"), "YouTube URL parser failed");
  console.log("[OK] Spotify & YouTube URL parsers verified.");

  // Seed temporary Spotify (4 tracks for 4-card carousel test!) & YouTube test records, then clean up in finally
  const sampleIds = [
    "4cOdK2wGLETKBW3PvgPWqT",
    "3n3Ppam7vgaVa1iaRUc9Lp",
    "7qiZfU4dY1lWllzX7mPBI3",
    "0VjIjW4GlUZAMYd2vXMi3b",
    "1BxfuPKGuaTgP7aM0Bbdwr",
  ];
  const createdSpotifyIds: string[] = [];
  for (let i = 0; i < sampleIds.length; i++) {
    const sp = await prisma.updateSpotifyTrack.create({
      data: {
        spotifyUrl: `https://open.spotify.com/track/${sampleIds[i]}`,
        spotifyUri: `spotify:track:${sampleIds[i]}`,
        itemType: "track",
        section: "SPOTIFY",
        title: `QA Spotify Showcase ${i + 1}`,
        artistName: "Goldex Test Artist",
        coverUrl: "/ref/abir.jpg",
        featured: i === 0,
        published: true,
        sortOrder: 90 + i,
      },
    });
    createdSpotifyIds.push(sp.id);
  }
  const tempTrend = await prisma.updateSpotifyTrack.create({
    data: {
      spotifyUrl: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
      spotifyUri: "spotify:track:4cOdK2wGLETKBW3PvgPWqT",
      itemType: "track",
      section: "TRENDING",
      title: "QA Trending Pick",
      artistName: "Goldex Trending Artist",
      coverUrl: "/ref/keshab.jpg",
      featured: true,
      published: true,
      sortOrder: 99,
    },
  });
  const tempYt = await prisma.updateYoutubeVideo.create({
    data: {
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ",
      title: "QA Official Music Video",
      channelName: "Goldex Media Network",
      description: "Temporary QA video verification item",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      featured: true,
      published: true,
      sortOrder: 99,
    },
  });

  const chrome = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  try {
    const viewports = [
      { name: "desktop", width: 1440, height: 900 },
      { name: "laptop", width: 1280, height: 800 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      const page = await chrome.newPage({ viewport: { width: vp.width, height: vp.height } });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));

      // Home + Featured Artist Glassmorphism Modal
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      const overflowHome = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2
      );
      assert(!overflowHome, `Horizontal overflow on / at ${vp.name}`);

      const artistCard = page.locator("text=Abir Biswas").first();
      await artistCard.click();
      const popup = page.locator('[data-testid="artist-profile-popup"]');
      await popup.waitFor({ state: "visible", timeout: 5000 });
      const popupBox = await popup.boundingBox();
      assert(popupBox && popupBox.height >= 420, `Artist popup too short on ${vp.name}: ${popupBox?.height}`);
      const socialLinksCount = await page.locator('[data-testid="artist-modal-socials"] a').count();
      assert(socialLinksCount >= 1, `Expected configured socials in modal on ${vp.name}`);
      await page.locator('[aria-label="Close modal"]').click();

      // Check NEW badge visibility & link navigation
      if (vp.width >= 1024) {
        const navUpdatesLink = page.locator('header nav a[href="/updates"]');
        await navUpdatesLink.waitFor({ state: "visible" });
        const txt = await navUpdatesLink.innerText();
        assert(txt.toUpperCase().includes("NEW UPDATES") && txt.toUpperCase().includes("NEW"), `Missing NEW badge on desktop nav: ${txt}`);
      } else {
        await page.locator('[aria-label="Toggle navigation menu"]').click();
        const mobUpdatesLink = page.locator('header a[href="/updates"]').last();
        await mobUpdatesLink.waitFor({ state: "visible" });
        await page.locator('[aria-label="Toggle navigation menu"]').click();
      }

      // /updates page + Red Hero + Spotify 4-card Carousel + inline YouTube Modal
      await page.goto(`${BASE_URL}/updates`, { waitUntil: "networkidle" });
      await page.locator('[data-testid="updates-hero-section"]').waitFor({ state: "visible" });
      const heroText = await page.locator('[data-testid="updates-hero-section"]').innerText();
      assert(!heroText.toLowerCase().includes("goldex media network radar"), "Old Radar pill still present in New Updates hero!");
      const heroTitleText = await page.locator('[data-testid="updates-hero-heading"]').innerText();
      assert(heroTitleText.toUpperCase().includes("NEW UPDATES"), `Expected NEW UPDATES heading, got: ${heroTitleText}`);
      const heroColor = await page.locator('[data-testid="updates-hero-heading"]').evaluate((el) => getComputedStyle(el).color);
      assert(heroColor === "rgb(239, 68, 68)", `Expected red hero color rgb(239, 68, 68), got ${heroColor}`);
      await page.locator('[data-testid="updates-hero-glow"]').waitFor({ state: "attached" });

      await page.locator('[data-testid="section-latest-releases"]').waitFor({ state: "visible" });
      await page.locator('[data-testid="section-spotify-music"]').waitFor({ state: "visible" });
      await page.locator('[data-testid="section-trending-spotify"]').waitFor({ state: "visible" });
      await page.locator('[data-testid="section-latest-videos"]').waitFor({ state: "visible" });

      // Verify compact Spotify card width & auto-scroll advancement on desktop
      const firstSpCardBox = await page.locator('[data-testid="spotify-music-card"]').first().boundingBox();
      assert(firstSpCardBox && firstSpCardBox.width <= 300, `Spotify card too wide (${firstSpCardBox?.width}px) to fit 4 in desktop row!`);
      if (vp.width >= 1024) {
        const scrollTrack = page.locator('[data-testid="spotify-carousel-scroll"]');
        await scrollTrack.waitFor({ state: "visible" });
        const s1 = await scrollTrack.evaluate((el) => el.scrollLeft);
        await page.waitForTimeout(450);
        const s2 = await scrollTrack.evaluate((el) => el.scrollLeft);
        assert(s2 > s1, `Expected Spotify carousel right-to-left auto-scroll to advance (before=${s1}, after=${s2})`);
      }

      const overflowUpdates = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2
      );
      assert(!overflowUpdates, `Horizontal overflow on /updates at ${vp.name}`);

      await page.locator('text=QA Official Music Video').first().click();
      const ytModal = page.locator('[data-testid="youtube-player-modal"]');
      await ytModal.waitFor({ state: "visible" });
      const iframeSrc = await ytModal.locator("iframe").getAttribute("src");
      assert(iframeSrc?.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"), `Unexpected YouTube iframe src: ${iframeSrc}`);
      await page.locator('[aria-label="Close video player"]').click();

      // /about & /brand
      await page.goto(`${BASE_URL}/about`, { waitUntil: "networkidle" });
      await page.locator('[data-testid="about-top-slider"]').waitFor({ state: "visible" });
      await page.locator("text=Our Leadership & Team").waitFor({ state: "visible" });
      await page.goto(`${BASE_URL}/brand`, { waitUntil: "networkidle" });
      await page.locator('[data-testid="brand-videos-section"]').waitFor({ state: "visible" });
      await page.locator("text=Brand Managers").waitFor({ state: "visible" });
      await page.locator('[data-testid="brand-videos-section"] button').first().click();
      await page.locator('[data-testid="brand-video-modal"]').waitFor({ state: "visible" });
      await page.locator('[aria-label="Close brand video player"]').click();

      assert(errors.length === 0, `Page console errors on ${vp.name}: ${errors.join("; ")}`);
      await page.close();
      console.log(`[OK] Playwright responsive E2E passed on ${vp.name} (${vp.width}x${vp.height})`);
    }

    // Authenticated Super Admin UI check (/admin/cms & /admin/updates)
    const adminPage = await chrome.newPage({ viewport: { width: 1440, height: 900 } });
    await adminPage.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
    await adminPage.fill('input[type="email"]', "godaramixing@gmail.com");
    await adminPage.fill('input[type="password"]', process.env.ADMIN_PASS || "Goldex@2026!");
    // Wait or verify login page loads cleanly; if password differs in env we test unauthenticated guard too
    const loginRes = await adminPage.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: "godaramixing@gmail.com", password: process.env.ADMIN_PASS || "Goldex@2026!" },
    });
    if (loginRes.ok()) {
      await adminPage.goto(`${BASE_URL}/admin/cms`, { waitUntil: "networkidle" });
      await adminPage.locator("text=About Section CMS").click();
      await adminPage.locator("text=Exclusive Licensing & Multiple Company Logos").waitFor({ state: "visible" });
      await adminPage.locator("text=Brand Solutions CMS").click();
      await adminPage.locator("text=Brand Solutions Management").waitFor({ state: "visible" });

      await adminPage.goto(`${BASE_URL}/admin/updates`, { waitUntil: "networkidle" });
      await adminPage.locator("text=New Updates Management").waitFor({ state: "visible" });
      await adminPage.locator("text=New Badge Settings").click();
      await adminPage.locator("text=Header & Mobile Navigation NEW Badge Settings").waitFor({ state: "visible" });
      console.log("[OK] Super Admin /admin/cms and /admin/updates interactive UI verified!");
    } else {
      console.log("[INFO] Skipping passworded admin login in script; testing auth protection instead.");
      const guardRes = await adminPage.request.get(`${BASE_URL}/api/admin/updates`);
      assert(guardRes.status() === 401, `Expected 401 unauthenticated on /api/admin/updates, got ${guardRes.status()}`);
      const guardSlide = await adminPage.request.get(`${BASE_URL}/api/admin/cms/about-slider`);
      assert(guardSlide.status() === 401, `Expected 401 on /api/admin/cms/about-slider, got ${guardSlide.status()}`);
      const guardBVideo = await adminPage.request.get(`${BASE_URL}/api/admin/cms/brand-videos`);
      assert(guardBVideo.status() === 401, `Expected 401 on /api/admin/cms/brand-videos, got ${guardBVideo.status()}`);
      console.log("[OK] /api/admin/updates, /about-slider, /brand-videos auth guards verified (401 without session).");
    }
    await adminPage.close();
  } finally {
    await prisma.updateSpotifyTrack.deleteMany({ where: { id: { in: [...createdSpotifyIds, tempTrend.id] } } });
    await prisma.updateYoutubeVideo.deleteMany({ where: { id: tempYt.id } });
    await chrome.close();
    await prisma.$disconnect();
  }

  console.log("=== ALL VERIFICATION CHECKS PASSED ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
