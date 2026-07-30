import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const vitest = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url))

const write = (path: string, content: string) =>
  Effect.promise(() => mkdir(dirname(path), { recursive: true }).then(() => writeFile(path, content)))

const sourceExample = (source: string, prefix = "") =>
  `${prefix}/**\n * \`\`\`ts\n${source.split("\n").map((line) => ` * ${line}`).join("\n")}\n * \`\`\`\n */\n` +
  `export const example = true\n`

interface Project {
  readonly name: string
  readonly root: string
  readonly files: ReadonlyArray<string>
}

const writeConfig = (root: string, project: Project) => {
  const path = join(root, "vitest.config.ts")
  const test = {
    name: project.name,
    include: project.files.map((file) => relative(project.root, file)),
    exclude: [],
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
  return write(join(project.root, "package.json"), JSON.stringify({ name: project.name })).pipe(
    Effect.andThen(write(
      path,
      `import { vitestPlugin } from ${
        JSON.stringify(fileURLToPath(new URL("../src/Examples.ts", import.meta.url)))
      }\n` +
        `import { defineConfig } from "vitest/config"\n\n` +
        `export default defineConfig({ root: ${JSON.stringify(project.root)}, plugins: [vitestPlugin()], test: ${
          JSON.stringify(test)
        } })\n`
    )),
    Effect.as(path)
  )
}

const fixture = <A, E, R>(use: (root: string) => Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.gen(function*() {
      const root = yield* Effect.promise(() => mkdtemp(join(tmpdir(), "effect-doctest-runner-")))
      yield* Effect.promise(() => mkdir(join(root, "node_modules", "@effect"), { recursive: true }))
      yield* Effect.promise(() =>
        symlink(join(packageRoot, "node_modules", "vitest"), join(root, "node_modules", "vitest"))
      )
      yield* Effect.promise(() => symlink(packageRoot, join(root, "node_modules", "@effect", "doctest")))
      return root
    }),
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

describe("DoctestRunner", () => {
  it.effect("filters source files without examples before collection", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const rootPackage = join(root, "package")
        const included = join(rootPackage, "src", "included.ts")
        const excluded = join(rootPackage, "src", "excluded.ts")
        yield* write(included, sourceExample("export const value = 1"))
        yield* write(excluded, "export const value = 2\n")
        const config = yield* writeConfig(root, {
          name: "fixture",
          root: rootPackage,
          files: [included, excluded]
        })

        const result = yield* run("run", config)

        assert.strictEqual(result.exitCode, 0, result.stderr)
        assert.match(result.stdout, /Test Files\s+1 passed \(1\)/)
      })
    ))

  it.effect("collects examples without importing their source files", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const rootPackage = join(root, "package")
        const first = join(rootPackage, "src", "first", "same.ts")
        const second = join(rootPackage, "src", "second", "same.ts")
        const sideEffect = join(root, "executed")
        yield* write(
          first,
          sourceExample(
            "export const value = 1",
            `import { writeFile } from "node:fs/promises"\nawait writeFile(${JSON.stringify(sideEffect)}, "yes")\n`
          )
        )
        yield* write(second, sourceExample("export const value = 2"))
        const config = yield* writeConfig(root, { name: "fixture", root: rootPackage, files: [first, second] })

        const result = yield* run("list", config)

        assert.strictEqual(result.exitCode, 0, result.stderr)
        assert.match(result.stdout, /fixture\/same\.example example 1/)
        assert.strictEqual(result.stdout.match(/same\.example example 1/g)?.length, 2)
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

  it.effect("runs imports, top-level await, and package-local dependencies", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const rootPackage = join(root, "package")
        const source = join(rootPackage, "src", "passing.ts")
        yield* write(join(rootPackage, "src", "helper.ts"), "export const local = 1\n")
        yield* write(
          join(rootPackage, "node_modules", "fixture-dependency", "package.json"),
          JSON.stringify({ name: "fixture-dependency", type: "module", exports: "./index.js" })
        )
        yield* write(
          join(rootPackage, "node_modules", "fixture-dependency", "index.js"),
          "export const dependency = 2\n"
        )
        yield* write(
          source,
          sourceExample(
            "import { dependency } from \"fixture-dependency\"\n" +
              "import { local } from \"./helper.ts\"\n" +
              "await Promise.resolve()\n" +
              "if (dependency + local !== 3) throw new Error(\"bad resolution\")\n" +
              "export const value = dependency + local\n"
          )
        )
        const config = yield* writeConfig(root, { name: "fixture", root: rootPackage, files: [source] })

        const result = yield* run("run", config)

        assert.strictEqual(result.exitCode, 0, `${result.stdout}\n${result.stderr}`)
        assert.match(result.stdout, /1 passed/)
      })
    ))

  it.effect("attributes failures to example names", () =>
    fixture((root) =>
      Effect.gen(function*() {
        const sync = join(root, "package", "src", "sync.ts")
        const rejected = join(root, "package", "src", "rejected.ts")
        yield* write(sync, sourceExample("throw new Error(\"sync failure\")"))
        yield* write(rejected, sourceExample("await Promise.reject(new Error(\"top-level rejected\"))"))
        const config = yield* writeConfig(root, {
          name: "fixture",
          root: join(root, "package"),
          files: [sync, rejected]
        })

        const result = yield* run("run", config)

        assert.notStrictEqual(result.exitCode, 0)
        assert.match(result.stdout, /fixture\/sync\.example example 1/)
        assert.match(result.stdout, /fixture\/rejected\.example example 1/)
        assert.match(`${result.stdout}\n${result.stderr}`, /sync failure/)
        assert.match(`${result.stdout}\n${result.stderr}`, /top-level rejected/)
      })
    ))
})
