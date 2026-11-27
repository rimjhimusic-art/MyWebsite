import { NextResponse } from "next/server";
import { processInboundEmailWebhook } from "@/lib/chat-email-inbound";

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/webhooks/email/inbound",
    domain: "www.goldexmedianetwork.info",
    accepts: ["POST"],
    formats: [
      "application/json",
      "multipart/form-data",
      "application/x-www-form-urlencoded",
    ],
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const contentType = (request.headers.get("content-type") || "").toLowerCase();
    let rawBody = "";
    let payload: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const cloned = request.clone();
      rawBody = await cloned.text();
      const form = await request.formData();
      for (const [k, v] of form.entries()) {
        if (typeof v === "string") {
          payload[k] = v;
        }
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      rawBody = await request.text();
      const params = new URLSearchParams(rawBody);
      for (const [k, v] of params.entries()) {
        payload[k] = v;
      }
    } else {
      rawBody = await request.text();
      if (!rawBody.trim()) {
        return NextResponse.json({ error: "Empty webhook POST payload." }, { status: 400 });
      }
      try {
        const parsed = JSON.parse(rawBody);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return NextResponse.json({ error: "Webhook payload must be a JSON object." }, { status: 400 });
        }
        payload = parsed as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Invalid JSON webhook payload." }, { status: 400 });
      }
    }

    const result = await processInboundEmailWebhook({
      rawBody,
      headers: request.headers,
      payload,
    });

    return NextResponse.json(result, { status: result.httpStatus });
  } catch (err) {
    console.error("Inbound email webhook error:", err);
    return NextResponse.json(
      { error: "Failed to process inbound email webhook." },
      { status: 500 }
    );
  }
}
