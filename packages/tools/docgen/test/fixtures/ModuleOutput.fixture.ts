import * as Checker from "@effect/docgen/Checker"
import * as CLI from "@effect/docgen/CLI"
import * as Configuration from "@effect/docgen/Configuration"
import * as Domain from "@effect/docgen/Domain"
import * as Parser from "@effect/docgen/Parser"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Command from "effect/unstable/cli/Command"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"
import * as Glob from "glob"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import * as ast from "ts-morph"

export const scenarios = ["dot", "default", "multi", "absolute", "absolute-cwd", "flat"] as const
export type Scenario = typeof scenarios[number]
export const stages = ["initial", "repeat-1", "repeat-2", "authored", "removed"] as const
export const authored = {
  "docs/index.md": "# Authored home\r\nKeep these exact bytes.\r\n",
  "docs/modules/index.md": "# Authored modules\nKeep these exact bytes.\n",
  "docs/guide.md": "# Guide\nUnrelated authored content.\n"
}
export const source = (marker: string) => `/** @since 1.0.0 */\nexport const ${marker} = "${marker}"\n`
export interface Snapshot {
  readonly sha256: string
  readonly content: string
}
export interface Generation {
  readonly stage: string
  readonly config: Configuration.ConfigurationShape
  readonly actualConfigs: ReadonlyArray<Configuration.ConfigurationShape>
  readonly pattern: string
  readonly scanned: ReadonlyArray<string>
  readonly cliReads: ReadonlyArray<string>
  readonly models: ReadonlyArray<{
    readonly path: ReadonlyArray<string>
    readonly sourcePath: string
    readonly constants: ReadonlyArray<string>
    readonly examples: number
  }>
  readonly checks: ReadonlyArray<string>
  readonly inputs: Record<string, Snapshot>
  readonly outputs: Record<string, Snapshot>
  readonly commands: ReadonlyArray<string>
}
export interface Receipt {
  readonly scenario: Scenario
  readonly cwd: string
  readonly srcDir: string
  readonly argv: ReadonlyArray<string>
  readonly node: string
  readonly tsMorphTypescript: string
  readonly configProvider: string
  readonly generations: Array<Generation>
  error?: string
}
const snapshot = (file: string): Snapshot => {
  const bytes = fs.readFileSync(file)
  return { content: bytes.toString(), sha256: createHash("sha256").update(bytes).digest("hex") }
}
const inventory = (directory: string): Record<string, Snapshot> => {
  if (!fs.existsSync(directory)) return {}
  return Object.fromEntries(
    fs.readdirSync(directory, { recursive: true })
      .map(String).sort().map((name) => path.join(directory, name))
      .filter((name) => fs.statSync(name).isFile()).map((name) => [name, snapshot(name)])
  )
}
const write = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

export const run = async (scenario: Scenario, destination: string) => {
  const cwd = fs.realpathSync(process.cwd())
  const directory = scenario === "dot" || scenario === "absolute-cwd"
    ? "."
    : scenario === "multi" || scenario === "absolute"
    ? "source/lib"
    : "src"
  const srcDir = scenario === "absolute" || scenario === "absolute-cwd" ? path.resolve(directory) : directory
  const argv: Array<string> = []
  const files = scenario === "flat"
    ? { [path.join(directory, "Flat.ts")]: source("flatMarker") }
    : {
      [path.join(directory, "left/Shared.ts")]: source("leftMarker"),
      [path.join(directory, "right/Shared.ts")]: source("rightMarker")
    }
  write("package.json", JSON.stringify({ name: "identity-fixture", homepage: "https://example.invalid/library" }))
  for (const [file, text] of Object.entries(files)) write(file, text)
  const receipt: Receipt = {
    scenario,
    cwd,
    srcDir,
    argv,
    node: process.version,
    tsMorphTypescript: ast.ts.version,
    configProvider:
      `Configuration.configProviderLayer + Domain.Process.layer + NodeServices.layer; no docgen.json; DOCGEN_SRC=${
        process.env.DOCGEN_SRC ?? "<absent>"
      }; outDir default docs`,
    generations: []
  }
  const services = Configuration.configProviderLayer.pipe(
    Layer.provideMerge(Layer.mergeAll(Domain.Process.layer, NodeServices.layer))
  )
  try {
    for (const stage of stages) {
      if (stage === "authored") {
        for (const [file, text] of Object.entries(authored)) write(file, text)
      }
      if (stage === "removed") {
        const removed = scenario === "flat" ? "Flat.ts" : "right/Shared.ts"
        fs.unlinkSync(path.join(directory, removed))
      }
      await Effect.runPromise(
        Effect.gen(function*() {
          const realFs = yield* FileSystem.FileSystem
          const realSpawner = yield* ChildProcessSpawner.ChildProcessSpawner
          const cliReads: Array<string> = []
          const actualConfigs: Array<Configuration.ConfigurationShape> = []
          const commands: Array<string> = []
          const observer: FileSystem.FileSystem = {
            ...realFs,
            readFileString: (file, encoding) =>
              Effect.gen(function*() {
                if (file.endsWith(".ts")) {
                  cliReads.push(file)
                  const context = yield* Effect.context<never>()
                  const config = Context.getOption(context, Configuration.Configuration)
                  if (Option.isSome(config)) actualConfigs.push(config.value)
                }
                return yield* realFs.readFileString(file, encoding)
              })
          }
          const spawner = ChildProcessSpawner.make((command) => {
            commands.push(command._tag)
            return realSpawner.spawn(command)
          })
          const preflight = Effect.gen(function*() {
            const config = yield* Configuration.Configuration
            const pattern = path.posix.normalize(path.posix.join(config.srcDir, "**", "*.ts"))
            const scanned = yield* Effect.promise(() =>
              Glob.glob(pattern, { ignore: config.exclude.slice(), withFileTypes: false })
            )
            const inputs = Object.fromEntries(scanned.map((file) => [file, snapshot(file)]))
            const modules = yield* Parser.parseFiles(
              scanned.map((file) => new Domain.File(file, inputs[file].content, false))
            )
            const checks = yield* Checker.checkModules(modules)
            return {
              config,
              pattern,
              scanned,
              inputs,
              checks,
              models: modules.map((module) => ({
                path: module.path,
                sourcePath: module.source.sourceFile.getFilePath(),
                constants: module.constants.map((constant) => constant.name),
                examples: module.doc.examples.length +
                  module.constants.reduce((n, constant) => n + constant.doc.examples.length, 0)
              }))
            }
          })
          let observed: Effect.Success<typeof preflight> | undefined
          const command = CLI.docgenCommand.pipe(
            Command.withHandler(() =>
              preflight.pipe(Effect.map((value) => {
                observed = value
              }))
            ),
            Command.provideEffect(Configuration.Configuration, CLI.loadConfiguration)
          )
          yield* Command.runWith(command, { version: "fixture" })(argv)
          if (observed === undefined) throw new Error("Configuration preflight did not run")
          yield* CLI.cli(argv).pipe(
            Effect.provideService(FileSystem.FileSystem, observer),
            Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner)
          )
          receipt.generations.push({
            stage,
            ...observed,
            cliReads,
            actualConfigs,
            commands,
            outputs: inventory("docs")
          })
        }).pipe(Effect.provide(services))
      )
      fs.writeFileSync(destination, JSON.stringify(receipt, null, 2))
    }
  } catch (error) {
    receipt.error = String(error)
    fs.writeFileSync(destination, JSON.stringify(receipt, null, 2))
    throw error
  }
}

if (import.meta.main) {
  const scenario = scenarios.find((value) => value === process.argv[2])
  const destination = process.argv[3]
  if (scenario === undefined || destination === undefined) throw new Error("Expected scenario and receipt path")
  await run(scenario, destination)
}
