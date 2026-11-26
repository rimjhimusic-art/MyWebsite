import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const message = (searchParams.get("message") || "").trim().toLowerCase();

  if (!message) {
    return NextResponse.json({
      reply:
        "Hi! Ask me about distribution plans, DSP stores, audio/artwork specs, VEVO, YouTube Content ID, or royalty payouts.",
    });
  }

  const faqs = await prisma.faqItem.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
  });

  const tokens = message
    .replace(/[^a-z0-9\s₹]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  let bestFaq: (typeof faqs)[number] | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const haystack = `${faq.question} ${faq.answer} ${faq.category} ${faq.keywords}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (faq.keywords.toLowerCase().includes(token)) score += 3;
      if (faq.question.toLowerCase().includes(token)) score += 2;
      if (haystack.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestFaq = faq;
    }
  }

  if (bestFaq && bestScore >= 2) {
    return NextResponse.json({
      reply: bestFaq.answer,
      matchedCategory: bestFaq.category,
      faqId: bestFaq.id,
    });
  }

  if (/\b(hi|hello|hey|namaste)\b/.test(message)) {
    return NextResponse.json({
      reply:
        "Hello! Welcome to OneTab Media Network. You can distribute music to 150+ stores starting at ₹0/year, manage labels, request VEVO channels, and track royalties. What would you like to know?",
    });
  }

  return NextResponse.json({
    reply:
      "I couldn't find an exact FAQ match for that question. You can browse all answers on our FAQ page, open a Support Ticket from Help & Support, or email support@onetabmedia.in.",
  });
}
