import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const AUTOPUSH_DIR = path.join(PROJECT_ROOT, ".autopush");
export const CONFIG_PATH = path.join(AUTOPUSH_DIR, "config.json");
export const STATE_PATH = path.join(AUTOPUSH_DIR, "state.json");
export const PID_PATH = path.join(AUTOPUSH_DIR, "daemon.pid");
export const LOCK_PATH = path.join(AUTOPUSH_DIR, "sync.lock");
export const LOG_PATH = path.join(AUTOPUSH_DIR, "autopush.log");

export const DEFAULT_CONFIG = {
  enabled: true,
  debounceMs: 10_000,
  remote: "origin",
  branch: "main",
  retryBaseMs: 15_000,
  retryMaxMs: 300_000,
};

export const DEFAULT_STATE = {
  status: "idle",
  lastSuccessfulPushAt: null,
  lastSuccessfulPushSha: null,
  lastCommitHash: null,
  lastCommitMessage: null,
  lastAttemptAt: null,
  lastError: null,
  secretWarning: null,
  blockedFiles: [],
  retryAttempt: 0,
  nextRetryAt: null,
  daemonHeartbeatAt: null,
};

// Directories and filename patterns completely excluded from watcher triggers & staging
export const IGNORED_PATH_PREFIXES = [
  ".git/",
  ".next/",
  "node_modules/",
  ".autopush/",
  "storage/",
  ".turbo/",
  ".cache/",
  "out/",
  "build/",
  "coverage/",
  ".vercel/",
];

const FORBIDDEN_FILE_PATTERNS = [
  /^\.env($|\.(?!example$).+)/i,
  /(^|\/)\.env($|\.(?!example$).+)/i,
  /\.(pem|key|p12|pfx|jks)$/i,
  /(^|\/)id_(rsa|ed25519)(\.pub)?$/i,
  /(^|\/)prisma\/dev\.db/i,
  /(^|\/)storage\//i,
  /(^|\/)(credentials|service-account|secrets?)\.json$/i,
  /(^|\/)secrets?\.(ya?ml|toml)$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.netrc$/i,
];

// Build regexes cleanly so this file's own source never trips its literal signature scanner
const PK_PREFIX = ["-----BEGIN ", "(?:RSA |EC |DSA |OPENSSH |PGP )?", "PRIVATE KEY-----"].join("");
const DB_PROTO = ["(?:postgres|postgresql|mysql|mongodb(?:\\+srv)?|redis)", "://"].join("");

const SAFE_PLACEHOLDER_RE =
  /(\$\{|process\.env\.|YOUR_|CHANGE_ME|CHANGEME|placeholder|dummy|localhost:5432\/postgres@|user:pass@|postgresql:\/\/user:password@|\*\*\*)/i;

const SECRET_LINE_RULES = [
  { name: "Private Key Block", regex: new RegExp(PK_PREFIX), allowPlaceholderBypass: false },
  { name: "AWS Access Key ID", regex: /\bAKIA[0-9A-Z]{16}\b/, allowPlaceholderBypass: false },
  { name: "GitHub Personal Access Token", regex: /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/, allowPlaceholderBypass: false },
  { name: "Google / Firebase API Key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/, allowPlaceholderBypass: false },
  { name: "Stripe Secret Key", regex: /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/, allowPlaceholderBypass: false },
  { name: "Slack Token", regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/, allowPlaceholderBypass: false },
  {
    name: "Database URL with Embedded Password",
    regex: new RegExp(`${DB_PROTO}[^:\\s"']+:[^\\s@"']{6,}@[^\\s"']+`, "i"),
    allowPlaceholderBypass: true,
  },
  {
    name: "Hardcoded Secret Assignment",
    regex: /^\s*(?:export\s+)?(?:DATABASE_URL|DIRECT_URL|JWT_SECRET|AUTH_SECRET|NEXTAUTH_SECRET|ADMIN_SETUP_TOKEN|R2_SECRET_ACCESS_KEY|R2_ACCESS_KEY_ID|RESEND_API_KEY|VERCEL_TOKEN|GITHUB_TOKEN|AWS_SECRET_ACCESS_KEY)\s*=\s*["']?([^\s"']{8,})["']?/,
    allowPlaceholderBypass: true,
  },
];

export function logLine(message, level = "INFO") {
  ensureAutopushDir();
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  try {
    // Cap log file size at ~2 MB cleanly
    if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > 2 * 1024 * 1024) {
      const old = fs.readFileSync(LOG_PATH, "utf8").slice(-512 * 1024);
      fs.writeFileSync(LOG_PATH, old, "utf8");
    }
    fs.appendFileSync(LOG_PATH, line, "utf8");
  } catch {
    // Non-fatal logging fallback
  }
}

export function ensureAutopushDir() {
  if (!fs.existsSync(AUTOPUSH_DIR)) {
    fs.mkdirSync(AUTOPUSH_DIR, { recursive: true, mode: 0o700 });
  }
}

export function readConfig() {
  ensureAutopushDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n", "utf8");
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(partial) {
  const next = { ...readConfig(), ...partial };
  ensureAutopushDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

export function readState() {
  ensureAutopushDir();
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(DEFAULT_STATE, null, 2) + "\n", "utf8");
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    return { ...DEFAULT_STATE, ...raw };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeState(partial) {
  const next = { ...readState(), ...partial };
  ensureAutopushDir();
  const tmpPath = `${STATE_PATH}.tmp.${process.pid}`;
  fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  fs.renameSync(tmpPath, STATE_PATH);
  return next;
}

export function isProcessAlive(pid) {
  if (!pid || typeof pid !== "number" || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function getDaemonPid() {
  try {
    if (!fs.existsSync(PID_PATH)) return null;
    const pid = Number.parseInt(fs.readFileSync(PID_PATH, "utf8").trim(), 10);
    return isProcessAlive(pid) ? pid : null;
  } catch {
    return null;
  }
}

export function shouldIgnoreRelativePath(relPath) {
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!norm) return true;
  for (const prefix of IGNORED_PATH_PREFIXES) {
    if (norm === prefix.slice(0, -1) || norm.startsWith(prefix)) return true;
  }
  const base = path.basename(norm);
  if (
    base === ".DS_Store" ||
    base.endsWith(".tsbuildinfo") ||
    base.endsWith(".swp") ||
    base.endsWith(".swo") ||
    base.endsWith(".tmp") ||
    base.endsWith("~") ||
    base.endsWith(".bak")
  ) {
    return true;
  }
  if (/^\.env($|\.(?!example$).*)/i.test(base)) {
    return true;
  }
  if (/^dev\.db/i.test(base) && norm.startsWith("prisma/")) {
    return true;
  }
  return false;
}

export async function runGit(args, timeoutMs = 45_000) {
  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    PATH: `/Users/anupambhowmick/.local/node/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
  };
  return execFileAsync("git", args, {
    cwd: PROJECT_ROOT,
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
    env,
  });
}

function acquireLock(owner = "autopush") {
  ensureAutopushDir();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(LOCK_PATH, "wx");
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, owner, createdAt: Date.now() }));
      fs.closeSync(fd);
      return true;
    } catch (err) {
      if (err && err.code === "EEXIST") {
        try {
          const info = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
          const ageMs = Date.now() - (info.createdAt || 0);
          if (!isProcessAlive(info.pid) || ageMs > 5 * 60 * 1000) {
            fs.unlinkSync(LOCK_PATH);
            continue;
          }
        } catch {
          try {
            const st = fs.statSync(LOCK_PATH);
            if (Date.now() - st.mtimeMs > 5 * 60 * 1000) {
              fs.unlinkSync(LOCK_PATH);
              continue;
            }
          } catch {
            continue;
          }
        }
      }
      return false;
    }
  }
  return false;
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) {
      const info = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
      if (info.pid === process.pid) {
        fs.unlinkSync(LOCK_PATH);
      }
    }
  } catch {
    try {
      fs.unlinkSync(LOCK_PATH);
    } catch {
      // ignore
    }
  }
}

export async function getPendingStatus() {
  const { stdout } = await runGit(["status", "--porcelain=v1", "-uall"]);
  const pendingFiles = stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      let filePath = line.slice(3).trim();
      if (filePath.includes(" -> ")) {
        filePath = filePath.split(" -> ").pop().trim();
      }
      // Remove surrounding quotes git adds for special filenames
      if (filePath.startsWith('"') && filePath.endsWith('"')) {
        filePath = filePath.slice(1, -1);
      }
      return { code, path: filePath };
    });
  return pendingFiles;
}

export async function scanSecretsForFiles(filePaths) {
  const findings = [];

  for (const relPath of filePaths) {
    const norm = relPath.replace(/\\/g, "/");
    for (const pat of FORBIDDEN_FILE_PATTERNS) {
      if (pat.test(norm)) {
        findings.push({
          file: norm,
          rule: "Forbidden sensitive or ignored file path",
        });
        break;
      }
    }

    const abs = path.join(PROJECT_ROOT, norm);
    if (!fs.existsSync(abs)) continue;
    let stat;
    try {
      stat = fs.statSync(abs);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;

    // Skip binary files quickly
    const buf = fs.readFileSync(abs);
    if (buf.subarray(0, 2048).includes(0)) continue;

    const text = buf.toString("utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const rule of SECRET_LINE_RULES) {
        if (!rule.regex.test(line)) continue;
        if (rule.allowPlaceholderBypass && SAFE_PLACEHOLDER_RE.test(line)) continue;
        findings.push({
          file: norm,
          line: i + 1,
          rule: rule.name,
        });
      }
    }
  }

  return findings;
}

export function buildCommitMessage(files) {
  const uniquePaths = Array.from(new Set(files.map((f) => f.path)));
  const count = uniquePaths.length;
  const preview = uniquePaths.slice(0, 3).map((p) => path.basename(p)).join(", ");
  const extra = count > 3 ? ` (+${count - 3} more)` : "";
  const subject = `Auto-sync (${count} ${count === 1 ? "file" : "files"}): ${preview}${extra}`.slice(0, 72);
  const body = uniquePaths.map((p) => `- ${p}`).join("\n");
  return { subject, body };
}

function notifyMac(title, message) {
  if (process.platform !== "darwin") return;
  const safeTitle = String(title).replace(/"/g, '\\"');
  const safeMsg = String(message).replace(/"/g, '\\"');
  execFile("osascript", ["-e", `display notification "${safeMsg}" with title "${safeTitle}"`], () => {
    // Best-effort only; ignore headless/background notification failures
  });
}

async function getBranchAndAheadCount(remote, branch) {
  const { stdout: currentBranchRaw } = await runGit(["branch", "--show-current"]);
  const currentBranch = currentBranchRaw.trim() || branch;

  let aheadCount = 0;
  try {
    const { stdout: countOut } = await runGit(["rev-list", "--count", `${remote}/${currentBranch}..HEAD`]);
    aheadCount = Number.parseInt(countOut.trim(), 10) || 0;
  } catch {
    aheadCount = 0;
  }

  let localHeadSha = null;
  let lastCommitMessage = null;
  let lastCommitAt = null;
  try {
    const { stdout: logOut } = await runGit(["log", "-1", "--format=%H%n%s%n%cI"]);
    const parts = logOut.trim().split("\n");
    localHeadSha = parts[0] || null;
    lastCommitMessage = parts[1] || null;
    lastCommitAt = parts[2] || null;
  } catch {
    // Empty repo fallback
  }

  return { currentBranch, aheadCount, localHeadSha, lastCommitMessage, lastCommitAt };
}

export async function syncAndPush({ trigger = "watcher", allowWhenDisabled = false } = {}) {
  const config = readConfig();
  if (!config.enabled && !allowWhenDisabled) {
    return { ok: true, skipped: true, reason: "Auto-Push is turned OFF." };
  }

  if (!acquireLock(trigger)) {
    return { ok: true, busy: true, reason: "Another sync/push operation is currently in progress." };
  }

  try {
    const nowIso = new Date().toISOString();
    writeState({ lastAttemptAt: nowIso });

    // Never collide with an active external git lock
    const gitIndexLock = path.join(PROJECT_ROOT, ".git", "index.lock");
    if (fs.existsSync(gitIndexLock)) {
      const lockAge = Date.now() - fs.statSync(gitIndexLock).mtimeMs;
      if (lockAge < 60_000) {
        return { ok: false, busy: true, reason: "Git index.lock active; skipping cycle." };
      }
    }

    const branchInfo = await getBranchAndAheadCount(config.remote, config.branch);
    if (branchInfo.currentBranch !== config.branch) {
      const msg = `Current branch is '${branchInfo.currentBranch}', expected '${config.branch}'. Auto-push paused safely.`;
      writeState({ status: "error", lastError: msg });
      logLine(msg, "WARN");
      return { ok: false, error: msg };
    }

    const pendingFiles = await getPendingStatus();

    if (pendingFiles.length > 0) {
      // 1. Secret scanning before git add!
      const findings = await scanSecretsForFiles(pendingFiles.map((f) => f.path));
      if (findings.length > 0) {
        const summary = findings
          .slice(0, 5)
          .map((f) => `${f.file}${f.line ? `:${f.line}` : ""} (${f.rule})`)
          .join("; ");
        const warning = `Push blocked by Secret Scanner: ${summary}`;
        writeState({
          status: "blocked_secret",
          secretWarning: warning,
          lastError: warning,
          blockedFiles: findings,
        });
        logLine(warning, "ERROR");
        notifyMac("OneTab Auto-Push Blocked", "Potential secret detected! Push stopped safely.");
        return { ok: false, blockedBySecret: true, error: warning, findings };
      }

      // 2. Stage project changes safely
      await runGit(["add", "-A"]);

      // Verify staged filenames too (defense in depth)
      const { stdout: stagedNamesOut } = await runGit(["diff", "--cached", "--name-only"]);
      const stagedFiles = stagedNamesOut.split(/\r?\n/).filter(Boolean);
      const stagedFindings = await scanSecretsForFiles(stagedFiles);
      if (stagedFindings.length > 0) {
        await runGit(["reset", "HEAD", "--"]);
        const summary = stagedFindings.map((f) => `${f.file} (${f.rule})`).join("; ");
        const warning = `Staged push blocked by Secret Scanner: ${summary}`;
        writeState({
          status: "blocked_secret",
          secretWarning: warning,
          lastError: warning,
          blockedFiles: stagedFindings,
        });
        logLine(warning, "ERROR");
        return { ok: false, blockedBySecret: true, error: warning, findings: stagedFindings };
      }

      // 3. Avoid duplicate/empty commit
      let hasStagedDiff = true;
      try {
        await runGit(["diff", "--cached", "--quiet"]);
        hasStagedDiff = false;
      } catch {
        hasStagedDiff = true;
      }

      if (hasStagedDiff) {
        const { subject, body } = buildCommitMessage(pendingFiles);
        await runGit(["commit", "-m", subject, "-m", body]);
        logLine(`Committed [${trigger}]: ${subject}`);
      }
    }

    const postCommitInfo = await getBranchAndAheadCount(config.remote, config.branch);
    if (postCommitInfo.aheadCount === 0 && pendingFiles.length === 0) {
      writeState({
        status: "synced",
        secretWarning: null,
        blockedFiles: [],
        lastError: null,
        lastCommitHash: postCommitInfo.localHeadSha,
        lastCommitMessage: postCommitInfo.lastCommitMessage,
      });
      return {
        ok: true,
        noChanges: true,
        headSha: postCommitInfo.localHeadSha,
        lastCommitMessage: postCommitInfo.lastCommitMessage,
      };
    }

    if (postCommitInfo.aheadCount > 0) {
      try {
        await runGit(["push", config.remote, config.branch], 90_000);
        const pushedAt = new Date().toISOString();
        const refreshed = await getBranchAndAheadCount(config.remote, config.branch);
        writeState({
          status: "synced",
          lastSuccessfulPushAt: pushedAt,
          lastSuccessfulPushSha: refreshed.localHeadSha,
          lastCommitHash: refreshed.localHeadSha,
          lastCommitMessage: refreshed.lastCommitMessage,
          lastError: null,
          secretWarning: null,
          blockedFiles: [],
          retryAttempt: 0,
          nextRetryAt: null,
        });
        logLine(`Pushed to ${config.remote}/${config.branch} @ ${refreshed.localHeadSha?.slice(0, 7)}`);
        return {
          ok: true,
          pushed: true,
          headSha: refreshed.localHeadSha,
          lastCommitMessage: refreshed.lastCommitMessage,
          pushedAt,
        };
      } catch (pushErr) {
        const curState = readState();
        const nextAttempt = (curState.retryAttempt || 0) + 1;
        const delayMs = Math.min(config.retryMaxMs, config.retryBaseMs * Math.pow(2, nextAttempt - 1));
        const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
        const errMsg = (pushErr?.stderr || pushErr?.message || "Git push failed").trim().slice(0, 400);
        writeState({
          status: "retry_scheduled",
          lastError: errMsg,
          lastCommitHash: postCommitInfo.localHeadSha,
          lastCommitMessage: postCommitInfo.lastCommitMessage,
          retryAttempt: nextAttempt,
          nextRetryAt,
        });
        logLine(`Push failed (retry #${nextAttempt} at ${nextRetryAt}): ${errMsg}`, "ERROR");
        return { ok: false, error: errMsg, retryAttempt: nextAttempt, nextRetryAt };
      }
    }

    return { ok: true, noChanges: true };
  } finally {
    releaseLock();
  }
}

export async function getRemoteAndVercelStatus() {
  const config = readConfig();
  let remoteUrl = "";
  try {
    remoteUrl = (await runGit(["remote", "get-url", config.remote])).stdout.trim();
  } catch {
    remoteUrl = "";
  }

  const branchInfo = await getBranchAndAheadCount(config.remote, config.branch);
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/i);
  const github = {
    repo: match ? `${match[1]}/${match[2]}` : null,
    remoteUrl,
    branch: branchInfo.currentBranch,
    localHeadSha: branchInfo.localHeadSha,
    remoteHeadSha: null,
    inSync: false,
    reachable: false,
    error: null,
  };

  const vercel = {
    linked: false,
    state: "unknown",
    summary: "Unable to verify Vercel status",
    latestDeploymentUrl: null,
    updatedAt: null,
  };

  try {
    const { stdout: lsOut } = await runGit(["ls-remote", config.remote, `refs/heads/${config.branch}`], 15_000);
    const remoteSha = lsOut.trim().split(/\s+/)[0] || null;
    github.remoteHeadSha = remoteSha;
    github.reachable = Boolean(remoteSha);
    github.inSync = Boolean(remoteSha && branchInfo.localHeadSha && remoteSha === branchInfo.localHeadSha);
  } catch (err) {
    github.error = (err?.stderr || err?.message || "GitHub unreachable").trim().slice(0, 200);
  }

  if (github.repo && branchInfo.localHeadSha) {
    try {
      const headers = { Accept: "application/vnd.github+json", "User-Agent": "OneTab-AutoPush" };
      const [depRes, statusRes, checkRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${github.repo}/deployments?per_page=5`, { headers }),
        fetch(`https://api.github.com/repos/${github.repo}/commits/${branchInfo.localHeadSha}/status`, { headers }),
        fetch(`https://api.github.com/repos/${github.repo}/commits/${branchInfo.localHeadSha}/check-runs`, { headers }),
      ]);

      const deployments = depRes.ok ? await depRes.json() : [];
      const commitStatus = statusRes.ok ? await statusRes.json() : null;
      const checkRunsData = checkRes.ok ? await checkRes.json() : null;

      const vercelDeps = Array.isArray(deployments)
        ? deployments.filter((d) => /vercel|production|preview/i.test(`${d.environment || ""} ${d.creator?.login || ""} ${d.description || ""}`))
        : [];
      const vercelStatuses = Array.isArray(commitStatus?.statuses)
        ? commitStatus.statuses.filter((s) => /vercel/i.test(`${s.context || ""} ${s.description || ""} ${s.target_url || ""}`))
        : [];
      const vercelChecks = Array.isArray(checkRunsData?.check_runs)
        ? checkRunsData.check_runs.filter((c) => /vercel/i.test(`${c.name || ""} ${c.app?.slug || ""}`))
        : [];

      if (vercelDeps.length > 0 || vercelStatuses.length > 0 || vercelChecks.length > 0) {
        vercel.linked = true;
        const latestStatus = vercelStatuses[0];
        const latestCheck = vercelChecks[0];
        const latestDep = vercelDeps[0];
        vercel.state =
          latestStatus?.state ||
          latestCheck?.conclusion ||
          latestCheck?.status ||
          "triggered";
        vercel.summary =
          latestStatus?.description ||
          latestCheck?.output?.title ||
          latestDep?.description ||
          `Vercel deployment detected (${vercel.state})`;
        vercel.latestDeploymentUrl = latestStatus?.target_url || latestCheck?.details_url || null;
        vercel.updatedAt = latestStatus?.updated_at || latestCheck?.completed_at || latestDep?.updated_at || null;
      } else {
        vercel.linked = false;
        vercel.state = "not_connected";
        vercel.summary =
          "GitHub repository has no Vercel deployments/checks yet. Connect rimjhimusic-art/MyWebsite in Vercel Dashboard to enable auto-deploy on push.";
      }
    } catch (err) {
      vercel.state = "check_failed";
      vercel.summary = `Could not query GitHub Deployments API: ${(err?.message || "").slice(0, 140)}`;
    }
  }

  return { github, vercel };
}

export async function getFullStatus({ includeRemote = true } = {}) {
  const config = readConfig();
  const state = readState();
  const daemonPid = getDaemonPid();
  const pendingFiles = await getPendingStatus();
  const branchInfo = await getBranchAndAheadCount(config.remote, config.branch);

  const remoteInfo = includeRemote ? await getRemoteAndVercelStatus() : null;

  return {
    autoPushEnabled: Boolean(config.enabled),
    debounceSeconds: Math.round((config.debounceMs || 10_000) / 1000),
    daemonRunning: Boolean(daemonPid),
    daemonPid,
    daemonHeartbeatAt: state.daemonHeartbeatAt,
    branch: branchInfo.currentBranch,
    remote: config.remote,
    pendingCount: pendingFiles.length,
    pendingFiles,
    unpushedCommitsCount: branchInfo.aheadCount,
    lastCommitHash: branchInfo.localHeadSha || state.lastCommitHash,
    lastCommitMessage: branchInfo.lastCommitMessage || state.lastCommitMessage,
    lastCommitAt: branchInfo.lastCommitAt,
    lastSuccessfulPushAt: state.lastSuccessfulPushAt,
    lastSuccessfulPushSha: state.lastSuccessfulPushSha,
    status: state.status,
    lastError: state.lastError,
    secretWarning: state.secretWarning,
    blockedFiles: state.blockedFiles || [],
    retryAttempt: state.retryAttempt || 0,
    nextRetryAt: state.nextRetryAt,
    ...(remoteInfo ? remoteInfo : {}),
  };
}
