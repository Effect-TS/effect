#!/usr/bin/env node
/* eslint-env node */
/* global console */

import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import path from "node:path"

const targets = [
  {
    id: "darwin-aarch64",
    build: ["nix", "build", "nixpkgs#sqlite.out", "--print-out-paths"],
    srcGlob: /libsqlite3.*\.dylib$/,
    dest: "packages-native/libsqlite/lib/darwin-aarch64/libsqlite3.dylib"
  },
  {
    id: "darwin-x86_64",
    build: ["nix", "build", "nixpkgs#legacyPackages.x86_64-darwin.sqlite.out", "--print-out-paths"],
    srcGlob: /libsqlite3.*\.dylib$/,
    dest: "packages-native/libsqlite/lib/darwin-x86_64/libsqlite3.dylib"
  },
  {
    id: "linux-x86_64",
    build: ["nix", "build", "nixpkgs#pkgsCross.gnu64.sqlite.out", "--print-out-paths"],
    srcGlob: /libsqlite3.*\.so(\.|$)/,
    dest: "packages-native/libsqlite/lib/linux-x86_64/libsqlite3.so"
  },
  {
    id: "linux-aarch64",
    build: ["nix", "build", "nixpkgs#pkgsCross.aarch64-multiplatform.sqlite.out", "--print-out-paths"],
    srcGlob: /libsqlite3.*\.so(\.|$)/,
    dest: "packages-native/libsqlite/lib/linux-aarch64/libsqlite3.so"
  }
]

function run(cmd) {
  const [file, ...args] = cmd
  const res = spawnSync(file, args, { encoding: "utf8" })
  return res
}

function findFile(dir, regex) {
  const files = readdirSync(dir)
  // prioritize non-symlink versioned files if present
  const versioned = files.find((f) => regex.test(f) && /\d/.test(f))
  if (versioned) return path.join(dir, versioned)
  const any = files.find((f) => regex.test(f))
  return any ? path.join(dir, any) : null
}

for (const t of targets) {
  try {
    const out = run(t.build)
    if (out.status !== 0) {
      console.warn(`⚠️  Build failed for ${t.id}:`, out.stderr || out.stdout)
      continue
    }
    const storePath = out.stdout.trim().split(/\s+/).pop()
    if (!storePath || !existsSync(storePath)) {
      console.warn(`⚠️  Missing store path for ${t.id}`)
      continue
    }
    const libDir = path.join(storePath, "lib")
    const src = findFile(libDir, t.srcGlob)
    if (!src) {
      console.warn(`⚠️  No libsqlite3 found under ${libDir} for ${t.id}`)
      continue
    }
    const destDir = path.dirname(t.dest)
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
    copyFileSync(src, t.dest)
    console.log(`✅ ${t.id}: ${src} -> ${t.dest}`)
  } catch (e) {
    console.warn(`⚠️  Error building ${t.id}:`, e?.message || e)
  }
}

// refresh metadata (best effort)
spawnSync("node", ["scripts/generate-lib-metadata.mjs"], { stdio: "inherit" })

console.log("Done.")
