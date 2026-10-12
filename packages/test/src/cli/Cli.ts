// The `etest` command, built with effect/cli. One-shot and never interactive:
// it exits 0 when everything is green, 1 when anything is red, 130 on Ctrl-C.
import * as Argument from "effect/cli/Argument"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as RpcClient from "effect/rpc/RpcClient"
import * as Runtime from "effect/Runtime"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { discover, run } from "../Coordinator.ts"
import * as Reporters from "../Reporters.ts"
import { isConfig } from "../Test.ts"
import * as Changed from "./Changed.ts"
import * as LastRun from "./LastRun.ts"
import { detect, moduleUrl } from "./Platform.ts"

/** Ends the process with `code`. Whatever caused it has already been reported. */
export class ExitCode extends Data.TaggedError("ExitCode")<{ readonly code: number }> {
  override get [Runtime.errorExitCode]() {
    return this.code
  }
  override readonly [Runtime.errorReported] = false
}

const paths = Argument.String("paths").pipe(
  Argument.withDescription("Files or directories to search for *.test.ts files (default: the current directory)"),
  Argument.variadic()
)

const list = Flag.Boolean("list").pipe(
  Flag.withDescription("Print the test tree without running anything"),
  Flag.withDefault(false)
)

const test = Flag.String("test").pipe(
  Flag.withDescription("Run only tests whose id contains this text"),
  Flag.optional
)

const failed = Flag.Boolean("failed").pipe(
  Flag.withDescription(`Re-run only the tests that failed in previous runs (recorded in ${LastRun.location})`),
  Flag.withDefault(false)
)

const changed = Flag.Boolean("changed").pipe(
  Flag.withDescription("Run only the tests affected by uncommitted changes (files they import, followed statically)"),
  Flag.withDefault(false)
)

const since = Flag.String("since").pipe(
  Flag.withMetavar("REF"),
  Flag.withDescription("With --changed (implied): also include what changed on this branch since it left REF"),
  Flag.optional
)

const tag = Flag.String("tag").pipe(
  Flag.withDescription("Run only tests with this tag"),
  Flag.optional
)

const seed = Flag.Int("seed").pipe(
  Flag.withDescription("Seed for this run (default: random, printed in the summary)"),
  Flag.optional
)

const workers = Flag.Int("workers").pipe(
  Flag.withDescription("Number of executors (worker threads)"),
  Flag.withDefault(2)
)

const bail = Flag.Boolean("bail").pipe(
  Flag.withDescription("Stop at the first failure and interrupt running tests"),
  Flag.withDefault(false)
)

const reporter = Flag.Literals("reporter", ["agent", "human", "jsonl"]).pipe(
  Flag.withDescription("Output format: compact failures-first text, a coloured tree, or one JSON event per line"),
  Flag.withDefault("agent")
)

const config = Flag.File("config", { mustExist: true }).pipe(
  Flag.withDescription("Test config file (default: ./etest.config.ts when it exists)"),
  Flag.optional
)

const noConfig = Flag.Boolean("no-config").pipe(
  Flag.withDescription("Ignore the test config, so every file builds its own layers"),
  Flag.withDefault(false)
)

/**
 * The executors: a pool of workers speaking `ExecutorRpcs`, each running up to
 * `filesPerExecutor` files at once. The platform provides the worker spawner (see
 * `platform/*.ts`), so this is the same on Node, Bun and Deno.
 */
const executorPool = (workers: number, filesPerExecutor: number) =>
  RpcClient.layerProtocolWorker({ size: workers, concurrency: filesPerExecutor })

/**
 * Validates the config before starting, so a broken config fails fast with a clear
 * message. Returns its absolute path, which the coordinator sends to the executors.
 */
const useConfig = Effect.fnUntraced(function*(file: string | undefined) {
  if (file === undefined) return undefined
  const resolved = path.resolve(file)
  const mod = yield* Effect.tryPromise(() => import(pathToFileURL(resolved).href)).pipe(
    Effect.catch((cause) =>
      Console.error(`etest: ${file}: failed to load\n${String(cause)}`).pipe(
        Effect.andThen(Effect.fail(new ExitCode({ code: 1 })))
      )
    )
  )
  if (!isConfig(mod.default)) {
    yield* Console.error(`etest: ${file}: the default export is not a Test.config(...)`)
    return yield* new ExitCode({ code: 1 })
  }
  return resolved
})

const bin = path.relative(process.cwd(), fileURLToPath(moduleUrl("./bin", import.meta.url)))
/** How to start the CLI again on the runtime we are on, for rerun hints. */
const launcher = { node: "node", bun: "bun", deno: "deno run -A" }[detect()]

export const cli = Command.make("etest", {
  paths,
  list,
  test,
  failed,
  changed,
  since,
  tag,
  seed,
  workers,
  bail,
  reporter,
  config,
  noConfig
}).pipe(
  Command.withDescription("Run Effect-native tests"),
  Command.withHandler(Effect.fnUntraced(function*(options) {
    const configFile = yield* useConfig(
      options.noConfig
        ? undefined
        : Option.getOrElse(
          options.config,
          () => fs.existsSync("etest.config.ts") ? "etest.config.ts" : undefined
        )
    )
    // stdout may be closed early (e.g. `etest | head`): stop writing, but finish the run
    let stdoutClosed = false
    process.stdout.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EPIPE") stdoutClosed = true
      else throw error
    })
    const write = (s: string) => {
      if (!stdoutClosed) process.stdout.write(s)
    }
    let paths = options.paths
    let ids: ReadonlySet<string> | undefined
    const selectedBy: Array<string> = []
    if (options.failed) {
      const last = LastRun.read()
      if (last === undefined) {
        yield* Console.error(`--failed: no previous run recorded (${LastRun.location})`)
        return yield* new ExitCode({ code: 1 })
      }
      const entries = Object.entries(last.failed)
      if (entries.length === 0) {
        yield* Console.log("--failed: no failing tests recorded; nothing to re-run")
        return
      }
      ids = new Set(entries.map(([id]) => id))
      selectedBy.push(`--failed (${entries.length} recorded)`)
      if (paths.length === 0) paths = [...new Set(entries.map(([, { file }]) => file))]
    }
    const sinceRef = Option.getOrUndefined(options.since)
    if (options.changed || sinceRef !== undefined) {
      const label = sinceRef === undefined ? "--changed" : `--since ${sinceRef}`
      const changedFiles = yield* Effect.try(() => Changed.changedFiles(process.cwd(), sinceRef)).pipe(
        Effect.catch((error) =>
          Console.error(`${label}: could not ask git for changes: ${String(error.cause)}`).pipe(
            Effect.andThen(Effect.fail(new ExitCode({ code: 1 })))
          )
        )
      )
      if (changedFiles.size === 0) {
        yield* Console.log(`${label}: no changed files; nothing to run`)
        return
      }
      if (configFile !== undefined && changedFiles.has(configFile)) {
        selectedBy.push(`${label} (the test config changed: every test is affected)`)
      } else {
        const { files } = discover(paths)
        const hit = Changed.affected(files, changedFiles, process.cwd())
        if (hit.length === 0) {
          yield* Console.log(
            `${label}: no test file is affected by the changes (${changedFiles.size} changed, ${files.length} test files searched); nothing to run`
          )
          return
        }
        paths = hit.map((file) => path.relative(process.cwd(), file))
        selectedBy.push(`${label} (${changedFiles.size} changed files)`)
      }
    }
    const ctx: Reporters.ReporterContext = {
      write,
      rerun: (t, runSeed) => `${launcher} ${bin} ${t.file} --test ${t.shortId} --seed ${runSeed}`
    }
    const reporter = options.reporter === "human"
      ? Reporters.human(ctx)
      : options.reporter === "jsonl"
      ? Reporters.jsonl(ctx)
      : Reporters.agent(ctx)
    const code = yield* run({
      paths,
      list: options.list,
      listJson: options.reporter === "jsonl",
      test: Option.getOrUndefined(options.test),
      tag: Option.getOrUndefined(options.tag),
      ids,
      selectedBy,
      seed: Option.getOrElse(options.seed, () => Math.floor(Math.random() * 100_000)),
      workers: options.workers,
      filesPerExecutor: 4,
      testsPerFile: 8,
      bail: options.bail,
      config: configFile,
      reporter: options.list ? reporter : LastRun.recording(reporter),
      write
    }).pipe(Effect.scoped, Effect.provide(executorPool(options.workers, 4)))
    if (code !== 0) return yield* new ExitCode({ code })
  }))
)
