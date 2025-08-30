#!/usr/bin/env node
/* eslint-env node */
/* global process, console */
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const pkgPath = path.join(root, "packages-native", "libsqlite", "package.json")
const metaPath = path.join(root, "packages-native", "libsqlite", "lib", "metadata.json")

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
const meta = JSON.parse(readFileSync(metaPath, "utf8"))

const versions = Array.from(new Set(meta.artifacts.map((a) => a.sqliteVersion).filter(Boolean)))
if (versions.length !== 1) {
  throw new Error(`Expected single sqliteVersion in metadata, got: ${versions.join(", ")}`)
}
const sqlite = versions[0] // e.g., "3.50.2"
const [maj, min, patch] = sqlite.split(".").map((x) => Number(x))
if (![maj, min, patch].every((n) => Number.isInteger(n))) {
  throw new Error(`Invalid sqliteVersion parsed from metadata: ${sqlite}`)
}

// Determine next wrapperPatch for this sqlite patch train
let next = 0
try {
  const out = execSync(`npm view ${pkg.name} versions --json`, { encoding: "utf8" }).trim()
  const published = (JSON.parse(out) || []).filter((v) => typeof v === "string")
  // Match same major.minor and same sqlite patch train (floor(n/100) === sqlitePatch)
  const re = new RegExp(`^${maj}\\.${min}\\.(\\d+)$`)
  const train = []
  for (const v of published) {
    const m = v.match(re)
    if (!m) continue
    const n = Number(m[1])
    if (Math.floor(n / 100) === patch) train.push(n)
  }
  const max = train.length ? Math.max(...train) : patch * 100 - 1
  next = (max % 100) + 1
} catch {
  next = 0
}

const target = `${maj}.${min}.${patch * 100 + next}`
if (pkg.version !== target) {
  console.log(`Setting ${pkg.name} version to ${target} (was ${pkg.version})`)
  pkg.version = target
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
} else {
  console.log(`${pkg.name} already at ${target}`)
}
