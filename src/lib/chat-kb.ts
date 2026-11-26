import { prisma } from "@/lib/db";
import { decryptSecret, maskSecretPreview } from "@/lib/chat-crypto";

export async function getOrCreateChatbotSettings() {
  const existing = await prisma.chatbotSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;

  return prisma.chatbotSettings.create({
    data: { id: "default" },
  });
}

export function resolveEffectiveAiCredentials(settings: {
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  aiBaseUrl: string | null;
  aiApiKeyEncrypted: string | null;
}) {
  const storedKey = decryptSecret(settings.aiApiKeyEncrypted);
  const envKey =
    settings.aiProvider === "GEMINI"
      ? process.env.GEMINI_API_KEY || ""
      : settings.aiProvider === "ANTHROPIC"
      ? process.env.ANTHROPIC_API_KEY || ""
      : process.env.OPENAI_API_KEY || "";

  const apiKey = storedKey || envKey.trim();
  const configured = Boolean(apiKey);
  return {
    configured,
    apiKey,
    source: storedKey ? "ADMIN_DB_ENCRYPTED" : envKey ? "ENV" : "NONE",
  };
}

export function resolveEffectiveEmailCredentials(settings: {
  emailEnabled: boolean;
  emailProvider: string;
  emailApiKeyEncrypted: string | null;
  inboundWebhookSecretEncrypted: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
}) {
  const storedKey = decryptSecret(settings.emailApiKeyEncrypted);
  const storedWebhookSecret = decryptSecret(settings.inboundWebhookSecretEncrypted);

  let envKey = "";
  switch (settings.emailProvider) {
    case "POSTMARK":
      envKey = process.env.POSTMARK_SERVER_TOKEN || "";
      break;
    case "SENDGRID":
      envKey = process.env.SENDGRID_API_KEY || "";
      break;
    case "RESEND":
      envKey = process.env.RESEND_API_KEY || "";
      break;
    case "SMTP":
      envKey = process.env.SMTP_PASS || "";
      break;
  }

  const envWebhookSecret = process.env.EMAIL_INBOUND_WEBHOOK_SECRET || "";
  const apiKey = storedKey || envKey.trim();
  const webhookSecret = storedWebhookSecret || envWebhookSecret.trim();

  const smtpReady =
    settings.emailProvider !== "SMTP" ||
    Boolean((settings.smtpHost || process.env.SMTP_HOST) && (settings.smtpUser || process.env.SMTP_USER));

  const configured = Boolean(apiKey && smtpReady);
  return {
    configured,
    apiKey,
    webhookSecret,
    webhookConfigured: Boolean(webhookSecret),
    source: storedKey ? "ADMIN_DB_ENCRYPTED" : envKey ? "ENV" : "NONE",
  };
}

export function sanitizeChatbotSettingsForAdmin(
  settings: Awaited<ReturnType<typeof getOrCreateChatbotSettings>>
) {
  const aiStatus = resolveEffectiveAiCredentials(settings);
  const emailStatus = resolveEffectiveEmailCredentials(settings);

  return {
    id: settings.id,
    aiEnabled: settings.aiEnabled,
    aiProvider: settings.aiProvider,
    aiModel: settings.aiModel,
    aiBaseUrl: settings.aiBaseUrl || "",
    hasAiApiKey: aiStatus.configured,
    aiApiKeyPreview: maskSecretPreview(settings.aiApiKeyEncrypted) || (aiStatus.source === "ENV" ? "Configured via ENV" : null),
    aiCredentialSource: aiStatus.source,
    assistantName: settings.assistantName,
    welcomeMessage: settings.welcomeMessage,
    systemInstructions: settings.systemInstructions,
    defaultLanguage: settings.defaultLanguage,
    escalationThreshold: settings.escalationThreshold,
    humanHandoverEnabled: settings.humanHandoverEnabled,
    emailEnabled: settings.emailEnabled,
    emailProvider: settings.emailProvider,
    supportEmail: settings.supportEmail,
    senderEmail: settings.senderEmail,
    senderName: settings.senderName,
    replyRoutingDomain: settings.replyRoutingDomain,
    hasEmailApiKey: emailStatus.configured,
    emailApiKeyPreview:
      maskSecretPreview(settings.emailApiKeyEncrypted) ||
      (emailStatus.source === "ENV" ? "Configured via ENV" : null),
    emailCredentialSource: emailStatus.source,
    hasInboundWebhookSecret: emailStatus.webhookConfigured,
    inboundWebhookSecretPreview: maskSecretPreview(settings.inboundWebhookSecretEncrypted),
    smtpHost: settings.smtpHost || "",
    smtpPort: settings.smtpPort || 587,
    smtpUser: settings.smtpUser || "",
    lastWebhookVerifiedAt: settings.lastWebhookVerifiedAt,
    lastTestEmailAt: settings.lastTestEmailAt,
    lastTestEmailStatus: settings.lastTestEmailStatus,
    updatedAt: settings.updatedAt,
  };
}

function tokenizeQuery(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s₹]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function scoreSnippet(queryTokens: string[], text: string): number {
  if (queryTokens.length === 0) return 1;
  const hay = text.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (hay.includes(t)) score += 1;
  }
  return score;
}

export async function buildUnifiedKnowledgeContext(queryText: string) {
  const [
    websiteSettings,
    sections,
    plans,
    services,
    controlFeatures,
    storesCount,
    faqs,
    kbEntries,
  ] = await Promise.all([
    prisma.websiteSettings.findUnique({ where: { id: "default" } }),
    prisma.pageSection.findMany({
      where: { enabled: true, draftStatus: { not: "DRAFT" } },
      orderBy: [{ pageSlug: "asc" }, { sortOrder: "asc" }],
      take: 35,
    }),
    prisma.distributionPlan.findMany({
      where: { published: true, draftStatus: { not: "DRAFT" } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.cmsService.findMany({
      where: { published: true, draftStatus: { not: "DRAFT" } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.controlFeature.findMany({
      where: { published: true, draftStatus: { not: "DRAFT" } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.digitalStore.count({ where: { enabled: true } }),
    prisma.faqItem.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.knowledgeBaseEntry.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  const tokens = tokenizeQuery(queryText);

  const businessLines: string[] = [];
  if (websiteSettings) {
    businessLines.push(
      `Company Name: ${websiteSettings.siteName}`,
      `Tagline: ${websiteSettings.tagline}`,
      `Official Support Email: ${websiteSettings.contactEmail}`,
      `Phone: ${websiteSettings.contactPhone}`,
      `Address: ${websiteSettings.contactAddress}`,
      `Connected Digital Stores Count: ${Math.max(storesCount, 150)}+ stores`
    );
  }

  const plansBlock = plans.map((p) => {
    let featuresText = "";
    try {
      const feats = JSON.parse(p.featuresJson) as string[];
      featuresText = Array.isArray(feats) ? feats.join("; ") : "";
    } catch {
      featuresText = "";
    }
    return `Plan: ${p.name} | Price: ${p.priceLabel} (${p.billingCycle}) | Description: ${p.description} | Features: ${featuresText}`;
  });

  const servicesBlock = services.map((s) => `Service: ${s.title} — ${s.shortDesc}`);
  const controlBlock = controlFeatures.map((c) => `Platform Feature: ${c.title} — ${c.description}`);

  const pageSummaries = sections
    .filter((s) => s.title || s.subtitle)
    .map((s) => `[${s.pageSlug}/${s.sectionKey}] ${s.title || ""} ${s.subtitle || ""}`.trim());

  const candidateKnowledge = [
    ...kbEntries.map((k) => ({
      source: `KB (${k.category}): ${k.title}`,
      text: `${k.question ? `Q: ${k.question}\n` : ""}${k.content}${k.tags ? `\nTags: ${k.tags}` : ""}`,
    })),
    ...faqs.map((f) => ({
      source: `FAQ (${f.category})`,
      text: `Q: ${f.question}\nA: ${f.answer}`,
    })),
  ];

  const rankedKnowledge = candidateKnowledge
    .map((item) => ({
      ...item,
      score: scoreSnippet(tokens, `${item.source} ${item.text}`),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  const contextSections = [
    "### WEBSITE BUSINESS INFORMATION",
    businessLines.join("\n"),
    "",
    "### PRICING & DISTRIBUTION PLANS",
    plansBlock.join("\n") || "No published plans found.",
    "",
    "### SERVICES",
    servicesBlock.join("\n") || "No published services found.",
    "",
    "### RIGHTS & CONTROL FEATURES",
    controlBlock.join("\n"),
    "",
    "### WEBSITE PAGES OVERVIEW (ABOUT, BRAND, HOME, ETC.)",
    pageSummaries.slice(0, 20).join("\n"),
    "",
    "### RELEVANT KNOWLEDGE BASE & FAQS",
    rankedKnowledge.map((k) => `[${k.source}]\n${k.text}`).join("\n\n"),
  ];

  return {
    formattedContext: contextSections.join("\n"),
    topKbMatches: rankedKnowledge.filter((k) => k.score >= 2),
    counts: {
      plans: plans.length,
      services: services.length,
      faqs: faqs.length,
      kbEntries: kbEntries.length,
    },
  };
}
