import { NextResponse } from "next/server";
import { getUpdatesFeed } from "@/lib/updates";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await getUpdatesFeed({ includeUnpublished: false });
  return NextResponse.json(feed);
}
