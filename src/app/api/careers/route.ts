import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const CareerSchema = z.object({
  roleTitle: z.string().trim().min(2, "Role title is required"),
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().optional().default(""),
  portfolioUrl: z.string().trim().optional().default(""),
  coverNote: z.string().trim().min(10, "Please share a brief cover note"),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`career:${ip}`, 8, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = CareerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid application." },
        { status: 400 }
      );
    }

    const app = await prisma.careerApplication.create({
      data: {
        roleTitle: parsed.data.roleTitle,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        portfolioUrl: parsed.data.portfolioUrl || null,
        coverNote: parsed.data.coverNote,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        id: app.id,
        message: "Application submitted! Our talent team will review it shortly.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Career application error:", err);
    return NextResponse.json(
      { error: "Failed to submit application." },
      { status: 500 }
    );
  }
}
