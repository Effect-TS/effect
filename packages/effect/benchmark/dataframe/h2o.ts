/**
 * effect/dataframe performance against Polars and pandas: the performance
 * half of the dataframe oracle.
 *
 *   python benchmark/dataframe/h2o.py generate --rows 1000000
 *   python benchmark/dataframe/h2o.py run --rows 1000000
 *   node benchmark/dataframe/h2o.ts [--rows=1000000] [--reps=3] [--workers=0] [--only=<substring>] [--out=<file.json>]
 *
 * Every query reads the same Arrow IPC files as the Python baseline, and runs
 * as a lazy query (so the time includes optimising the plan). Before
 * its time counts, each result's checksum (row count and the sum of its
 * numeric columns) has to match the Polars result, so a fast wrong answer
 * can't win. Times are the best of `--reps` runs, in milliseconds.
 *
 * `--workers=N` runs the queries with a `Parallel` pool of N Node worker
 * threads (worker.ts); the input files are then read into shared memory, so
 * columns reach the workers without copies. `node --expose-gc h2o.ts --gc`
 * collects garbage before every timed run, so earlier queries' garbage
 * doesn't count against later ones.
 */
import { Effect, Layer, ManagedRuntime } from "effect"
import { ArrowIpc } from "effect/arrow"
import { DataFrame, Expr, Parallel, Query } from "effect/dataframe"
import * as Result from "effect/Result"
import type * as WorkerPlatform from "effect/workers/Worker"
import * as Fs from "node:fs"
import * as Path from "node:path"
import { Worker } from "node:worker_threads"

/** @effect/platform-node's NodeWorker, loaded at run time (not a dependency of effect). */
const NodeWorker: {
  readonly layer: (spawn: (id: number) => Worker) => Layer.Layer<WorkerPlatform.WorkerPlatform | WorkerPlatform.Spawner>
} = await import(new URL("../../../platform/node/src/NodeWorker.ts", import.meta.url).href)

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const rows = Number(arg("rows") ?? 1_000_000)
const reps = Number(arg("reps") ?? 3)
const only = arg("only")
const out = arg("out")
const data = arg("data") ?? Path.join(import.meta.dirname, ".data")
const workers = Number(arg("workers") ?? 0)
/** With `node --expose-gc ... --gc`, collect garbage before every timed run. */
const gc = process.argv.includes("--gc") ? (globalThis as { gc?: () => void }).gc : undefined

/** The file's bytes, in shared memory when workers will read them. */
const read = (file: string): Uint8Array => {
  if (workers === 0) return new Uint8Array(Fs.readFileSync(file))
  const fd = Fs.openSync(file, "r")
  const bytes = new Uint8Array(new SharedArrayBuffer(Fs.fstatSync(fd).size))
  Fs.readSync(fd, bytes)
  Fs.closeSync(fd)
  return bytes
}

const load = (name: string) => {
  const start = performance.now()
  const bytes = read(Path.join(data, `${name}-${rows}.arrow`))
  const table = Result.getOrThrow(ArrowIpc.decodeFile(bytes))
  const df = DataFrame.fromArrowTable(table)
  return { df: df as DataFrame.DataFrame<any>, ms: performance.now() - start }
}

const loads = {
  g: load("groupby"),
  x: load("join-x"),
  small: load("join-small"),
  medium: load("join-medium"),
  big: load("join-big")
}
const t = Object.fromEntries(Object.entries(loads).map(([k, v]) => [k, Query.from(v.df)])) as Record<
  keyof typeof loads,
  Query.Query<any>
>

/** Untyped frames: joins are built as plan data. */
const join = (left: Query.Query<any>, right: Query.Query<any>, on: string, how: Query.JoinHow = "inner") =>
  Query.fromPlan({ _tag: "Join", left: left.plan, right: right.plan, on: [on], how })

const queries: Record<string, () => Query.Query<any>> = {
  "q1 sum v1 by id1": () => t.g.pipe(Query.groupBy("id1"), Query.agg((c) => ({ v1: Expr.sum(c.v1) }))),
  "q2 sum v1 by id1:id2": () => t.g.pipe(Query.groupBy("id1", "id2"), Query.agg((c) => ({ v1: Expr.sum(c.v1) }))),
  "q3 sum v1, mean v3 by id3": () =>
    t.g.pipe(Query.groupBy("id3"), Query.agg((c) => ({ v1: Expr.sum(c.v1), v3: Expr.mean(c.v3) }))),
  "q4 mean v1:v3 by id4": () =>
    t.g.pipe(
      Query.groupBy("id4"),
      Query.agg((c) => ({ v1: Expr.mean(c.v1), v2: Expr.mean(c.v2), v3: Expr.mean(c.v3) }))
    ),
  "q5 sum v1:v3 by id6": () =>
    t.g.pipe(
      Query.groupBy("id6"),
      Query.agg((c) => ({ v1: Expr.sum(c.v1), v2: Expr.sum(c.v2), v3: Expr.sum(c.v3) }))
    ),
  "q6 median, sd v3 by id4:id5": () =>
    t.g.pipe(
      Query.groupBy("id4", "id5"),
      Query.agg((c) => ({ median: Expr.median(c.v3), sd: Expr.std(c.v3) }))
    ),
  "q7 max v1 - min v2 by id3": () =>
    t.g.pipe(
      Query.groupBy("id3"),
      Query.agg((c) => ({ v1: Expr.max(c.v1), v2: Expr.min(c.v2) })),
      Query.select((c) => ({ id3: c.id3, range: Expr.subtract(c.v1, c.v2) }))
    ),
  "q10 sum v3, count by id1:id6": () =>
    t.g.pipe(
      Query.groupBy("id1", "id2", "id3", "id4", "id5", "id6"),
      Query.agg((c) => ({ v3: Expr.sum(c.v3), len: Expr.count() }))
    ),
  "filter v3 > 50, sum v3": () =>
    t.g.pipe(Query.filter((c) => Expr.gt(c.v3, 50)), Query.aggregate((c) => ({ v3: Expr.sum(c.v3) }))),
  "sort by v3 desc, id6": () => t.g.pipe(Query.sort((c) => [Expr.desc(c.v3), c.id6])),
  "top 10 by v3 desc, id6": () => t.g.pipe(Query.sort((c) => [Expr.desc(c.v3), c.id6]), Query.head(10)),
  "j1 inner small on id1": () => join(t.x, t.small, "id1"),
  "j2 inner medium on id2": () => join(t.x, t.medium.pipe(Query.omit("id5")), "id2"),
  "j3 left medium on id2": () => join(t.x, t.medium.pipe(Query.omit("id5")), "id2", "left"),
  "j4 inner medium on id5 (string)": () => join(t.x.pipe(Query.omit("id2")), t.medium.pipe(Query.omit("id2")), "id5"),
  "j5 inner big on id3": () => join(t.x, t.big, "id3")
}

/**
 * Row count and the sum of every numeric column. Reading the columns also
 * forces the late-materialised columns of a result, so the timed work
 * includes producing every value, as it does for Polars.
 */
const checksum = (df: DataFrame.DataFrame<any>) => {
  let sum = 0
  for (const field of df.schema.fields) {
    const t = field.type._tag
    if (t !== "Int" && t !== "Float") continue
    for (const v of DataFrame.toArray(df, field.name)) {
      if (typeof v === "number" && !Number.isNaN(v)) sum += v
      else if (typeof v === "bigint") sum += Number(v)
    }
  }
  return { rows: df.length, sum }
}

/** Forces every column of a result without converting values to JS. */
const force = (df: DataFrame.DataFrame<any>) => DataFrame.toArrowTable(df)

const baselinePath = Path.join(data, `baseline-${rows}.json`)
const baseline = Fs.existsSync(baselinePath) ? JSON.parse(Fs.readFileSync(baselinePath, "utf8")) : undefined
if (baseline === undefined) console.warn(`no baseline at ${baselinePath}: run h2o.py run --rows ${rows}`)

const poolStart = performance.now()
const runtime = ManagedRuntime.make(
  workers === 0 ? Layer.empty : Parallel.layer({ size: workers }).pipe(
    Layer.provide(NodeWorker.layer(() => new Worker(new URL("./worker.ts", import.meta.url))))
  )
)
await runtime.runPromise(Effect.void)
if (workers > 0) console.log(`pool: ${workers} workers ready in ${(performance.now() - poolStart).toFixed(0)} ms`)

const results: Record<string, unknown> = {}
const fmt = (ms: number | undefined) => (ms === undefined ? "—" : ms.toFixed(1)).padStart(9)
const ratio = (a: number, b: number | undefined) => (b === undefined ? "" : `${(a / b).toFixed(2)}x`).padStart(7)

console.log(
  `effect/dataframe vs Polars ${baseline?.polars.version ?? "?"} (${
    baseline?.polars.threads ?? "?"
  } threads) and pandas ${baseline?.pandas.version ?? "?"}, ${rows} rows, best of ${reps}, ${workers} workers`
)
console.log(
  `load (IPC decode + DataFrame): ${Object.entries(loads).map(([k, v]) => `${k} ${v.ms.toFixed(1)} ms`).join(", ")}`
)
console.log(
  `${"query".padEnd(34)} ${"effect".padStart(9)} ${"polars".padStart(9)} ${"pl 1t".padStart(9)} ${
    "pandas".padStart(9)
  }  ${"vs pl".padStart(7)} ${"vs pl1t".padStart(7)} ${"vs pd".padStart(7)}  check`
)
for (const [name, query] of Object.entries(queries)) {
  if (only !== undefined && !name.includes(only)) continue
  let best = Infinity
  let first = 0
  let result: DataFrame.DataFrame<any> | undefined
  for (let r = 0; r < reps; r++) {
    result = undefined
    gc?.()
    const start = performance.now()
    result = await runtime.runPromise(query())
    force(result)
    const ms = performance.now() - start
    if (r === 0) first = ms
    best = Math.min(best, ms)
  }
  const sum = checksum(result!)
  const expected = baseline?.polars.queries[name]?.checksum
  const ok = expected === undefined
    ? "?"
    : expected.rows === sum.rows && Math.abs(expected.sum - sum.sum) <= 1e-6 * Math.max(1, Math.abs(expected.sum))
    ? "ok"
    : `MISMATCH rows ${sum.rows}/${expected.rows} sum ${sum.sum}/${expected.sum}`
  const pl = baseline?.polars.queries[name]?.ms
  const pl1 = baseline?.polars1.queries[name]?.ms
  const pd = baseline?.pandas.queries[name]?.ms
  console.log(
    `${name.padEnd(34)} ${fmt(best)} ${fmt(pl)} ${fmt(pl1)} ${fmt(pd)}  ${ratio(best, pl)} ${ratio(best, pl1)} ${
      ratio(best, pd)
    }  ${ok}`
  )
  results[name] = { ms: best, first, checksum: sum, ok, polars: pl, polars1: pl1, pandas: pd }
}
await runtime.dispose()
if (out !== undefined) Fs.writeFileSync(out, JSON.stringify({ rows, reps, results }, null, 2) + "\n")
