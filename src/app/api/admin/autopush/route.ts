import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

const execFileAsync = promisify(execFile);

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("toggle"),
    enabled: z.boolean(),
  }),
  z.object({
    action: z.literal("manual_push"),
  }),
]);

async function runCtl(args: string[]) {
  const ctlPath = path.join(process.cwd(), "scripts", "autopush", "ctl.mjs");
  const env = {
    ...process.env,
    PATH: `/Users/anupambhowmick/.local/node/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
  };
  const { stdout } = await execFileAsync(process.execPath, [ctlPath, ...args, "--json"], {
    cwd: process.cwd(),
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
    env,
  });
  return JSON.parse(stdout);
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (auth.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only the Primary Super Admin can view Auto-Push deployment controls." },
      { status: 403 }
    );
  }

  try {
    const status = await runCtl(["status"]);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unable to read Auto-Push system status.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (auth.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only the Primary Super Admin can control GitHub Auto-Push." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid action payload." },
        { status: 400 }
      );
    }

    if (parsed.data.action === "toggle") {
      const cmd = parsed.data.enabled ? "on" : "off";
      const result = await runCtl([cmd]);
      await recordAuditLog({
        actorUserId: auth.user.id,
        action: parsed.data.enabled ? "AUTOPUSH_ENABLED" : "AUTOPUSH_DISABLED",
        entityType: "Deployment",
        entityId: "github-autopush",
      });
      return NextResponse.json(result);
    }

    const pushResult = await runCtl(["push"]);
    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "AUTOPUSH_MANUAL_PUSH",
      entityType: "Deployment",
      entityId: "github-autopush",
      metadata: {
        ok: Boolean(pushResult.ok),
        headSha: pushResult.headSha || null,
        blockedBySecret: Boolean(pushResult.blockedBySecret),
      },
    });

    if (pushResult.blockedBySecret) {
      return NextResponse.json(pushResult, { status: 422 });
    }
    return NextResponse.json(pushResult, { status: pushResult.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to execute Auto-Push command.",
      },
      { status: 500 }
    );
  }
}
