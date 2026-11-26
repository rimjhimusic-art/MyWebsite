import { NextResponse } from "next/server";
import { processInboundEmailWebhook } from "@/lib/chat-email-inbound";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let payload: Record<string, unknown> = {};

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      for (const [k, v] of params.entries()) {
        payload[k] = v;
      }
    } else {
      try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
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
