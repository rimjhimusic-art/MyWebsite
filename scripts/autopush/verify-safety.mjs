import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PROJECT_ROOT,
  buildCommitMessage,
  scanSecretsForFiles,
  shouldIgnoreRelativePath,
} from "./core.mjs";

async function main() {
  // 1. Verify ignored paths never trigger auto-push
  assert.equal(shouldIgnoreRelativePath(".env"), true);
  assert.equal(shouldIgnoreRelativePath(".env.local"), true);
  assert.equal(shouldIgnoreRelativePath(".env.production"), true);
  assert.equal(shouldIgnoreRelativePath(".env.example"), false);
  assert.equal(shouldIgnoreRelativePath("node_modules/pkg/index.js"), true);
  assert.equal(shouldIgnoreRelativePath(".next/server/app.js"), true);
  assert.equal(shouldIgnoreRelativePath("prisma/dev.db"), true);
  assert.equal(shouldIgnoreRelativePath("prisma/dev.db-journal"), true);
  assert.equal(shouldIgnoreRelativePath("storage/uploads/test.png"), true);
  assert.equal(shouldIgnoreRelativePath(".autopush/state.json"), true);
  assert.equal(shouldIgnoreRelativePath("src/app/page.tsx"), false);

  // 2. Verify secret scanner catches private keys, AWS keys, DB creds, API tokens
  const tmpSafe = path.join(PROJECT_ROOT, "scripts/autopush/.tmp_scan_test.txt");
  try {
    const fakeKey = ["-----BEGIN ", "RSA PRIVATE KEY-----"].join("");
    const fakeDb = ["postgres", "://produser:VerySecretPass99@db.internal-prod.net:5432/app"].join("");
    fs.writeFileSync(tmpSafe, `hello\n${fakeKey}\n${fakeDb}\n`, "utf8");

    const findings = await scanSecretsForFiles(["scripts/autopush/.tmp_scan_test.txt", ".env"]);
    assert.ok(findings.some((f) => f.rule === "Forbidden sensitive or ignored file path"));
    assert.ok(findings.some((f) => f.rule === "Private Key Block"));
    assert.ok(findings.some((f) => f.rule === "Database URL with Embedded Password"));

    // Clean safe source file should produce 0 findings
    fs.writeFileSync(tmpSafe, "export const hello = 'OneTab Media Safe Test';\n", "utf8");
    const cleanFindings = await scanSecretsForFiles(["scripts/autopush/.tmp_scan_test.txt"]);
    assert.equal(cleanFindings.length, 0);
  } finally {
    if (fs.existsSync(tmpSafe)) fs.unlinkSync(tmpSafe);
  }

  // 3. Commit message generation stays concise and deterministic
  const msg = buildCommitMessage([
    { path: "src/app/page.tsx" },
    { path: "src/components/Navbar.tsx" },
    { path: "src/lib/cms.ts" },
    { path: "src/app/services/page.tsx" },
  ]);
  assert.ok(msg.subject.startsWith("Auto-sync (4 files):"));
  assert.ok(msg.subject.length <= 72);

  console.log("ALL AUTOPUSH SECRET-SCAN & IGNORE SAFETY CHECKS PASSED!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
