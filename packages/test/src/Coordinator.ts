// The coordinator: the test runner itself, headless. It is given everything as data (a
// `RunConfig`: the test files, the project each belongs to with its resolved defaults, the
// selection, the seed), asks executors for the files' trees, resolves options (nearest wins)
// into a plan, dispatches files to the executor pool, enforces bail by interrupting in-flight
// work, and guarantees exactly one terminal event per planned test. It reads no config file,
// searches no directory, and knows nothing of the command line or the working directory: the
// host (the CLI, `src/cli/`) does that, and provides the executors (any `RpcClient.Protocol`).
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as RpcClient from "effect/rpc/RpcClient"
import * as Stream from "effect/Stream"
import * as fs from "node:fs"
import * as path from "node:path"
import type {
  Failure,
  ListedNode,
  Location,
  PlannedTest,
  RunFileTest,
  RunFinished,
  SelectedProject,
  Selection,
  SourceLine,
  Status,
  TestEvent,
  TestFinished
} from "./Protocol.ts"
import { ExecutorRpcs, schemaVersion } from "./Protocol.ts"
import type { Reporter } from "./Reporters.ts"

/**
 * A project: the root a test file's ids are relative to, the defaults its tests start from, and
 * the configs its shared layers come from. How projects are found (config files, nested
 * directories) is up to the host.
 */
export interface Project {
  /** the project's root relative to the workspace root (`.`: the workspace root itself) */
  readonly key: string
  /** the project's root (absolute) */
  readonly dir: string
  /** the project's own config file (absolute), if any, named in the selection */
  readonly config?: string | undefined
  /**
   * modules (absolute) whose default export's `shared` layers its files use, the workspace
   * root's first; executors import them (default: none)
   */
  readonly configs?: ReadonlyArray<string> | undefined
  /** defaults for test options that no node on the tree sets (default: `builtinDefaults`) */
  readonly defaults?: Defaults | undefined
}

/** A test file (absolute) and the project it belongs to. */
export interface TestFile {
  readonly file: string
  readonly project: Project
}

/** Which of the files' tests to run; all of them when nothing is set. */
export interface Filter {
  /** an exact id, key or short id; otherwise text the test's key must contain */
  readonly test?: string | undefined
  readonly tag?: string | undefined
  /** only these tests, by key (`testKey`; a file's key selects the whole file), e.g. the last failures */
  readonly keys?: ReadonlySet<string> | undefined
}

/** What a test file's previous runs say about it, for ordering (see `RunConfig.history`). */
export interface History {
  readonly status: Status
  readonly durationMs: number
}

/** Everything a run (or a listing) needs, resolved by the host. */
export interface RunConfig {
  /** the workspace root (absolute): files and keys are relative to it */
  readonly root: string
  /** the workspace's config file (absolute), if any, named in the selection */
  readonly config?: string | undefined
  /** the test files, each with its project */
  readonly files: ReadonlyArray<TestFile>
  /** the projects searched, in order; listed in the selection even when they have no file (default: the files') */
  readonly projects?: ReadonlyArray<Project> | undefined
  readonly filter?: Filter | undefined
  /**
   * How the host describes the selection, echoed in `RunPlanned.selection`: the paths searched
   * (relative to the root) and what narrowed it, in the host's own words (e.g. `--test "x"`)
   */
  readonly description?: {
    readonly paths?: ReadonlyArray<string> | undefined
    readonly filters?: ReadonlyArray<string> | undefined
  } | undefined
  /** the run's seed; each test's seed derives from it and the test's id */
  readonly seed: number
  /** how many tests of a file run at once (default: `TESTS_PER_FILE`) */
  readonly testsPerFile?: number | undefined
  /** stop at the first failure, interrupting running tests */
  readonly bail?: boolean | undefined
  /** previous outcomes by test key: files with no history run first, then failed ones, then the slowest */
  readonly history?: ((key: string) => History | undefined) | undefined
}

/** Defaults for test options that no node on the tree sets. */
export interface Defaults {
  readonly timeoutMs: number
  readonly retries: number
}

/** The built-in defaults: a test fails after 60 seconds (it is reported as slow after 5), and isn't retried. */
export const builtinDefaults: Defaults = { timeoutMs: 60_000, retries: 0 }

/** A test that takes longer than this is reported as slow (it still passes). */
export const SLOW_MS = 5_000

/** How many tests of a file run at once, unless `RunConfig.testsPerFile` says otherwise. */
export const TESTS_PER_FILE = 8

/** A test's key, unique in a run: its id, prefixed with its project unless that is the workspace root. */
export const testKey = (project: string, id: string) => project === "." ? id : `${project}/${id}`

/** Whether a run is green: nothing failed, timed out or was interrupted. */
export const passed = (summary: RunFinished): boolean =>
  summary.failed + summary.timedOut + summary.interrupted === 0

/** A run selected no tests. A run that selects nothing is red: "nothing ran" must never read as green. */
export class NoTestsSelected extends Data.TaggedError("NoTestsSelected")<{ readonly selection: Selection }> {
  override get message() {
    const selection = this.selection
    const where = selection.paths.length ? selection.paths.join(", ") : "."
    if (selection.files === 0) return `no test files found in ${where}`
    if (selection.tests === 0) return `${selection.files} test file(s) in ${where}, but none defines a test`
    return `${selection.tests} test(s) in ${selection.files} file(s), but none matched ${
      selection.filters.join(" and ")
    }`
  }
}

// --- code frames: the source at a failure's location, read here (executors send none)

const CONTEXT_LINES = 2

/** Reads the source at failures' locations (relative to `root`, the executors' working directory). */
const makeSources = (root: string) => {
  const files = new Map<string, ReadonlyArray<string> | undefined>()
  const linesOf = (file: string) => {
    if (!files.has(file)) {
      try {
        files.set(file, fs.readFileSync(path.resolve(root, file), "utf8").split("\n"))
      } catch {
        files.set(file, undefined)
      }
    }
    return files.get(file)
  }
  const at = (location: Location): Array<SourceLine> | undefined => {
    const lines = linesOf(location.file)
    if (!lines || location.line < 1 || location.line > lines.length) return undefined
    const from = Math.max(1, location.line - CONTEXT_LINES)
    return lines.slice(from - 1, location.line).map((text, i) => ({ line: from + i, text }))
  }
  const withSource = (f: Failure): Failure => {
    const source = f.location ? at(f.location) : undefined
    return source ? { ...f, source } : f
  }
  return { withSource }
}

// --- planning

const posix = (p: string) => p.split(path.sep).join("/")

const fnv1a = (s: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}
/** A test's own seed: from the run's seed and its id (relative to its project, so the same from anywhere). */
export const testSeed = (runSeed: number, id: string) => fnv1a(`${runSeed}:${id}`)

/** A short, stable handle for a test: 8 hex characters of a hash of its key (`testKey`). */
export const shortId = (key: string) => fnv1a(key).toString(16).padStart(8, "0")

const ancestry = (byId: Map<string, ListedNode>, node: ListedNode) => {
  const chain: Array<ListedNode> = []
  for (let n: ListedNode | undefined = node; n; n = n.parent !== undefined ? byId.get(n.parent) : undefined) {
    chain.unshift(n)
  }
  return chain
}

/** A listed file: its tree, ids relative to its project's root. */
export interface Listing {
  readonly project: Project
  /** the file (absolute) */
  readonly path: string
  readonly nodes: ReadonlyArray<ListedNode>
}

/** The selected tests of the listed files, with their options resolved (nearest wins) and their seeds. */
export const plan = (
  listings: ReadonlyArray<Listing>,
  opts: { readonly root: string; readonly seed: number; readonly filter?: Filter | undefined }
): Array<PlannedTest> => {
  const planned: Array<PlannedTest & { only: boolean }> = []
  const filter = opts.filter ?? {}
  // an exact id, key or short id selects exactly that test; anything else is a substring of the key
  const exact = filter.test !== undefined &&
    listings.some((l) =>
      l.nodes.some((n) => {
        const key = testKey(l.project.key, n.id)
        return n.id === filter.test || key === filter.test || (n.kind === "test" && shortId(key) === filter.test)
      })
    )
  for (const { nodes, path: file, project } of listings) {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const fileKey = posix(path.relative(opts.root, file))
    for (const node of nodes) {
      if (node.kind !== "test") continue
      const chain = ancestry(byId, node)
      const nearest = <K extends keyof ListedNode>(k: K): ListedNode[K] | undefined => {
        for (let i = chain.length - 1; i >= 0; i--) if (chain[i][k] !== undefined) return chain[i][k]
        return undefined
      }
      const tags = [...new Set(chain.flatMap((n) => n.tags))]
      const key = testKey(project.key, node.id)
      const sid = shortId(key)
      if (
        filter.test !== undefined &&
        (exact ? node.id !== filter.test && key !== filter.test && sid !== filter.test : !key.includes(filter.test))
      ) {
        continue
      }
      if (filter.tag !== undefined && !tags.includes(filter.tag)) continue
      if (filter.keys !== undefined && !filter.keys.has(key) && !filter.keys.has(testKey(project.key, chain[0].id))) {
        continue
      }
      const skip = nearest("skip")
      planned.push({
        project: project.key,
        id: node.id,
        shortId: sid,
        file: fileKey,
        tags,
        timeoutMs: nearest("timeoutMs") ?? (project.defaults ?? builtinDefaults).timeoutMs,
        retries: nearest("retries") ?? (project.defaults ?? builtinDefaults).retries,
        ...(nearest("noAssertions") ? { noAssertions: true } : {}),
        seed: testSeed(opts.seed, node.id),
        only: chain.some((n) => n.only),
        ...(skip !== undefined ? { skip } : {})
      })
    }
  }
  const anyOnly = planned.some((t) => t.only)
  return planned.map(({ only, ...t }) =>
    anyOnly && !only && t.skip === undefined ? { ...t, skip: "not marked only" } : t
  )
}

/**
 * The order to dispatch files in, from what their tests did before: files with no history
 * first (new or never run), then files with a failure, then the rest, slowest first, so the
 * long poles start early. Plan order breaks ties. Only when tests run depends on this;
 * reporters print in plan order.
 */
export const dispatchOrder = <A>(
  files: ReadonlyArray<readonly [A, ReadonlyArray<string>]>,
  history: (key: string) => History | undefined
): Array<A> => {
  const ranked = files.map(([file, keys], index) => {
    const known = keys.map(history).filter((h): h is History => h !== undefined)
    const failed = known.some((h) => h.status === "failed" || h.status === "timedOut" || h.status === "interrupted")
    return {
      file,
      index,
      rank: known.length === 0 ? 0 : failed ? 1 : 2,
      durationMs: known.reduce((n, h) => n + h.durationMs, 0)
    }
  })
  ranked.sort((a, b) => a.rank - b.rank || b.durationMs - a.durationMs || a.index - b.index)
  return ranked.map((r) => r.file)
}


// --- listing

/** A file whose listing failed (a load error, or an executor that died): kept, so it can't vanish. */
export interface LoadFailure extends TestFile {
  readonly message: string
}

/** What `list` found: the files' trees, the files that failed to list, and the tests selected. */
export interface Listed {
  readonly listings: ReadonlyArray<Listing>
  readonly failures: ReadonlyArray<LoadFailure>
  readonly planned: ReadonlyArray<PlannedTest>
}

const describe = (e: unknown): string => {
  const cause = (e as any)?.reason?.cause ?? (e as any)?.cause
  return `${String(e)}${cause ? `\n  caused by: ${cause instanceof Error ? cause.stack : String(cause)}` : ""}`
}

const listFiles = (
  client: RpcClient.FromGroup<typeof ExecutorRpcs>,
  files: ReadonlyArray<TestFile>
) =>
  Effect.map(
    Effect.forEach(
      files,
      ({ file, project }) => Effect.result(client.ListFile({ path: file, root: project.dir })),
      { concurrency: "unbounded" }
    ),
    (listed) => ({
      listings: listed.flatMap((r, i): Array<Listing> =>
        r._tag === "Success" ? [{ project: files[i].project, path: files[i].file, nodes: r.success.nodes }] : []
      ),
      failures: listed.flatMap((r, i): Array<LoadFailure> =>
        r._tag === "Failure"
          ? [{
            ...files[i],
            message: r.failure._tag === "LoadError" ? r.failure.message : `could not list the file: ${describe(r.failure)}`
          }]
          : []
      )
    })
  )

/** The files' trees and the tests selected, without running anything or acquiring any fixture. */
export const list = (config: RunConfig) =>
  Effect.gen(function*() {
    const client = yield* RpcClient.make(ExecutorRpcs)
    const { failures, listings } = yield* listFiles(client, config.files)
    return { listings, failures, planned: plan(listings, config) } satisfies Listed
  })

// --- running

/**
 * Runs the selected tests of `config.files`, sending every event to `reporter`, and returns the
 * summary (also the last event). Fails with `NoTestsSelected` when the selection is empty.
 */
export const run = (config: RunConfig, reporter: Reporter) =>
  Effect.gen(function*() {
    const startedAt = Date.now()
    const root = config.root
    const client = yield* RpcClient.make(ExecutorRpcs)
    const files = config.files
    const projects = config.projects ?? [...new Set(files.map((f) => f.project))]
    const { failures: loadErrors, listings } = yield* listFiles(client, files)

    const planned = plan(listings, config)
    // a file that fails to list becomes a single failed planned test, so it can't vanish silently
    for (const { file, project } of loadErrors) {
      const id = posix(path.relative(project.dir, file))
      planned.push({
        project: project.key,
        id,
        shortId: shortId(testKey(project.key, id)),
        file: posix(path.relative(root, file)),
        tags: [],
        timeoutMs: 0,
        retries: 0,
        seed: 0
      })
    }
    const testsIn = (l: Listing) => l.nodes.filter((node) => node.kind === "test").length
    const relative = (file: string | undefined) => file !== undefined ? posix(path.relative(root, file)) : undefined
    const selection: Selection = {
      root,
      ...(config.config !== undefined ? { config: relative(config.config) } : {}),
      projects: projects.map((project): SelectedProject => ({
        project: project.key,
        ...(project.config !== undefined ? { config: relative(project.config) } : {}),
        files: files.filter((f) => f.project === project).length,
        tests: listings.filter((l) => l.project === project).reduce((n, l) => n + testsIn(l), 0)
      })),
      paths: config.description?.paths ?? [],
      files: files.length,
      tests: listings.reduce((n, l) => n + testsIn(l), 0),
      filters: config.description?.filters ?? []
    }
    if (planned.length === 0) return yield* new NoTestsSelected({ selection })

    const keyOf = (e: { readonly project: string; readonly id: string }) => testKey(e.project, e.id)
    const byKey = new Map(planned.map((t) => [keyOf(t), t]))
    const terminal = new Map<string, TestFinished>()
    const started = new Set<string>()
    const sources = makeSources(root)
    const emit = (event: TestEvent) => {
      let e = event
      if (e._tag === "TestFinished") {
        if (terminal.has(keyOf(e))) return
        if (e.failures.some((f) => f.location)) e = { ...e, failures: e.failures.map(sources.withSource) }
        terminal.set(keyOf(e), e)
      }
      if (e._tag === "TestStarted") started.add(keyOf(e))
      reporter.onEvent(e)
    }
    const finished = (t: PlannedTest, status: Status, extra: Partial<TestFinished> = {}): TestFinished => ({
      _tag: "TestFinished",
      project: t.project,
      id: t.id,
      status,
      durationMs: 0,
      seed: t.seed,
      attempt: 0,
      previousAttempts: [],
      failures: [],
      console: [],
      ...extra
    })

    emit({
      _tag: "RunPlanned",
      schemaVersion,
      runSeed: config.seed,
      selection,
      tests: planned.map(({ skip, ...t }) => skip ? { ...t, skip } : t)
    })
    for (const { file, message, project } of loadErrors) {
      const t = byKey.get(testKey(project.key, posix(path.relative(project.dir, file))))
      if (t === undefined) continue
      emit(finished(t, "failed", { failures: [{ kind: "load", message }] }))
    }
    for (const t of planned) {
      if (t.skip !== undefined && !terminal.has(keyOf(t))) emit(finished(t, "skipped", { skipReason: t.skip }))
    }

    const byFile = new Map<string, { project: Project; tests: Array<RunFileTest>; keys: Array<string> }>()
    const projectOf = new Map(listings.map((l) => [l.path, l.project]))
    for (const t of planned) {
      if (t.skip !== undefined || terminal.has(keyOf(t))) continue
      const file = path.resolve(root, t.file)
      let entry = byFile.get(file)
      if (entry === undefined) byFile.set(file, entry = { project: projectOf.get(file)!, tests: [], keys: [] })
      entry.tests.push({
        id: t.id,
        seed: t.seed,
        timeoutMs: t.timeoutMs,
        retries: t.retries,
        ...(t.noAssertions ? { noAssertions: true } : {})
      })
      entry.keys.push(keyOf(t))
    }
    const order = dispatchOrder(
      [...byFile].map(([file, { keys }]) => [file, keys] as const),
      config.history ?? (() => undefined)
    )

    const bail = yield* Deferred.make<void>()
    let bailed = false
    const work = Effect.forEach(
      order,
      (file) => {
        const { project, tests } = byFile.get(file)!
        return client.RunFile({
          path: file,
          root: project.dir,
          project: project.key,
          configs: project.configs ?? [],
          concurrency: config.testsPerFile ?? TESTS_PER_FILE,
          tests
        }).pipe(
          Stream.runForEach((e) =>
            Effect.suspend(() => {
              emit(e)
              if (config.bail && e._tag === "TestFinished" && (e.status === "failed" || e.status === "timedOut")) {
                bailed = true
                return Deferred.succeed(bail, void 0)
              }
              return Effect.void
            })
          ),
          Effect.catch((error) =>
            Effect.sync(() => {
              for (const t of tests) {
                const p = byKey.get(testKey(project.key, t.id))!
                if (!terminal.has(keyOf(p))) {
                  emit(
                    finished(p, "failed", {
                      failures: [{ kind: "defect", message: `executor error: ${describe(error)}` }]
                    })
                  )
                }
              }
            })
          )
        )
      },
      { concurrency: "unbounded", discard: true }
    )
    // completeness guarantee: every planned test ends in exactly one terminal event,
    // whether the run completed, bailed, or was interrupted (Ctrl-C, a cancelled request)
    let cancelled = false
    let summary: RunFinished | undefined
    const count = (s: Status) => [...terminal.values()].filter((e) => e.status === s).length
    const finalize = Effect.sync(() => {
      const reason = bailed ? "bail" : "cancellation"
      for (const t of planned) {
        if (terminal.has(keyOf(t))) continue
        emit(
          started.has(keyOf(t))
            ? finished(t, "interrupted", {
              failures: [{ kind: "interrupted", message: `interrupted by ${reason}` }]
            })
            : finished(t, "skipped", { skipReason: `not run: ${reason}` })
        )
      }
      summary = {
        _tag: "RunFinished",
        passed: count("passed"),
        failed: count("failed"),
        skipped: count("skipped"),
        timedOut: count("timedOut"),
        interrupted: count("interrupted"),
        total: planned.length,
        durationMs: Date.now() - startedAt,
        bailed,
        cancelled
      }
      emit(summary)
      reporter.onEnd()
    })

    // bail = interrupt every in-flight RunFile; executors interrupt the test fibers, finalizers run
    yield* Effect.raceFirst(work, Deferred.await(bail)).pipe(
      Effect.onInterrupt(() => Effect.sync(() => void (cancelled = true))),
      Effect.ensuring(finalize)
    )
    return summary!
  })
