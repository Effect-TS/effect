import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { execFile } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { afterAll } from "vitest"

const sourcePath = fileURLToPath(new URL("../src/Fixtures.ts", import.meta.url))
const root = mkdtempSync(fileURLToPath(new URL("../.fixtures-test-", import.meta.url)))

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("Fixtures", () => {
  it.effect("discovers fixtures when the module path contains spaces", () =>
    Effect.gen(function*() {
      const directory = join(root, "Effect Work")
      const modulePath = join(directory, "src/Fixtures.ts")
      const fixturesDir = join(directory, "fixtures")
      mkdirSync(join(directory, "src"), { recursive: true })
      mkdirSync(fixturesDir)
      copyFileSync(sourcePath, modulePath)
      writeFileSync(join(fixturesDir, "example.ts"), "")

      const { stdout } = yield* Effect.promise(() =>
        promisify(execFile)(process.execPath, [
          fileURLToPath(new URL("fixtures/fixtures-runner.mjs", import.meta.url)),
          modulePath
        ], { timeout: 15_000 })
      )

      assert.deepStrictEqual(JSON.parse(stdout), {
        fixtures: ["example.ts"],
        fixturesDir: fixturesDir + sep
      })
    }))
})
