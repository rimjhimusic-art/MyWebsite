import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  LOG_PATH,
  getFullStatus,
  logLine,
  syncAndPush,
  writeConfig,
} from "./core.mjs";

const execFileAsync = promisify(execFile);
const PLIST_LABEL = "com.onetabmedia.autopush";
const PLIST_PATH = path.join(os.homedir(), "Library", "LaunchAgents", `${PLIST_LABEL}.plist`);

async function runLaunchctl(args) {
  return execFileAsync("launchctl", args, { timeout: 15_000 });
}

async function restartLaunchAgent() {
  const uid = process.getuid ? process.getuid() : 501;
  const domainTarget = `gui/${uid}/${PLIST_LABEL}`;
  try {
    await runLaunchctl(["kickstart", "-k", domainTarget]);
    return true;
  } catch {
    try {
      await runLaunchctl(["unload", "-w", PLIST_PATH]);
    } catch {
      // ignore if not loaded
    }
    await runLaunchctl(["load", "-w", PLIST_PATH]);
    return true;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = (args[0] || "status").toLowerCase();
  const jsonMode = args.includes("--json");
  const fastMode = args.includes("--fast");

  switch (cmd) {
    case "on":
    case "enable": {
      const cfg = writeConfig({ enabled: true });
      logLine("Auto-Push turned ON via CLI/API.");
      const status = await getFullStatus({ includeRemote: !fastMode });
      if (jsonMode) console.log(JSON.stringify({ ok: true, config: cfg, status }));
      else console.log(`Auto-Push: ON (Watcher PID: ${status.daemonPid || "not running"})`);
      break;
    }

    case "off":
    case "disable": {
      const cfg = writeConfig({ enabled: false });
      logLine("Auto-Push turned OFF via CLI/API.");
      const status = await getFullStatus({ includeRemote: !fastMode });
      if (jsonMode) console.log(JSON.stringify({ ok: true, config: cfg, status }));
      else console.log("Auto-Push: OFF (Pending edits remain safely local until re-enabled or manually pushed).");
      break;
    }

    case "push":
    case "manual": {
      const result = await syncAndPush({ trigger: "manual", allowWhenDisabled: true });
      const status = await getFullStatus({ includeRemote: !fastMode });
      if (jsonMode) console.log(JSON.stringify({ ...result, status }));
      else {
        console.log("Manual Push Result:", JSON.stringify(result, null, 2));
      }
      if (!result.ok && !result.busy) process.exitCode = 1;
      break;
    }

    case "verify":
    case "status": {
      const status = await getFullStatus({ includeRemote: !fastMode });
      if (jsonMode) {
        console.log(JSON.stringify(status));
      } else {
        console.log("=== OneTab Auto-Push Status ===");
        console.log(`Auto Push:            ${status.autoPushEnabled ? "ON" : "OFF"}`);
        console.log(`Background Watcher:   ${status.daemonRunning ? `RUNNING (PID ${status.daemonPid})` : "STOPPED"}`);
        console.log(`Branch / Remote:      ${status.branch} -> ${status.remote}`);
        console.log(`Pending Changes:      ${status.pendingCount} file(s)`);
        console.log(`Unpushed Commits:     ${status.unpushedCommitsCount}`);
        console.log(`Last Commit:          ${status.lastCommitHash?.slice(0, 7) || "none"} — ${status.lastCommitMessage || "none"}`);
        console.log(`Last Successful Push: ${status.lastSuccessfulPushAt || "not recorded yet"}`);
        console.log(`Push Status:          ${status.status}${status.lastError ? ` (ERROR: ${status.lastError})` : ""}`);
        if (status.github) {
          console.log(`GitHub Verification:  ${status.github.inSync ? "IN SYNC" : "OUT OF SYNC"} (Remote SHA: ${status.github.remoteHeadSha?.slice(0, 7) || "unknown"})`);
        }
        if (status.vercel) {
          console.log(`Vercel Verification:  ${status.vercel.state.toUpperCase()} — ${status.vercel.summary}`);
        }
      }
      break;
    }

    case "restart": {
      await restartLaunchAgent();
      const status = await getFullStatus({ includeRemote: false });
      console.log(`Restarted LaunchAgent (${PLIST_LABEL}). Watcher PID: ${status.daemonPid || "starting"}`);
      break;
    }

    case "logs": {
      if (!fs.existsSync(LOG_PATH)) {
        console.log("No auto-push logs yet.");
      } else {
        const lines = fs.readFileSync(LOG_PATH, "utf8").trim().split("\n");
        console.log(lines.slice(-40).join("\n"));
      }
      break;
    }

    default: {
      console.error(`Unknown command: ${cmd}. Usage: ctl.mjs <status|on|off|push|verify|restart|logs> [--json]`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
