import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const prismaDir = path.join(rootDir, "prisma");
const mainSchema = path.join(prismaDir, "schema.prisma");
const pgSchema = path.join(prismaDir, "schema.postgresql.prisma");

const shouldPush = process.argv.includes("--push");
const dbUrl = (process.env.DATABASE_URL || "").trim();
const isPostgres = /^postgres(ql)?:\/\//i.test(dbUrl);

function runPrisma(args) {
  execFileSync("npx", ["prisma", ...args], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
}

if (isPostgres) {
  if (!fs.existsSync(pgSchema)) {
    throw new Error("Missing prisma/schema.postgresql.prisma");
  }
  console.log("PostgreSQL DATABASE_URL detected — selecting PostgreSQL Prisma schema for build.");
  fs.copyFileSync(pgSchema, mainSchema);
  runPrisma(["generate"]);
  if (shouldPush && process.env.SKIP_PRISMA_DB_PUSH !== "1") {
    console.log("Syncing database schema with PostgreSQL (prisma db push)...");
    runPrisma(["db", "push", "--skip-generate"]);
  }
} else {
  console.log("Using default SQLite Prisma schema (local environment).");
  runPrisma(["generate"]);
}
