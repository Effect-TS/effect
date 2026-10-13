// The coordinator: discovers files and the projects they belong to, asks executors for their
// trees, resolves options (nearest wins) into a plan, dispatches files to the executor pool,
// enforces bail by interrupting in-flight work, and guarantees exactly one terminal event per
// planned test.
import * as Console from "effect/Console"
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
 * A project: a directory with its own config (or the workspace root, with or without one). A
 * test file belongs to the nearest project above it; its ids are relative to the project's root.
 */
export interface Project {
  /** the project's root relative to the workspace root (`.`: the workspace root itself) */
  readonly key: string
  /** the project's root (absolute) */
  readonly dir: string
  /** the project's own config file (absolute), if any */
  readonly config: string | undefined
  /** the configs whose `shared` layers its files use (absolute), the workspace root's first */
  readonly configs: ReadonlyArray<string>
  /** where its tests are when it is searched without paths (relative to `dir`; default: all of it) */
  readonly paths: ReadonlyArray<string> | undefined
  /** glob patterns skipped while searching its directories (relative to `dir`) */
  readonly exclude: ReadonlyArray<string>
  /** defaults for test options that no node on the tree sets */
  readonly defaults: Defaults
}

/** The workspace's projects, as discovery asks for them. */
export interface Projects<E> {
  /** the project whose root is exactly `dir`, if it is one (a nested config) */
  readonly at: (dir: string) => Effect.Effect<Project | undefined, E>
  /** the project a path belongs to: the nearest one at or above it */
  readonly of: (p: string) => Effect.Effect<Project, E>
}

/** What a test file's previous runs say about it, for ordering (see `RunOptions.history`). */
export interface History {
  readonly status: Status
  readonly durationMs: number
}

export interface RunOptions<E> {
  /** where to search, relative to the workspace root (the working directory) */
  readonly paths: ReadonlyArray<string>
  readonly list: boolean
  readonly listJson: boolean
  readonly test: string | undefined
  readonly tag: string | undefined
  /** only these tests, by key (`testKey`; a file's key selects the whole file), e.g. the last failures */
  readonly ids: ReadonlySet<string> | undefined
  /** how the caller narrowed the selection beyond `test` / `tag`, for reporting, e.g. `--failed (11 recorded)` */
  readonly selectedBy: ReadonlyArray<string>
  readonly seed: number
  readonly testsPerFile: number
  readonly bail: boolean
  /** the workspace root (absolute; the working directory) */
  readonly root: string
  /** the workspace's config (absolute), if any, for the selection */
  readonly config: string | undefined
  readonly projects: Projects<E>
  /** previous outcomes by test key: files with no history run first, then failed ones, then the slowest */
  readonly history: (key: string) => History | undefined
  readonly reporter: Reporter
  readonly write: (s: string) => void
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

/** A test's key, unique in a run: its id, prefixed with its project unless that is the workspace root. */
export const testKey = (project: string, id: string) => project === "." ? id : `${project}/${id}`

// --- code frames: the source at a failure's location, read here (executors send none)

const CONTEXT_LINES = 2

const makeSources = () => {
  const files = new Map<string, ReadonlyArray<string> | undefined>()
  const linesOf = (file: string) => {
    if (!files.has(file)) {
      try {
        files.set(file, fs.readFileSync(path.resolve(file), "utf8").split("\n"))
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

// --- discovery

/** Directories that are never searched. */
const skipped = (name: string) => name === "node_modules" || name.startsWith(".")

/** A glob as a RegExp: `*` within a path segment, `**` across segments, `?` one character. */
export const globToRegExp = (glob: string): RegExp => {
  let out = ""
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === "*" && glob[i + 1] === "*") {
      i++
      if (glob[i + 1] === "/") {
        i++
        out += "(?:.*/)?"
      } else out += ".*"
    } else if (c === "*") out += "[^/]*"
    else if (c === "?") out += "[^/]"
    else out += /[\\^$.|+()[\]{}]/.test(c) ? `\\${c}` : c
  }
  return new RegExp(`^${out}$`)
}

const posix = (p: string) => p.split(path.sep).join("/")

export interface Discovered {
  /** the test files found (absolute), sorted, each with its project */
  readonly files: ReadonlyArray<{ readonly file: string; readonly project: Project }>
  /** the projects searched, in the order they were reached */
  readonly projects: ReadonlyArray<Project>
  /** paths that don't exist */
  readonly missing: ReadonlyArray<string>
  /** paths that yield no test file (a file that isn't a test file, or a directory without any) */
  readonly empty: ReadonlyArray<string>
}

/**
 * The `*.test.ts` files under `paths` (relative to the working directory, the workspace root),
 * each in the project it belongs to: the nearest one above it.
 *
 * Directories are searched, skipping `node_modules`, dot-directories and what the project's
 * `exclude` matches (relative to the project's root). A search that reaches a nested project
 * continues there with that project's rules: its `exclude`, and its own `paths` (it wasn't
 * named). A directory an outer project excludes is never entered, nested projects included.
 *
 * Naming a path opts it in: a file named directly is never excluded, and a directory that is
 * itself excluded is searched in full when it is named (`etest test/fixtures` despite
 * `**` + `/fixtures/**`). Paths that don't exist, and those that yield no test file, are
 * returned too: asking for something that can't run is an error, never silently ignored.
 */
export const discover = <E>(paths: ReadonlyArray<string>, projects: Projects<E>): Effect.Effect<Discovered, E> =>
  Effect.gen(function*() {
    const patterns = new Map<Project, Array<RegExp>>()
    const excluded = (project: Project, p: string) => {
      let res = patterns.get(project)
      if (res === undefined) patterns.set(project, res = project.exclude.map(globToRegExp))
      const rel = posix(path.relative(project.dir, path.resolve(p)))
      return res.some((re) => re.test(rel) || re.test(`${rel}/`))
    }
    const files = new Map<string, Project>()
    const searched = new Map<string, Project>()
    const missing: Array<string> = []
    const empty: Array<string> = []
    const reached = (project: Project) => {
      if (!searched.has(project.key)) searched.set(project.key, project)
    }

    const visit = (p: string, project: Project, exclusions: boolean): Effect.Effect<void, E> =>
      Effect.gen(function*() {
        if (exclusions && excluded(project, p)) return
        if (fs.statSync(p).isDirectory()) {
          const nested = path.resolve(p) !== project.dir ? yield* projects.at(p) : undefined
          if (nested !== undefined) return yield* enter(nested)
          for (const e of fs.readdirSync(p).sort()) {
            if (!skipped(e)) yield* visit(path.join(p, e), project, exclusions)
          }
        } else if (p.endsWith(".test.ts")) files.set(path.resolve(p), project)
      })
    // a path given to search (on the command line, or a project's `paths`): opted in
    const named = (p: string, project: Project): Effect.Effect<void, E> =>
      Effect.gen(function*() {
        // what is below a named directory is excluded only if the directory itself isn't
        if (!excluded(project, p) && fs.statSync(p).isDirectory()) {
          for (const e of fs.readdirSync(p).sort()) {
            if (!skipped(e)) yield* visit(path.join(p, e), project, true)
          }
        } else yield* visit(p, project, false)
      })
    // a nested project reached by a search: its own `paths`, else all of it
    const enter = (project: Project): Effect.Effect<void, E> =>
      Effect.gen(function*() {
        reached(project)
        for (const rel of project.paths ?? ["."]) {
          const p = path.relative(process.cwd(), path.resolve(project.dir, rel)) || "."
          if (!fs.existsSync(p)) missing.push(p)
          else yield* named(p, project)
        }
      })

    for (const p of paths.length ? paths : ["."]) {
      if (!fs.existsSync(p)) {
        missing.push(p)
        continue
      }
      const project = yield* projects.of(p)
      reached(project)
      const before = files.size
      yield* named(p, project)
      if (files.size === before) empty.push(p)
    }
    // overlapping paths (`examples examples/a.test.ts`) find a file more than once: a Map keeps one
    return {
      files: [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([file, project]) => ({ file, project })),
      projects: [...searched.values()],
      missing,
      empty
    }
  })

/** What narrowed the selection, in the words of the command line. */
const filtersOf = (opts: Pick<RunOptions<unknown>, "test" | "tag" | "selectedBy">): Array<string> => [
  ...opts.selectedBy,
  ...(opts.test !== undefined ? [`--test ${JSON.stringify(opts.test)}`] : []),
  ...(opts.tag !== undefined ? [`--tag ${JSON.stringify(opts.tag)}`] : [])
]

/** Why a run selected no tests, for the error message. */
const whyEmpty = (selection: Selection): string => {
  const where = selection.paths.length ? selection.paths.join(", ") : "."
  if (selection.files === 0) return `no test files (*.test.ts) found in ${where}`
  if (selection.tests === 0) return `${selection.files} test file(s) in ${where}, but none defines a test`
  return `${selection.tests} test(s) in ${selection.files} file(s), but none matched ${selection.filters.join(" and ")}`
}

// --- planning

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

export const plan = (
  listings: ReadonlyArray<Listing>,
  opts: Pick<RunOptions<unknown>, "test" | "tag" | "ids" | "seed" | "root">
): Array<PlannedTest> => {
  const planned: Array<PlannedTest & { only: boolean }> = []
  // an exact id, key or short id selects exactly that test; anything else is a substring of the key
  const exact = opts.test !== undefined &&
    listings.some((l) =>
      l.nodes.some((n) => {
        const key = testKey(l.project.key, n.id)
        return n.id === opts.test || key === opts.test || (n.kind === "test" && shortId(key) === opts.test)
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
        opts.test !== undefined &&
        (exact ? node.id !== opts.test && key !== opts.test && sid !== opts.test : !key.includes(opts.test))
      ) {
        continue
      }
      if (opts.tag !== undefined && !tags.includes(opts.tag)) continue
      if (opts.ids !== undefined && !opts.ids.has(key) && !opts.ids.has(testKey(project.key, chain[0].id))) continue
      const skip = nearest("skip")
      planned.push({
        project: project.key,
        id: node.id,
        shortId: sid,
        file: fileKey,
        tags,
        timeoutMs: nearest("timeoutMs") ?? project.defaults.timeoutMs,
        retries: nearest("retries") ?? project.defaults.retries,
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

// --- running

export const run = <E>(opts: RunOptions<E>) =>
  Effect.gen(function*() {
    const startedAt = Date.now()
    const client = yield* RpcClient.make(ExecutorRpcs)
    const { empty, files, missing, projects } = yield* discover(opts.paths, opts.projects)
    if (missing.length > 0) {
      yield* Console.error(`No such file or directory: ${missing.join(", ")}`)
      return 1
    }
    if (empty.length > 0) {
      for (const p of empty) {
        yield* Console.error(
          fs.statSync(p).isDirectory()
            ? `${p}: no test files (*.test.ts) in it${
              projects.some((project) => project.exclude.length) ? " (after excluding config `exclude` patterns)" : ""
            }`
            : `${p}: not a test file (*.test.ts)`
        )
      }
      return 1
    }

    const listed = yield* Effect.forEach(
      files,
      ({ file, project }) => Effect.result(client.ListFile({ path: file, root: project.dir })),
      { concurrency: "unbounded" }
    )
    const listings = listed.flatMap((r, i): Array<Listing> =>
      r._tag === "Success" ? [{ project: files[i].project, path: files[i].file, nodes: r.success.nodes }] : []
    )
    // any file whose listing failed (a load error, or an executor that died) is kept, so it can't vanish
    const loadErrors = listed.flatMap((r, i) => r._tag === "Failure" ? [{ ...files[i], error: r.failure }] : [])

    if (opts.list) {
      opts.write(opts.listJson ? renderListJson(listings, opts) : renderList(listings, opts))
      for (const { error, file } of loadErrors) {
        opts.write(
          `LOAD ERROR ${
            error._tag === "LoadError"
              ? `${path.relative(opts.root, error.path)}: ${error.message}`
              : `${path.relative(opts.root, file)}: ${describe(error)}`
          }\n`
        )
      }
      return loadErrors.length ? 1 : 0
    }

    const planned = plan(listings, opts)
    // a file that fails to list becomes a single failed planned test, so it can't vanish silently
    for (const { file, project } of loadErrors) {
      const id = posix(path.relative(project.dir, file))
      planned.push({
        project: project.key,
        id,
        shortId: shortId(testKey(project.key, id)),
        file: posix(path.relative(opts.root, file)),
        tags: [],
        timeoutMs: 0,
        retries: 0,
        seed: 0
      })
    }
    const testsIn = (l: Listing) => l.nodes.filter((node) => node.kind === "test").length
    // a run that selects nothing is red: an agent must never read "nothing ran" as "all green"
    const selection: Selection = {
      root: opts.root,
      ...(opts.config !== undefined ? { config: posix(path.relative(opts.root, opts.config)) } : {}),
      projects: projects.map((project): SelectedProject => ({
        project: project.key,
        ...(project.config !== undefined ? { config: posix(path.relative(opts.root, project.config)) } : {}),
        files: files.filter((f) => f.project === project).length,
        tests: listings.filter((l) => l.project === project).reduce((n, l) => n + testsIn(l), 0)
      })),
      paths: opts.paths,
      files: files.length,
      tests: listings.reduce((n, l) => n + testsIn(l), 0),
      filters: filtersOf(opts)
    }
    if (planned.length === 0) {
      yield* Console.error(`No tests selected: ${whyEmpty(selection)}`)
      return 1
    }

    const keyOf = (e: { readonly project: string; readonly id: string }) => testKey(e.project, e.id)
    const byKey = new Map(planned.map((t) => [keyOf(t), t]))
    const terminal = new Map<string, TestFinished>()
    const started = new Set<string>()
    const sources = makeSources()
    const emit = (event: TestEvent) => {
      let e = event
      if (e._tag === "TestFinished") {
        if (terminal.has(keyOf(e))) return
        if (e.failures.some((f) => f.location)) e = { ...e, failures: e.failures.map(sources.withSource) }
        terminal.set(keyOf(e), e)
      }
      if (e._tag === "TestStarted") started.add(keyOf(e))
      opts.reporter.onEvent(e)
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
      runSeed: opts.seed,
      selection,
      tests: planned.map(({ skip, ...t }) => skip ? { ...t, skip } : t)
    })
    for (const { error, file, project } of loadErrors) {
      const t = byKey.get(testKey(project.key, posix(path.relative(project.dir, file))))
      if (t === undefined) continue
      emit(finished(t, "failed", {
        failures: [{
          kind: "load",
          message: error._tag === "LoadError" ? error.message : `could not list the file: ${describe(error)}`
        }]
      }))
    }
    for (const t of planned) {
      if (t.skip !== undefined && !terminal.has(keyOf(t))) emit(finished(t, "skipped", { skipReason: t.skip }))
    }

    const byFile = new Map<string, { project: Project; tests: Array<RunFileTest>; keys: Array<string> }>()
    const projectOf = new Map(listings.map((l) => [l.path, l.project]))
    for (const t of planned) {
      if (t.skip !== undefined || terminal.has(keyOf(t))) continue
      const file = path.resolve(opts.root, t.file)
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
    const order = dispatchOrder([...byFile].map(([file, { keys }]) => [file, keys] as const), opts.history)

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
          configs: project.configs,
          concurrency: opts.testsPerFile,
          tests
        }).pipe(
          Stream.runForEach((e) =>
            Effect.suspend(() => {
              emit(e)
              if (opts.bail && e._tag === "TestFinished" && (e.status === "failed" || e.status === "timedOut")) {
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
    // whether the run completed, bailed, or was interrupted (Ctrl-C)
    let cancelled = false
    const finalize = Effect.sync(() => {
      const reason = bailed ? "--bail" : "Ctrl-C"
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
      emit({
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
      })
      opts.reporter.onEnd()
    })
    const count = (s: Status) => [...terminal.values()].filter((e) => e.status === s).length

    // bail = interrupt every in-flight RunFile; executors interrupt the test fibers, finalizers run
    yield* Effect.raceFirst(work, Deferred.await(bail)).pipe(
      Effect.onInterrupt(() => Effect.sync(() => void (cancelled = true))),
      Effect.ensuring(finalize)
    )

    return count("failed") + count("timedOut") + count("interrupted") > 0 ? 1 : 0
  })

const describe = (e: unknown): string => {
  const cause = (e as any)?.reason?.cause ?? (e as any)?.cause
  return `${String(e)}${cause ? `\n  caused by: ${cause instanceof Error ? cause.stack : String(cause)}` : ""}`
}

const renderListJson = (
  listings: ReadonlyArray<Listing>,
  opts: Pick<RunOptions<unknown>, "test" | "tag" | "ids" | "seed" | "root">
) => {
  const planned = new Map(plan(listings, opts).map((t) => [testKey(t.project, t.id), t]))
  const keys = [...planned.keys()]
  return listings.flatMap((l) =>
    l.nodes.map((n) => ({ project: l.project.key, node: n, key: testKey(l.project.key, n.id) }))
  )
    .filter(({ key, node }) => node.kind === "suite" ? keys.some((k) => k.startsWith(key)) : planned.has(key))
    .map(({ key, node, project }) =>
      JSON.stringify({ project, ...node, ...(node.kind === "test" ? { resolved: planned.get(key) } : {}) }) + "\n"
    )
    .join("")
}

// --- --list: the tree, with resolved data, without running or acquiring anything

const renderList = (
  listings: ReadonlyArray<Listing>,
  opts: Pick<RunOptions<unknown>, "test" | "tag" | "ids" | "seed" | "root">
) => {
  const selected = new Set(plan(listings, opts).map((t) => testKey(t.project, t.id)))
  let out = ""
  for (const { nodes, project } of listings) {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const depth = (n: ListedNode): number => n.parent === undefined ? 0 : 1 + depth(byId.get(n.parent)!)
    const visible = new Set<string>()
    for (const n of nodes) {
      if (n.kind !== "test" || !selected.has(testKey(project.key, n.id))) continue
      for (let p: ListedNode | undefined = n; p; p = p.parent !== undefined ? byId.get(p.parent) : undefined) {
        visible.add(p.id)
      }
    }
    for (const n of nodes) {
      if (!visible.has(n.id)) continue
      const bits: Array<string> = []
      if (n.tags.length) bits.push(`tags=${n.tags.join(",")}`)
      if (n.timeoutMs !== undefined) bits.push(`timeout=${n.timeoutMs}ms`)
      if (n.retries !== undefined) bits.push(`retries=${n.retries}`)
      if (n.skip) bits.push(`skip="${n.skip}"`)
      if (n.only) bits.push("only")
      if (n.noAssertions) bits.push("noAssertions")
      for (const f of n.fixtures) bits.push(`provide=${f.name}`)
      const label = n.kind === "suite"
        ? (n.parent === undefined ? testKey(project.key, n.name) : `${n.name}/`)
        : `[${shortId(testKey(project.key, n.id))}] ${n.name}`
      out += `${"  ".repeat(depth(n))}${label}${bits.length ? `  [${bits.join(" ")}]` : ""}${
        n.kind === "test" ? `  at=${n.location ?? "?"}` : ""
      }\n`
    }
  }
  return out + `${selected.size} tests selected\n`
}
