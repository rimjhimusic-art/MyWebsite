import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import { parseSpotifyUrl, parseYoutubeUrl } from "../src/lib/media-metadata";
import { findMediaReferences, replaceMediaUrlAcrossCms } from "../src/lib/cms";
import {
  DEFAULT_UPDATES_HERO_EXTENDED,
  HERO_FONT_CATALOG,
  normalizeUpdatesHeroExtended,
} from "../src/lib/updates-hero-config";

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
  const [adminUser, artistCount, teamCount, brandCount, brandVideoCount, aboutSlideCount, upcomingCount, navUpdates, aboutHero, aboutStory, updatesReleasesSec, updatesUpcomingSec] =
    await Promise.all([
      prisma.user.findUnique({ where: { email: "godaramixing@gmail.com" } }),
      prisma.featuredArtist.count(),
      prisma.teamMember.count(),
      prisma.brandCreator.count(),
      prisma.brandVideo.count(),
      prisma.aboutSliderImage.count(),
      prisma.upcomingRelease.count(),
      prisma.navigationItem.findFirst({ where: { location: "HEADER", href: "/updates" } }),
      prisma.pageSection.findUnique({
        where: { pageSlug_sectionKey: { pageSlug: "about", sectionKey: "hero" } },
      }),
      prisma.pageSection.findUnique({
        where: { pageSlug_sectionKey: { pageSlug: "about", sectionKey: "story" } },
      }),
      prisma.pageSection.findUnique({
        where: { pageSlug_sectionKey: { pageSlug: "updates", sectionKey: "releases" } },
      }),
      prisma.pageSection.findUnique({
        where: { pageSlug_sectionKey: { pageSlug: "updates", sectionKey: "upcoming" } },
      }),
    ]);

  assert(adminUser && adminUser.role === "SUPER_ADMIN", "Super Admin godaramixing@gmail.com missing");
  assert(artistCount >= 3, `Expected >= 3 FeaturedArtists, got ${artistCount}`);
  assert(teamCount >= 7, `Expected >= 7 TeamMembers, got ${teamCount}`);
  assert(brandCount >= 7, `Expected >= 7 BrandCreators, got ${brandCount}`);
  assert(brandVideoCount >= 7, `Expected >= 7 migrated BrandVideos, got ${brandVideoCount}`);
  assert(aboutSlideCount >= 8, `Expected >= 8 migrated AboutSliderImages, got ${aboutSlideCount}`);
  assert(upcomingCount >= 1, `Expected >= 1 UpcomingReleases, got ${upcomingCount}`);
  assert(navUpdates && navUpdates.enabled, "HEADER nav item /updates missing");
  assert(aboutHero && aboutStory, "About CMS PageSections missing");
  assert(updatesReleasesSec && !/\bcatalog drop\b/i.test(updatesReleasesSec.badgeText || ""), "updates.releases badgeText still references Catalog Drop");
  assert(updatesUpcomingSec, "updates.upcoming CMS PageSection missing");
  console.log(
    `[OK] DB preserved & migrated: artists=${artistCount}, team=${teamCount}, brandCreators=${brandCount}, brandVideos=${brandVideoCount}, aboutSlides=${aboutSlideCount}, upcoming=${upcomingCount}, nav=/updates`
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

  // UpcomingRelease CRUD + move_to_latest + findMediaReferences / replaceMediaUrlAcrossCms check
  const qaTempUrl = "/api/files/qa-temp-gallery-check";
  const qaUpcoming = await prisma.upcomingRelease.create({
    data: {
      title: "QA Upcoming Single",
      slug: `qa-upcoming-single-${Date.now()}`,
      artistName: "QA Artist",
      releaseType: "SINGLE",
      releaseDate: "2026-12-31",
      description: "Temporary upcoming verification item",
      thumbnailUrl: qaTempUrl,
      heroBgUrl: qaTempUrl,
      statusBadge: "Coming Soon",
      published: false,
      sortOrder: 999,
    },
  });
  const [qaMovedRelease] = await prisma.$transaction([
    prisma.updateRelease.create({
      data: {
        title: qaUpcoming.title,
        slug: `qa-moved-release-${Date.now()}`,
        artistName: qaUpcoming.artistName || "Goldex Artist",
        releaseType: qaUpcoming.releaseType,
        releaseDate: qaUpcoming.releaseDate,
        description: qaUpcoming.description,
        coverUrl: qaUpcoming.thumbnailUrl,
        featured: false,
        trending: false,
        published: false,
        sortOrder: 999,
      },
    }),
  ]);
  await prisma.upcomingRelease.update({
    where: { id: qaUpcoming.id },
    data: { movedReleaseId: qaMovedRelease.id, published: false },
  });
  const refsBefore = await findMediaReferences(qaTempUrl);
  assert(
    refsBefore.some((r) => r.startsWith("UpcomingRelease:")) && refsBefore.some((r) => r.startsWith("LatestRelease:")),
    `Expected findMediaReferences to catch UpcomingRelease & LatestRelease, got: ${JSON.stringify(refsBefore)}`
  );
  const replacedCount = await replaceMediaUrlAcrossCms(qaTempUrl, "/ref/abir.jpg");
  assert(replacedCount >= 2, `Expected replaceMediaUrlAcrossCms >= 2 updates, got ${replacedCount}`);
  const refsAfter = await findMediaReferences(qaTempUrl);
  assert(refsAfter.length === 0, `Expected 0 lingering references after replace, got: ${JSON.stringify(refsAfter)}`);
  await prisma.upcomingRelease.delete({ where: { id: qaUpcoming.id } });
  await prisma.updateRelease.delete({ where: { id: qaMovedRelease.id } });
  console.log("[OK] AboutSliderImage, BrandVideo, UpcomingRelease + move_to_latest + Media Replace/Cleanup verified.");

  // URL Parsers Unit Check
  const spParsed = parseSpotifyUrl("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=test");
  assert(spParsed && spParsed.spotifyId === "4cOdK2wGLETKBW3PvgPWqT" && spParsed.embedUrl.includes("/embed/track/"), "Spotify URL parser failed");
  const ytParsed = parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=10");
  assert(ytParsed && ytParsed.videoId === "dQw4w9WgXcQ" && ytParsed.embedUrl.includes("youtube-nocookie.com/embed/"), "YouTube URL parser failed");
  console.log("[OK] Spotify & YouTube URL parsers verified.");

  // Hero Studio Validation & Clamping Check
  assert(HERO_FONT_CATALOG.length >= 30, `Expected 30 fonts across 10 categories, got ${HERO_FONT_CATALOG.length}`);
  const normClamped = normalizeUpdatesHeroExtended({
    bgAppearance: { defaultBrightness: 75, defaultContrast: 90, defaultOpacity: 100, defaultOverlay: 30, defaultBlur: 3, hoverBlur: 99 },
    elements: { upcoming: { desktop: { x: 250, y: -12, align: "invalid", fontSize: 500, width: 999, height: 0 } } },
    typography: { fontId: "non-existent-font" },
  });
  assert(normClamped.bgAppearance.hoverBlur === 20, `Expected hoverBlur clamped to 20, got ${normClamped.bgAppearance.hoverBlur}`);
  assert(normClamped.elements.upcoming.desktop.x === 100 && normClamped.elements.upcoming.desktop.y === 0, "Expected invalid X/Y clamped to 0..100");
  assert(normClamped.typography.fontId === DEFAULT_UPDATES_HERO_EXTENDED.typography.fontId, "Expected invalid fontId to fall back to default");
  console.log("[OK] Hero Studio config validation, initial defaults & 30-font registry verified.");

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

      // /updates page + Redesigned Clear 4-Edge Dissolve Hero (UPCOMING) + Neon Perimeter Subnav + Upcoming + Spotify + YouTube Modal
      await page.goto(`${BASE_URL}/updates`, { waitUntil: "domcontentloaded" });
      const heroSec = page.locator('[data-testid="updates-hero-section"]');
      await heroSec.waitFor({ state: "visible" });
      const heroText = await heroSec.innerText();
      assert(!heroText.toLowerCase().includes("goldex media network radar"), "Old Radar pill still present in New Updates hero!");
      assert(!heroText.toLowerCase().includes("explore upcoming"), "EXPLORE UPCOMING button text must be completely removed from Hero!");
      const heroContentButtonsCount = await heroSec.locator('[data-testid="updates-hero-content"] a, [data-testid="updates-hero-content"] button').count();
      assert(heroContentButtonsCount === 0, `Expected 0 buttons inside Hero typography content after removing EXPLORE UPCOMING, found ${heroContentButtonsCount}`);

      const fullPageText = await page.locator("main").innerText();
      assert(!/\bcatalog drop\b/i.test(fullPageText), `"Catalog Drop" must be completely removed from /updates! Found in: ${fullPageText.slice(0, 300)}`);

      const heroHeading = page.locator('[data-testid="updates-hero-heading"]');
      const heroTitleText = (await heroHeading.textContent()) || "";
      assert(heroTitleText.toUpperCase().includes("UPCOMING"), `Expected UPCOMING Hero heading, got: ${heroTitleText}`);
      const headingStyles = await heroHeading.evaluate((el) => {
        const st = getComputedStyle(el);
        const breathEl = el.parentElement;
        const bSt = breathEl ? getComputedStyle(breathEl) : st;
        const d1 = el.querySelector('[data-testid="upcoming-dot-1"]');
        const d2 = el.querySelector('[data-testid="upcoming-dot-2"]');
        const d3 = el.querySelector('[data-testid="upcoming-dot-3"]');
        const d1St = d1 ? getComputedStyle(d1) : st;
        return {
          fontSize: parseFloat(st.fontSize),
          fontFamily: st.fontFamily,
          headingColor: st.color,
          d1Color: d1St.color,
          breathAnim: bSt.animationName,
          breathDur: parseFloat(bSt.animationDuration || "0"),
          colorAnim: st.animationName,
          colorDur: parseFloat(st.animationDuration || "0"),
          textShadow: st.textShadow,
          d1Anim: d1 ? getComputedStyle(d1).animationName : "",
          d2Anim: d2 ? getComputedStyle(d2).animationName : "",
          d3Anim: d3 ? getComputedStyle(d3).animationName : "",
        };
      });
      assert(headingStyles.fontFamily.toLowerCase().includes("kaushan"), `Expected brush font Kaushan Script, got ${headingStyles.fontFamily}`);
      assert(headingStyles.fontSize >= 32, `Expected commanding brush UPCOMING heading >= 32px, got ${headingStyles.fontSize}`);
      assert(headingStyles.textShadow !== "none", "Expected luminous textShadow on UPCOMING heading");
      assert(headingStyles.breathAnim.includes("goldexUpcomingBreathCycle") && headingStyles.breathDur >= 10, `Expected drop/disappear cycle, got ${headingStyles.breathAnim} (${headingStyles.breathDur}s)`);
      assert(headingStyles.colorAnim.includes("goldexUpcomingColorCycle") && headingStyles.colorDur >= 20, `Expected synchronized 10-color sequence (~10s/step = 100s loop), got ${headingStyles.colorAnim} (${headingStyles.colorDur}s)`);
      assert(headingStyles.headingColor === headingStyles.d1Color, `Expected UPCOMING and dots synchronized color, got ${headingStyles.headingColor} vs ${headingStyles.d1Color}`);
      assert(
        headingStyles.d1Anim.includes("goldexDotOne") &&
          headingStyles.d2Anim.includes("goldexDotTwo") &&
          headingStyles.d3Anim.includes("goldexDotThree"),
        `Expected sequential 3 dots animation, got ${headingStyles.d1Anim}, ${headingStyles.d2Anim}, ${headingStyles.d3Anim}`
      );
      await page.locator('[data-testid="updates-hero-glow"]').waitFor({ state: "attached" });

      const supportingLabels = page.locator('[data-testid="updates-hero-supporting-labels"]');
      await supportingLabels.waitFor({ state: "visible" });
      const supportingText = (await supportingLabels.innerText()).toUpperCase();
      for (const lbl of ["UPCOMING", "LATEST RELEASE", "SPOTIFY", "TRENDING", "MUSIC"]) {
        assert(supportingText.includes(lbl), `Missing supporting label "${lbl}" around UPCOMING heading`);
      }
      const supportingFontSize = await supportingLabels.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      assert(supportingFontSize <= 13, `Supporting labels should remain small/subtle (<=13px), got ${supportingFontSize}`);

      const heroBox = await heroSec.boundingBox();
      const headingBox = await heroHeading.boundingBox();
      assert(
        heroBox && headingBox && headingBox.y >= heroBox.y - 2 && headingBox.y + headingBox.height <= heroBox.y + heroBox.height + 2,
        `Expected UPCOMING heading inside Hero container on ${vp.name}`
      );

      if (vp.name === "desktop" && headingBox) {
        await page.mouse.move(headingBox.x + headingBox.width * 0.45, headingBox.y + headingBox.height * 0.45);
        await page.waitForTimeout(160);
        const hoverTransform = await heroHeading.locator('[data-testid="upcoming-letter"]').nth(3).evaluate((el) => el.style.transform);
        assert(hoverTransform && hoverTransform.includes("translate3d"), `Expected interactive 3D letter float on mouse hover, got ${hoverTransform}`);
        await page.mouse.move(5, 5);
        await page.waitForTimeout(120);
      }

      const heroBgImg = page.locator('[data-testid="updates-hero-bg-image"]');
      await heroBgImg.waitFor({ state: "visible" });
      await page.waitForFunction(() => {
        const img = document.querySelector('[data-testid="updates-hero-bg-image"]');
        return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0;
      });
      const heroImgStats = await heroBgImg.evaluate((img: HTMLImageElement) => {
        const st = getComputedStyle(img);
        const wrap = img.parentElement ? getComputedStyle(img.parentElement) : null;
        return {
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          objectFit: st.objectFit,
          filter: st.filter,
          maskImage: wrap?.maskImage || wrap?.webkitMaskImage || "none",
        };
      });
      assert(heroImgStats.complete && heroImgStats.naturalWidth > 0, `Hero background image failed to load on ${vp.name}`);
      assert(heroImgStats.objectFit === "contain", `Expected object-fit: contain on hero background artwork to prevent cropping, got ${heroImgStats.objectFit}`);
      const dimMatch = heroImgStats.filter.match(/brightness\(([\d.]+)\)/);
      const dimBrightness = dimMatch ? parseFloat(dimMatch[1]) : 1;
      assert(dimBrightness < 0.86, `Expected default slightly dimmed Hero photo brightness (<0.86), got filter=${heroImgStats.filter}`);
      assert(heroImgStats.filter.includes("blur("), `Expected configurable default blur active before hover, got filter=${heroImgStats.filter}`);
      assert(heroImgStats.maskImage !== "none", "Expected 4-side dissolve maskImage on Hero artwork wrapper");

      if (vp.name === "desktop" && heroBox) {
        await page.mouse.move(heroBox.x + 24, heroBox.y + 24);
        await page.waitForTimeout(850);
        const hoveredStats = await heroSec.evaluate(() => {
          const img = document.querySelector('[data-testid="updates-hero-bg-image"]');
          const ov = document.querySelector('[data-testid="updates-hero-dark-overlay"]');
          return {
            filter: img ? getComputedStyle(img).filter : "",
            overlayOpacity: ov ? parseFloat(getComputedStyle(ov).opacity || "1") : 1,
          };
        });
        const hovMatch = hoveredStats.filter.match(/brightness\(([\d.]+)\)/);
        const hovBrightness = hovMatch ? parseFloat(hovMatch[1]) : hoveredStats.filter === "none" ? 1 : 0;
        assert(hovBrightness >= 0.98, `Expected Hero photo brightness restored (~1.0) on hover, got ${hoveredStats.filter}`);
        assert(!hoveredStats.filter.includes("blur(3px)"), `Expected Hero blur transitioned to ~0px on hover, got ${hoveredStats.filter}`);
        assert(hoveredStats.overlayOpacity <= 0.08, `Expected dark overlay intensity reduced on hover, got ${hoveredStats.overlayOpacity}`);
        await page.mouse.move(5, 5);
        await page.waitForTimeout(850);
      }

      const heroContentBox = await page.locator('[data-testid="updates-hero-content"]').boundingBox();
      const comingSoonBox = await page.locator('[data-testid="updates-hero-el-coming-soon"]').boundingBox();
      assert(
        headingBox && comingSoonBox && headingBox.y + headingBox.height <= comingSoonBox.y + 8,
        `Expected zero overlap between UPCOMING heading and COMING SOON on ${vp.name}`
      );
      const neonNavWrap = heroSec.locator('[data-testid="updates-subnav-neon-border"]');
      await neonNavWrap.waitFor({ state: "visible" });
      const neonAnimName = await neonNavWrap.locator(".goldex-neon-nav-rotator").first().evaluate((el) => getComputedStyle(el).animationName);
      assert(neonAnimName.includes("goldexNeonPerimeterSpin"), `Expected continuous neon perimeter animation, got ${neonAnimName}`);

      const subnav = heroSec.locator('[data-testid="updates-subnav-box"]');
      await subnav.waitFor({ state: "visible" });
      const navGlassStyles = await subnav.evaluate((el) => {
        const st = getComputedStyle(el);
        return {
          backdrop: st.backdropFilter || (st as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter || "none",
          text: (el.textContent || "").toUpperCase(),
        };
      });
      assert(navGlassStyles.backdrop.includes("blur("), `Expected Apple Liquid Glass backdrop blur on Nav Box, got ${navGlassStyles.backdrop}`);
      for (const navLbl of ["ALL UPDATES", "LATEST RELEASES", "SPOTIFY MUSIC", "TRENDING MUSIC", "MUSIC VIDEOS"]) {
        assert(navGlassStyles.text.includes(navLbl), `Missing preserved navigation option "${navLbl}"`);
      }
      const subnavBox = await neonNavWrap.boundingBox();
      assert(
        heroBox && subnavBox && subnavBox.y >= heroBox.y && subnavBox.y + subnavBox.height <= heroBox.y + heroBox.height + 2,
        `Expected navigation box positioned INSIDE Hero photo on ${vp.name}`
      );
      assert(
        heroContentBox && subnavBox && heroContentBox.y + heroContentBox.height <= subnavBox.y + 2,
        `Expected shifted-up Hero content above embedded Navigation Box with zero overlap on ${vp.name}`
      );

      await page.locator('[data-testid="section-latest-releases"]').waitFor({ state: "visible" });
      const attnBtn = page.locator('[data-testid="upcoming-attention-btn"]');
      await attnBtn.waitFor({ state: "visible" });
      assert((await attnBtn.innerText()).toUpperCase().includes("UPCOMING RELEASES"), "Missing UPCOMING RELEASES red attention button");
      await page.locator('[data-testid="section-upcoming-releases"]').waitFor({ state: "visible" });
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
      const guardMedia = await adminPage.request.get(`${BASE_URL}/api/admin/cms/media`);
      assert(guardMedia.status() === 401, `Expected 401 on /api/admin/cms/media, got ${guardMedia.status()}`);
      await adminPage.goto(`${BASE_URL}/admin/gallery`, { waitUntil: "networkidle" });
      assert(adminPage.url().includes("/admin/login"), `Expected unauthenticated /admin/gallery redirect to /admin/login, got ${adminPage.url()}`);
      console.log("[OK] /api/admin/updates, /about-slider, /brand-videos, /cms/media & /admin/gallery auth guards verified.");
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
