import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const faqs = await prisma.faqItem.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ faqs });
}
