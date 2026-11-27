import { NextResponse } from "next/server";
import { requireCmsApiAuth } from "@/lib/cms";
import { fetchSpotifyMetadata, fetchYoutubeMetadata } from "@/lib/media-metadata";

export async function POST(request: Request) {
  const auth = await requireCmsApiAuth(request, { resource: "cms", action: "edit" });
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { platform?: string; url?: string };
    const platform = String(body.platform || "").toLowerCase();
    const url = String(body.url || "").trim();

    if (!url) {
      return NextResponse.json({ error: "Please provide a URL to fetch metadata." }, { status: 400 });
    }

    if (platform === "spotify") {
      const meta = await fetchSpotifyMetadata(url);
      return NextResponse.json({ ok: true, platform: "spotify", metadata: meta });
    }

    if (platform === "youtube") {
      const meta = await fetchYoutubeMetadata(url);
      return NextResponse.json({ ok: true, platform: "youtube", metadata: meta });
    }

    return NextResponse.json({ error: "Unsupported platform. Use spotify or youtube." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch URL metadata.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
