/**
 * Running queries on several cores: a pool of workers that group and gather
 * rows in parallel, sharing columns through shared memory.
 *
 * **Mental model**
 *
 * - Queries run on the calling thread unless a {@link Pool} is provided.
 *   With one, operations over at least `minRows` rows split their rows into
 *   ranges, one per worker, and combine the results on the calling thread.
 * - Columns are not copied to workers: a column in `SharedArrayBuffer`
 *   memory is passed to every worker as views of the same memory. Other
 *   columns are copied into shared memory once, the first time a pool
 *   operation reads them.
 * - The pool uses `effect/workers`, so it runs wherever a `WorkerPlatform`
 *   exists (Node, Bun, Deno, browsers). Workers run a module that calls
 *   {@link runWorker}.
 *
 * **Example** (A worker module for Node worker threads)
 *
 * ```ts
 * // worker.ts
 * import { NodeRuntime, NodeWorkerRunner } from "@effect/platform-node"
 * import { Effect } from "effect"
 * import { Parallel } from "effect/dataframe"
 *
 * Parallel.runWorker.pipe(Effect.provide(NodeWorkerRunner.layer), NodeRuntime.runMain)
 * ```
 *
 * **Example** (Running queries on a pool of worker threads)
 *
 * ```ts
 * // main.ts
 * import { NodeWorker } from "@effect/platform-node"
 * import { Effect, Layer } from "effect"
 * import { Parallel } from "effect/dataframe"
 * import { Worker } from "node:worker_threads"
 *
 * const Workers = Parallel.layer({ size: 8 }).pipe(
 *   Layer.provide(NodeWorker.layer(() => new Worker(new URL("./worker.ts", import.meta.url))))
 * )
 *
 * program.pipe(Effect.provide(Workers))
 * ```
 *
 * **Details**
 *
 * Parallel today: grouping (`Query.groupBy`), sorting (`Query.sort`), and
 * gathering the columns of a query's result through the rows earlier
 * operations selected (after filters, sorts and joins). Everything else
 * (filters, joins, top-k) runs on the calling thread.
 *
 * Grouping picks one of two strategies from a sample of the keys: with few
 * groups, each worker groups a range of rows and the partial aggregates are
 * combined; with many groups (or a median or distinct count), rows are
 * partitioned by key hash and each worker owns whole groups.
 *
 * Results are the same as without a pool except for float rounding when
 * partial aggregates are combined: sums, means and variances of few groups
 * add per-range parts, so the last bits of a float result can depend on the
 * number of workers.
 *
 * The work is memory-bound: on CPUs with two hardware threads per core,
 * one worker per physical core is often faster than one per hardware
 * thread. Tune `size` for the machine.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import type * as Worker from "../workers/Worker.ts"
import type { WorkerError } from "../workers/WorkerError.ts"
import type * as WorkerRunner from "../workers/WorkerRunner.ts"
import * as P from "./internal/parallel.ts"

const none: { readonly size: number; readonly minRows: number } = P.sequential

/**
 * The workers queries run on. Defaults to none: queries run on the calling
 * thread.
 *
 * @stability experimental
 * @category services
 * @since 4.1.5
 */
export class Pool extends Context.Reference<Pool.Service>("effect/dataframe/Parallel/Pool", {
  defaultValue: () => none
}) {}

/**
 * Types of the {@link Pool} service.
 *
 * @stability experimental
 * @since 4.1.5
 */
export declare namespace Pool {
  /**
   * A pool of workers.
   *
   * @stability experimental
   * @category models
   * @since 4.1.5
   */
  export interface Service {
    /** The number of workers; 0 runs everything on the calling thread. */
    readonly size: number
    /** Operations over fewer rows run on the calling thread. */
    readonly minRows: number
  }
}

const defaultSize = (): number => {
  const cores = (globalThis as { readonly navigator?: { readonly hardwareConcurrency?: number } }).navigator
    ?.hardwareConcurrency
  return typeof cores === "number" && cores > 0 ? cores : 4
}

/**
 * A layer that spawns a pool of workers (one per core by default) and waits
 * until they are ready. Operations over fewer than `minRows` rows (65 536 by
 * default) run on the calling thread. The workers stop when the layer's
 * scope closes.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const layer = (options?: {
  readonly size?: number | undefined
  readonly minRows?: number | undefined
}): Layer.Layer<never, WorkerError, Worker.WorkerPlatform | Worker.Spawner> =>
  Layer.effect(Pool, P.make({ size: options?.size ?? defaultSize(), minRows: options?.minRows ?? 65_536 }))

/**
 * The program a pool worker runs: it answers the pool's requests until the
 * pool closes. Provide the platform's `WorkerRunnerPlatform`.
 *
 * @stability experimental
 * @category workers
 * @since 4.1.5
 */
export const runWorker: Effect.Effect<void, WorkerError, WorkerRunner.WorkerRunnerPlatform> = P.runWorker
