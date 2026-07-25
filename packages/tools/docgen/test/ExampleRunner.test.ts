import * as ExampleMetadata from "@effect/docgen/ExampleMetadata"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const vitest = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url))

const header = (name: string, packageName: string, sourcePath: string) =>
  ExampleMetadata.encode({ name, packageName, sourcePath, declaration: "example", index: 1 })

const write = (path: string, content: string) =>
  Effect.promise(() => mkdir(dirname(path), { recursive: true }).then(() => writeFile(path, content)))

const writeConfig = (root: string, files: ReadonlyArray<string>) => {
  const path = join(root, "vitest.config.ts")
  const runner = fileURLToPath(new URL("../src/ExampleRunner.ts", import.meta.url))
  const projects = globalThis.Array.from(new Set(files.map((file) => dirname(dirname(file))))).map((root) => ({
    test: {
      name: root,
      root,
      include: ["examples/*.ts"],
      exclude: [],
      runner,
      environment: "node",
      coverage: { enabled: false },
      isolate: false,
      fileParallelism: false,
      maxWorkers: 1,
      minWorkers: 1,
      maxConcurrency: 1,
      sequence: { concurrent: false, shuffle: false }
    }
  }))
  return write(
    path,
    `import { defineConfig } from "vitest/config"\n\nexport default defineConfig(${
      JSON.stringify({
        root: packageRoot,
        test: {
          coverage: { enabled: false },
          fileParallelism: false,
          maxWorkers: 1,
          projects
        }
      })
    })\n`
  ).pipe(Effect.as(path))
}

const fixture = <A, E, R>(use: (root: string) => Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.promise(() => mkdtemp(join(tmpdir(), "effect-docgen-runner-"))).pipe(
      Effect.tap((root) => Effect.promise(() => symlink(join(packageRoot, "node_modules"), join(root, "node_modules"))))
    ),
    use,
    (root) => Effect.promise(() => rm(root, { recursive: true, force: true }))
  )

const run = (command: "list" | "run", config: string) =>
  Effect.callback<{ readonly stdout: string; readonly stderr: string; readonly exitCode: number }>((resume) => {
    import("node:child_process").then(({ spawn }) => {
      const child = spawn(process.execPath, [vitest, command, "--config", config])
      let stdout = ""
      let stderr = ""
      child.stdout.on("data", (chunk) => stdout += chunk)
      child.stderr.on("data", (chunk) => stderr += chunk)
      child.on("close", (code) => resume(Effect.succeed({ stdout, stderr, exitCode: code ?? 1 })))
    })
  })

describe("ExampleRunner", () => {
  it.effect("collects one metadata-named task per module without executing examples", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const first = join(root, "first", "examples", "same.ts")
        const second = join(root, "second", "examples", "same.ts")
        const sideEffect = join(root, "executed")
        yield* write(
          first,
          `${header("first/example example 1", "first", "packages/first/src/index.ts")}\n` +
            `import { writeFile } from "node:fs/promises"\nawait writeFile(${JSON.stringify(sideEffect)}, "yes")\n`
        )
        yield* write(
          second,
          `${header("second/example example 1", "second", "packages/second/src/index.ts")}\n` +
            "export const value = 1\n"
        )
        const config = yield* writeConfig(root, [first, second])

        const result = yield* run("list", config)

        assert.strictEqual(result.exitCode, 0, result.stderr)
        assert.match(result.stdout, /first\/example example 1/)
        assert.match(result.stdout, /second\/example example 1/)
        assert.strictEqual(result.stdout.match(/example example 1/g)?.length, 2)
        assert.isFalse(
          yield* Effect.promise(() =>
            import("node:fs/promises").then((fs) =>
              fs.stat(sideEffect).then(
                () => true,
                () => false
              )
            )
          )
        )
      })
    ))

  it.effect("runs modules with static imports, top-level await, and package-local dependencies", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const packageRoot = join(root, "package")
        const example = join(packageRoot, "examples", "passing.ts")
        yield* write(join(packageRoot, "helper.ts"), "export const local = 1\n")
        yield* write(
          join(packageRoot, "node_modules", "fixture-dependency", "package.json"),
          JSON.stringify({ name: "fixture-dependency", type: "module", exports: "./index.js" })
        )
        yield* write(
          join(packageRoot, "node_modules", "fixture-dependency", "index.js"),
          "export const dependency = 2\n"
        )
        yield* write(
          example,
          `${header("fixture/passing example 1", "fixture", "packages/fixture/src/index.ts")}\n` +
            "import { dependency } from \"fixture-dependency\"\n" +
            "import { local } from \"../helper.ts\"\n" +
            "await Promise.resolve()\n" +
            "if (dependency + local !== 3) throw new Error(\"bad resolution\")\n" +
            "export const value = dependency + local\n"
        )
        const config = yield* writeConfig(root, [example])

        const result = yield* run("run", config)

        assert.strictEqual(result.exitCode, 0, `${result.stdout}\n${result.stderr}`)
        assert.match(result.stdout, /1 passed/)
      })
    ))

  it.effect("attributes synchronous and top-level-await failures to metadata names", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const sync = join(root, "examples", "sync.ts")
        const rejected = join(root, "examples", "rejected.ts")
        yield* write(
          sync,
          `${header("fixture/sync failure example 1", "fixture", "sync.ts")}\n` +
            "throw new Error(\"sync failure\")\n"
        )
        yield* write(
          rejected,
          `${header("fixture/rejected failure example 1", "fixture", "rejected.ts")}\n` +
            "await Promise.reject(new Error(\"top-level rejected\"))\n"
        )
        const config = yield* writeConfig(root, [sync, rejected])

        const result = yield* run("run", config)

        assert.notStrictEqual(result.exitCode, 0)
        assert.match(result.stdout, /fixture\/sync failure example 1/)
        assert.match(result.stdout, /fixture\/rejected failure example 1/)
        assert.match(`${result.stdout}\n${result.stderr}`, /sync failure/)
        assert.match(`${result.stdout}\n${result.stderr}`, /top-level rejected/)
      })
    ))

  it.effect("reports missing metadata in generated example directories", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const example = join(root, "examples", "missing.ts")
        yield* write(example, "export const value = 1\n")
        const config = yield* writeConfig(root, [example])

        const result = yield* run("list", config)

        assert.notStrictEqual(result.exitCode, 0)
        assert.match(`${result.stdout}\n${result.stderr}`, /missing.*metadata header/)
      })
    ))
})
