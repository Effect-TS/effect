import * as Protocol from "@effect/doctest/Protocol"
import * as Runner from "@effect/doctest/Runner"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import type { TestRunner } from "vitest"

interface ImportedFile {
  readonly filepath: string
  readonly source: "collect" | "setup"
}

const makeRunner = (include: ReadonlyArray<string> = [], root?: string | undefined) => {
  const imported: Array<ImportedFile> = []
  class BaseRunner {
    importFile(filepath: string, source: "collect" | "setup") {
      imported.push({ filepath, source })
    }
  }
  const Wrapped = Runner.wrap(BaseRunner as unknown as typeof TestRunner, include, root)
  const runner = Object.create(Wrapped.prototype) as BaseRunner
  return { imported, runner }
}

const withFile = <A>(relativePath: string, source: string, use: (file: string, root: string) => Promise<A>) =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      const root = mkdtempSync(join(tmpdir(), "effect-doctest-runner-"))
      const file = join(root, relativePath)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, source)
      return { file, root }
    }),
    ({ file, root }) => Effect.promise(() => use(file, root)),
    ({ root }) => Effect.sync(() => rmSync(root, { recursive: true, force: true }))
  )

const markedSource = "/** ```ts import.meta.vitest\nconst value = 1\n``` */\nexport const value = 1\n"

describe("DoctestRunner", () => {
  it.effect("routes marked source files through a versioned collector", () =>
    withFile(
      "src/example.ts",
      markedSource,
      (file) => {
        const { imported, runner } = makeRunner()
        return Promise.resolve(runner.importFile(file, "collect")).then(() => {
          const version = createHash("sha256").update(markedSource).digest("hex").slice(0, 16)
          assert.deepStrictEqual(imported, [{ filepath: Protocol.collectorId(file, version), source: "collect" }])
        })
      }
    ))

  it.effect("delegates unmarked source files", () =>
    withFile("src/example.ts", "export const value = 1\n", (file) => {
      const { imported, runner } = makeRunner()
      return Promise.resolve(runner.importFile(file, "collect")).then(() => {
        assert.deepStrictEqual(imported, [{ filepath: file, source: "collect" }])
      })
    }))

  it.effect("delegates regular test files", () =>
    withFile("test/example.test.ts", "const marker = \"import.meta.vitest\"\n", (file, root) => {
      const { imported, runner } = makeRunner(["test/**/*.test.ts"], root)
      return Promise.resolve(runner.importFile(file, "collect")).then(() => {
        assert.deepStrictEqual(imported, [{ filepath: file, source: "collect" }])
      })
    }))

  it.effect("delegates setup files", () =>
    withFile("setup.ts", "const marker = \"import.meta.vitest\"\n", (file) => {
      const { imported, runner } = makeRunner()
      return Promise.resolve(runner.importFile(file, "setup")).then(() => {
        assert.deepStrictEqual(imported, [{ filepath: file, source: "setup" }])
      })
    }))
})
