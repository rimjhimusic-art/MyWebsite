import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// Populate DATABASE_URL from .env when executed directly outside Next.js
if (!process.env.DATABASE_URL) {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

const prisma = new PrismaClient();

function rebrandText(input: string): string;
function rebrandText(input: string | null | undefined): string | null | undefined;
function rebrandText(input: string | null | undefined): string | null | undefined {
  if (input === null || input === undefined) return input;
  return input
    .replace(/One\s*Tab Media Network Private Limited/gi, "Goldex Media Network Private Limited")
    .replace(/One\s*Tab Media Network Pvt\.?\s*Ltd\.?/gi, "Goldex Media Network Private Limited")
    .replace(/One\s*Tab Media Network/gi, "Goldex Media Network")
    .replace(/One\s*Tab Media/gi, "Goldex Media Network")
    .replace(/#OneTabRevolution/gi, "#GoldexRevolution")
    .replace(/#OneTabMedia/gi, "#GoldexMediaNetwork")
    .replace(/https?:\/\/(?:www\.)?onetabmedianetwork\.com/gi, "https://goldexmedianetwork.com")
    .replace(/https?:\/\/(?:www\.)?instagram\.com\/onetab\.media\/?/gi, "https://www.instagram.com/goldexmedianetwork/")
    .replace(/https?:\/\/(?:www\.)?facebook\.com\/onetabmedia\/?/gi, "https://www.facebook.com/goldexmedianetwork/")
    .replace(/https?:\/\/(?:www\.)?youtube\.com\/@OneTabMediaNetwork\/?/gi, "https://www.youtube.com/@GoldexMediaNetwork")
    .replace(/support@onetabmedia\.in/gi, "support@goldexmedianetwork.com")
    .replace(/contact@onetabmedia\.in/gi, "support@goldexmedianetwork.com")
    .replace(/reply\.onetabmedia\.in/gi, "reply.goldexmedianetwork.com")
    .replace(/\+91[\s-]*70470[\s-]*13399/g, "+918724804659")
    .replace(/917047013399/g, "918724804659")
    .replace(/70470[\s-]*13399/g, "8724804659")
    .replace(/Nadia,\s*West Bengal,\s*India/gi, "Assam, Guwahati, India")
    .replace(/West Bengal,\s*India/gi, "Assam, Guwahati, India")
    .replace(/\bOne\s*Tab\b(?![@.])/gi, "Goldex Media Network")
    .replace(/©\s*2026\s+Goldex Media Network Private Limited\.?\s*All Rights Reserved\.?/gi, "Copyright 2026 Goldex Media Network Private Limited. All rights reserved.");
}

async function run() {
  console.log("Running non-destructive Goldex Media Network DB migration...");

  // 1. WebsiteSettings singleton (only rebrand legacy OneTab rows; preserve later Goldex Admin edits)
  const ws = await prisma.websiteSettings.findUnique({ where: { id: "default" } });
  if (ws && (/one\s*tab/i.test(ws.siteName) || /onetab/i.test(ws.contactEmail) || ws.contactPhone.includes("70470"))) {
    await prisma.websiteSettings.update({
      where: { id: "default" },
      data: {
        siteName: "Goldex Media Network",
        tagline:
          rebrandText(ws.tagline) ||
          "India's leading digital music distribution partner empowering independent artists and labels globally with enterprise-grade technology.",
        headerLogoUrl:
          !ws.headerLogoUrl || ws.headerLogoUrl === "/ref/logo.png" || /onetab/i.test(ws.headerLogoUrl)
            ? "/ref/goldex-logo.svg"
            : ws.headerLogoUrl,
        headerLogoWidth: ws.headerLogoUrl === "/ref/logo.png" ? 186 : ws.headerLogoWidth,
        headerLogoHeight: ws.headerLogoUrl === "/ref/logo.png" ? 42 : ws.headerLogoHeight,
        footerLogoUrl:
          !ws.footerLogoUrl || ws.footerLogoUrl === "/ref/logo.png" || /onetab/i.test(ws.footerLogoUrl)
            ? "/ref/goldex-logo.svg"
            : ws.footerLogoUrl,
        footerLogoWidth: ws.footerLogoUrl === "/ref/logo.png" ? 186 : ws.footerLogoWidth,
        footerLogoHeight: ws.footerLogoUrl === "/ref/logo.png" ? 42 : ws.footerLogoHeight,
        faviconUrl:
          !ws.faviconUrl || ws.faviconUrl === "/ref/logo.png" || /onetab/i.test(ws.faviconUrl)
            ? "/ref/goldex-favicon.svg"
            : ws.faviconUrl,
        contactEmail: "support@goldexmedianetwork.com",
        contactPhone: "+918724804659",
        contactAddress: "Assam, Guwahati, India",
        instagramUrl: rebrandText(ws.instagramUrl) || "https://www.instagram.com/goldexmedianetwork/",
        facebookUrl: rebrandText(ws.facebookUrl) || "https://www.facebook.com/goldexmedianetwork/",
        whatsappUrl: "https://wa.me/918724804659",
        youtubeUrl: rebrandText(ws.youtubeUrl) || "https://www.youtube.com/@GoldexMediaNetwork",
        instagramEnabled: true,
        facebookEnabled: true,
        whatsappEnabled: true,
        youtubeEnabled: true,
        socialOrderJson: ws.socialOrderJson || '["instagram","facebook","whatsapp","youtube"]',
        whatsappUsePhone: true,
        copyrightCompanyName: "Goldex Media Network Private Limited",
        copyrightYear: ws.copyrightYear || 2026,
        copyrightText: `Copyright ${ws.copyrightYear || 2026} Goldex Media Network Private Limited. All rights reserved.`,
        draftJson: rebrandText(ws.draftJson) ?? null,
      },
    });
    console.log("Updated WebsiteSettings singleton.");
  }

  // 2. PageSection records
  const sections = await prisma.pageSection.findMany();
  for (const s of sections) {
    await prisma.pageSection.update({
      where: { id: s.id },
      data: {
        title: rebrandText(s.title),
        subtitle: rebrandText(s.subtitle),
        badgeText: rebrandText(s.badgeText),
        bodyHtml: rebrandText(s.bodyHtml),
        ctaLabel: rebrandText(s.ctaLabel),
        cta2Label: rebrandText(s.cta2Label),
        mediaUrl: s.mediaUrl === "/ref/logo.png" ? "/ref/goldex-logo.svg" : s.mediaUrl,
        extraJson: rebrandText(s.extraJson),
        draftJson: s.draftJson !== null ? rebrandText(s.draftJson) : null,
      },
    });
  }
  console.log(`Checked/updated ${sections.length} PageSection records.`);

  // 3. SeoSetting records
  const seoRows = await prisma.seoSetting.findMany();
  for (const row of seoRows) {
    await prisma.seoSetting.update({
      where: { id: row.id },
      data: {
        metaTitle: rebrandText(row.metaTitle) || row.metaTitle,
        metaDescription: rebrandText(row.metaDescription) || row.metaDescription,
        ogTitle: rebrandText(row.ogTitle),
        ogDescription: rebrandText(row.ogDescription),
        ogImageUrl:
          !row.ogImageUrl || row.ogImageUrl === "/ref/logo.png"
            ? "/ref/goldex-og.svg"
            : row.ogImageUrl,
        draftJson: rebrandText(row.draftJson),
      },
    });
  }
  console.log(`Checked/updated ${seoRows.length} SeoSetting records.`);

  // 4. SitePage records
  const sitePages = await prisma.sitePage.findMany();
  for (const p of sitePages) {
    await prisma.sitePage.update({
      where: { id: p.id },
      data: {
        title: rebrandText(p.title) || p.title,
        subtitle: rebrandText(p.subtitle),
        contentJson: rebrandText(p.contentJson) || p.contentJson,
      },
    });
  }
  console.log(`Checked/updated ${sitePages.length} SitePage records.`);

  // 5. DistributionPlan, CmsService, ControlFeature, BrandCreator, FaqItem, KnowledgeBaseEntry
  const plans = await prisma.distributionPlan.findMany();
  for (const p of plans) {
    await prisma.distributionPlan.update({
      where: { id: p.id },
      data: {
        name: rebrandText(p.name),
        featuresJson: rebrandText(p.featuresJson),
        draftJson: p.draftJson !== null ? rebrandText(p.draftJson) : null,
      },
    });
  }

  const services = await prisma.cmsService.findMany();
  for (const srv of services) {
    await prisma.cmsService.update({
      where: { id: srv.id },
      data: {
        title: rebrandText(srv.title),
        shortDesc: rebrandText(srv.shortDesc),
        detailsJson: rebrandText(srv.detailsJson),
        draftJson: srv.draftJson !== null ? rebrandText(srv.draftJson) : null,
      },
    });
  }

  const faqs = await prisma.faqItem.findMany();
  for (const f of faqs) {
    await prisma.faqItem.update({
      where: { id: f.id },
      data: {
        question: rebrandText(f.question) || f.question,
        answer: rebrandText(f.answer) || f.answer,
      },
    });
  }

  const kbs = await prisma.knowledgeBaseEntry.findMany();
  for (const k of kbs) {
    await prisma.knowledgeBaseEntry.update({
      where: { id: k.id },
      data: {
        title: rebrandText(k.title) || k.title,
        content: rebrandText(k.content) || k.content,
      },
    });
  }

  // 6. Non-destructive check on TeamMember & FeaturedArtist (preserve all rows)
  const teamCount = await prisma.teamMember.count();
  const artistCount = await prisma.featuredArtist.count();
  const teamRows = await prisma.teamMember.findMany();
  for (const tm of teamRows) {
    const newBio = tm.bio !== null ? rebrandText(tm.bio) : null;
    const newDraft = tm.draftJson !== null ? rebrandText(tm.draftJson) : null;
    if (newBio !== tm.bio || newDraft !== tm.draftJson) {
      await prisma.teamMember.update({
        where: { id: tm.id },
        data: { bio: newBio, draftJson: newDraft },
      });
    }
  }
  const artistRows = await prisma.featuredArtist.findMany();
  for (const ar of artistRows) {
    const newBio = rebrandText(ar.bio);
    const newDraft = ar.draftJson !== null ? rebrandText(ar.draftJson) : null;
    if (newBio !== ar.bio || newDraft !== ar.draftJson) {
      await prisma.featuredArtist.update({
        where: { id: ar.id },
        data: { bio: newBio, draftJson: newDraft },
      });
    }
  }
  console.log(`Preserved all ${teamCount} TeamMember and ${artistCount} FeaturedArtist records.`);

  // 7. ChatbotSettings
  const chat = await prisma.chatbotSettings.findUnique({ where: { id: "default" } });
  if (chat) {
    await prisma.chatbotSettings.update({
      where: { id: "default" },
      data: {
        assistantName: /onetab/i.test(chat.assistantName)
          ? "Goldex Support Assistant"
          : chat.assistantName,
        welcomeMessage:
          rebrandText(chat.welcomeMessage) ||
          "Hi! I'm Goldex Support Assistant, the official Goldex Media Network assistant. Ask me about music distribution, plans, DSPs, royalties, or VEVO.",
        systemInstructions:
          rebrandText(chat.systemInstructions) ||
          "You are Goldex Support Assistant, the official customer support assistant for Goldex Media Network.",
        supportEmail: /onetab/i.test(chat.supportEmail)
          ? "support@goldexmedianetwork.com"
          : chat.supportEmail,
        senderEmail: /onetab/i.test(chat.senderEmail)
          ? "support@goldexmedianetwork.com"
          : chat.senderEmail,
        senderName: /onetab/i.test(chat.senderName)
          ? "Goldex Media Network Support"
          : chat.senderName,
        replyRoutingDomain: /onetab/i.test(chat.replyRoutingDomain)
          ? "reply.goldexmedianetwork.com"
          : chat.replyRoutingDomain,
      },
    });
    console.log("Updated ChatbotSettings singleton.");
  }

  console.log("Goldex Media Network non-destructive DB migration completed!");
}

run()
  .catch((err) => {
    console.error("Rebrand DB error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
