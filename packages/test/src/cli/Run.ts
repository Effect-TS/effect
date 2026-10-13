// What the CLI does for a run, in three steps:
// 1. a `Request` (what the command line, or an MCP tool call, asks for), decoded with its Schema;
// 2. `resolve`: the request against the workspace: configs read, projects laid out, test files
//    found, `--failed` and `--changed` applied, the result a `Coordinator.RunConfig` (plain data);
// 3. `execute`: the coordinator runs that config headless, with the reporter, the results cache
//    and the executors the CLI provides, and the outcome becomes an exit code.
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as RpcClient from "effect/rpc/RpcClient"
import * as Runtime from "effect/Runtime"
import * as Schema from "effect/Schema"
import type * as Worker from "effect/workers/Worker"
import type { WorkerError } from "effect/workers/WorkerError"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as Coordinator from "../Coordinator.ts"
import * as Reporters from "../Reporters.ts"
import * as Changed from "./Changed.ts"
import { BUILTIN_WORKERS } from "./Config.ts"
import { scriptCommand } from "./invocation.ts"
import { Output } from "./Output.ts"
import { detect, moduleUrl } from "./Platform.ts"
import * as Results from "./Results.ts"
import { isWithin } from "./root.ts"
import * as Workspace from "./Workspace.ts"

/** Ends the process with `code`. Whatever caused it has already been reported. */
export class ExitCode extends Data.TaggedError("ExitCode")<{ readonly code: number }> {
  override get [Runtime.errorExitCode]() {
    return this.code
  }
  override readonly [Runtime.errorReported] = false
}

// --- the request

/** An optional field that decodes to `value` when it is absent (or `undefined`). */
const orElse = <S extends Schema.Top>(schema: S, value: S["Encoded"]) =>
  schema.pipe(Schema.withDecodingDefault(Effect.succeed(value)))

/** What a run asks for, as the command line's flags (and MCP's tools) say it. */
export const Request = Schema.Struct({
  /** files or directories to search, relative to where the request was made (`Invocation.cwd`) */
  paths: orElse(Schema.Array(Schema.String), []),
  /** print the test tree instead of running it */
  list: orElse(Schema.Boolean, false),
  test: Schema.optional(Schema.String),
  tag: Schema.optional(Schema.String),
  /** only the tests that failed in previous runs */
  failed: orElse(Schema.Boolean, false),
  /** only the tests affected by uncommitted changes (and, with `since`, the branch's) */
  changed: orElse(Schema.Boolean, false),
  since: Schema.optional(Schema.String),
  /** default: random */
  seed: Schema.optional(Schema.Int),
  /** default: the workspace config's `workers`, else `BUILTIN_WORKERS` */
  workers: Schema.optional(Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))),
  bail: orElse(Schema.Boolean, false),
  reporter: orElse(Schema.Literals(["agent", "human", "jsonl"]), "agent"),
  /** the workspace config file, relative to where the request was made */
  config: Schema.optional(Schema.String),
  noConfig: orElse(Schema.Boolean, false)
})
export type Request = typeof Request.Encoded

const decodeRequest = Schema.decodeUnknownEffect(Request, { onExcessProperty: "error", errors: "all" })

/**
 * Where and how a request was made: the directory the paths given on the command line are
 * relative to, and the package script (`pnpm run test`), if any, that rerun hints repeat. A
 * run forwarded to `etest serve` gets its client's.
 */
export interface Invocation {
  readonly cwd: string
  readonly script: string | undefined
}
/** The working directory this process started in (a run then moves to the workspace root). */
const startedIn = process.cwd()
export const Invocation = Context.Reference<Invocation>("etest/cli/Invocation", {
  defaultValue: () => ({ cwd: startedIn, script: scriptCommand() })
})

// --- the executors

/** How many files an executor runs at once. */
const FILES_PER_EXECUTOR = 4

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

// --- resolving a request into a RunConfig

/** A request that can't run; the message is printed as is, and the run exits 1. */
export class RequestError extends Data.TaggedError("RequestError")<{ readonly message: string }> {}

/** What a request resolves to: a run of this config, or nothing to do (exit 0), and why. */
export type Resolved =
  | {
    readonly _tag: "Run"
    readonly config: Coordinator.RunConfig
    readonly workers: number
    /** the results cache, as read (for recording this run's outcomes into it) */
    readonly results: ReadonlyMap<string, Results.Entry> | undefined
  }
  | { readonly _tag: "Nothing"; readonly message: string }

/** Changes to these files can affect any test: `--changed` then runs everything. */
const affectsEverything = (file: string, rootConfig: string | undefined) =>
  file === rootConfig ||
  /^(package\.json|tsconfig.*\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|deno\.lock)$/
    .test(path.basename(file))

/**
 * Resolves a decoded request against the workspace it was made in: reads its configs, lays out
 * its projects, finds the test files, and applies `--failed` and `--changed`.
 */
export const resolve = (request: typeof Request.Type, invocation: Invocation) =>
  Effect.gen(function*() {
    const ws = yield* Workspace.workspace(invocation.cwd, request)
    const root = ws.root.dir
    const here = path.resolve(invocation.cwd)
    const fromRoot = (p: string) => path.relative(root, path.resolve(invocation.cwd, p)) || "."
    // paths given on the command line replace the config's. Without any: at a project's root, its
    // `paths`; anywhere below one (or above the workspace), the working directory
    const projectHere = here === root || !isWithin(here, root) ? ws.root : yield* ws.at(here)
    let paths = request.paths.length > 0
      ? request.paths.map(fromRoot)
      : projectHere === undefined
      ? [fromRoot(".")]
      : (projectHere.paths ?? (projectHere === ws.root ? [] : ["."])).map((p) =>
        path.relative(root, path.resolve(projectHere.dir, p)) || "."
      )
    let keys: Array<string> | undefined
    const filters: Array<string> = []
    const results = Results.read(root)
    if (request.failed) {
      if (results === undefined) {
        return yield* new RequestError({ message: `--failed: no previous run recorded (${Results.location})` })
      }
      // without paths: the failures recorded under the working directory (all of them at the workspace root)
      const scope = request.paths.length > 0 || here === root || !isWithin(here, root) ? root : here
      const entries = [...results].filter(([, e]) =>
        Results.failing(e.status) && isWithin(path.resolve(root, e.file), scope)
      )
      if (entries.length === 0) {
        return { _tag: "Nothing", message: "--failed: no failing tests recorded; nothing to re-run" } as const
      }
      keys = entries.map(([key]) => key)
      filters.push(`--failed (${entries.length} recorded)`)
      if (request.paths.length === 0) paths = [...new Set(entries.map(([, { file }]) => file))]
    }

    const discovered = yield* Workspace.discover(ws, paths)
    if (discovered.missing.length > 0) {
      return yield* new RequestError({ message: `No such file or directory: ${discovered.missing.join(", ")}` })
    }
    if (discovered.empty.length > 0) {
      const excludes = discovered.projects.some((project) => project.exclude.length)
      return yield* new RequestError({
        message: discovered.empty.map((p) =>
          fs.statSync(path.resolve(root, p)).isDirectory()
            ? `${p}: no test files (*.test.ts) in it${excludes ? " (after excluding config `exclude` patterns)" : ""}`
            : `${p}: not a test file (*.test.ts)`
        ).join("\n")
      })
    }
    let { files, projects } = discovered

    if (request.changed || request.since !== undefined) {
      const label = request.since === undefined ? "--changed" : `--since ${request.since}`
      const changedFiles = yield* Effect.try({
        try: () => Changed.changedFiles(root, request.since),
        catch: (error) => new RequestError({ message: `${label}: could not ask git for changes: ${String(error)}` })
      })
      if (changedFiles.size === 0) {
        return { _tag: "Nothing", message: `${label}: no changed files; nothing to run` } as const
      }
      const everything = [...changedFiles].find((file) => affectsEverything(file, ws.config.file))
      if (everything !== undefined) {
        filters.push(`${label} (${path.relative(root, everything)} changed: every test is affected)`)
      } else {
        // a nested project's own config affects that project's tests (the workspace's affects all, above)
        const hit = new Set(
          files.flatMap(({ file, project }) =>
            project.config !== undefined && changedFiles.has(project.config) ? [file] : []
          )
        )
        for (const file of Changed.affected(files.map((f) => f.file), changedFiles, root)) hit.add(file)
        if (hit.size === 0) {
          return {
            _tag: "Nothing",
            message:
              `${label}: no test file is affected by the changes (${changedFiles.size} changed, ${files.length} test files searched); nothing to run`
          } as const
        }
        // as if the affected files had been named: each in its project
        files = files.filter((f) => hit.has(f.file))
        projects = [...new Set(files.map((f) => f.project))]
        paths = files.map((f) => path.relative(root, f.file))
        filters.push(`${label} (${changedFiles.size} changed files)`)
      }
    }

    if (request.test !== undefined) filters.push(`--test ${JSON.stringify(request.test)}`)
    if (request.tag !== undefined) filters.push(`--tag ${JSON.stringify(request.tag)}`)
    const config: Coordinator.RunConfig = {
      root,
      ...(ws.config.file !== undefined ? { config: ws.config.file } : {}),
      projects: projects.map(Workspace.forRun),
      files: files.map((f) => ({ file: f.file, project: f.project.key })),
      filter: {
        ...(request.test !== undefined ? { test: request.test } : {}),
        ...(request.tag !== undefined ? { tag: request.tag } : {}),
        ...(keys !== undefined ? { keys } : {})
      },
      description: { paths, filters },
      seed: request.seed ?? Math.floor(Math.random() * 100_000),
      bail: request.bail,
      history: Object.fromEntries(
        [...results ?? []].map(([key, { durationMs, status }]) => [key, { status, durationMs }])
      )
    }
    return {
      _tag: "Run",
      config,
      workers: request.workers ?? ws.config.workers ?? BUILTIN_WORKERS,
      results
    } satisfies Resolved as Resolved
  })

// --- executing

const bin = fileURLToPath(moduleUrl("./bin", import.meta.url))
/** How to start the CLI again on the runtime we are on, for rerun hints. */
const launcher = { node: "node", bun: "bun", deno: "deno run -A" }[detect()]

/** Prints `message` on stderr and ends the run with exit code 1. */
const fail = (message: string) => Console.error(message).pipe(Effect.andThen(Effect.fail(new ExitCode({ code: 1 }))))

/**
 * Runs a request: resolves it, then has the coordinator list or run the tests, writing to
 * `Output`. Exits 0 when everything is green (or there is nothing to do), else fails with an
 * `ExitCode`, its reason already printed.
 */
export const execute = (input: Request) =>
  Effect.gen(function*() {
    const invocation = yield* Invocation
    const output = yield* Output
    const request = yield* decodeRequest(input).pipe(Effect.catchTag("SchemaError", (e) => fail(`etest: ${e.message}`)))
    const resolved = yield* resolve(request, invocation).pipe(
      Effect.catchTags({
        ConfigError: (e) => fail(`etest: ${e.message}`),
        RequestError: (e) => fail(e.message)
      })
    )
    if (resolved._tag === "Nothing") return yield* Console.log(resolved.message)
    const { config, results, workers } = resolved
    const root = config.root
    // a run anchors at the workspace root: `process.cwd()` inside a test is the root, as in vitest
    if (process.cwd() !== root) process.chdir(root)
    const executors = (yield* Executors).layer(workers)
    const invalid = (e: Schema.SchemaError) => fail(`etest: invalid run config: ${e.message}`)

    if (request.list) {
      const listed = yield* Coordinator.list(config).pipe(
        Effect.scoped,
        Effect.provide(executors),
        Effect.catchTag("SchemaError", invalid)
      )
      output.out(request.reporter === "jsonl" ? Reporters.listJsonl(listed, root) : Reporters.listTree(listed, root))
      if (listed.failures.length > 0) return yield* new ExitCode({ code: 1 })
      return
    }

    // a rerun hint repeats how this run was started, with paths relative to where it was
    const relativeBin = path.relative(invocation.cwd, bin)
    const start = invocation.script ?? `${launcher} ${relativeBin.length < bin.length ? relativeBin : bin}`
    const ctx: Reporters.ReporterContext = {
      write: output.out,
      rerun: (t, runSeed) =>
        `${start} ${path.relative(invocation.cwd, path.resolve(root, t.file))} --test ${t.shortId} --seed ${runSeed}`
    }
    const reporter = request.reporter === "human"
      ? Reporters.human(ctx)
      : request.reporter === "jsonl"
      ? Reporters.jsonl(ctx)
      : Reporters.agent(ctx)
    const summary = yield* Coordinator.run(config, Results.recording(reporter, results, root)).pipe(
      Effect.scoped,
      Effect.provide(executors),
      Effect.catchTags({
        SchemaError: invalid,
        NoTestsSelected: (e) => fail(`No tests selected: ${e.message}`)
      })
    )
    if (!Coordinator.passed(summary)) return yield* new ExitCode({ code: 1 })
  })
