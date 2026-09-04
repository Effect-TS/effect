import * as Checker from "@effect/docgen/Checker"
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
import { cases } from "./Core.exampleIdentity.fixtures.ts"

describe("example inventory", () => {
  for (const fixture of cases) {
    it.effect(fixture.name, () => {
      const assertions: Array<{ label: string; actual: unknown; expected: unknown }> = []
      const equal = (label: string, actual: unknown, expected: unknown) => {
        assertions.push({ label, actual: structuredClone(actual), expected: structuredClone(expected) })
        assert.deepStrictEqual(actual, expected)
      }
      return Effect.gen(function*() {
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
        const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "docgen-inventory-" })
        const config: Configuration.ConfigurationShape = {
          projectName: "fixture",
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
          runExamples: fixture.runExamples,
          exclude: [],
          parseCompilerOptions: {},
          examplesCompilerOptions: Configuration.defaultCompilerOptions
        }
        const project = new ast.Project({ useInMemoryFileSystem: true })
        const modules: Array<Domain.Module> = []
        for (const [file, source] of Object.entries(fixture.files)) {
          if (source === undefined) continue
          yield* fs.makeDirectory(path.dirname(path.join(cwd, file)), { recursive: true })
          yield* fs.writeFileString(path.join(cwd, file), source)
          const parts = file.split("/")
          const [head, ...tail] = parts
          if (head === undefined) throw new Error("empty fixture path")
          const module = yield* Parser.parseModule.pipe(
            Effect.provideService(Parser.Source, {
              path: [head, ...tail],
              sourceFile: project.createSourceFile(file, source)
            }),
            Effect.provideService(Configuration.Configuration, config)
          )
          equal(`parsed path ${file}`, module.path, parts)
          equal(`module examples ${file}`, module.doc.examples, [])
          modules.push(module)
        }
        const errors = yield* Checker.checkModules(modules).pipe(
          Effect.provideService(Configuration.Configuration, config)
        )
        equal("checker", errors, [])
        const bodies: Array<string> = []
        const visit = (entry: { readonly doc: Domain.Doc }) => {
          bodies.push(...Core.extractFencedCode(entry.doc.description ?? "")[0])
          for (const example of entry.doc.examples) bodies.push(...Core.extractFencedCode(example)[0])
        }
        const namespace = (n: Domain.Namespace) => {
          visit(n)
          n.interfaces.forEach(visit)
          n.typeAliases.forEach(visit)
          n.namespaces.forEach(namespace)
        }
        for (const module of modules) {
          visit(module)
          module.constants.forEach(visit)
          module.namespaces.forEach(namespace)
          for (const c of module.classes) {
            visit(c)
            c.properties.forEach(visit)
            c.methods.forEach(visit)
            c.staticMethods.forEach(visit)
          }
        }
        equal("parsed complete example multiset", bodies.slice().sort(), fixture.expected.slice().sort())
        const commands: Array<string> = []
        const captures: Array<Record<string, string>> = []
        const spawner = ChildProcessSpawner.make((command) =>
          Effect.gen(function*() {
            if (command._tag !== "StandardCommand") throw new Error("unexpected pipeline")
            commands.push(command.command)
            const directory = path.join(config.outDir, "examples")
            const files: Record<string, string> = {}
            for (const name of (yield* fs.readDirectory(directory)).slice().sort()) {
              files[name] = yield* fs.readFileString(path.join(directory, name))
            }
            captures.push(files)
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
            platform: Effect.succeed<NodeJS.Platform>("darwin"),
            argv: Effect.succeed([]),
            env: Effect.succeed({})
          }),
          Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner)
        )
        yield* program
        const expectedCommands = fixture.expected.length === 0 ? [] : fixture.runExamples ? ["tsc", "tsx"] : ["tsc"]
        equal("selected process requests (not execution)", commands, expectedCommands)
        for (const [i, files] of captures.entries()) {
          const snippets = Object.entries(files).filter(([name]) => name.endsWith(".ts") && name !== "index.ts")
          equal(
            `materialized contents ${i}`,
            snippets.map(([, body]) => body).slice().sort(),
            fixture.expected.slice().sort()
          )
          const imports = files["index.ts"]?.trim().split("\n").slice().sort()
          equal(
            `entrypoint identity multiset ${i}`,
            imports,
            snippets.map(([name]) => `import './${name.slice(0, -3)}'`).slice().sort()
          )
          equal(`compiler options ${i}`, JSON.parse(files["tsconfig.json"] ?? "null"), {
            compilerOptions: config.examplesCompilerOptions
          })
        }
        equal("cleanup", yield* fs.exists(path.join(config.outDir, "examples")), false)
        const first = captures.slice()
        commands.length = 0
        captures.length = 0
        yield* program
        equal("replay commands", commands, expectedCommands)
        equal("replay exact files and imports", captures, first)
      }).pipe(
        Effect.ensuring(
          Effect.sync(() =>
            process.stdout.write(`R11_ASSERTIONS ${JSON.stringify({ test: fixture.name, assertions })}\n`)
          )
        ),
        Effect.provide(NodeServices.layer)
      )
    })
  }
})
