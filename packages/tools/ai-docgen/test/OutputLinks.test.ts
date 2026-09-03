import { assert, describe, it } from "@effect/vitest"
import { spawnSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const cli = fileURLToPath(new URL("../src/main.ts", import.meta.url))

describe("generated links", () => {
  it("resolves links relative to a nested output document", () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "ai-docgen-output-links-"))

    try {
      const examples = path.join(fixture, "examples")
      const source = path.join(examples, "10_example.ts")
      const output = path.join(fixture, "docs", "guide.md")
      fs.mkdirSync(path.dirname(output), { recursive: true })
      fs.mkdirSync(examples)
      fs.writeFileSync(source, "export const answer = 42\n")

      const child = spawnSync(process.execPath, [cli, "examples", "--output", "docs/guide.md"], {
        cwd: fixture,
        encoding: "utf8"
      })

      assert.strictEqual(child.status, 0, child.stderr)
      const markdown = fs.readFileSync(output, "utf8")
      const href = markdown.match(/\]\(([^)]+)\)/)?.[1]
      assert.isString(href)
      assert.strictEqual(path.resolve(path.dirname(output), href), source)
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true })
    }
  })
})
