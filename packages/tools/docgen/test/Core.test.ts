import * as Configuration from "@effect/docgen/Configuration"
import * as Core from "@effect/docgen/Core"
import * as Domain from "@effect/docgen/Domain"
import * as Parser from "@effect/docgen/Parser"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"
import * as ast from "ts-morph"

const assertFencedCode = (
  markdown: string,
  expectedExamples: ReadonlyArray<string>,
  expectedWarnings: ReadonlyArray<string>
) => {
  assert.deepStrictEqual(Core.extractFencedCode(markdown), [expectedExamples, expectedWarnings])
}

describe("Core", () => {
  describe("example files", () => {
    for (const runExamples of [false, true]) {
      it.effect(`preserves examples from colliding module paths (runExamples: ${runExamples})`, () =>
        Effect.gen(function*() {
          const fs = yield* FileSystem.FileSystem
          const path = yield* Path.Path
          const cwd = yield* fs.makeTempDirectoryScoped()
          const config: Configuration.ConfigurationShape = {
            projectName: "example-files",
            projectHomepage: "https://example.test",
            srcLink: "https://example.test",
            srcDir: path.relative(process.cwd(), path.join(cwd, "src")),
            outDir: path.relative(process.cwd(), path.join(cwd, "docs")),
            theme: Configuration.DEFAULT_THEME,
            enableSearch: true,
            enforceDescriptions: false,
            enforceExamples: false,
            enforceVersion: true,
            tscExecutable: "tsc",
            runExamples,
            exclude: [],
            parseCompilerOptions: {},
            examplesCompilerOptions: Configuration.defaultCompilerOptions
          }
          const expected: Array<string> = []
          for (const [index, file] of ["a-b/c.ts", "a/b-c.ts"].entries()) {
            const examples = [0, 1].map((n) => `console.log("module ${index}, example ${n}")`)
            expected.push(...examples)
            const source = [
              "/** @since 1.0.0 */",
              "export {}",
              "/**",
              " * @since 1.0.0",
              ...examples.flatMap((example) => [" * @example", " * ```ts", ` * ${example}`, " * ```"]),
              " */",
              "export const value = 1"
            ].join("\n")
            const filePath = path.join(config.srcDir, file)
            yield* fs.makeDirectory(path.dirname(filePath), { recursive: true })
            yield* fs.writeFileString(filePath, source)
          }
          const directory = path.join(config.outDir, "examples")
          const commands: Array<string> = []
          const captures: Array<Record<string, string>> = []
          // Inspect the files passed to the compiler and runner without launching either.
          const spawner = ChildProcessSpawner.make((command) =>
            Effect.gen(function*() {
              if (command._tag !== "StandardCommand") throw new Error("Unexpected pipeline")
              commands.push(command.command)
              const files: Record<string, string> = {}
              for (const name of yield* fs.readDirectory(directory)) {
                if (name.endsWith(".ts")) files[name] = yield* fs.readFileString(path.join(directory, name))
              }
              captures.push(files)
              const snippets = Object.entries(files).filter(([name]) => name !== "index.ts")
              assert.deepStrictEqual(snippets.map(([, body]) => body).sort(), expected.slice().sort())
              assert.deepStrictEqual(
                files["index.ts"].trim().split("\n").sort(),
                snippets.map(([name]) => `import './${name.slice(0, -3)}'`).sort()
              )
              return ChildProcessSpawner.makeHandle({
                pid: ChildProcessSpawner.ProcessId(1),
                exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
                isRunning: Effect.succeed(false),
                kill: () => Effect.void,
                stdin: Sink.drain,
                stdout: Stream.empty,
                stderr: Stream.empty,
                all: Stream.empty,
                getInputFd: () => Sink.drain,
                getOutputFd: () => Stream.empty,
                unref: Effect.succeed(Effect.void)
              })
            })
          )
          const program = Core.program.pipe(
            Effect.provideService(Configuration.Configuration, config),
            Effect.provideService(Domain.Process, {
              cwd: Effect.succeed(process.cwd()),
              platform: Effect.succeed(process.platform),
              argv: Effect.succeed([]),
              env: Effect.succeed({})
            }),
            Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner)
          )
          yield* program
          const expectedCommands = (runExamples ? ["tsc", "tsx"] : ["tsc"]).map((command) =>
            process.platform === "win32" ? `${command}.cmd` : command
          )
          assert.deepStrictEqual(commands, expectedCommands)
          assert.isFalse(yield* fs.exists(directory))
          const first = captures.slice()
          commands.length = 0
          captures.length = 0
          yield* program
          assert.deepStrictEqual(commands, expectedCommands)
          assert.deepStrictEqual(captures, first)
          assert.isFalse(yield* fs.exists(directory))
        }).pipe(Effect.provide(NodeServices.layer)))
    }
  })

  it.effect("preserves a type alias name and declared type parameters", () => {
    const sourceFile = new ast.Project({ useInMemoryFileSystem: true }).createSourceFile(
      "Identity.ts",
      `/**
       * A boxed value.
       *
       * @since 1.0.0
       */
      export type Identity<A extends string = string> = A`
    )

    return Parser.parseTypeAliases.pipe(
      Effect.provideService(Parser.Source, { path: ["Identity.ts"], sourceFile }),
      Effect.map(([alias]) => assert.strictEqual(alias?.signature, "type Identity<A extends string = string> = A"))
    )
  })

  describe("[internal] extractFencedCode", () => {
    it("should extract fenced code blocks from markdown (backticks)", () => {
      assertFencedCode("a\n\n```ts\nconst a = 1\n```\n\nb", ["const a = 1"], [])
    })

    it("should extract fenced code blocks from markdown (tildes)", () => {
      assertFencedCode("a\n\n~~~ts\nconst a = 1\n~~~~\n\nb", ["const a = 1"], [])
    })

    it("should skip-type-checking (backticks)", () => {
      assertFencedCode("a\n\n```ts skip-type-checking a=1\nconst a = 1\n```\n\nb", [], [])
    })

    it("should skip-type-checking (tildes)", () => {
      assertFencedCode("a\n\n~~~ts skip-type-checking a=1\nconst a = 1\n~~~~\n\nb", [], [])
    })

    it("should handle metadata (backticks)", () => {
      assertFencedCode("a\n\n```ts a=1\nconst a = 1\n```\n\nb", ["const a = 1"], [])
    })

    it("should handle metadata (tildes)", () => {
      assertFencedCode("a\n\n~~~ts a=1\nconst a = 1\n~~~~\n\nb", ["const a = 1"], [])
    })

    it("should handle non closing fences (backticks)", () => {
      assertFencedCode("a\n\n```ts\nconst a = 1", ["const a = 1"], [
        "Code block does not have a matching closing fence:\na\n\n```ts\nconst a = 1"
      ])
    })

    it("should handle non closing fences (tildes)", () => {
      assertFencedCode("a\n\n~~~ts\nconst a = 1", ["const a = 1"], [
        "Code block does not have a matching closing fence:\na\n\n~~~ts\nconst a = 1"
      ])
    })
  })

  describe("[internal] runCommand", () => {
    it.effect("streams output without a maxBuffer limit", () =>
      Effect.gen(function*() {
        const size = 1024 * 1024 + 1
        const result = yield* Core.runCommand("node", [
          "-e",
          `process.stdout.write("x".repeat(${size})); process.stderr.write("problem"); process.exitCode = 2`
        ], false)
        assert.strictEqual(result.stdout.length, size)
        assert.strictEqual(result.stderr, "problem")
        assert.strictEqual(result.exitCode, 2)
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)))
  })
})
