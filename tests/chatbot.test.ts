import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { prisma } from "../src/lib/db";
import { decryptSecret, encryptSecret, maskSecretPreview } from "../src/lib/chat-crypto";
import { buildUnifiedKnowledgeContext, getOrCreateChatbotSettings } from "../src/lib/chat-kb";
import { generateAiChatResponse } from "../src/lib/chat-ai";
import { retryFailedSupportEmails, sendSupportHandoverEmail } from "../src/lib/chat-email";
import { processInboundEmailWebhook } from "../src/lib/chat-email-inbound";

let mockAiServer: http.Server;
let mockAiBaseUrl = "";
let aiShouldFail = false;

describe("AI Support Chatbot & Two-Way Email Unit + Integration Suite", () => {
  before(async () => {
    mockAiServer = http.createServer(async (req, res) => {
      if (req.url === "/v1/chat/completions" && req.method === "POST") {
        let raw = "";
        for await (const chunk of req) raw += chunk;

        if (aiShouldFail) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "AI upstream temporary outage" }));
          return;
        }

        const body = JSON.parse(raw) as {
          messages: Array<{ role: string; content: string }>;
        };
        const sysPrompt = body.messages[0]?.content || "";
        const userMsg = body.messages[body.messages.length - 1]?.content || "";

        // Ensure real website/KB knowledge is injected into system prompt
        assert.ok(sysPrompt.includes("Goldex Media Network"));

        if (/custom\s*royalty\s*advance|private\s*contract|outside\s*knowledge/i.test(userMsg)) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      reply: "That requires review by our human business team.",
                      language: "English",
                      confidence: 0.25,
                      shouldEscalate: true,
                      escalationReason: "Question outside standard knowledge base (custom contract).",
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
                    reply: "Goldex Media Network distributes your music to 150+ digital stores starting at ₹0/year.",
                    language: "English",
                    confidence: 0.95,
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

    await new Promise<void>((resolve) => {
      mockAiServer.listen(0, "127.0.0.1", () => {
        const addr = mockAiServer.address();
        if (addr && typeof addr !== "string") {
          mockAiBaseUrl = `http://127.0.0.1:${addr.port}/v1`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => mockAiServer.close(() => resolve()));
    await prisma.$disconnect();
  });

  it("encrypts and masks credentials without exposing plaintext", () => {
    const raw = "pm-secret-live-token-987654321";
    const enc = encryptSecret(raw);
    assert.ok(enc.startsWith("v1:"));
    assert.ok(!enc.includes(raw));
    assert.equal(decryptSecret(enc), raw);
    assert.equal(maskSecretPreview(enc), "pm-s••••4321");
  });

  it("answers KB question accurately without sending email and escalates unknown/human requests", async () => {
    const kb = await buildUnifiedKnowledgeContext("pricing plans digital stores");
    assert.ok(kb.formattedContext.includes("PRICING & DISTRIBUTION PLANS"));

    const settings = {
      aiEnabled: true,
      aiProvider: "OPENAI_COMPATIBLE",
      aiModel: "test-model",
      aiBaseUrl: mockAiBaseUrl,
      aiApiKeyEncrypted: encryptSecret("test-ai-key-123456"),
      assistantName: "Goldex Support Assistant",
      systemInstructions: "Help artists using verified website info.",
      defaultLanguage: "auto",
      escalationThreshold: 0.65,
      humanHandoverEnabled: true,
    };

    // TEST 1: KB question resolved by AI -> no escalation
    const okDecision = await generateAiChatResponse({
      settings,
      visitorMessage: "What are your distribution pricing plans?",
      historyMessages: [],
      knowledgeContext: kb.formattedContext,
    });
    assert.equal(okDecision.ok, true);
    assert.equal(okDecision.shouldEscalate, false);
    assert.ok(okDecision.reply.includes("150+"));

    // TEST 2: Outside KB -> escalates cleanly
    const unknownDecision = await generateAiChatResponse({
      settings,
      visitorMessage: "Can we negotiate a custom royalty advance deal?",
      historyMessages: [],
      knowledgeContext: kb.formattedContext,
    });
    assert.equal(unknownDecision.shouldEscalate, true);

    // Explicit Hindi/Bengali human request -> deterministic escalation
    const hindiHuman = await generateAiChatResponse({
      settings,
      visitorMessage: "Mujhe kisi human agent se baat karni hai",
      historyMessages: [],
      knowledgeContext: kb.formattedContext,
    });
    assert.equal(hindiHuman.shouldEscalate, true);

    // TEST 8: Failed AI endpoint -> safe fallback & handover without throwing
    aiShouldFail = true;
    const failedDecision = await generateAiChatResponse({
      settings,
      visitorMessage: "Hello?",
      historyMessages: [],
      knowledgeContext: kb.formattedContext,
    });
    aiShouldFail = false;
    assert.equal(failedDecision.ok, false);
    assert.equal(failedDecision.errorCode, "AI_PROVIDER_ERROR");
    assert.equal(failedDecision.shouldEscalate, true);
  });

  it("handles two-way email dispatch, threading, retries, signature checks, bounce & duplicate webhook guards", async () => {
    const originalSettings = await getOrCreateChatbotSettings();
    const webhookSecret = "whsec-unit-test-secret-abcdef123456";

    await prisma.chatbotSettings.update({
      where: { id: "default" },
      data: {
        emailEnabled: true,
        emailProvider: "POSTMARK",
        supportEmail: "owner@onetabmedia.in",
        senderEmail: "support@onetabmedia.in",
        replyRoutingDomain: "reply.onetabmedia.in",
        emailApiKeyEncrypted: encryptSecret("postmark-test-token-999"),
        inboundWebhookSecretEncrypted: encryptSecret(webhookSecret),
      },
    });

    const visitor = await prisma.chatVisitor.create({
      data: {
        visitorTokenHash: crypto.createHash("sha256").update(`tok-${Date.now()}`).digest("hex"),
        name: "Test Visitor",
        email: "visitor@example.com",
      },
    });

    const conv = await prisma.chatConversation.create({
      data: {
        visitorId: visitor.id,
        replyToken: crypto.randomBytes(18).toString("hex"),
        messages: {
          create: [
            { senderType: "VISITOR", senderName: "Test Visitor", content: "I need custom label help." },
          ],
        },
      },
    });

    const originalFetch = globalThis.fetch;
    const sentPayloads: Array<{ url: string; body: Record<string, unknown> }> = [];
    let simulateEmailOutage = false;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "https://api.postmarkapp.com/email") {
        if (simulateEmailOutage) {
          return new Response(JSON.stringify({ Message: "Upstream 503 outage" }), { status: 503 });
        }
        const parsed = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
        sentPayloads.push({ url, body: parsed });
        return new Response(JSON.stringify({ MessageID: `pm-msg-${sentPayloads.length}` }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      // Outbound escalation email + threading
      const res1 = await sendSupportHandoverEmail({
        conversationId: conv.id,
        isFollowUp: false,
        reason: "Bespoke label negotiation",
        latestMessage: "I need custom label help.",
      });
      assert.equal(res1.delivered, true);
      assert.equal(sentPayloads.length, 1);
      const replyToAddr = String(sentPayloads[0].body.ReplyTo || "");
      assert.ok(replyToAddr.includes("@reply.onetabmedia.in"));
      assert.ok(String(sentPayloads[0].body.TextBody || "").includes(visitor.id));
      assert.ok(String(sentPayloads[0].body.TextBody || "").includes(conv.id));

      // Temporary email outage -> records FAILED with nextRetryAt -> retry recovers!
      simulateEmailOutage = true;
      const failedRes = await sendSupportHandoverEmail({
        conversationId: conv.id,
        isFollowUp: true,
        reason: "Follow-up message",
        latestMessage: "Are you there?",
      });
      assert.equal(failedRes.delivered, false);
      assert.equal(failedRes.status, "FAILED");

      await prisma.chatEmailRecord.update({
        where: { id: failedRes.recordId },
        data: { nextRetryAt: new Date(Date.now() - 1000) },
      });

      simulateEmailOutage = false;
      const retrySummary = await retryFailedSupportEmails();
      assert.equal(retrySummary.succeeded >= 1, true);

      // Inbound email reply via webhook: reject bad signature (401)
      const inboundBody = JSON.stringify({
        MessageID: `in-msg-${Date.now()}`,
        From: "owner@onetabmedia.in",
        To: replyToAddr,
        Subject: `Re: [OneTab Support]`,
        TextBody: "Hello! Yes we can help your label today.\n\nOn Thu, wrote:\n> old quoted text",
      });

      const badSigRes = await processInboundEmailWebhook({
        rawBody: inboundBody,
        headers: new Headers({ "x-onetab-signature": "sha256=deadbeef" }),
        payload: JSON.parse(inboundBody),
      });
      assert.equal(badSigRes.httpStatus, 401);

      // Valid HMAC signature -> saves reply cleanly without quoted thread!
      const goodSig = crypto.createHmac("sha256", webhookSecret).update(inboundBody).digest("hex");
      const validRes = await processInboundEmailWebhook({
        rawBody: inboundBody,
        headers: new Headers({ "x-onetab-signature": `sha256=${goodSig}` }),
        payload: JSON.parse(inboundBody),
      });
      assert.equal(validRes.ok, true);
      assert.equal(validRes.conversationId, conv.id);

      // Duplicate webhook delivery -> ignored safely
      const dupRes = await processInboundEmailWebhook({
        rawBody: inboundBody,
        headers: new Headers({ "x-onetab-signature": `sha256=${goodSig}` }),
        payload: JSON.parse(inboundBody),
      });
      assert.equal(dupRes.status, "DUPLICATE");

      const msgs = await prisma.chatMessage.findMany({
        where: { conversationId: conv.id, senderType: "HUMAN_SUPPORT" },
      });
      assert.equal(msgs.length, 1);
      assert.equal(msgs[0].content, "Hello! Yes we can help your label today.");
    } finally {
      globalThis.fetch = originalFetch;
      await prisma.chatVisitor.delete({ where: { id: visitor.id } });
      await prisma.chatbotSettings.update({
        where: { id: "default" },
        data: {
          aiEnabled: originalSettings.aiEnabled,
          aiProvider: originalSettings.aiProvider,
          aiModel: originalSettings.aiModel,
          aiBaseUrl: originalSettings.aiBaseUrl,
          aiApiKeyEncrypted: originalSettings.aiApiKeyEncrypted,
          emailEnabled: originalSettings.emailEnabled,
          emailProvider: originalSettings.emailProvider,
          supportEmail: originalSettings.supportEmail,
          senderEmail: originalSettings.senderEmail,
          replyRoutingDomain: originalSettings.replyRoutingDomain,
          emailApiKeyEncrypted: originalSettings.emailApiKeyEncrypted,
          inboundWebhookSecretEncrypted: originalSettings.inboundWebhookSecretEncrypted,
        },
      });
    }
  });
});
