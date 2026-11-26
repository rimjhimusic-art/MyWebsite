import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import zlib from "zlib";
import { hasPermission, isAdminRole } from "../src/lib/permissions";
import { hashPassword, verifyPassword } from "../src/lib/auth";
import {
  validateUploadFile,
  putObject,
  getObject,
  deleteObject,
} from "../src/lib/storage";
import { getProviderCredentialStatus } from "../src/lib/integrations";

function createTestPngBuffer(width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  const ihdrType = Buffer.from("IHDR");
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(zlib.crc32(Buffer.concat([ihdrType, ihdrData])) >>> 0, 0);
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  return Buffer.concat([signature, ihdrLen, ihdrType, ihdrData, ihdrCrc, iend]);
}

function createTestWavBuffer(seconds = 1, sampleRate = 44100): Buffer {
  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const dataSize = byteRate * seconds;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((numChannels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, Buffer.alloc(Math.min(dataSize, 4096))]);
}

describe("Unit Tests: RBAC, Hashing, Storage & Integrations", () => {
  it("enforces distinct permissions across all 7 roles", () => {
    assert.equal(isAdminRole("SUPER_ADMIN"), true);
    assert.equal(isAdminRole("ADMIN"), true);
    assert.equal(isAdminRole("FINANCE_MANAGER"), true);
    assert.equal(isAdminRole("CONTENT_MANAGER"), true);
    assert.equal(isAdminRole("ARTIST"), false);
    assert.equal(isAdminRole("LABEL_OWNER"), false);
    assert.equal(isAdminRole("LABEL_MANAGER"), false);

    assert.equal(hasPermission("SUPER_ADMIN", "integrations:manage"), true);
    assert.equal(hasPermission("FINANCE_MANAGER", "payments:process"), true);
    assert.equal(hasPermission("FINANCE_MANAGER", "release:approve"), false);
    assert.equal(hasPermission("CONTENT_MANAGER", "release:approve"), true);
    assert.equal(hasPermission("CONTENT_MANAGER", "payments:process"), false);
    assert.equal(hasPermission("ARTIST", "release:create"), true);
    assert.equal(hasPermission("ARTIST", "users:manage"), false);
    assert.equal(hasPermission("LABEL_OWNER", "label:manage_own"), true);
    assert.equal(hasPermission("LABEL_MANAGER", "royalties:manage_splits"), false);
  });

  it("hashes passwords securely with bcrypt and verifies correctly", async () => {
    const hash = await hashPassword("OneTabSecure#2026");
    assert.notEqual(hash, "OneTabSecure#2026");
    assert.equal(hash.startsWith("$2"), true);
    assert.equal(await verifyPassword("OneTabSecure#2026", hash), true);
    assert.equal(await verifyPassword("wrong-password", hash), false);
  });

  it("validates artwork 1:1 ratio and minimum 1400x1400 resolution", async () => {
    const smallPng = new File(
      [new Uint8Array(createTestPngBuffer(800, 800))],
      "small.png",
      { type: "image/png" }
    );
    const resSmall = await validateUploadFile({ file: smallPng, kind: "ARTWORK" });
    assert.equal(resSmall.ok, false);

    const rectPng = new File(
      [new Uint8Array(createTestPngBuffer(1600, 1200))],
      "rect.png",
      { type: "image/png" }
    );
    const resRect = await validateUploadFile({ file: rectPng, kind: "ARTWORK" });
    assert.equal(resRect.ok, false);

    const validPng = new File(
      [new Uint8Array(createTestPngBuffer(1400, 1400))],
      "cover.png",
      { type: "image/png" }
    );
    const resValid = await validateUploadFile({ file: validPng, kind: "ARTWORK" });
    assert.equal(resValid.ok, true);
    if (resValid.ok) {
      assert.equal(resValid.data.width, 1400);
      assert.equal(resValid.data.height, 1400);
    }
  });

  it("validates WAV audio signatures and rejects spoofed audio files", async () => {
    const fakeWav = new File(
      [Buffer.from("not-a-real-wav-file-content")],
      "fake.wav",
      { type: "audio/wav" }
    );
    const resFake = await validateUploadFile({ file: fakeWav, kind: "AUDIO" });
    assert.equal(resFake.ok, false);

    const validWav = new File(
      [new Uint8Array(createTestWavBuffer(1, 44100))],
      "master.wav",
      { type: "audio/wav" }
    );
    const resValid = await validateUploadFile({ file: validWav, kind: "AUDIO" });
    assert.equal(resValid.ok, true);
    if (resValid.ok) {
      assert.equal(resValid.data.sampleRate, 44100);
    }
  });

  it("stores, reads, and deletes objects via storage adapter", async () => {
    const key = `test/node-test-${Date.now()}.txt`;
    await putObject(key, Buffer.from("hello-onetab"), "text/plain");
    const readBack = await getObject(key);
    assert.equal(readBack?.toString(), "hello-onetab");
    await deleteObject(key);
    assert.equal(await getObject(key), null);
  });

  it("reports honest unconfigured state for third-party APIs without credentials", () => {
    const vydia = getProviderCredentialStatus("VYDIA");
    assert.equal(vydia.configured, false);
    assert.equal(vydia.mode, "UNCONFIGURED");
  });
});

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3099";

async function reqWithCookie(
  path: string,
  init: RequestInit = {},
  cookie?: string
): Promise<{
  res: Response;
  body: Record<string, unknown>;
  setCookie: string | null;
}> {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie);
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  const rawSetCookie = res.headers.get("set-cookie");
  const nextCookie = rawSetCookie ? rawSetCookie.split(";")[0] : null;
  return { res, body, setCookie: nextCookie };
}

describe("Integration Tests: Full Platform Workflows", () => {
  let serverAvailable = false;

  before(async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/health`);
      serverAvailable = r.ok;
    } catch {
      serverAvailable = false;
    }
  });

  it("serves all public pages and responsive layout markup with HTTP 200", async () => {
    assert.equal(serverAvailable, true, "Test server must be running");
    const routes = [
      "/",
      "/about",
      "/services",
      "/brand",
      "/plan",
      "/plans",
      "/control",
      "/careers",
      "/contact",
      "/faq",
      "/help",
      "/terms",
      "/privacy",
      "/login",
      "/register/artist",
      "/register/label",
      "/forgot-password",
      "/verify-email",
    ];
    for (const route of routes) {
      const r = await fetch(`${BASE_URL}${route}`);
      assert.equal(r.status, 200, `Route ${route} returned ${r.status}`);
      const html = await r.text();
      assert.ok(html.includes("OneTab"), `Route ${route} missing OneTab text`);
    }

    const mediaAssets = [
      "/ref/logo.png",
      "/ref/video/hero-studio-perform.mp4",
      "/ref/video/hero-singer-mic.mp4",
      "/ref/video/hero-guitar-studio.mp4",
      "/ref/stores/spotify.png",
      "/ref/stores/apple.png",
      "/ref/stores/wynk.png",
      "/ref/stores/jiosaavn.png",
      "/ref/stores/gaana.png",
      "/ref/stores/amazon.png",
      "/ref/stores/soundcloud.webp",
      "/ref/stores/ytmusic.svg",
      "/ref/stores/deezer.svg",
      "/ref/stores/tiktok.svg",
      "/ref/in.svg",
      "/ref/vevo-logo.png",
      "/ref/team/sujoy.png",
      "/ref/brand/bm1.jpeg",
      "/ref/flag/about-1.png",
    ];
    for (const asset of mediaAssets) {
      const r = await fetch(`${BASE_URL}${asset}`);
      assert.equal(r.status, 200, `Media asset ${asset} returned ${r.status}`);
    }
  });

  it("handles public contact, brand, career, and chatbot APIs", async () => {
    assert.equal(serverAvailable, true);
    const c = await reqWithCookie("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "testcontact@example.com",
        phone: "9876543210",
        message: "Testing distribution contact form",
      }),
    });
    assert.equal(c.res.status, 201);

    const b = await reqWithCookie("/api/brand-inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Brand",
        lastName: "Tester",
        phone: "9876543210",
        email: "brand@example.com",
        businessName: "Test Media Co",
        message: "Sync licensing inquiry",
      }),
    });
    assert.equal(b.res.status, 201);

    const chat = await reqWithCookie("/api/chat?message=vevo%20pricing");
    assert.equal(chat.res.status, 200);
    assert.equal(typeof chat.body.reply, "string");
  });

  it("executes registration, login, logout, password reset, and RBAC checks", async () => {
    assert.equal(serverAvailable, true);
    const uniqueEmail = `test-artist-${Date.now()}@example.com`;

    const reg = await reqWithCookie("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType: "ARTIST",
        name: "Test Indie Artist",
        stageOrLabelName: "Indie Tester",
        email: uniqueEmail,
        country: "India",
        password: "TestPass@2026",
        termsAccepted: true,
      }),
    });
    assert.equal(reg.res.status, 201);
    const artistCookie = reg.setCookie!;
    assert.ok(artistCookie.includes("onetab_session="));

    const forbiddenAdmin = await reqWithCookie("/api/admin/users", {}, artistCookie);
    assert.equal(forbiddenAdmin.res.status, 403);

    const logout = await reqWithCookie(
      "/api/auth/logout",
      { method: "POST" },
      artistCookie
    );
    assert.equal(logout.res.status, 200);

    const afterLogout = await reqWithCookie("/api/auth/me", {}, artistCookie);
    assert.equal(afterLogout.res.status, 401);

    const forgot = await reqWithCookie("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail }),
    });
    assert.equal(forgot.res.status, 200);
    const resetUrl = String(forgot.body.resetUrl || "");
    const token = new URL(resetUrl).searchParams.get("token");
    assert.ok(token);

    const reset = await reqWithCookie("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: "NewPass@2026" }),
    });
    assert.equal(reset.res.status, 200);

    const login = await reqWithCookie("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: uniqueEmail,
        password: "NewPass@2026",
        rememberMe: true,
      }),
    });
    assert.equal(login.res.status, 200);
  });

  it("runs complete upload -> release wizard -> submit -> admin approve -> royalty split -> payout flow", async () => {
    assert.equal(serverAvailable, true);

    const artistLogin = await reqWithCookie("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "artist@onetabmedia.in",
        password: "OneTab@2026!",
      }),
    });
    assert.equal(artistLogin.res.status, 200);
    const artistCookie = artistLogin.setCookie!;

    const artForm = new FormData();
    artForm.append("kind", "ARTWORK");
    artForm.append(
      "file",
      new File([new Uint8Array(createTestPngBuffer(1400, 1400))], "cover.png", {
        type: "image/png",
      })
    );
    const artRes = await reqWithCookie(
      "/api/uploads",
      { method: "POST", body: artForm },
      artistCookie
    );
    assert.equal(artRes.res.status, 201);
    const artworkId = (artRes.body.asset as { id: string }).id;

    const audForm = new FormData();
    audForm.append("kind", "AUDIO");
    audForm.append(
      "file",
      new File([new Uint8Array(createTestWavBuffer(1, 44100))], "single.wav", {
        type: "audio/wav",
      })
    );
    const audRes = await reqWithCookie(
      "/api/uploads",
      { method: "POST", body: audForm },
      artistCookie
    );
    assert.equal(audRes.res.status, 201);
    const audioId = (audRes.body.asset as { id: string }).id;

    const draft = await reqWithCookie(
      "/api/releases",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseType: "SINGLE",
          title: "Integration Test Single",
          primaryArtist: "Abir Biswas",
          recordLabelName: "Eastern Wave Records",
          genre: "Pop",
          language: "Bengali",
        }),
      },
      artistCookie
    );
    assert.equal(draft.res.status, 201);
    const releaseId = (draft.body.release as { id: string }).id;

    const patch = await reqWithCookie(
      `/api/releases/${releaseId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkAssetId: artworkId,
          tracks: [
            {
              title: "Integration Test Track 1",
              primaryArtist: "Abir Biswas",
              audioAssetId: audioId,
            },
          ],
          currentWizardStep: 7,
        }),
      },
      artistCookie
    );
    assert.equal(patch.res.status, 200);

    const submit = await reqWithCookie(
      `/api/releases/${releaseId}/submit`,
      { method: "POST" },
      artistCookie
    );
    assert.equal(submit.res.status, 200);
    assert.equal((submit.body.release as { status: string }).status, "SUBMITTED");

    const badSplit = await reqWithCookie(
      "/api/royalties",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId,
          splits: [
            { beneficiaryName: "Artist", beneficiaryRole: "ARTIST", percentage: 70 },
            { beneficiaryName: "Label", beneficiaryRole: "LABEL", percentage: 20 },
          ],
        }),
      },
      artistCookie
    );
    assert.equal(badSplit.res.status, 400);

    const goodSplit = await reqWithCookie(
      "/api/royalties",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId,
          splits: [
            { beneficiaryName: "Abir Biswas", beneficiaryRole: "ARTIST", percentage: 80 },
            { beneficiaryName: "Eastern Wave", beneficiaryRole: "LABEL", percentage: 20 },
          ],
        }),
      },
      artistCookie
    );
    assert.equal(goodSplit.res.status, 200);

    const adminLogin = await reqWithCookie("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "superadmin@onetabmedia.in",
        password: "OneTab@2026!",
      }),
    });
    assert.equal(adminLogin.res.status, 200);
    const adminCookie = adminLogin.setCookie!;

    const approve = await reqWithCookie(
      "/api/admin/releases",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId,
          status: "APPROVED",
          internalNotes: "Audio and artwork QC verified.",
        }),
      },
      adminCookie
    );
    assert.equal(approve.res.status, 200);
    assert.equal((approve.body.release as { status: string }).status, "APPROVED");

    const imp = await reqWithCookie(
      "/api/admin/royalties",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodMonth: "2026-11",
          sourcePartner: "Spotify Verified CSV",
          fileName: "test-import.csv",
          rows: [
            {
              releaseId,
              storeSlug: "spotify",
              countryCode: "IN",
              countryName: "India",
              streams: 5000,
              grossRevenue: 25,
              platformFee: 2.5,
            },
          ],
        }),
      },
      adminCookie
    );
    assert.equal(imp.res.status, 201);

    const overview = await reqWithCookie("/api/dashboard/overview", {}, artistCookie);
    assert.equal(overview.res.status, 200);
    assert.ok((overview.body.metrics as { totalReleases: number }).totalReleases > 0);

    const csvRes = await fetch(`${BASE_URL}/api/analytics?format=csv`, {
      headers: { Cookie: artistCookie },
    });
    assert.equal(csvRes.status, 200);
    assert.ok((await csvRes.text()).includes("Integration Test Single"));

    const overPay = await reqWithCookie(
      "/api/payments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 9999999,
          method: "UPI",
          accountSummary: "artist@upi",
        }),
      },
      artistCookie
    );
    assert.equal(overPay.res.status, 400);

    const validPay = await reqWithCookie(
      "/api/payments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 10,
          method: "UPI",
          accountSummary: "artist@upi",
        }),
      },
      artistCookie
    );
    assert.equal(validPay.res.status, 201);

    const ytReq = await reqWithCookie(
      "/api/youtube",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_request",
          requestType: "OAC",
          releaseId,
          notes: "Requesting Official Artist Channel merge",
        }),
      },
      artistCookie
    );
    assert.equal(ytReq.res.status, 201);
    assert.equal(
      (ytReq.body.request as { status: string }).status,
      "PENDING_PARTNER_AUTH"
    );

    const rightsRes = await reqWithCookie("/api/rights", {}, artistCookie);
    assert.equal(rightsRes.res.status, 200);
    assert.ok((rightsRes.body.assets as unknown[]).length > 0);
  });

  it("supports label registration, sub-labels, invitations, and account suspension", async () => {
    assert.equal(serverAvailable, true);
    const labelEmail = `test-label-${Date.now()}@example.com`;
    const reg = await reqWithCookie("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType: "LABEL",
        name: "Label Boss",
        stageOrLabelName: "Bengal Indie Collective",
        email: labelEmail,
        country: "India",
        password: "LabelPass@2026",
        termsAccepted: true,
      }),
    });
    assert.equal(reg.res.status, 201);
    const labelCookie = reg.setCookie!;
    const userId = (reg.body.user as { id: string }).id;

    const labelsRes = await reqWithCookie("/api/labels", {}, labelCookie);
    assert.equal(labelsRes.res.status, 200);
    const parentId = (labelsRes.body.labels as Array<{ id: string }>)[0].id;

    const subRes = await reqWithCookie(
      "/api/labels",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_label",
          name: "Bengal Folk Sub-Label",
          parentLabelId: parentId,
        }),
      },
      labelCookie
    );
    assert.equal(subRes.res.status, 201);

    const adminLogin = await reqWithCookie("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "superadmin@onetabmedia.in",
        password: "OneTab@2026!",
      }),
    });
    const adminCookie = adminLogin.setCookie!;

    const suspend = await reqWithCookie(
      "/api/admin/users",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: "SUSPENDED" }),
      },
      adminCookie
    );
    assert.equal(suspend.res.status, 200);

    const blockedLogin = await reqWithCookie("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: labelEmail, password: "LabelPass@2026" }),
    });
    assert.equal(blockedLogin.res.status, 403);

    const reapprove = await reqWithCookie(
      "/api/admin/users",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: "APPROVED" }),
      },
      adminCookie
    );
    assert.equal(reapprove.res.status, 200);
  });
});
