/**
 * effect/dataframe on timestamp, duration and decimal columns, which frames
 * hold as integers. Only rows turn them into `DateTime`, `Duration` and
 * `BigDecimal` values, so the cases compare work that stays in columns with
 * the same input read as rows.
 *
 *   node [--expose-gc] benchmark/dataframe/columnar.ts [--rows=1000000] [--reps=5] [--only=<substring>]
 *     [--out=<file.json>] [--gc]
 *
 * The data is generated in memory: a timestamp and a duration in
 * microseconds, a decimal(18, 2), a float64 and a string key of 100 values,
 * without nulls, encoded once as an Arrow IPC stream. Times are the best of
 * `--reps` runs, in milliseconds.
 *
 * `--gc` (with `node --expose-gc`) collects garbage before every timed run,
 * and again after it while the case's result is still referenced. The memory
 * columns are the growth between the two, in MiB, in the last run: `heap` is
 * `heapUsed`, the JS objects the result keeps alive, and `buffers` is
 * `arrayBuffers`, the memory of its typed arrays. Neither counts what a run
 * allocated and released.
 */
import { BigDecimal, DateTime, Effect } from "effect"
import { ArrowIpc, ArrowSchema, ArrowTable } from "effect/arrow"
import { DataFrame, Expr, Query } from "effect/dataframe"
import * as Result from "effect/Result"
import * as Fs from "node:fs"

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const rows = Number(arg("rows") ?? 1_000_000)
const reps = Number(arg("reps") ?? 5)
const only = arg("only")
const out = arg("out")
const gc = process.argv.includes("--gc") ? (globalThis as { gc?: () => void }).gc : undefined

let state = 0x9e3779b9
const next = (bound: number) => {
  state ^= state << 13
  state ^= state >>> 17
  state ^= state << 5
  return Math.floor(((state >>> 0) / 4294967296) * bound)
}
/** 2024-01-01T00:00:00Z, in milliseconds. */
const start = 1_704_067_200_000
const bytes = Result.getOrThrow(ArrowIpc.encodeStream(Result.getOrThrow(ArrowTable.fromColumns(
  ArrowSchema.make([
    ArrowSchema.field("at", ArrowSchema.timestamp("microsecond")),
    ArrowSchema.field("took", ArrowSchema.duration("microsecond")),
    ArrowSchema.field("amount", ArrowSchema.decimal(18, 2)),
    ArrowSchema.field("v", ArrowSchema.float64),
    ArrowSchema.field("key", ArrowSchema.utf8)
  ]),
  [
    // One row a second, up to a second late.
    Array.from({ length: rows }, (_, i) => BigInt(start + i * 1000) * 1000n + BigInt(next(1_000_000))),
    Array.from({ length: rows }, () => BigInt(next(3_600_000_000))),
    Array.from({ length: rows }, () => BigDecimal.make(BigInt(next(2_000_000_000) - 1_000_000_000), 2)),
    Array.from({ length: rows }, () => next(1_000_000) / 1000),
    Array.from({ length: rows }, () => `key${next(100)}`)
  ]
))))

const decode = () =>
  DataFrame.fromArrowTable(Result.getOrThrow(ArrowIpc.decodeStream(bytes))) as DataFrame.DataFrame<any>
const encode = (df: DataFrame.DataFrame<any>) => Result.getOrThrow(ArrowIpc.encodeStream(DataFrame.toArrowTable(df)))
/** The later half of the rows. */
const since = DateTime.makeUnsafe(start + (rows / 2) * 1000)
const input = decode()

const cases: Record<string, () => { readonly result: unknown; readonly rows: number }> = {
  "a decode, filter, group, encode": () => {
    const result = Effect.runSync(
      Query.from(decode()).pipe(
        Query.filter((c) => Expr.gt(c.at, since)),
        Query.groupBy("key"),
        Query.agg((c) => ({
          amount: Expr.sum(c.amount),
          took: Expr.mean(c.took),
          last: Expr.max(c.at),
          v: Expr.sum(c.v)
        }))
      )
    )
    return { result: encode(result), rows: result.length }
  },
  "b decode, rows": () => {
    const result = DataFrame.toRows(decode())
    return { result, rows: result.length }
  },
  "c cast decimal(18, 2) to (18, 1)": () => {
    const result = Effect.runSync(
      Query.from(input).pipe(Query.select((c) => ({ amount: Expr.castDecimal(c.amount, 18, 1) })))
    )
    // Forces the column without converting values to JS.
    return { result: DataFrame.toArrowTable(result), rows: result.length }
  }
}

const results: Record<string, unknown> = {}
/** References the result of the last run, so that collecting garbage keeps it. */
const held: { result?: unknown } = {}
/** Runs a case in a call of its own, so that `held` has the only reference to its result afterwards. */
const time = (run: () => { readonly result: unknown; readonly rows: number }) => {
  const start = performance.now()
  const { result, rows } = run()
  const ms = performance.now() - start
  held.result = result
  return { ms, rows }
}
const fmt = (n: number | undefined) => (n === undefined ? "—" : n.toFixed(1)).padStart(9)
const mib = (n: number) => n / 1024 / 1024

console.log(
  `effect/dataframe columnar path, ${rows} rows (${mib(bytes.length).toFixed(1)} MiB of IPC), best of ${reps}`
)
console.log(
  `${"case".padEnd(34)} ${"best ms".padStart(9)} ${"first ms".padStart(9)} ${"heap MiB".padStart(9)} ${
    "buffers".padStart(9)
  }  rows`
)
for (const [name, run] of Object.entries(cases)) {
  if (only !== undefined && !name.includes(only)) continue
  let best = Infinity
  let first = 0
  let count = 0
  let heap: number | undefined
  let buffers: number | undefined
  for (let r = 0; r < reps; r++) {
    held.result = undefined
    gc?.()
    const before = process.memoryUsage()
    const { ms, rows } = time(run)
    if (r === 0) first = ms
    best = Math.min(best, ms)
    count = rows
    if (gc !== undefined) {
      gc()
      const after = process.memoryUsage()
      heap = mib(after.heapUsed - before.heapUsed)
      buffers = mib(after.arrayBuffers - before.arrayBuffers)
    }
  }
  console.log(`${name.padEnd(34)} ${fmt(best)} ${fmt(first)} ${fmt(heap)} ${fmt(buffers)}  ${count}`)
  results[name] = { ms: best, first, heapMiB: heap, arrayBuffersMiB: buffers, rows: count }
}

if (out !== undefined) Fs.writeFileSync(out, JSON.stringify({ rows, reps, results }, null, 2) + "\n")
