import fs from "node:fs";
import {
  PID_PATH,
  PROJECT_ROOT,
  ensureAutopushDir,
  getDaemonPid,
  logLine,
  readConfig,
  readState,
  shouldIgnoreRelativePath,
  syncAndPush,
  writeState,
} from "./core.mjs";

let debounceTimer = null;
let retryTimer = null;
let heartbeatTimer = null;
let watcher = null;
let syncInFlight = false;
let dirtyDuringSync = false;

function cleanupAndExit(signal) {
  logLine(`Daemon stopping cleanly on ${signal}`);
  if (debounceTimer) clearTimeout(debounceTimer);
  if (retryTimer) clearTimeout(retryTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  try {
    watcher?.close();
  } catch {
    // ignore
  }
  try {
    if (fs.existsSync(PID_PATH)) {
      const current = Number.parseInt(fs.readFileSync(PID_PATH, "utf8").trim(), 10);
      if (current === process.pid) {
        fs.unlinkSync(PID_PATH);
      }
    }
  } catch {
    // ignore
  }
  process.exit(0);
}

function scheduleRetryIfNeeded(result) {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (!result || result.ok || result.blockedBySecret) return;

  const state = readState();
  if (state.status === "retry_scheduled" && state.nextRetryAt) {
    const waitMs = Math.max(5_000, new Date(state.nextRetryAt).getTime() - Date.now());
    retryTimer = setTimeout(() => {
      runCycle("retry");
    }, waitMs);
  }
}

async function runCycle(trigger) {
  const cfg = readConfig();
  if (!cfg.enabled) {
    return;
  }

  if (syncInFlight) {
    dirtyDuringSync = true;
    return;
  }

  syncInFlight = true;
  try {
    const res = await syncAndPush({ trigger, allowWhenDisabled: false });
    scheduleRetryIfNeeded(res);
  } catch (err) {
    logLine(`Unexpected daemon cycle error: ${err?.message || err}`, "ERROR");
  } finally {
    syncInFlight = false;
    if (dirtyDuringSync) {
      dirtyDuringSync = false;
      scheduleDebouncedSync("queued_edit");
    }
  }
}

function scheduleDebouncedSync(reason = "file_change") {
  const cfg = readConfig();
  if (!cfg.enabled) return;

  if (syncInFlight) {
    dirtyDuringSync = true;
    return;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  const waitMs = cfg.debounceMs || 10_000;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runCycle(reason);
  }, waitMs);
}

function startWatcher() {
  ensureAutopushDir();

  const existingPid = getDaemonPid();
  if (existingPid && existingPid !== process.pid) {
    console.log(`Auto-push daemon already running (PID ${existingPid}). Exiting duplicate cleanly.`);
    process.exit(0);
  }

  fs.writeFileSync(PID_PATH, String(process.pid), "utf8");
  writeState({ daemonHeartbeatAt: new Date().toISOString() });
  logLine(`Auto-push daemon started (PID ${process.pid}) watching ${PROJECT_ROOT}`);

  process.on("SIGINT", () => cleanupAndExit("SIGINT"));
  process.on("SIGTERM", () => cleanupAndExit("SIGTERM"));

  watcher = fs.watch(PROJECT_ROOT, { recursive: true }, (_eventType, filename) => {
    if (!filename) return;
    const rel = String(filename);
    if (shouldIgnoreRelativePath(rel)) return;
    scheduleDebouncedSync("file_save");
  });

  watcher.on("error", (err) => {
    logLine(`fs.watch error: ${err?.message || err}`, "ERROR");
  });

  let lastKnownEnabled = readConfig().enabled;

  // Periodic heartbeat + safety check for toggle ON transitions or network retry recovery
  heartbeatTimer = setInterval(() => {
    try {
      const cfg = readConfig();
      writeState({ daemonHeartbeatAt: new Date().toISOString() });
      const state = readState();

      if (!lastKnownEnabled && cfg.enabled) {
        logLine("Auto-Push re-enabled; scheduling sync check.");
        scheduleDebouncedSync("re_enabled");
      }
      lastKnownEnabled = cfg.enabled;

      if (cfg.enabled && state.status === "retry_scheduled" && state.nextRetryAt) {
        if (Date.now() >= new Date(state.nextRetryAt).getTime() && !syncInFlight && !debounceTimer) {
          runCycle("retry_heartbeat");
        }
      }
    } catch {
      // non-fatal
    }
  }, 5_000);

  // Startup catch-up sync (handles changes edited while Mac was restarting or Antigravity restarted)
  setTimeout(() => {
    runCycle("startup_catchup");
  }, 3_000);
}

startWatcher();
