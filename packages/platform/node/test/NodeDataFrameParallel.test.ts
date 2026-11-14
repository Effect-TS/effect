import * as NodeWorker from "@effect/platform-node/NodeWorker"
import { assert, describe, it } from "@effect/vitest"
import { DataFrame, Expr, Parallel, Query } from "effect/dataframe"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Worker } from "node:worker_threads"

const fixture = new URL("./fixtures/dataframe-worker.ts", import.meta.url)

const Workers = Parallel.layer({ size: 3, minRows: 1000 }).pipe(
  Layer.provide(NodeWorker.layer(() => new Worker(fixture, { execArgv: [] })))
)

const n = 50_000
const frame = DataFrame.fromColumns({
  key: Int32Array.from({ length: n }, (_, i) => (i * 7919) % 101),
  name: Array.from({ length: n }, (_, i) => `name-${(i * 31) % 997}`),
  value: Float64Array.from({ length: n }, (_, i) => ((i * 2654435761) % 1000) / 7)
})

/** Float sums may round differently: per-range partials add in another order. */
const close = (a: unknown, b: unknown): boolean =>
  typeof a === "number" && typeof b === "number"
    ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
    : typeof a === "object" && a !== null && typeof b === "object" && b !== null
    ? Object.keys(a).every((k) => close((a as any)[k], (b as any)[k]))
    : a === b

describe("effect/dataframe on Node worker threads", () => {
  it.live("groups, sorts and gathers like the calling thread", () =>
    Effect.gen(function*() {
      const queries: ReadonlyArray<Query.Query<{ readonly [name: string]: unknown }>> = [
        Query.from(frame).pipe(
          Query.groupBy("key"),
          Query.agg((c) => ({ n: Expr.count(), total: Expr.sum(c.value), median: Expr.median(c.value) }))
        ),
        Query.from(frame).pipe(
          Query.groupBy("name", "key"),
          Query.agg((c) => ({ max: Expr.max(c.value) }))
        ),
        Query.from(frame).pipe(Query.sort((c) => [Expr.desc(c.value), c.name])),
        Query.from(frame).pipe(Query.filter((c) => Expr.gt(c.value, 50)), Query.sort((c) => [c.name]))
      ]
      for (const query of queries) {
        const sequential = DataFrame.toRows(yield* query)
        const parallel = DataFrame.toRows(yield* query.pipe(Effect.provide(Workers)))
        assert.strictEqual(parallel.length, sequential.length)
        for (let r = 0; r < parallel.length; r++) {
          if (!close(parallel[r], sequential[r])) assert.deepStrictEqual(parallel[r], sequential[r], `row ${r}`)
        }
      }
    }), { timeout: 60_000 })
})
