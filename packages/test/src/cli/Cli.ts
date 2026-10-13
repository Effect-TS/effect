// The `etest` command, built with effect/cli. One-shot and never interactive:
// it exits 0 when everything is green, 1 when anything is red, 130 on Ctrl-C.
import * as Argument from "effect/cli/Argument"
import * as Command from "effect/cli/Command"
import * as Flag from "effect/cli/Flag"
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as RpcClient from "effect/rpc/RpcClient"
import * as Runtime from "effect/Runtime"
import type * as Worker from "effect/workers/Worker"
import type { WorkerError } from "effect/workers/WorkerError"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { builtinDefaults, discover, run } from "../Coordinator.ts"
import * as Reporters from "../Reporters.ts"
import * as Changed from "./Changed.ts"
import * as Config from "./Config.ts"
import { scriptCommand } from "./invocation.ts"
import * as LastRun from "./LastRun.ts"
import { Output } from "./Output.ts"
import { detect, moduleUrl } from "./Platform.ts"

/** Ends the process with `code`. Whatever caused it has already been reported. */
export class ExitCode extends Data.TaggedError("ExitCode")<{ readonly code: number }> {
  override get [Runtime.errorExitCode]() {
    return this.code
  }
  override readonly [Runtime.errorReported] = false
}

const paths = Argument.String("paths").pipe(
  Argument.withDescription(
    "Files or directories to search for *.test.ts files (default: the config's `paths`, else the project root)"
  ),
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
  Flag.withDescription("Number of executors (worker threads; default: the config's `workers`, else 2)"),
  Flag.optional
)

const bail = Flag.Boolean("bail").pipe(
  Flag.withDescription("Stop at the first failure and interrupt running tests"),
  Flag.withDefault(false)
)

const reporter = Flag.Literals("reporter", ["agent", "human", "jsonl"]).pipe(
  Flag.withDescription("Output format: compact failures-first text, a coloured tree, or one JSON event per line"),
  Flag.withDefault("agent")
)

const config = Flag.String("config").pipe(
  Flag.withMetavar("FILE"),
  Flag.withDescription("Test config file (default: the nearest etest.config.ts, up to the repository root)"),
  Flag.optional
)

const noConfig = Flag.Boolean("no-config").pipe(
  Flag.withDescription("Ignore the test config, so every file builds its own layers"),
  Flag.withDefault(false)
)

const noServer = Flag.Boolean("no-server").pipe(
  Flag.withDescription("Run in this process even when `etest serve` is running for this directory"),
  Flag.withDefault(false)
)

/** How many files an executor runs at once. */
const FILES_PER_EXECUTOR = 4

/** How many tests of a file run at once. */
const TESTS_PER_FILE = 8

/**
 * The executors: a pool of workers speaking `ExecutorRpcs`, each running up to
 * `FILES_PER_EXECUTOR` files at once. The platform provides the worker spawner (see
 * `platform/*.ts`), so this is the same on Node, Bun and Deno.
 */
export const executorPool = (workers: number) =>
  RpcClient.layerProtocolWorker({ size: workers, concurrency: FILES_PER_EXECUTOR })

/** Where a run's executors come from: a fresh pool per run, or `etest serve`'s pre-started one. */
export class Executors extends Context.Service<Executors, {
  readonly layer: (
    workers: number
  ) => Layer.Layer<RpcClient.Protocol, WorkerError, Worker.WorkerPlatform | Worker.Spawner>
}>()("etest/cli/Executors") {
  static readonly fresh = Layer.succeed(Executors)({ layer: executorPool })
}

const bin = fileURLToPath(moduleUrl("./bin", import.meta.url))
/** How to start the CLI again on the runtime we are on, for rerun hints. */
const launcher = { node: "node", bun: "bun", deno: "deno run -A" }[detect()]

/** The working directory this process started in (a run then moves to the project root). */
const startedIn = process.cwd()

/**
 * Where and how this run was started: the directory the paths given on the command line are
 * relative to, and the package script (`pnpm run test`), if any, that rerun hints repeat. A
 * run forwarded to `etest serve` gets its client's.
 */
export interface Invocation {
  readonly cwd: string
  readonly script: string | undefined
}
export const Invocation = Context.Reference<Invocation>("etest/cli/Invocation", {
  defaultValue: () => ({ cwd: startedIn, script: scriptCommand() })
})

const configFailure = (error: Config.ConfigError) =>
  Console.error(`etest: ${error.message}`).pipe(Effect.andThen(Effect.fail(new ExitCode({ code: 1 }))))

/** Changes to these files can affect any test: `--changed` then runs everything. */
const affectsEverything = (file: string, configFile: string | undefined) =>
  file === configFile ||
  /^(package\.json|tsconfig.*\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|deno\.lock)$/
    .test(path.basename(file))

/** The `etest` command itself: run the tests. `etest serve` runs this on forwarded arguments. */
export const command = Command.make("etest", {
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
  noConfig,
  noServer
}).pipe(
  Command.withDescription("Run Effect-native tests"),
  Command.withHandler(Effect.fnUntraced(function*(options) {
    const invocation = yield* Invocation
    const config = yield* Config.resolve(invocation.cwd, options).pipe(Effect.catchTag("ConfigError", configFailure))
    const configFile = config.file
    // everything is relative to the project root: test ids, seeds, the --failed record
    if (process.cwd() !== config.root) process.chdir(config.root)
    const fromRoot = (p: string) => path.relative(config.root, path.resolve(invocation.cwd, p)) || "."
    const output = yield* Output
    const write = output.out
    // paths given on the command line replace the config's
    let paths = options.paths.length > 0 ? options.paths.map(fromRoot) : [...(config.paths ?? [])]
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
      if (options.paths.length === 0) paths = [...new Set(entries.map(([, { file }]) => file))]
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
      const everything = [...changedFiles].find((file) => affectsEverything(file, configFile))
      if (everything !== undefined) {
        selectedBy.push(`${label} (${path.relative(config.root, everything)} changed: every test is affected)`)
      } else {
        const { files } = discover(paths, config.exclude)
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
    // a rerun hint repeats how this run was started, with paths relative to where it was
    const relativeBin = path.relative(invocation.cwd, bin)
    const start = invocation.script ?? `${launcher} ${relativeBin.length < bin.length ? relativeBin : bin}`
    const ctx: Reporters.ReporterContext = {
      write,
      rerun: (t, runSeed) =>
        `${start} ${
          path.relative(invocation.cwd, path.resolve(config.root, t.file))
        } --test ${t.shortId} --seed ${runSeed}`
    }
    const workerCount = Option.getOrElse(options.workers, () => config.workers ?? Config.BUILTIN_WORKERS)
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
      testsPerFile: TESTS_PER_FILE,
      bail: options.bail,
      config: configFile,
      root: config.root,
      exclude: config.exclude,
      defaults: {
        timeoutMs: config.defaults.timeoutMs ?? builtinDefaults.timeoutMs,
        retries: config.defaults.retries ?? builtinDefaults.retries
      },
      reporter: options.list ? reporter : LastRun.recording(reporter),
      write
    }).pipe(Effect.scoped, Effect.provide((yield* Executors).layer(workerCount)))
    if (code !== 0) return yield* new ExitCode({ code })
  }))
)
