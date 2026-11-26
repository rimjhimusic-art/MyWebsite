import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "/tmp/ref_shots";
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = "https://www.onetabmedianetwork.com";

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const report = {};

  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await desktop.newPage();

    const pages = [
      { key: "home", url: "/" },
      { key: "about", url: "/about" },
      { key: "brand", url: "/brand" },
      { key: "services", url: "/services" },
      { key: "plan", url: "/plan" },
      { key: "control", url: "/control" },
      { key: "signup", url: "/signup" },
      { key: "login", url: "/login" },
    ];

    for (const p of pages) {
      const target = `${BASE_URL}${p.url}`;
      console.log(`Inspecting ${target}...`);
      try {
        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1800);

        await page.screenshot({
          path: path.join(OUT_DIR, `${p.key}_top.png`),
          fullPage: false,
        });
        await page.screenshot({
          path: path.join(OUT_DIR, `${p.key}_full.png`),
          fullPage: true,
        });

        const info = await page.evaluate(() => {
          const title = document.title;
          const navLinks = Array.from(document.querySelectorAll("header a, nav a")).map((a) => ({
            text: (a.textContent || "").trim(),
            href: a.getAttribute("href"),
          }));
          const headerImgs = Array.from(document.querySelectorAll("header img, nav img")).map((img) => ({
            src: img.getAttribute("src"),
            w: img.getBoundingClientRect().width,
            h: img.getBoundingClientRect().height,
          }));
          const footerHtml = document.querySelector("footer")?.innerHTML?.slice(0, 4000) || "";
          const footerSocials = Array.from(document.querySelectorAll("footer a")).map((a) => ({
            href: a.getAttribute("href"),
            text: (a.textContent || "").trim(),
            html: a.innerHTML.trim().slice(0, 300),
          }));
          const heroCtas = Array.from(document.querySelectorAll(".hero a, .hero-section a, section:first-of-type a")).map((a) => ({
            text: (a.textContent || "").trim(),
            href: a.getAttribute("href"),
          }));
          const h1 = document.querySelector("h1")?.textContent?.trim() || "";
          return { title, url: window.location.href, h1, navLinks, headerImgs, footerSocials, heroCtas, footerHtmlLen: footerHtml.length };
        });

        // Page-specific inspections
        if (p.key === "home") {
          const homeDetails = await page.evaluate(() => {
            const sections = Array.from(document.querySelectorAll("section, .section, footer")).map((el, i) => ({
              idx: i,
              tag: el.tagName,
              cls: el.className,
              id: el.id,
              bg: getComputedStyle(el).backgroundColor,
              h: Math.round(el.getBoundingClientRect().height),
              heading: el.querySelector("h1,h2,h3")?.textContent?.trim()?.slice(0, 80) || "",
            }));
            const talentCards = Array.from(document.querySelectorAll(".talent-card, .artist-card, [onclick*='openModal'], [data-artist]")).map((c) => ({
              cls: c.className,
              text: (c.textContent || "").trim().slice(0, 120),
              onclick: c.getAttribute("onclick"),
              img: c.querySelector("img")?.getAttribute("src"),
            }));
            const storeImgs = Array.from(document.querySelectorAll(".marquee img, .stores img, .platforms img, img[src*='store'], img[src*='logo']")).map((img) => ({
              src: img.getAttribute("src"),
              alt: img.getAttribute("alt"),
            }));
            return { sections, talentCards, storeImgs };
          });
          info.homeDetails = homeDetails;

          // Scroll & capture key homepage sections
          const scrollSpots = [
            { name: "home_talent", y: 820 },
            { name: "home_stores", y: 1500 },
            { name: "home_revolution", y: 2250 },
            { name: "home_vevo", y: 2950 },
            { name: "home_footer", y: 99999 },
          ];
          for (const s of scrollSpots) {
            await page.evaluate((y) => window.scrollTo(0, y), s.y);
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(OUT_DIR, `${s.name}.png`), fullPage: false });
          }

          // Click first talent card if modal exists
          await page.evaluate(() => window.scrollTo(0, 820));
          await page.waitForTimeout(300);
          const firstCard = page.locator(".talent-card, .artist-card, [onclick*='Modal'], [onclick*='Artist']").first();
          if (await firstCard.count()) {
            await firstCard.click().catch(() => {});
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(OUT_DIR, "home_artist_modal.png"), fullPage: false });
            info.modalHtml = await page.evaluate(() => {
              const modal = document.querySelector(".modal, #artistModal, [class*='modal'][style*='flex'], [class*='modal'].active, [class*='modal'].show");
              return modal ? modal.innerHTML.slice(0, 3000) : "";
            });
          }
        }

        if (p.key === "services") {
          info.serviceCards = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll(".service-card, .card, .services-grid > div"));
            return cards.map((c, idx) => {
              const iconBox = c.querySelector(".icon-box, .service-icon, i, svg")?.parentElement || c.querySelector(".icon-box, .service-icon");
              const iconEl = c.querySelector("i, svg, img");
              return {
                idx,
                title: c.querySelector("h2,h3,h4")?.textContent?.trim() || "",
                iconClass: iconEl?.getAttribute("class") || iconEl?.tagName || "",
                iconBoxClass: iconBox?.className || "",
                iconColor: iconEl ? getComputedStyle(iconEl).color : "",
                boxBg: iconBox ? getComputedStyle(iconBox).backgroundColor : "",
              };
            });
          });
        }

        if (p.key === "signup") {
          info.signupDetails = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll("img, svg")).map((el) => ({
              tag: el.tagName,
              src: el.getAttribute("src"),
              alt: el.getAttribute("alt"),
              cls: el.getAttribute("class"),
            }));
            return {
              h1: document.querySelector("h1")?.textContent?.trim(),
              h2: document.querySelector("h2")?.textContent?.trim(),
              imgs,
            };
          });
        }

        report[p.key] = info;
      } catch (err) {
        report[p.key] = { error: String(err) };
      }
    }

    // Mobile screenshots
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    const mpage = await mobile.newPage();
    for (const p of [
      { key: "home_mobile", url: "/" },
      { key: "services_mobile", url: "/services" },
      { key: "signup_mobile", url: "/signup" },
    ]) {
      await mpage.goto(`${BASE_URL}${p.url}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await mpage.waitForTimeout(1500);
      await mpage.screenshot({ path: path.join(OUT_DIR, `${p.key}.png`), fullPage: false });
    }

    fs.writeFileSync(path.join(OUT_DIR, "audit_report.json"), JSON.stringify(report, null, 2));
    console.log("Reference inspection complete. Saved to", OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
