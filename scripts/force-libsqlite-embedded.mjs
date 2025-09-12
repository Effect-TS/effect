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

// Determine whether the local package is already on the same sqlite patch train.
// Train is encoded as: major.minor.(sqlitePatch*100 + wrapperPatch)
let vMaj = 0, vMin = 0, vPatch = 0
try {
  const parts = String(pkg.version).split(".")
  if (parts.length !== 3) {
    throw new Error(`Invalid semver: '${pkg.version}'`)
  }
  ;[vMaj, vMin, vPatch] = parts.map((x) => Number(x))
  if (![vMaj, vMin, vPatch].every(Number.isInteger)) {
    throw new Error(`Non-integer semver parts: '${pkg.version}'`)
  }
} catch (err) {
  console.error(
    `@effect-native/libsqlite: failed to parse package version '${pkg.version}': ${
      err && err.message ? err.message : err
    }`
  )
  process.exit(1)
}
const localTrain = Number.isInteger(vPatch) ? Math.floor(vPatch / 100) : -1
const sameTrain = vMaj === maj && vMin === min && localTrain === patch

if (sameTrain) {
  // Already on the correct sqlite train; do not bump version.
  console.log(`${pkg.name} already on sqlite ${maj}.${min}.${patch} train; leaving version unchanged (${pkg.version}).`)
  process.exit(0)
}

// Switching to a new sqlite train: pick the next wrapper patch for this train.
let next = 1
try {
  const out = execSync(`npm view ${pkg.name} versions --json`, { encoding: "utf8" }).trim()
  const published = (JSON.parse(out) || []).filter((v) => typeof v === "string")
  const re = new RegExp(`^${maj}\\.${min}\\.(\\d+)$`)
  const train = []
  for (const v of published) {
    const m = v.match(re)
    if (!m) continue
    const n = Number(m[1])
    if (Math.floor(n / 100) === patch) train.push(n)
  }
  const max = train.length ? Math.max(...train) : patch * 100
  next = (max % 100) + 1
} catch (err) {
  console.error(
    `@effect-native/libsqlite: failed to query npm versions (network or auth). Ensure NPM_TOKEN is available. Underlying error: ${
      err && err.message ? err.message : err
    }`
  )
  process.exit(1)
}

const target = `${maj}.${min}.${patch * 100 + next}`
console.log(`Setting ${pkg.name} version to ${target} (was ${pkg.version})`)
pkg.version = target
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
