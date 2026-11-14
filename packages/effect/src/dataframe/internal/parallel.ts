/**
 * Running parts of a query on worker threads.
 *
 * Columns are shared with workers, not copied: a vector whose buffers are
 * `SharedArrayBuffer`s is cloned into a worker as views of the same memory.
 * `share` copies a vector into shared memory once (cached per vector).
 *
 * Work is split into row ranges, one per worker:
 *
 * - `take` (gathering a column through a selection): each worker gathers its
 *   range of the output; the ranges are concatenated.
 * - `groupBy`: each worker groups its range (local group ids, first rows)
 *   and computes partial aggregates. The main thread hashes the local groups'
 *   keys, in range order, which gives the global groups in order of first
 *   appearance, and combines the partials: sums, counts, minima, maxima,
 *   firsts and lasts by aggregating the partials again; means from sums and
 *   counts; variances from counts, means and M2 (Chan et al.). Medians and
 *   distinct counts need every value per group: workers return their local
 *   ids and the main thread aggregates with the global ids.
 *
 * Results match the sequential engine except for float rounding: sums and
 * moments are added in a different order.
 *
 * @internal
 */
import * as Deferred from "../../Deferred.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import type * as Scope from "../../Scope.ts"
import * as Worker from "../../workers/Worker.ts"
import type { WorkerError } from "../../workers/WorkerError.ts"
import * as WorkerRunner from "../../workers/WorkerRunner.ts"
import { DataFrameError } from "../DataFrame.ts"
import type * as Plan from "../Plan.ts"
import * as Agg from "./aggregate.ts"
import * as E from "./expr.ts"
import * as F from "./frame.ts"
import * as Hash from "./hash.ts"
import * as Partial from "./partial.ts"
import * as Sort from "./sort.ts"
import * as V from "./vector.ts"

// -----------------------------------------------------------------------------
// Shared memory
// -----------------------------------------------------------------------------

type View = Float64Array | Int32Array | Uint32Array | BigInt64Array | Uint8Array

const isShared = (a: View | undefined): boolean => a === undefined || a.buffer instanceof SharedArrayBuffer

const toShared = <A extends View>(a: A): A => {
  if (isShared(a)) return a
  const Ctor = a.constructor as new(buffer: SharedArrayBuffer, offset: number, length: number) => A
  const out = new Ctor(new SharedArrayBuffer(a.byteLength), 0, a.length)
  out.set(a as any)
  return out
}

const sharedVectors = new WeakMap<object, V.Vector>()
const sharedArrays = new WeakMap<object, Int32Array>()

/** The vector with its buffers in shared memory (copied once). @internal */
export const share = (v: V.Vector): V.Vector => {
  const cached = sharedVectors.get(v)
  if (cached !== undefined) return cached
  let out: V.Vector
  switch (v.kind) {
    case "null":
      out = v
      break
    case "str":
      out = isShared(v.offsets) && isShared(v.data) && isShared(v.valid)
        ? v
        : { ...v, offsets: toShared(v.offsets), data: toShared(v.data), valid: v.valid && toShared(v.valid) }
      break
    case "list":
      out = { ...v, offsets: toShared(v.offsets), child: share(v.child), valid: v.valid && toShared(v.valid) }
      break
    case "struct":
      out = { ...v, children: v.children.map(share), valid: v.valid && toShared(v.valid) }
      break
    default:
      out = isShared(v.values) && isShared(v.valid)
        ? v
        : { ...v, values: toShared(v.values as any), valid: v.valid && toShared(v.valid) } as V.Vector
  }
  sharedVectors.set(v, out)
  return out
}

const shareIndices = (a: Int32Array): Int32Array => {
  if (isShared(a)) return a
  const cached = sharedArrays.get(a)
  if (cached !== undefined) return cached
  const out = toShared(a)
  sharedArrays.set(a, out)
  return out
}

// -----------------------------------------------------------------------------
// Protocol
// -----------------------------------------------------------------------------

type AggFn = Agg.AggFn

/** @internal */
export type Task =
  | {
    readonly _tag: "take"
    readonly vector: V.Vector
    readonly indices: Int32Array
    readonly from: number
    readonly to: number
  }
  | {
    readonly _tag: "group"
    readonly keys: ReadonlyArray<V.Vector>
    readonly inputs: ReadonlyArray<{ readonly fn: AggFn; readonly vector: V.Vector | undefined }>
    readonly from: number
    readonly to: number
    readonly ids: boolean
  }
  | {
    readonly _tag: "hash"
    readonly keys: ReadonlyArray<V.Vector>
    readonly from: number
    readonly to: number
    readonly partitions: number
    readonly out: Uint16Array
  }
  | {
    readonly _tag: "partition"
    readonly keys: ReadonlyArray<V.Vector>
    readonly inputs: ReadonlyArray<{ readonly fn: AggFn; readonly vector: V.Vector | undefined }>
    readonly owners: Uint16Array
    readonly partition: number
    readonly partitions: number
  }
  | {
    readonly _tag: "gather"
    readonly src: Uint32Array
    readonly perm: Int32Array
    readonly out: Uint32Array
    readonly from: number
    readonly to: number
  }
  | {
    readonly _tag: "words"
    readonly key: Sort.SortKey
    readonly perm: Int32Array
    readonly lo: Uint32Array
    readonly hi: Uint32Array | undefined
    readonly from: number
    readonly to: number
  }
  | {
    readonly _tag: "histogram"
    readonly digits: Uint32Array
    readonly shift: number
    readonly from: number
    readonly to: number
    readonly counts: Int32Array
    readonly base: number
  }
  | {
    readonly _tag: "scatter"
    readonly digits: Uint32Array
    readonly shift: number
    readonly from: number
    readonly to: number
    readonly counts: Int32Array
    readonly base: number
    readonly src: RadixArrays
    readonly dst: RadixArrays
  }

/** What a radix pass moves: the permutation and the key words. */
interface RadixArrays {
  readonly perm: Int32Array
  readonly lo: Uint32Array
  readonly hi: Uint32Array | undefined
}

/** @internal */
export type Result =
  | { readonly _tag: "take"; readonly vector: V.Vector }
  | { readonly _tag: "done" }
  | {
    readonly _tag: "group"
    readonly count: number
    readonly firstRow: Int32Array
    readonly partials: ReadonlyArray<Partial.Part>
    readonly ids: Int32Array | undefined
  }
  | { readonly _tag: "hash" }
  | {
    readonly _tag: "partition"
    readonly count: number
    readonly firstRow: Int32Array
    readonly aggregates: ReadonlyArray<V.Vector>
  }

/** @internal */
export interface Request {
  readonly id: number
  readonly task: Task
}

/** @internal */
export type Response =
  | { readonly id: number; readonly ok: true; readonly result: Result }
  | { readonly id: number; readonly ok: false; readonly message: string }

/** Runs one task. @internal */
export const runTask = (task: Task): Result => {
  switch (task._tag) {
    case "take":
      return { _tag: "take", vector: V.take(task.vector, task.indices.subarray(task.from, task.to)) }
    case "group": {
      const { from, to } = task
      const g = Hash.groups(task.keys.map((k) => V.slice(k, from, to)), to - from)
      const partials = task.inputs.map(({ fn, vector }) =>
        Partial.partial(fn, vector === undefined ? undefined : V.slice(vector, from, to), g)
      )
      return { _tag: "group", count: g.count, firstRow: g.firstRow, partials, ids: task.ids ? g.ids : undefined }
    }
    case "gather": {
      const { from, out, perm, src, to } = task
      for (let i = from; i < to; i++) out[i] = src[perm[i]]
      return { _tag: "done" }
    }
    case "words":
      Sort.fillWords(task.key, task.perm, task.from, task.to, task.lo, task.hi)
      return { _tag: "done" }
    case "histogram": {
      const { base, counts, digits, from, shift, to } = task
      counts.fill(0, base, base + BUCKETS)
      for (let i = from; i < to; i++) counts[base + ((digits[i] >>> shift) & MASK)]++
      return { _tag: "done" }
    }
    case "scatter": {
      const { base, counts, digits, dst, from, shift, src, to } = task
      const hi = src.hi
      const dhi = dst.hi
      for (let i = from; i < to; i++) {
        const at = counts[base + ((digits[i] >>> shift) & MASK)]++
        dst.perm[at] = src.perm[i]
        dst.lo[at] = src.lo[i]
        if (hi !== undefined) dhi![at] = hi[i]
      }
      return { _tag: "done" }
    }
    case "hash": {
      const { from, partitions, to } = task
      const hashes = new Int32Array(to)
      Hash.rowHashes(task.keys, from, to, hashes)
      const out = task.out
      // Multiply-shift: the hash's low 16 bits scaled to [0, partitions).
      for (let i = from; i < to; i++) out[i] = ((hashes[i] & 0xffff) * partitions) >>> 16
      return { _tag: "hash" }
    }
    case "partition": {
      // The rows of this partition, in row order: every group lies in one
      // partition, so its aggregates are complete here.
      const { owners, partition, partitions } = task
      const n = owners.length
      let rows = new Int32Array(Math.ceil(n / partitions * 1.25) + 16)
      let count = 0
      for (let i = 0; i < n; i++) {
        if (owners[i] !== partition) continue
        if (count === rows.length) {
          const grown = new Int32Array(rows.length * 2)
          grown.set(rows)
          rows = grown
        }
        rows[count++] = i
      }
      rows = rows.subarray(0, count)
      const keys = task.keys.map((k) => V.take(k, rows))
      const g = Hash.groups(keys, count)
      const aggregates = task.inputs.map(({ fn, vector }) =>
        Agg.aggregate(fn, vector === undefined ? undefined : V.take(vector, rows), g)
      )
      const firstRow = new Int32Array(g.count)
      for (let j = 0; j < g.count; j++) firstRow[j] = rows[g.firstRow[j]]
      return { _tag: "partition", count: g.count, firstRow, aggregates }
    }
  }
}

/** The unshared buffers of a result, to transfer instead of copy. */
const transferables = (result: Result): Array<ArrayBuffer> => {
  const out = new Set<ArrayBuffer>()
  const add = (a: View | undefined) => {
    if (a !== undefined && a.buffer instanceof ArrayBuffer && a.byteLength === a.buffer.byteLength) out.add(a.buffer)
  }
  const addVector = (v: V.Vector) => {
    add(v.valid)
    if (v.kind === "str") {
      add(v.offsets)
      add(v.data)
    } else if (v.kind === "list") {
      add(v.offsets)
      addVector(v.child)
    } else if (v.kind === "struct") {
      for (const c of v.children) addVector(c)
    } else if (v.kind !== "null") add(v.values)
  }
  if (result._tag === "take") addVector(result.vector)
  else if (result._tag === "hash" || result._tag === "done") return []
  else if (result._tag === "partition") {
    add(result.firstRow)
    for (const v of result.aggregates) addVector(v)
  } else {
    add(result.firstRow)
    add(result.ids)
    for (const p of result.partials) {
      if (p._tag === "vector") addVector(p.vector)
      else if (p._tag === "mean") {
        add(p.sum)
        add(p.count)
      } else if (p._tag === "moments") {
        add(p.count)
        add(p.mean)
        add(p.m2)
      }
    }
  }
  return [...out]
}

/** The worker side: answers requests until the pool closes. @internal */
export const runWorker: Effect.Effect<void, WorkerError, WorkerRunner.WorkerRunnerPlatform> = Effect.gen(function*() {
  const platform = yield* WorkerRunner.WorkerRunnerPlatform
  const runner = yield* platform.start<Response, Request>()
  yield* runner.run<void, never, never>((portId, request) => {
    let response: Response
    let transfer: Array<ArrayBuffer> = []
    try {
      const result = runTask(request.task)
      transfer = transferables(result)
      response = { id: request.id, ok: true, result }
    } catch (cause) {
      response = { id: request.id, ok: false, message: cause instanceof Error ? cause.message : String(cause) }
    }
    runner.sendUnsafe(portId, response, transfer)
  })
})

// -----------------------------------------------------------------------------
// Pool
// -----------------------------------------------------------------------------

/** @internal */
export interface Pool {
  readonly size: number
  readonly minRows: number
  readonly run: (worker: number, task: Task) => Effect.Effect<Result, DataFrameError>
}

/** A pool that runs nothing in parallel. @internal */
export const sequential: Pool = {
  size: 0,
  minRows: Infinity,
  run: () => Effect.fail(new DataFrameError({ message: "no workers" }))
}

const workerFailed = (cause: unknown) =>
  new DataFrameError({ message: `a dataframe worker failed: ${cause instanceof Error ? cause.message : cause}`, cause })

/** Spawns `size` workers and waits until they are ready. @internal */
export const make = (options: {
  readonly size: number
  readonly minRows: number
}): Effect.Effect<Pool, WorkerError, Worker.WorkerPlatform | Worker.Spawner | Scope.Scope> =>
  Effect.gen(function*() {
    const platform = yield* Worker.WorkerPlatform
    let nextId = 0
    const spawn = Effect.fnUntraced(function*(index: number) {
      const worker = yield* platform.spawn<Response, Request>(index)
      const pending = new Map<number, Deferred.Deferred<Result, DataFrameError>>()
      const ready = yield* Deferred.make<void>()
      yield* worker.run((response) =>
        Effect.sync(() => {
          const deferred = pending.get(response.id)
          if (deferred === undefined) return
          pending.delete(response.id)
          Deferred.doneUnsafe(
            deferred,
            response.ok ? Exit.succeed(response.result) : Exit.fail(new DataFrameError({ message: response.message }))
          )
        }), { onSpawn: Deferred.done(ready, Exit.void) }).pipe(
          Effect.onExit((exit) =>
            Effect.sync(() => {
              for (const deferred of pending.values()) {
                Deferred.doneUnsafe(deferred, Exit.fail(workerFailed(Exit.isFailure(exit) ? exit.cause : "exited")))
              }
              pending.clear()
            })
          ),
          Effect.forkScoped
        )
      yield* Deferred.await(ready)
      const run = (task: Task): Effect.Effect<Result, DataFrameError> =>
        Effect.suspend(() => {
          const id = nextId++
          const deferred = Deferred.makeUnsafe<Result, DataFrameError>()
          pending.set(id, deferred)
          return worker.send({ id, task }).pipe(
            Effect.mapError(workerFailed),
            Effect.andThen(Deferred.await(deferred)),
            Effect.ensuring(Effect.sync(() => pending.delete(id)))
          )
        })
      return run
    })
    const workers = yield* Effect.forEach(Array.from({ length: options.size }, (_, i) => i), spawn, {
      concurrency: "unbounded"
    })
    return {
      size: options.size,
      minRows: options.minRows,
      run: (worker, task) => workers[worker % workers.length](task)
    }
  })

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

/** Row ranges, at most one per worker, of at least 16K rows (or `minRows`). */
const ranges = (pool: Pool, n: number): Array<readonly [number, number]> => {
  const chunks = Math.max(1, Math.min(pool.size, Math.ceil(n / Math.min(16_384, pool.minRows))))
  const size = Math.ceil(n / chunks)
  const out: Array<readonly [number, number]> = []
  for (let from = 0; from < n; from += size) out.push([from, Math.min(n, from + size)])
  return out
}

/** Whether an operation over `n` rows should run on the pool. @internal */
export const worthIt = (pool: Pool, n: number): boolean => pool.size > 0 && n >= pool.minRows

const take = (pool: Pool, vector: V.Vector, indices: Int32Array): Effect.Effect<V.Vector, DataFrameError> => {
  const shared = share(vector)
  const sharedIndices = shareIndices(indices)
  return Effect.forEach(
    ranges(pool, indices.length),
    ([from, to], i) => pool.run(i, { _tag: "take", vector: shared, indices: sharedIndices, from, to }),
    { concurrency: "unbounded" }
  ).pipe(Effect.map((results) => V.concat(results.map((r) => (r as Extract<Result, { _tag: "take" }>).vector))))
}

/**
 * The frame with the given columns (all by default) gathered through their
 * selections on the pool.
 *
 * @internal
 */
export const materialize = (
  pool: Pool,
  frame: F.Frame,
  names?: ReadonlySet<string>
): Effect.Effect<F.Frame, DataFrameError> => {
  const pendingColumns = frame.columns.filter((c) =>
    (names === undefined || names.has(c.name)) && c.peek() === undefined && c.vector.kind !== "null"
  )
  if (pendingColumns.length === 0 || !worthIt(pool, frame.length)) return Effect.succeed(frame)
  return Effect.forEach(
    pendingColumns,
    (c) => Effect.map(take(pool, c.vector, c.selection!), (v) => [c.name, v] as const),
    { concurrency: "unbounded" }
  ).pipe(Effect.map((gathered) => {
    const byName = new Map(gathered)
    return F.make(
      frame.columns.map((c) => {
        const v = byName.get(c.name)
        return v === undefined ? c : new F.Column(c.name, v, undefined, c.nullable)
      }),
      frame.length
    )
  }))
}

const groupResult = (r: Result) => r as Extract<Result, { _tag: "group" }>

/** `F.groupBy` on the pool. @internal */
export const groupBy = (
  pool: Pool,
  input: F.Frame,
  keys: ReadonlyArray<string>,
  aggregates: ReadonlyArray<Plan.Named>
): Effect.Effect<F.Frame, DataFrameError> =>
  Effect.gen(function*() {
    const frame = yield* materialize(
      pool,
      input,
      new Set([...keys, ...aggregates.flatMap((a) => [...E.columns(a.expression)])])
    )
    const n = frame.length
    const ctx = F.context(frame)
    const keyVectors = keys.map((k) => F.column(frame, k).values())
    const inputs = aggregates.map(({ expression, name }) => {
      if (expression._tag !== "AggregateCall") return V.fail(`${name} is not an aggregate expression`)
      if (expression.arg === undefined && expression.fn !== "count") return V.fail(`${expression.fn} needs an argument`)
      const fn: AggFn = expression.arg === undefined ? "len" : expression.fn
      return { fn, vector: expression.arg === undefined ? undefined : E.evaluateColumn(expression.arg, ctx) }
    })
    const needIds = inputs.some((i) => !Partial.combinable(i.fn))
    const sharedKeys = keyVectors.map(share)
    const sharedInputs = inputs.map((i) => ({ fn: i.fn, vector: i.vector === undefined ? undefined : share(i.vector) }))
    if (keys.length > 0 && (needIds || manyGroups(keyVectors, n))) {
      return yield* partitioned(pool, frame, keys, aggregates, sharedKeys, sharedInputs)
    }
    const chunks = ranges(pool, n)
    const results = (yield* Effect.forEach(
      chunks,
      ([from, to], i) => pool.run(i, { _tag: "group", keys: sharedKeys, inputs: sharedInputs, from, to, ids: needIds }),
      { concurrency: "unbounded" }
    )).map(groupResult)

    // Global groups: hash the local groups' first rows, in range order.
    const offsets: Array<number> = []
    let total = 0
    for (const r of results) {
      offsets.push(total)
      total += r.count
    }
    const candidates = new Int32Array(total)
    results.forEach((r, c) => {
      const from = chunks[c][0]
      for (let j = 0; j < r.count; j++) candidates[offsets[c] + j] = from + r.firstRow[j]
    })
    const candidateKeys = keyVectors.map((k) => V.take(k, candidates))
    const global = Hash.groups(candidateKeys, total)
    const keyColumns = keys.map((k, i) =>
      new F.Column(k, V.take(candidateKeys[i], global.firstRow), undefined, F.column(frame, k).nullable)
    )

    let globalIds: Int32Array | undefined
    const rowIds = (): Int32Array => {
      if (globalIds !== undefined) return globalIds
      globalIds = new Int32Array(n)
      results.forEach((r, c) => {
        const from = chunks[c][0]
        const local = r.ids!
        const offset = offsets[c]
        for (let i = 0; i < local.length; i++) globalIds![from + i] = global.ids[offset + local[i]]
      })
      return globalIds
    }

    const columns = aggregates.map(({ name }, a) => {
      const { fn, vector } = inputs[a]
      const out = Partial.combinable(fn)
        ? Partial.finish(fn, Partial.combine(fn, results.map((r) => r.partials[a]), global.ids, global.count), vector)
        : Agg.aggregate(fn, vector, { ids: rowIds(), count: global.count })
      return new F.Column(name, out, undefined)
    })
    return F.make([...keyColumns, ...columns], global.count)
  })

/**
 * Whether a sample of rows suggests many groups: then merging per-range
 * groups costs about as much as grouping, and partitioning by key hash is
 * faster.
 */
const manyGroups = (keys: ReadonlyArray<V.Vector>, n: number): boolean => {
  const m = Math.min(n, 20_000)
  const stride = n / m
  const sample = new Int32Array(m)
  for (let i = 0; i < m; i++) sample[i] = Math.floor(i * stride)
  return Hash.groups(keys.map((k) => V.take(k, sample)), m).count > m * 0.7
}

/**
 * `groupBy` by key hash: workers hash the keys of their row ranges, then
 * each worker groups and aggregates the rows of one hash partition. Groups
 * are put in order of first appearance by sorting their first rows. Each
 * group's values are aggregated in row order, as without workers.
 */
const partitioned = (
  pool: Pool,
  frame: F.Frame,
  keys: ReadonlyArray<string>,
  aggregates: ReadonlyArray<Plan.Named>,
  sharedKeys: ReadonlyArray<V.Vector>,
  sharedInputs: ReadonlyArray<{ readonly fn: AggFn; readonly vector: V.Vector | undefined }>
): Effect.Effect<F.Frame, DataFrameError> =>
  Effect.gen(function*() {
    const n = frame.length
    const partitions = pool.size
    const owners = new Uint16Array(new SharedArrayBuffer(n * 2))
    yield* Effect.forEach(
      ranges(pool, n),
      ([from, to], i) => pool.run(i, { _tag: "hash", keys: sharedKeys, from, to, partitions, out: owners }),
      { concurrency: "unbounded" }
    )
    const results = (yield* Effect.forEach(
      Array.from({ length: partitions }, (_, p) => p),
      (partition) =>
        pool.run(partition, {
          _tag: "partition",
          keys: sharedKeys,
          inputs: sharedInputs,
          owners,
          partition,
          partitions
        }),
      { concurrency: "unbounded" }
    )) as Array<Extract<Result, { _tag: "partition" }>>
    // Order groups by first row: first rows are distinct rows, so scatter
    // them into row positions and read them back in row order.
    const total = results.reduce((s, r) => s + r.count, 0)
    const slot = new Int32Array(n).fill(-1)
    let at = 0
    for (const r of results) {
      for (let j = 0; j < r.count; j++) slot[r.firstRow[j]] = at + j
      at += r.count
    }
    const order = new Int32Array(total)
    const firstRows = new Int32Array(new SharedArrayBuffer(total * 4))
    let k = 0
    for (let i = 0; i < n; i++) {
      if (slot[i] < 0) continue
      order[k] = slot[i]
      firstRows[k++] = i
    }
    const keyColumns = yield* Effect.forEach(
      keys,
      (key, i) =>
        Effect.map(
          worthIt(pool, total)
            ? take(pool, sharedKeys[i], firstRows)
            : Effect.succeed(V.take(sharedKeys[i], firstRows)),
          (v) => new F.Column(key, v, undefined, F.column(frame, key).nullable)
        ),
      { concurrency: "unbounded" }
    )
    const columns = aggregates.map(({ name }, a) =>
      new F.Column(name, V.take(V.concat(results.map((r) => r.aggregates[a])), order), undefined)
    )
    return F.make([...keyColumns, ...columns], total)
  })

// -----------------------------------------------------------------------------
// Sorting
// -----------------------------------------------------------------------------

const sharedU32 = (n: number) => new Uint32Array(new SharedArrayBuffer(n * 4))
const sharedI32 = (n: number) => new Int32Array(new SharedArrayBuffer(n * 4))

/** Radix digits of the parallel sort: 11 bits keeps the offset tables small. */
const BITS = 11
const BUCKETS = 1 << BITS
const MASK = BUCKETS - 1
const SHIFTS = [0, 11, 22]

/**
 * `Sort.permutation` on the pool: a stable LSD radix sort, key by key from
 * the last. Workers compute each key's words in the current row order, then
 * every pass counts digits per row range and scatters each range to its
 * offsets. String keys are ranked here first.
 *
 * @internal
 */
export const permutation = (
  pool: Pool,
  keys: ReadonlyArray<Sort.SortKey>,
  nullsLast: boolean,
  n: number
): Effect.Effect<Int32Array, DataFrameError> =>
  Effect.gen(function*() {
    const chunks = ranges(pool, n)
    const counts = sharedI32(chunks.length * BUCKETS)
    const all = (task: (from: number, to: number, c: number) => Task) =>
      Effect.forEach(chunks, ([from, to], c) => pool.run(c, task(from, to, c)), {
        concurrency: "unbounded",
        discard: true
      })
    const anyHigh = keys.some((k) => Sort.hasHighWord(k.vector))
    let cur: RadixArrays = { perm: sharedI32(n), lo: sharedU32(n), hi: anyHigh ? sharedU32(n) : undefined }
    let next: RadixArrays = { perm: sharedI32(n), lo: sharedU32(n), hi: anyHigh ? sharedU32(n) : undefined }
    for (let i = 0; i < n; i++) cur.perm[i] = i
    for (let k = keys.length - 1; k >= 0; k--) {
      const key = keys[k]
      const high = Sort.hasHighWord(key.vector)
      // The key's words, in the current row order.
      if (key.vector.kind === "str") {
        const lo = toShared(Sort.words(key).lo)
        yield* all((from, to) => ({ _tag: "gather", src: lo, perm: cur.perm, out: cur.lo, from, to }))
      } else {
        const shared = { vector: share(key.vector), descending: key.descending }
        yield* all((from, to) => ({
          _tag: "words",
          key: shared,
          perm: cur.perm,
          lo: cur.lo,
          hi: high ? cur.hi : undefined,
          from,
          to
        }))
      }
      const digits: Array<readonly [hi: boolean, shift: number]> = SHIFTS.map((shift) => [false, shift] as const)
      if (high) { for (const shift of SHIFTS) digits.push([true, shift]) }
      for (const [useHi, shift] of digits) {
        const source = useHi ? cur.hi! : cur.lo
        yield* all((from, to, c) => ({ _tag: "histogram", digits: source, shift, from, to, counts, base: c * BUCKETS }))
        // Offsets: by digit, then by range, so ranges keep their order.
        let constant = false
        for (let d = 0; d < BUCKETS && !constant; d++) {
          let inDigit = 0
          for (let c = 0; c < chunks.length; c++) inDigit += counts[c * BUCKETS + d]
          if (inDigit === n) constant = true
        }
        if (constant) continue
        let total = 0
        for (let d = 0; d < BUCKETS; d++) {
          for (let c = 0; c < chunks.length; c++) {
            const at = c * BUCKETS + d
            const count = counts[at]
            counts[at] = total
            total += count
          }
        }
        const src: RadixArrays = { ...cur, hi: high ? cur.hi : undefined }
        const dst: RadixArrays = { ...next, hi: high ? next.hi : undefined }
        yield* all((from, to, c) => ({
          _tag: "scatter",
          digits: source,
          shift,
          from,
          to,
          counts,
          base: c * BUCKETS,
          src,
          dst
        }))
        ;[cur, next] = [{ ...dst, hi: next.hi }, { ...src, hi: cur.hi }]
      }
      const partitioned = Sort.partitionNulls(key.vector, cur.perm, nullsLast)
      if (partitioned !== cur.perm) cur.perm.set(partitioned)
    }
    return cur.perm
  })

/** `F.sort` on the pool. @internal */
export const sort = (
  pool: Pool,
  input: F.Frame,
  keys: ReadonlyArray<Plan.SortKey>,
  nullsLast: boolean
): Effect.Effect<F.Frame, DataFrameError> =>
  Effect.gen(function*() {
    const frame = yield* materialize(pool, input, new Set(keys.flatMap((k) => [...E.columns(k.expression)])))
    const ctx = F.context(frame)
    const sortKeys = keys.map((k) => ({ vector: E.evaluateColumn(k.expression, ctx), descending: k.descending }))
    return F.take(frame, yield* permutation(pool, sortKeys, nullsLast, frame.length))
  })
