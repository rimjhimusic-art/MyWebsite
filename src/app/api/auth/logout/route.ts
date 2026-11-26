import { NextResponse } from "next/server";
import { getCurrentUser, revokeCurrentSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  await revokeCurrentSession();
  if (user) {
    await recordAuditLog({
      actorUserId: user.id,
      action: "USER_LOGOUT",
      entityType: "Session",
      entityId: user.sessionId,
    });
  }
  return NextResponse.json({ ok: true });
}
