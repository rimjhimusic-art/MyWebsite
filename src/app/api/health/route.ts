import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (err) {
    console.error("Health check error:", err);
    return NextResponse.json({ ok: false, database: "error" }, { status: 500 });
  }
}
