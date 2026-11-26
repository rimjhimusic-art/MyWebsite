import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function main() {
  const adminEmail = (process.env.TEST_ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || "";
  if (!adminEmail || !adminPassword) {
    throw new Error("TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required.");
  }

  const prisma = new PrismaClient();
  try {
    // 1. DB Assertions: strictly 1 SUPER_ADMIN, 0 old ADMINs, non-admin users preserved
    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { email: true, status: true },
    });
    assert.equal(superAdmins.length, 1, "Strictly one SUPER_ADMIN allowed");
    assert.equal(superAdmins[0].email, adminEmail);
    assert.equal(superAdmins[0].status, "APPROVED");

    const oldAdminCount = await prisma.user.count({
      where: { email: { in: ["superadmin@onetabmedia.in", "admin@onetabmedia.in"] } },
    });
    assert.equal(oldAdminCount, 0, "Old admin accounts must be removed");

    const nonAdminCount = await prisma.user.count({
      where: { email: { in: ["artist@onetabmedia.in", "label@onetabmedia.in"] } },
    });
    assert.equal(nonAdminCount, 2, "Existing artist and label accounts must be preserved");
    console.log("DB state verified: 1 SUPER_ADMIN, 0 old admins, non-admins intact.");
  } finally {
    await prisma.$disconnect();
  }

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 2. Old Super Admin login must fail with 401
    const oldLoginRes = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: "superadmin@onetabmedia.in", password: "OneTab@2026!" },
    });
    assert.equal(oldLoginRes.status(), 401, "Removed old superadmin login must fail");

    // 3. New Super Admin logs in via /admin/login -> lands on /admin dashboard
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname === "/admin", { timeout: 15000 });

    // Super Admin can access CMS, Users, Settings, Releases
    for (const route of ["/admin/cms", "/admin/users", "/admin/settings", "/admin/releases"]) {
      const res = await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
      assert.equal(res?.status(), 200, `Super Admin must access ${route}`);
    }

    // Wrong current password rejected cleanly on /api/auth/me
    const wrongPassRes = await page.request.patch(`${BASE_URL}/api/auth/me`, {
      data: { email: adminEmail, currentPassword: "wrong-password-123", newPassword: "NewPassword123!" },
    });
    assert.equal(wrongPassRes.status(), 400, "Wrong current password must be rejected");

    // 4. Super Admin creates a restricted Website Editor sub-admin via /api/admin/users
    const subEmail = `subeditor_${Date.now()}@onetabmedia.in`;
    const subPass = `SubPass#${Date.now()}`;
    const createSubRes = await page.request.post(`${BASE_URL}/api/admin/users`, {
      data: {
        name: "Scoped Website Editor",
        email: subEmail,
        password: subPass,
        role: "EDITOR",
        adminPreset: "WEBSITE_EDITOR",
        permissions: ["dashboard:view", "cms:view", "cms:edit", "media:view"],
        allowedSections: ["home"],
      },
    });
    assert.equal(createSubRes.status(), 201, "Super Admin must create sub-admin cleanly");
    const createdSub = await createSubRes.json();

    // 5. Log in as restricted sub-admin in a fresh browser context & verify server-side enforcement
    const subCtx = await browser.newContext();
    const subPage = await subCtx.newPage();
    const subLogin = await subPage.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: subEmail, password: subPass },
    });
    assert.equal(subLogin.status(), 200);

    // Restricted sub-admin can view CMS overview
    const subOverview = await subPage.request.get(`${BASE_URL}/api/admin/cms/overview`);
    assert.equal(subOverview.status(), 200);
    const overviewData = await subOverview.json();
    const aboutHero = overviewData.sections.find((s) => s.pageSlug === "about" && s.sectionKey === "hero");
    assert.ok(aboutHero);

    // Restricted sub-admin CANNOT publish live (missing cms:publish -> 403)
    const denyPublish = await subPage.request.post(`${BASE_URL}/api/admin/cms/publish`, {
      data: { action: "publish" },
    });
    assert.equal(denyPublish.status(), 403, "Restricted editor must get 403 on Publish");

    // Restricted sub-admin CANNOT edit unassigned "about" section (allowedSections = ["home"] -> 403)
    const denySection = await subPage.request.patch(`${BASE_URL}/api/admin/cms/pages`, {
      data: { id: aboutHero.id, title: "Blocked Edit", mode: "draft" },
    });
    assert.equal(denySection.status(), 403, "Section-scoped editor must get 403 on unassigned section");

    // Restricted sub-admin CANNOT access user management or modify Super Admin
    const denyUsers = await subPage.request.get(`${BASE_URL}/api/admin/users`);
    assert.equal(denyUsers.status(), 403);

    const denySuperTouch = await subPage.request.patch(`${BASE_URL}/api/admin/users`, {
      data: { userId: createdSub.user.id, role: "SUPER_ADMIN" },
    });
    assert.equal(denySuperTouch.status(), 403);

    // Even a FULL GENERAL ADMIN cannot demote/modify/delete SUPER_ADMIN!
    const generalAdminEmail = `genadmin_${Date.now()}@onetabmedia.in`;
    const createGenRes = await page.request.post(`${BASE_URL}/api/admin/users`, {
      data: {
        name: "General Admin",
        email: generalAdminEmail,
        password: subPass,
        role: "ADMIN",
        adminPreset: "FULL_ADMIN",
      },
    });
    assert.equal(createGenRes.status(), 201);
    const genCreated = await createGenRes.json();

    const genCtx = await browser.newContext();
    const genPage = await genCtx.newPage();
    await genPage.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: generalAdminEmail, password: subPass },
    });
    const usersListRes = await genPage.request.get(`${BASE_URL}/api/admin/users`);
    const usersListJson = await usersListRes.json();
    const superRow = usersListJson.users.find((u) => u.role === "SUPER_ADMIN");
    assert.ok(superRow);

    const tamperSuper = await genPage.request.patch(`${BASE_URL}/api/admin/users`, {
      data: { userId: superRow.id, status: "SUSPENDED" },
    });
    assert.equal(tamperSuper.status(), 403, "General Admin MUST get 403 trying to suspend Super Admin");

    const delSuper = await genPage.request.delete(`${BASE_URL}/api/admin/users?userId=${superRow.id}`);
    assert.equal(delSuper.status(), 403, "General Admin MUST get 403 trying to delete Super Admin");

    await subCtx.close();
    await genCtx.close();

    // 6. Cleanup test sub-admins cleanly as Super Admin
    assert.equal((await page.request.delete(`${BASE_URL}/api/admin/users?userId=${createdSub.user.id}`)).status(), 200);
    assert.equal((await page.request.delete(`${BASE_URL}/api/admin/users?userId=${genCreated.user.id}`)).status(), 200);

    console.log("ALL SUPER ADMIN & GRANULAR PERMISSION SECURITY CHECKS PASSED!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Admin security verification failed:", err);
  process.exit(1);
});
