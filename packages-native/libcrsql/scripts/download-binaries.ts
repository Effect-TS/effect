/**
 * Maintainers/CI-only script to fetch cr-sqlite v0.16.3 binaries.
 * - Does not run on consumer install
 * - Requires Node 18+
 */

import { execFileSync } from "node:child_process"
import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("..", import.meta.url))

const ASSETS: ReadonlyArray<{ platform: string; url: string; out: string }> = [
  {
    platform: "darwin-aarch64",
    url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-darwin-aarch64.zip",
    out: "lib/darwin-aarch64"
  },
  {
    platform: "darwin-x86_64",
    url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-darwin-x86_64.zip",
    out: "lib/darwin-x86_64"
  },
  {
    platform: "linux-aarch64",
    url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-linux-aarch64.zip",
    out: "lib/linux-aarch64"
  },
  {
    platform: "linux-x86_64",
    url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-linux-x86_64.zip",
    out: "lib/linux-x86_64"
  },
  {
    platform: "win-x86_64",
    url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-win-x86_64.zip",
    out: "lib/win-x86_64"
  },
  {
    platform: "win-i686",
    url: "https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-win-i686.zip",
    out: "lib/win-i686"
  }
]

async function main() {
  console.log("Downloading cr-sqlite v0.16.3 binaries (maintainers/CI only)...")
  for (const asset of ASSETS) {
    const dir = join(ROOT, asset.out)
    mkdirSync(dir, { recursive: true })
    console.log(`→ ${asset.platform}`)
    const res = await fetch(asset.url)
    if (!res.ok) throw new Error(`Failed to download ${asset.url}: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const tmp = join(dir, "asset.zip")
    writeFileSync(tmp, buf)

    const extracted = join(dir, "extracted")
    rmSync(extracted, { recursive: true, force: true })
    mkdirSync(extracted, { recursive: true })
    // Try unzip (available on macOS/Linux). On Windows, recommend extracting manually.
    try {
      execFileSync("unzip", ["-o", "-q", tmp, "-d", extracted], { stdio: "inherit" })
    } catch {
      console.warn(`unzip not available. Please extract ${tmp} manually to ${extracted}`)
      continue
    }

    // Find binary within extracted folder
    const walk = (p: string, files: Array<string> = []): Array<string> => {
      for (const entry of readdirSync(p)) {
        const full = join(p, entry)
        const s = statSync(full)
        if (s.isDirectory()) walk(full, files)
        else files.push(full)
      }
      return files
    }
    const files = walk(extracted)
    const ext = asset.platform.startsWith("darwin")
      ? ".dylib"
      : asset.platform.startsWith("linux")
      ? ".so"
      : ".dll"
    const candidate = files.find((f) => f.toLowerCase().endsWith(ext) && /crsqlite/i.test(f))
    if (!candidate) {
      console.warn(`No candidate binary found in ${extracted}; please inspect manually`)
      continue
    }
    const targetName = ext === ".dll" ? "crsqlite.dll" : `libcrsqlite${ext}`
    const target = join(dir, targetName)
    cpSync(candidate, target)
    rmSync(tmp, { force: true })
    rmSync(extracted, { recursive: true, force: true })
    console.log(`✓ ${asset.platform} → ${target}`)
  }
  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
