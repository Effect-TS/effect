import * as Examples from "@effect/docgen/Examples"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const vitest = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url))

interface Example {
  readonly source: string
  readonly packageName: string
  readonly sourcePath: string
  readonly declarationPathname: string
  readonly modulePath: ReadonlyArray<string>
  readonly declarationPath: ReadonlyArray<string>
  readonly declarationKind: "constant"
  readonly index: number
  readonly name: string
}

const example = (file: string, name: string, source: string): Example => ({
  source,
  packageName: "fixture",
  sourcePath: relative(dirname(dirname(file)), file),
  declarationPathname: file,
  modulePath: ["src", file.slice(file.lastIndexOf("/") + 1)],
  declarationPath: ["example"],
  declarationKind: "constant",
  index: 1,
  name
})

const write = (path: string, content: string) =>
  Effect.promise(() => mkdir(dirname(path), { recursive: true }).then(() => writeFile(path, content)))

const writeConfig = (root: string, examples: ReadonlyArray<Example>) => {
  const path = join(root, "vitest.config.ts")
  const runner = fileURLToPath(new URL("../src/ExampleRunner.ts", import.meta.url))
  const roots = globalThis.Array.from(new Set(examples.map((example) => dirname(dirname(example.declarationPathname)))))
  const projects = roots.map((projectRoot) => {
    const selected = examples.filter((example) => example.declarationPathname.startsWith(`${projectRoot}/`))
    return {
      plugins: `plugins: [vitestPlugin(${JSON.stringify(selected)})]`,
      test: {
        name: projectRoot,
        root: projectRoot,
        include: globalThis.Array.from(
          new Set(selected.map((example) => relative(projectRoot, example.declarationPathname)))
        ),
        exclude: [],
        runner,
        environment: "node",
        coverage: { enabled: false },
        isolate: false,
        fileParallelism: false,
        maxWorkers: 1,
        minWorkers: 1,
        maxConcurrency: 1,
        sequence: { concurrent: false, shuffle: false },
        experimental: { viteModuleRunner: true }
      }
    }
  })
  const projectSource = projects.map(({ plugins, test }) => `{ ${plugins}, test: ${JSON.stringify(test)} }`).join(",\n")
  return write(
    path,
    `import { vitestPlugin } from ${JSON.stringify(fileURLToPath(new URL("../src/Examples.ts", import.meta.url)))}\n` +
      `import { defineConfig } from "vitest/config"\n\n` +
      `export default defineConfig({ test: { projects: [${projectSource}] } })\n`
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
  it.effect("reloads invalidated virtual example modules", () =>
    Effect.gen(function*() {
      const file = "/workspace/package/src/watch.ts"
      const first = example(file, "fixture/watch example 1", "export const version = 1")
      const second = example(file, "fixture/watch example 1", "export const version = 2")
      const current: ReadonlyArray<Example> = [second]
      const plugin = Examples.vitestPlugin([first], () => Promise.resolve(current))
      const resolveId = plugin.resolveId
      const load = plugin.load
      const watchChange = plugin.watchChange
      if (
        typeof resolveId !== "function" || typeof load !== "function" || typeof watchChange !== "function"
      ) {
        return assert.fail("expected function plugin hooks")
      }
      const context = { addWatchFile() {} } as never
      const collector = yield* Effect.promise(() =>
        Promise.resolve(resolveId.call(context, Examples.collectorId(file, "first"), undefined, {} as never))
      )
      if (typeof collector !== "string") return assert.fail("expected resolved collector ID")
      yield* Effect.promise(() => Promise.resolve(load.call(context, collector, {} as never)))

      watchChange.call(context, file, { event: "update" })
      const refreshedId = yield* Effect.promise(() =>
        Promise.resolve(resolveId.call(context, Examples.collectorId(file, "second"), undefined, {} as never))
      )
      if (typeof refreshedId !== "string") return assert.fail("expected refreshed collector ID")
      assert.notStrictEqual(refreshedId, collector)
      const refreshed = yield* Effect.promise(() => Promise.resolve(load.call(context, refreshedId, {} as never)))
      if (typeof refreshed !== "string") return assert.fail("expected refreshed collector module")
      const encodedId = /import\((".*")\)/.exec(refreshed)?.[1]
      if (encodedId === undefined) return assert.fail("expected virtual example import")
      const id = JSON.parse(encodedId)
      const resolved = yield* Effect.promise(() => Promise.resolve(resolveId.call(context, id, undefined, {} as never)))
      if (typeof resolved !== "string") return assert.fail("expected resolved example ID")
      const source = yield* Effect.promise(() => Promise.resolve(load.call(context, resolved, {} as never)))

      if (typeof source !== "string") return assert.fail("expected example module source")
      assert.strictEqual(source, second.source)
    }))

  it.effect("collects source-backed examples without importing their source files", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const first = join(root, "first", "src", "same.ts")
        const second = join(root, "second", "src", "same.ts")
        const sideEffect = join(root, "executed")
        yield* write(
          first,
          `import { writeFile } from "node:fs/promises"\nawait writeFile(${JSON.stringify(sideEffect)}, "yes")\n`
        )
        yield* write(second, "export const value = 1\n")
        const config = yield* writeConfig(root, [
          example(first, "first/example example 1", "export const value = 1"),
          example(second, "second/example example 1", "export const value = 2")
        ])

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

  it.effect("runs virtual modules with static imports, top-level await, and package-local dependencies", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const rootPackage = join(root, "package")
        const source = join(rootPackage, "src", "passing.ts")
        yield* write(source, "export const example = true\n")
        yield* write(join(rootPackage, "src", "helper.ts"), "export const local = 1\n")
        yield* write(
          join(rootPackage, "node_modules", "fixture-dependency", "package.json"),
          JSON.stringify({ name: "fixture-dependency", type: "module", exports: "./index.js" })
        )
        yield* write(
          join(rootPackage, "node_modules", "fixture-dependency", "index.js"),
          "export const dependency = 2\n"
        )
        const config = yield* writeConfig(root, [example(
          source,
          "fixture/passing example 1",
          "import { dependency } from \"fixture-dependency\"\n" +
            "import { local } from \"./helper.ts\"\n" +
            "await Promise.resolve()\n" +
            "if (dependency + local !== 3) throw new Error(\"bad resolution\")\n" +
            "export const value = dependency + local\n"
        )])

        const result = yield* run("run", config)

        assert.strictEqual(result.exitCode, 0, `${result.stdout}\n${result.stderr}`)
        assert.match(result.stdout, /1 passed/)
      })
    ))

  it.effect("attributes synchronous and top-level-await failures to example names", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const sync = join(root, "package", "src", "sync.ts")
        const rejected = join(root, "package", "src", "rejected.ts")
        yield* write(sync, "export const example = true\n")
        yield* write(rejected, "export const example = true\n")
        const config = yield* writeConfig(root, [
          example(sync, "fixture/sync failure example 1", "throw new Error(\"sync failure\")"),
          example(
            rejected,
            "fixture/rejected failure example 1",
            "await Promise.reject(new Error(\"top-level rejected\"))"
          )
        ])

        const result = yield* run("run", config)

        assert.notStrictEqual(result.exitCode, 0)
        assert.match(result.stdout, /fixture\/sync failure example 1/)
        assert.match(result.stdout, /fixture\/rejected failure example 1/)
        assert.match(`${result.stdout}\n${result.stderr}`, /sync failure/)
        assert.match(`${result.stdout}\n${result.stderr}`, /top-level rejected/)
      })
    ))
})
