// The coordinator: discovers files, asks executors for their trees,
// resolves options (nearest wins) into a plan, dispatches files to the executor
// pool, enforces bail by interrupting in-flight work, and guarantees exactly one
// terminal event per planned test.
import * as NodeWorker from "@effect/platform-node/NodeWorker"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as RpcClient from "effect/rpc/RpcClient"
import * as Stream from "effect/Stream"
import * as fs from "node:fs"
import * as path from "node:path"
import { Worker } from "node:worker_threads"
import type { ListedNode, PlannedTest, RunFileTest, Status, TestEvent, TestFinished } from "./Protocol.ts"
import { ExecutorRpcs } from "./Protocol.ts"
import type { Reporter } from "./Reporters.ts"

export interface RunOptions {
  readonly paths: ReadonlyArray<string>
  readonly list: boolean
  readonly listJson: boolean
  readonly test: string | undefined
  readonly tag: string | undefined
  readonly seed: number
  readonly workers: number
  readonly filesPerExecutor: number
  readonly testsPerFile: number
  readonly bail: boolean
  readonly reporter: Reporter
  readonly write: (s: string) => void
}

const DEFAULT_TIMEOUT_MS = 5_000

// --- discovery

export const discover = (paths: ReadonlyArray<string>): Array<string> => {
  const out: Array<string> = []
  const visit = (p: string) => {
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(p)) if (e !== "node_modules") visit(path.join(p, e))
    } else if (p.endsWith(".test.ts")) out.push(path.resolve(p))
  }
  for (const p of paths.length ? paths : ["."]) visit(p)
  return out.sort()
}

// --- planning

const fnv1a = (s: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}
export const testSeed = (runSeed: number, id: string) => fnv1a(`${runSeed}:${id}`)

const ancestry = (byId: Map<string, ListedNode>, node: ListedNode) => {
  const chain: Array<ListedNode> = []
  for (let n: ListedNode | undefined = node; n; n = n.parent !== undefined ? byId.get(n.parent) : undefined) {
    chain.unshift(n)
  }
  return chain
}

export const plan = (
  listings: ReadonlyArray<{ readonly file: string; readonly nodes: ReadonlyArray<ListedNode> }>,
  opts: Pick<RunOptions, "test" | "tag" | "seed">
): Array<PlannedTest> => {
  const planned: Array<PlannedTest & { only: boolean }> = []
  // an exact id selects exactly that test; anything else is a substring match
  const exact = opts.test !== undefined && listings.some((l) => l.nodes.some((n) => n.id === opts.test))
  for (const { file, nodes } of listings) {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    for (const node of nodes) {
      if (node.kind !== "test") continue
      const chain = ancestry(byId, node)
      const nearest = <K extends keyof ListedNode>(k: K): ListedNode[K] | undefined => {
        for (let i = chain.length - 1; i >= 0; i--) if (chain[i][k] !== undefined) return chain[i][k]
        return undefined
      }
      const tags = [...new Set(chain.flatMap((n) => n.tags))]
      if (opts.test !== undefined && (exact ? node.id !== opts.test : !node.id.includes(opts.test))) continue
      if (opts.tag !== undefined && !tags.includes(opts.tag)) continue
      const skip = nearest("skip")
      planned.push({
        id: node.id,
        file,
        tags,
        timeoutMs: nearest("timeoutMs") ?? DEFAULT_TIMEOUT_MS,
        retries: nearest("retries") ?? 0,
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

// --- the executor pool: worker threads speaking ExecutorRpcs

export const executorPool = (workers: number, filesPerExecutor: number) =>
  RpcClient.layerProtocolWorker({ size: workers, concurrency: filesPerExecutor }).pipe(
    Layer.provide(NodeWorker.layer(() => {
      const w = new Worker(new URL("./executor-worker.ts", import.meta.url), { stdout: true, stderr: true })
      // keep the coordinator's stdout for the reporter only
      w.stdout.pipe(process.stderr)
      w.stderr.pipe(process.stderr)
      return w
    }))
  )

// --- running

export const run = (opts: RunOptions) =>
  Effect.gen(function*() {
    const startedAt = Date.now()
    const client = yield* RpcClient.make(ExecutorRpcs)
    const files = discover(opts.paths)

    const listed = yield* Effect.forEach(
      files,
      (file) => Effect.result(client.ListFile({ path: file })),
      { concurrency: "unbounded" }
    )
    const listings = listed.flatMap((r) => r._tag === "Success" ? [r.success] : [])
    const loadErrors = listed.flatMap((r) => r._tag === "Failure" ? [r.failure] : [])

    if (opts.list) {
      opts.write(opts.listJson ? renderListJson(listings, opts) : renderList(listings, opts))
      for (const e of loadErrors) {
        opts.write(`LOAD ERROR ${e._tag === "LoadError" ? `${e.path}: ${e.message}` : describe(e)}\n`)
      }
      return loadErrors.length ? 1 : 0
    }

    const planned = plan(listings, opts)
    // a file that fails to load becomes a single failed planned test, so it can't vanish silently
    for (const e of loadErrors) {
      if (e._tag !== "LoadError") continue
      const id = path.relative(process.cwd(), e.path)
      planned.push({ id, file: id, tags: [], timeoutMs: 0, retries: 0, seed: 0 })
    }

    const terminal = new Map<string, TestFinished>()
    const started = new Set<string>()
    const emit = (e: TestEvent) => {
      if (e._tag === "TestFinished") {
        if (terminal.has(e.id)) return
        terminal.set(e.id, e)
      }
      if (e._tag === "TestStarted") started.add(e.id)
      opts.reporter.onEvent(e)
    }
    const finished = (id: string, status: Status, extra: Partial<TestFinished> = {}): TestFinished => ({
      _tag: "TestFinished",
      id,
      status,
      durationMs: 0,
      seed: planned.find((p) => p.id === id)?.seed ?? 0,
      attempt: 0,
      previousAttempts: [],
      failures: [],
      console: [],
      ...extra
    })

    emit({ _tag: "RunPlanned", runSeed: opts.seed, tests: planned.map(({ skip, ...t }) => skip ? { ...t, skip } : t) })
    for (const e of loadErrors) {
      if (e._tag !== "LoadError") continue
      emit(finished(path.relative(process.cwd(), e.path), "failed", {
        failures: [{ kind: "load", message: e.message }]
      }))
    }
    for (const t of planned) {
      if (t.skip !== undefined && !terminal.has(t.id)) emit(finished(t.id, "skipped", { skipReason: t.skip }))
    }

    const byFile = new Map<string, Array<RunFileTest>>()
    for (const t of planned) {
      if (t.skip !== undefined || terminal.has(t.id)) continue
      const list = byFile.get(t.file) ?? []
      list.push({ id: t.id, seed: t.seed, timeoutMs: t.timeoutMs, retries: t.retries })
      byFile.set(t.file, list)
    }

    const bail = yield* Deferred.make<void>()
    let bailed = false
    const work = Effect.forEach(
      [...byFile],
      ([file, tests]) =>
        client.RunFile({ path: path.resolve(file), concurrency: opts.testsPerFile, tests }).pipe(
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
                if (!terminal.has(t.id)) {
                  emit(
                    finished(t.id, "failed", {
                      failures: [{ kind: "defect", message: `executor error: ${describe(error)}` }]
                    })
                  )
                }
              }
            })
          )
        ),
      { concurrency: "unbounded", discard: true }
    )
    // completeness guarantee: every planned test ends in exactly one terminal event,
    // whether the run completed, bailed, or was interrupted (Ctrl-C)
    let cancelled = false
    const finalize = Effect.sync(() => {
      const reason = bailed ? "--bail" : "Ctrl-C"
      for (const t of planned) {
        if (terminal.has(t.id)) continue
        emit(
          started.has(t.id)
            ? finished(t.id, "interrupted", {
              failures: [{ kind: "interrupted", message: `interrupted by ${reason}` }]
            })
            : finished(t.id, "skipped", { skipReason: `not run: ${reason}` })
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
  listings: ReadonlyArray<{ readonly file: string; readonly nodes: ReadonlyArray<ListedNode> }>,
  opts: Pick<RunOptions, "test" | "tag" | "seed">
) => {
  const planned = new Map(plan(listings, opts).map((t) => [t.id, t]))
  const ids = [...planned.keys()]
  return listings.flatMap((l) => l.nodes)
    .filter((n) => n.kind === "suite" ? ids.some((id) => id.startsWith(n.id)) : planned.has(n.id))
    .map((n) => JSON.stringify(n.kind === "test" ? { ...n, resolved: planned.get(n.id) } : n) + "\n")
    .join("")
}

// --- --list: the tree, with resolved data, without running or acquiring anything

const renderList = (
  listings: ReadonlyArray<{ readonly file: string; readonly nodes: ReadonlyArray<ListedNode> }>,
  opts: Pick<RunOptions, "test" | "tag" | "seed">
) => {
  const selected = new Set(plan(listings, opts).map((t) => t.id))
  let out = ""
  for (const { nodes } of listings) {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const depth = (n: ListedNode): number => n.parent === undefined ? 0 : 1 + depth(byId.get(n.parent)!)
    const visible = new Set<string>()
    for (const n of nodes) {
      if (n.kind !== "test" || !selected.has(n.id)) continue
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
      for (const f of n.fixtures) bits.push(`provide=${f.name}`)
      const label = n.kind === "suite" ? (n.parent === undefined ? n.name : `${n.name}/`) : n.name
      out += `${"  ".repeat(depth(n))}${label}${bits.length ? `  [${bits.join(" ")}]` : ""}${
        n.kind === "test" ? `  at=${n.location ?? "?"}` : ""
      }\n`
    }
  }
  return out + `${selected.size} tests selected\n`
}
