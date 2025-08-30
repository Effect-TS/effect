#!/usr/bin/env node
/* eslint-env node */
/* global process, console */
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const PKG_LIB = path.join(ROOT, "packages-native", "libsqlite", "lib")

function sha256(file) {
  const h = createHash("sha256")
  h.update(readFileSync(file))
  return h.digest("hex")
}

function nixpkgsRev() {
  try {
    const lock = JSON.parse(readFileSync(path.join(ROOT, "flake.lock"), "utf8"))
    return lock?.nodes?.nixpkgs?.locked?.rev || null
  } catch {
    return null
  }
}

function sqliteVersionFromTarget(target) {
  // Returns version parsed from the store path of a build target
  try {
    const out = spawnSync("nix", ["build", ...target, "--print-out-paths"], { encoding: "utf8" })
    if (out.status !== 0) return null
    const storePath = out.stdout.trim().split(/\s+/).pop()
    const base = path.basename(storePath)
    // patterns: libsqlite3-3.47.2, sqlite-x86_64-unknown-linux-gnu-3.50.2
    const m = base.match(/-(\d+\.\d+\.\d+)$/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

function sqliteVersionFromFile(filePath) {
  try {
    const buf = readFileSync(filePath)
    const text = buf.toString("latin1") // scan as 8-bit text
    const m = text.match(/3\.(\d+)\.(\d+)/)
    return m ? `3.${m[1]}.${m[2]}` : null
  } catch {
    return null
  }
}

const targets = [
  { platform: "darwin-aarch64", arch: "arm64", file: "libsqlite3.dylib", eval: ["nixpkgs#sqlite.out"] },
  {
    platform: "darwin-x86_64",
    arch: "x86_64",
    file: "libsqlite3.dylib",
    eval: ["nixpkgs#legacyPackages.x86_64-darwin.sqlite.out"]
  },
  { platform: "linux-x86_64", arch: "x86_64", file: "libsqlite3.so", eval: ["nixpkgs#pkgsCross.gnu64.sqlite.out"] },
  {
    platform: "linux-aarch64",
    arch: "aarch64",
    file: "libsqlite3.so",
    eval: ["nixpkgs#pkgsCross.aarch64-multiplatform.sqlite.out"]
  }
]

const artifacts = []
for (const t of targets) {
  const dir = path.join(PKG_LIB, t.platform)
  const p = path.join(dir, t.file)
  if (!existsSync(p)) continue
  const sum = sha256(p)
  let version = sqliteVersionFromTarget([t.eval[0]])
  if (!version) version = sqliteVersionFromFile(p)
  artifacts.push({ platform: t.platform, arch: t.arch, filename: t.file, sha256: sum, sqliteVersion: version })
}

const meta = {
  nixpkgs: { rev: nixpkgsRev() },
  builtAt: new Date().toISOString(),
  artifacts
}

// Assertions: macOS arm64 vs x86_64 should not have identical sha256
const darwinArm = artifacts.find((a) => a.platform === "darwin-aarch64")
const darwinX64 = artifacts.find((a) => a.platform === "darwin-x86_64")
if (darwinArm && darwinX64 && darwinArm.sha256 === darwinX64.sha256) {
  throw new Error(
    "darwin-aarch64 and darwin-x86_64 artifacts have identical sha256; expected distinct architecture-specific builds"
  )
}

const outFile = path.join(PKG_LIB, "metadata.json")
writeFileSync(outFile, JSON.stringify(meta, null, 2))
console.log(`Wrote ${outFile}`)
