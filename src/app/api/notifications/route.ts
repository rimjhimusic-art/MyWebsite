import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const notifications = await prisma.notification.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  if (body?.id) {
    await prisma.notification.updateMany({
      where: { id: String(body.id), userId: auth.user.id },
      data: { isRead: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: auth.user.id, isRead: false },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ ok: true });
}
