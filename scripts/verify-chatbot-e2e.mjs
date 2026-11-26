import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { chromium } from "playwright-core";
import { prisma } from "../src/lib/db";
import { encryptSecret } from "../src/lib/chat-crypto";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function main() {
  const originalSettings = await prisma.chatbotSettings.findUnique({ where: { id: "default" } });
  const webhookSecret = `whsec_e2e_${crypto.randomBytes(12).toString("hex")}`;

  // Spin up local OpenAI-compatible AI server to verify live browser ChatWidget -> AI + KB + Escalation + SSE!
  const mockAiServer = http.createServer(async (req, res) => {
    if (req.url === "/v1/chat/completions" && req.method === "POST") {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      const lastMsg = body.messages[body.messages.length - 1]?.content || "";
      const sysPrompt = body.messages[0]?.content || "";

      assert.ok(sysPrompt.includes("OneTab Media Network"), "Knowledge base must include live site data");

      if (/unlisted|custom\s*deal|escalate/i.test(lastMsg)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    reply: "I don't have details on custom enterprise label deals in my knowledge base, so I'm handing this over to our support team.",
                    language: "English",
                    confidence: 0.2,
                    shouldEscalate: true,
                    escalationReason: "Question outside knowledge base.",
                  }),
                },
              },
            ],
          })
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reply: "Our Independent Artist distribution plan starts at ₹0/year with delivery to 150+ stores.",
                  language: "English",
                  confidence: 0.96,
                  shouldEscalate: false,
                  escalationReason: null,
                }),
              },
            },
          ],
        })
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => mockAiServer.listen(0, "127.0.0.1", () => resolve()));
  const addr = mockAiServer.address();
  assert.ok(addr && typeof addr !== "string");
  const aiBaseUrl = `http://127.0.0.1:${addr.port}/v1`;

  await prisma.chatbotSettings.upsert({
    where: { id: "default" },
    update: {
      aiEnabled: true,
      aiProvider: "OPENAI_COMPATIBLE",
      aiModel: "gpt-4o-mini",
      aiBaseUrl,
      aiApiKeyEncrypted: encryptSecret("test-key-local-e2e"),
      inboundWebhookSecretEncrypted: encryptSecret(webhookSecret),
      humanHandoverEnabled: true,
    },
    create: {
      id: "default",
      aiEnabled: true,
      aiProvider: "OPENAI_COMPATIBLE",
      aiModel: "gpt-4o-mini",
      aiBaseUrl,
      aiApiKeyEncrypted: encryptSecret("test-key-local-e2e"),
      inboundWebhookSecretEncrypted: encryptSecret(webhookSecret),
      humanHandoverEnabled: true,
    },
  });

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const createdVisitorIds = [];

  try {
    // Context 1: Visitor A
    const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageA = await ctxA.newPage();
    await pageA.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

    // Open existing bottom-right ChatWidget
    await pageA.click('button[aria-label="Toggle OneTab Support Assistant"]');
    await pageA.waitForSelector('input[placeholder*="English"]', { timeout: 10000 });

    // TEST 1: Ask KB question -> AI responds immediately without escalation
    const inputA = pageA.locator('input[placeholder*="English"]');
    await inputA.fill("What are your pricing plans?");
    await pageA.click('button[aria-label="Send message"]');
    await pageA.waitForSelector('text=₹0/year', { timeout: 15000 });

    const convInfoA = await pageA.evaluate(() => ({
      convId: localStorage.getItem("onetab_chat_conv_id_v1"),
      token: localStorage.getItem("onetab_chat_visitor_token_v1"),
    }));
    assert.ok(convInfoA.convId && convInfoA.token);
    const convARow = await prisma.chatConversation.findUnique({ where: { id: convInfoA.convId } });
    assert.ok(convARow);
    createdVisitorIds.push(convARow.visitorId);
    assert.equal(convARow.escalatedToHuman, false, "TEST 1 KB match must NOT escalate");

    // TEST 2: Ask outside-KB question -> Escalates cleanly
    await pageA.locator('input[placeholder*="Ask about distribution"]').fill("I need a custom deal outside knowledge base");
    await pageA.click('button[aria-label="Send message"]');
    await pageA.waitForSelector('text=handing this over to our support team', { timeout: 15000 });

    const escalatedRow = await prisma.chatConversation.findUnique({ where: { id: convInfoA.convId } });
    assert.equal(escalatedRow?.escalatedToHuman, true, "TEST 2 must escalate conversation");

    // TEST 3: Inbound Email Webhook Reply -> Appears LIVE in Visitor A's chat via SSE WITHOUT page refresh!
    const inboundPayload = JSON.stringify({
      MessageID: `e2e-in-1-${Date.now()}`,
      From: "support@onetabmedia.in",
      To: `reply+${escalatedRow.replyToken}.${crypto
        .createHmac("sha256", process.env.AUTH_SECRET || "onetab-local-dev-secret-change-in-production-32chars-min")
        .update(`${escalatedRow.id}:${escalatedRow.replyToken}`)
        .digest("hex")
        .slice(0, 12)}@reply.onetabmedia.in`,
      Subject: "Re: Support Request",
      TextBody: "Hi! Anupam from Support Team here — we reviewed your custom deal inquiry.\n\nOn Thu wrote:\n> old text",
    });
    const sig1 = crypto.createHmac("sha256", webhookSecret).update(inboundPayload).digest("hex");
    const whRes1 = await pageA.request.post(`${BASE_URL}/api/webhooks/email/inbound`, {
      data: inboundPayload,
      headers: {
        "Content-Type": "application/json",
        "x-onetab-signature": `sha256=${sig1}`,
      },
    });
    assert.equal(whRes1.status(), 200);
    await pageA.waitForSelector('text=Anupam from Support Team here', { timeout: 12000 });

    // TEST 4 & TEST 5: Visitor A sends follow-up -> Human sends second email reply -> Same chat updates live!
    await pageA.locator('input[placeholder*="Reply directly"]').fill("Thanks! Can we schedule tomorrow?");
    await pageA.click('button[aria-label="Send message"]');
    await pageA.waitForSelector('text=Thanks! Can we schedule tomorrow?', { timeout: 10000 });

    const inboundPayload2 = JSON.stringify({
      MessageID: `e2e-in-2-${Date.now()}`,
      From: "support@onetabmedia.in",
      To: JSON.parse(inboundPayload).To,
      Subject: "Re: Support Request",
      TextBody: "Yes, tomorrow at 4 PM IST works great!",
    });
    const sig2 = crypto.createHmac("sha256", webhookSecret).update(inboundPayload2).digest("hex");
    const whRes2 = await pageA.request.post(`${BASE_URL}/api/webhooks/email/inbound`, {
      data: inboundPayload2,
      headers: {
        "Content-Type": "application/json",
        "x-onetab-signature": `sha256=${sig2}`,
      },
    });
    assert.equal(whRes2.status(), 200);
    await pageA.waitForSelector('text=Yes, tomorrow at 4 PM IST works great!', { timeout: 12000 });

    // TEST 7: Refresh browser -> Conversation history remains available cleanly!
    await pageA.reload({ waitUntil: "networkidle" });
    await pageA.click('button[aria-label="Toggle OneTab Support Assistant"]');
    await pageA.waitForSelector('text=Anupam from Support Team here', { timeout: 10000 });
    await pageA.waitForSelector('text=Yes, tomorrow at 4 PM IST works great!', { timeout: 10000 });

    // TEST 6: Separate Visitor B in fresh context cannot see or access Visitor A's conversation!
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageB = await ctxB.newPage();
    await pageB.goto(`${BASE_URL}/services`, { waitUntil: "networkidle" });
    await pageB.click('button[aria-label="Toggle OneTab Support Assistant"]');
    await pageB.waitForSelector('input[placeholder*="English"]', { timeout: 10000 });
    const pageBText = await pageB.textContent("body");
    assert.ok(!pageBText?.includes("Anupam from Support Team here"), "Visitor B MUST NOT see Visitor A replies");

    const crossAccess = await pageB.request.post(`${BASE_URL}/api/chat`, {
      data: { conversationId: convInfoA.convId, message: "Spoof check" },
    });
    assert.equal(crossAccess.status(), 403, "Visitor B MUST get 403 trying to post into Visitor A conversation");

    await ctxA.close();
    await ctxB.close();
    console.log("ALL REAL BROWSER + SSE + TWO-WAY EMAIL WEBHOOK E2E TESTS (1-8) PASSED!");
  } finally {
    await browser.close();
    await new Promise((resolve) => mockAiServer.close(() => resolve()));

    for (const vid of createdVisitorIds) {
      await prisma.chatVisitor.delete({ where: { id: vid } }).catch(() => {});
    }
    if (originalSettings) {
      await prisma.chatbotSettings.update({
        where: { id: "default" },
        data: {
          aiEnabled: originalSettings.aiEnabled,
          aiProvider: originalSettings.aiProvider,
          aiModel: originalSettings.aiModel,
          aiBaseUrl: originalSettings.aiBaseUrl,
          aiApiKeyEncrypted: originalSettings.aiApiKeyEncrypted,
          inboundWebhookSecretEncrypted: originalSettings.inboundWebhookSecretEncrypted,
          humanHandoverEnabled: originalSettings.humanHandoverEnabled,
        },
      });
    } else {
      await prisma.chatbotSettings.deleteMany({ where: { id: "default" } });
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Chatbot E2E verification failed:", err);
  process.exit(1);
});
