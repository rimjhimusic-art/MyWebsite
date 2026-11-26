import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPlatformEmail } from "@/lib/email";

const ContactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Valid email address is required"),
  phone: z.string().trim().max(30).optional().default(""),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(4000),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rl = checkRateLimit(`contact:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many contact requests. Please try again shortly." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid contact form input." },
        { status: 400 }
      );
    }

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
      },
    });

    await sendPlatformEmail({
      toEmail: parsed.data.email,
      subject: "We received your inquiry — OneTab Media Network",
      bodyPreview: `Hi ${parsed.data.name}, thank you for contacting OneTab Media Network. Reference ID: ${inquiry.id}`,
      template: "contact_confirmation",
    });

    return NextResponse.json(
      {
        ok: true,
        id: inquiry.id,
        message: "Thank you! Your message has been received. Our team will respond shortly.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Contact POST error:", err);
    return NextResponse.json(
      { error: "Failed to submit message. Please try again." },
      { status: 500 }
    );
  }
}
