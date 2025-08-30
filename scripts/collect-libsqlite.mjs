#!/usr/bin/env node
/* eslint-env node */
/* global process, console */

import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import path from "node:path"

function platformDir() {
  const p = process.platform
  const a = process.arch
  if (p === "darwin" && a === "arm64") return "darwin-aarch64"
  if (p === "darwin" && a === "x64") return "darwin-x86_64"
  if (p === "linux" && a === "x64") return "linux-x86_64"
  if (p === "linux" && a === "arm64") return "linux-aarch64"
  throw new Error(`Unsupported host: ${p}-${a}`)
}

function buildWithNix() {
  // fresh result symlink
  spawnSync("rm", ["-f", "result"], { stdio: "inherit" })
  const r = spawnSync("nix", ["build", ".#libsqlite3"], { stdio: "inherit" })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function copyOut() {
  const sys = platformDir()
  const outDir = path.join("packages-native", "libsqlite", "lib", sys)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  const files = readdirSync(path.join("result", "lib"))
  const dylib = files.find((f) => f.startsWith("libsqlite3") && f.endsWith(".dylib"))
  const so = files.find((f) => f.startsWith("libsqlite3") && f.includes(".so"))
  const src = dylib ? path.join("result", "lib", dylib) : so ? path.join("result", "lib", so) : null
  if (!src) throw new Error("libsqlite3 .so/.dylib not found under result/lib")
  const dest = path.join(outDir, path.basename(src).includes(".dylib") ? "libsqlite3.dylib" : "libsqlite3.so")
  console.log(`Copy ${src} -> ${dest}`)
  copyFileSync(src, dest)
  console.log("Done.")
}

buildWithNix()
copyOut()
// refresh metadata (best effort)
spawnSync("node", ["scripts/generate-lib-metadata.mjs"], { stdio: "inherit" })
