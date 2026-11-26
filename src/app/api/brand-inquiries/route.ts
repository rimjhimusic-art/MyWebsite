import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const BrandSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(5, "Phone number is required"),
  email: z.string().trim().email("Valid email is required"),
  businessName: z.string().trim().min(2, "Business/Organization name is required"),
  message: z.string().trim().max(4000).optional().default(""),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`brand:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = BrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid submission." },
        { status: 400 }
      );
    }

    const inquiry = await prisma.brandInquiry.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        businessName: parsed.data.businessName,
        message: parsed.data.message || null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        id: inquiry.id,
        message: "Thank you! A Brand Manager will reach out within 24 hours.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Brand inquiry error:", err);
    return NextResponse.json(
      { error: "Failed to save brand inquiry." },
      { status: 500 }
    );
  }
}
