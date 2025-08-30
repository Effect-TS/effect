import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const BASE = join(import.meta.dirname, "..", "lib")
const checksums = JSON.parse(
  readFileSync(join(import.meta.dirname, "checksums.json"), "utf8")
) as Record<string, { file: string; sha256: string }>

let failures = 0
for (const [platform, meta] of Object.entries(checksums)) {
  const p = join(BASE, platform, meta.file)
  const got = createHash("sha256").update(readFileSync(p)).digest("hex")
  if (got !== meta.sha256) {
    console.error(`✗ ${platform}: sha256 mismatch\n  expected: ${meta.sha256}\n  actual:   ${got}`)
    failures++
  } else {
    console.log(`✓ ${platform}: ${meta.file} sha256 OK`)
  }
}

if (failures > 0) {
  process.exitCode = 1
}
