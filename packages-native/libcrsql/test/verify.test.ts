import { describe, expect, it } from "@effect/vitest"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("binary checksum verification", () => {
  it("computes sha256 matching checksums.json for all platforms", () => {
    const base = join(__dirname, "..", "lib")
    const checksums = JSON.parse(
      readFileSync(join(__dirname, "..", "scripts", "checksums.json"), "utf8")
    ) as Record<string, { file: string; sha256: string }>

    for (const [platform, meta] of Object.entries(checksums)) {
      const p = join(base, platform, meta.file)
      const hash = createHash("sha256").update(readFileSync(p)).digest("hex")
      expect(hash).toBe(meta.sha256)
    }
  })
})
