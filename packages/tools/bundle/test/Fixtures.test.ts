import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { afterAll } from "vitest"

const source = fileURLToPath(new URL("../src/Fixtures.ts", import.meta.url))
const root = mkdtempSync(fileURLToPath(new URL("../.fixtures-test-", import.meta.url)))
afterAll(() => rmSync(root, { recursive: true, force: true }))
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex")

describe("Fixtures native module paths", () => {
  for (const spelling of ["ASCII", "Effect Work", "hash#name", "percent%20name", "café"]) {
    it.effect(`discovers sorted top-level TypeScript files in ${spelling}`, () =>
      Effect.gen(function*() {
        const directory = join(mkdtempSync(join(root, "case-")), spelling)
        const modulePath = join(directory, "src/Fixtures.ts")
        const fixturesDir = join(directory, "fixtures")
        mkdirSync(join(directory, "src"), { recursive: true })
        mkdirSync(join(fixturesDir, "nested"), { recursive: true })
        copyFileSync(source, modulePath)
        writeFileSync(join(fixturesDir, "z.ts"), "console.log(\"z\")\n")
        writeFileSync(join(fixturesDir, "a.ts"), "console.log(\"a\")\n")
        writeFileSync(join(fixturesDir, "ignored.js"), "console.log(\"js\")\n")
        writeFileSync(join(fixturesDir, "nested/ignored.ts"), "console.log(\"nested\")\n")
        const { stdout } = yield* Effect.promise(() =>
          promisify(execFile)(process.execPath, [
            fileURLToPath(new URL("fixtures/fixtures-runner.mjs", import.meta.url)),
            modulePath
          ], { timeout: 15_000 })
        )
        writeFileSync(join(directory, "result.json"), stdout)
        const result = JSON.parse(stdout)
        assert.strictEqual(result.modulePath, modulePath)
        assert.strictEqual(result.symlink, false)
        assert.strictEqual(result.sourceHash, hash(source))
        assert.strictEqual(result.fixturesDir, fixturesDir + "/")
        assert.deepStrictEqual(result.fixtures, ["a.ts", "z.ts"])
        assert.deepStrictEqual(result.nativeEntries, ["a.ts", "ignored.js", "nested", "z.ts"])
      }))
  }
})
