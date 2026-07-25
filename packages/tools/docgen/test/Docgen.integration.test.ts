import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repositoryRoot = fileURLToPath(new URL("../../../..", import.meta.url))
const fixtureSource = fileURLToPath(new URL("fixtures/workspace", import.meta.url))
const declarationFixtureSource = fileURLToPath(new URL("fixtures/frontends", import.meta.url))
const bin = fileURLToPath(new URL("../src/bin.ts", import.meta.url))

const exists = (path: string) =>
  Effect.promise(() => import("node:fs/promises").then((fs) => fs.stat(path).then(() => true, () => false)))

const fixture = <A, E, R>(use: (root: string) => Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.promise(() => mkdtemp(join(tmpdir(), "effect-docgen-integration-"))).pipe(
      Effect.tap((root) => Effect.promise(() => cp(fixtureSource, root, { recursive: true }))),
      Effect.tap((root) =>
        Effect.promise(() => symlink(join(repositoryRoot, "node_modules"), join(root, "node_modules")))
      ),
      Effect.tap((root) =>
        Effect.promise(() =>
          writeFile(
            join(root, "package.json"),
            JSON.stringify({
              name: "docgen-fixture",
              private: true,
              homepage: "https://example.com"
            })
          )
        )
      ),
      Effect.tap((root) =>
        Effect.promise(() =>
          writeFile(
            join(root, "docgen.json"),
            JSON.stringify({
              workspace: true,
              projectHomepage: "https://example.com",
              srcLink: "https://example.com/src/",
              outDir: "docs",
              enforceVersion: true
            })
          )
        )
      )
    ),
    use,
    (root) => Effect.promise(() => rm(root, { recursive: true, force: true }))
  )

const declarationFixture = <A, E, R>(use: (root: string) => Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.promise(() => mkdtemp(join(tmpdir(), "effect-docgen-declaration-integration-"))).pipe(
      Effect.tap((root) => Effect.promise(() => cp(declarationFixtureSource, root, { recursive: true }))),
      Effect.tap((root) =>
        Effect.promise(() => symlink(join(repositoryRoot, "node_modules"), join(root, "node_modules")))
      ),
      Effect.tap((root) =>
        Effect.promise(() =>
          writeFile(join(root, "docgen.json"), JSON.stringify({ frontend: "declaration", enforceVersion: false }))
        )
      )
    ),
    use,
    (root) => Effect.promise(() => rm(root, { recursive: true, force: true }))
  )

const runDocgen = (root: string, args: ReadonlyArray<string>) =>
  Effect.callback<{ readonly stdout: string; readonly stderr: string; readonly exitCode: number }>((resume) => {
    import("node:child_process").then(({ spawn }) => {
      const source = `process.chdir(${JSON.stringify(root)});process.argv=[${
        [process.execPath, "docgen", ...args].map((argument) => JSON.stringify(argument)).join(",")
      }];await import(${JSON.stringify(pathToFileURL(bin).href)})`
      const child = spawn(process.execPath, ["--input-type=module", "--eval", source])
      let stdout = ""
      let stderr = ""
      child.stdout.on("data", (chunk) => stdout += chunk)
      child.stderr.on("data", (chunk) => stderr += chunk)
      child.on("close", (code) => resume(Effect.succeed({ stdout, stderr, exitCode: code ?? 1 })))
    })
  })

describe("docgen semantic compiler", () => {
  it.effect("declaration validation writes no output", () =>
    declarationFixture((root) =>
      Effect.gen(function*() {
        const outputFile = join(root, "docgen-output.json")
        const result = yield* runDocgen(root, ["--validate", "--json", outputFile])
        assert.strictEqual(result.exitCode, 0, `${result.stdout}\n${result.stderr}`)
        assert.isFalse(yield* exists(join(root, "docs")))
        assert.isFalse(yield* exists(join(root, "examples")))
        assert.isFalse(yield* exists(join(root, ".docgen")))
        assert.isFalse(yield* exists(outputFile))
      })
    ))

  it.effect("declaration projections can be enabled independently", () =>
    declarationFixture((root) =>
      Effect.gen(function*() {
        const noDocs = yield* runDocgen(root, ["--no-docs"])
        assert.strictEqual(noDocs.exitCode, 0, `${noDocs.stdout}\n${noDocs.stderr}`)
        assert.isFalse(yield* exists(join(root, "docs")))
        assert.isTrue(yield* exists(join(root, "examples", ".effect-docgen")))

        yield* Effect.promise(() => rm(join(root, "examples"), { recursive: true }))
        const noExamples = yield* runDocgen(root, ["--no-examples"])
        assert.strictEqual(noExamples.exitCode, 0, `${noExamples.stdout}\n${noExamples.stderr}`)
        assert.isTrue(yield* exists(join(root, "docs", "modules", "index.ts.md")))
        assert.isFalse(yield* exists(join(root, "examples")))
      })
    ))

  it.effect("validation performs semantic checks without output or subprocess workflows", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const sentinel = join(root, "packages", "example", "docs", "sentinel")
        yield* Effect.promise(() => mkdir(join(root, "packages", "example", "docs"), { recursive: true }))
        yield* Effect.promise(() => writeFile(sentinel, "unchanged"))

        const result = yield* runDocgen(root, ["--validate", "--package", "example"])

        assert.strictEqual(result.exitCode, 0, `${result.stdout}\n${result.stderr}`)
        assert.notMatch(result.stdout, /Typechecking examples|Running examples|RUN  v/)
        assert.strictEqual(yield* Effect.promise(() => readFile(sentinel, "utf8")), "unchanged")
        assert.isFalse(yield* exists(join(root, "packages", "example", "examples")))
        assert.isFalse(yield* exists(join(root, ".docgen")))
      })
    ))

  it.effect("ordinary generation writes both projections and launches neither tsc nor Vitest", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const result = yield* runDocgen(root, [])

        assert.strictEqual(result.exitCode, 0, `${result.stdout}\n${result.stderr}`)
        assert.notMatch(result.stdout, /Typechecking examples|Running examples|RUN  v/)
        assert.isTrue(yield* exists(join(root, "packages", "example", "docs", "modules", "index.ts.md")))
        assert.isTrue(yield* exists(join(root, "packages", "example", "examples", ".effect-docgen")))
        assert.isFalse(yield* exists(join(root, ".docgen")))
      })
    ))

  it.effect("writes the semantic model as JSON without diagnostics", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const outputFile = join(root, "artifacts", "docgen.json")
        const result = yield* runDocgen(root, ["--no-docs", "--no-examples", "--json", outputFile])

        assert.strictEqual(result.exitCode, 0, `${result.stdout}\n${result.stderr}`)
        const output = JSON.parse(yield* Effect.promise(() => readFile(outputFile, "utf8")))
        assert.strictEqual(output.frontend, "source")
        assert.deepStrictEqual(output.packages.map((pkg: { readonly name: string }) => pkg.name), [
          "@effect/example",
          "@effect/second"
        ])
        assert.isAbove(output.modules.length, 0)
        assert.notProperty(output, "diagnostics")
        assert.isFalse(yield* exists(join(root, "packages", "example", "docs")))
        assert.isFalse(yield* exists(join(root, "packages", "example", "examples")))
      })
    ))

  it.effect("disables documentation and examples independently", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const noDocs = yield* runDocgen(root, ["--no-docs"])
        assert.strictEqual(noDocs.exitCode, 0, `${noDocs.stdout}\n${noDocs.stderr}`)
        assert.isFalse(yield* exists(join(root, "packages", "example", "docs")))
        assert.isTrue(yield* exists(join(root, "packages", "example", "examples", ".effect-docgen")))

        yield* Effect.promise(() => rm(join(root, "packages", "example", "examples"), { recursive: true }))
        const noExamples = yield* runDocgen(root, ["--no-examples"])
        assert.strictEqual(noExamples.exitCode, 0, `${noExamples.stdout}\n${noExamples.stderr}`)
        assert.isTrue(yield* exists(join(root, "packages", "example", "docs", "modules", "index.ts.md")))
        assert.isFalse(yield* exists(join(root, "packages", "example", "examples")))
      })
    ))

  it.effect("disabling both projections still analyzes and validates without output", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const result = yield* runDocgen(root, ["--no-docs", "--no-examples"])
        assert.strictEqual(result.exitCode, 0, `${result.stdout}\n${result.stderr}`)
        assert.match(result.stdout, /Parsing .* source file/)
        assert.match(result.stdout, /Checking modules/)
        assert.isFalse(yield* exists(join(root, "packages", "example", "docs")))
        assert.isFalse(yield* exists(join(root, "packages", "example", "examples")))
      })
    ))

  it.effect("refreshes selected marker-owned examples and preserves rejected unowned directories", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const owned = join(root, "packages", "example", "examples")
        yield* Effect.promise(() => mkdir(owned, { recursive: true }))
        yield* Effect.promise(() => writeFile(join(owned, ".effect-docgen"), "generated by @effect/docgen\n"))
        yield* Effect.promise(() => writeFile(join(owned, "stale.ts"), "stale"))
        const refreshed = yield* runDocgen(root, ["--no-docs"])
        assert.strictEqual(refreshed.exitCode, 0, `${refreshed.stdout}\n${refreshed.stderr}`)
        assert.isFalse(yield* exists(join(owned, "stale.ts")))

        yield* Effect.promise(() => rm(owned, { recursive: true }))
        yield* Effect.promise(() => mkdir(owned, { recursive: true }))
        yield* Effect.promise(() => writeFile(join(owned, "sentinel"), "unowned"))
        const rejected = yield* runDocgen(root, ["--no-docs"])
        assert.notStrictEqual(rejected.exitCode, 0)
        assert.match(`${rejected.stdout}\n${rejected.stderr}`, /Refusing to overwrite unowned example directory/)
        assert.strictEqual(yield* Effect.promise(() => readFile(join(owned, "sentinel"), "utf8")), "unowned")
      })
    ))
})
