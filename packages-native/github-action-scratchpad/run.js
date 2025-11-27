#!/usr/bin/env node
// Wrapper to run main.ts with tsx for proper TypeScript/ESM handling
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mainTs = join(__dirname, "main.ts");

// Run with tsx which handles .js extension rewriting
const child = spawn("npx", ["tsx", mainTs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
