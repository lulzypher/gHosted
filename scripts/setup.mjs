#!/usr/bin/env node
/**
 * First-time setup: Node version check, npm install, copy .env.example → .env if missing.
 * Run: npm run setup
 */
import { existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");

const major = process.versions.node.split(".").map(Number)[0];
if (major < 18) {
  console.error("Node.js 18+ is required. You have:", process.version);
  process.exit(1);
}

const envExample = path.join(root, ".env.example");
const envFile = path.join(root, ".env");
if (!existsSync(envFile) && existsSync(envExample)) {
  copyFileSync(envExample, envFile);
  console.log("Created .env from .env.example — edit DATABASE_URL if needed.");
} else if (!existsSync(envFile)) {
  console.warn("No .env and no .env.example; create .env with DATABASE_URL for messaging.");
} else {
  console.log(".env already present; skipping copy.");
}

console.log("Running npm install…");
const r = spawnSync("npm", ["install"], { cwd: root, stdio: "inherit", shell: true });
process.exit(r.status ?? 0);
