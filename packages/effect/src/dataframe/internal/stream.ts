/**
 * Running plans batch by batch over streamed tables.
 *
 * Row-wise operations (filters, projections, derived columns without
 * windows, renames, `dropNulls`, `explode`, `unnest`) run on every batch as
 * it arrives, a slice from the start stops pulling batches once it has its
 * rows, joins stream their left side against the collected right side, and
 * concatenations stream their inputs one after the other. Grouping and whole-
 * table aggregation fold every batch into partial aggregates, so memory grows
 * with the number of groups, not rows (medians and distinct counts collect
 * instead). Every other operation collects its inputs first.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as Effect from "../../Effect.ts"
import * as Stream from "../../Stream.ts"
import type { Catalog } from "../Catalog.ts"
import type { DataFrameError } from "../DataFrame.ts"
import type * as Plan from "../Plan.ts"
import type * as Agg from "./aggregate.ts"
import * as E from "./expr.ts"
import * as F from "./frame.ts"
import * as K from "./kernels.ts"
import * as Partial from "./partial.ts"
import * as Q from "./query.ts"
import { conform } from "./schema.ts"
import * as V from "./vector.ts"

type Batches = Stream.Stream<F.Frame, DataFrameError>

const typeOf: Record<string, S.DataType> = {
  Int8: S.int8,
  Int16: S.int16,
  Int32: S.int32,
  Int64: S.int64,
  UInt8: S.uint8,
  UInt16: S.uint16,
  UInt32: S.uint32,
  UInt64: S.uint64,
  Float32: S.float32,
  Float64: S.float64,
  Utf8: S.utf8,
  Binary: S.binary,
  Bool: S.bool,
  Null: S.nullType,
  Date: S.date("day"),
  Timestamp: S.timestamp("microsecond"),
  Duration: S.duration("microsecond")
}

/** A table without rows: its declared columns, or none. */
const emptyTable = (node: Extract<Q.Node, { readonly _tag: "Table" }>): F.Frame =>
  F.make(
    (node.columns ?? []).map((c) =>
      new F.Column(c.name, K.nullsOf(typeOf[c.type] ?? S.nullType, 0), undefined, c.nullable)
    ),
    0
  )

/** The plan over no rows (every input empty), run in place. */
const runEmpty = (node: Q.Node): Effect.Effect<F.Frame, DataFrameError> => {
  const empty = (n: Q.Node): Q.Node => {
    switch (n._tag) {
      case "Table":
        return { _tag: "Values", frame: emptyTable(n) as any }
      case "Values":
        return { _tag: "Values", frame: F.slice(n.frame as unknown as F.Frame, 0, 0) as any }
      case "Join":
        return { ...n, left: empty(n.left), right: empty(n.right) }
      case "Concat":
        return { ...n, inputs: n.inputs.map(empty) }
      default:
        return { ...n, input: empty((n as { readonly input: Q.Node }).input) } as Q.Node
    }
  }
  return Q.execute(empty(node))
}

const collectFrames = (batches: Batches, node: Q.Node): Effect.Effect<F.Frame, DataFrameError> =>
  Effect.flatMap(Stream.runCollect(batches), (frames) =>
    frames.length === 0
      ? runEmpty(node)
      : Q.attempt(() => frames.length === 1 ? frames[0] : F.concat(frames)))

const isRowWise = (node: Q.Node): boolean => {
  switch (node._tag) {
    case "Filter":
    case "Pick":
    case "Omit":
    case "Rename":
    case "DropNulls":
    case "Explode":
    case "Unnest":
      return true
    case "Select":
    case "WithColumns":
      return node.columns.every((c) => E.isRowWise(c.expression))
    default:
      return false
  }
}

/** Runs a node by collecting its inputs (an operation that needs all rows). */
const collected = (node: Q.Node, catalog: Catalog.Service): Batches =>
  Stream.unwrap(
    Effect.forEach(Q.children(node), (c) => collectFrames(batches(c, catalog), c)).pipe(
      Effect.flatMap((inputs) => Q.attempt(() => Q.step(node, inputs))),
      Effect.map(Stream.succeed)
    )
  )

const aggregate = (
  node: Extract<Q.Node, { readonly _tag: "GroupBy" | "Aggregate" }>,
  catalog: Catalog.Service
): Batches => {
  const keys = node._tag === "GroupBy" ? node.keys : []
  const specs = node.aggregates.map(({ expression, name }) => {
    if (expression._tag !== "AggregateCall") return V.fail(`${name} is not an aggregate expression`)
    if (expression.arg === undefined && expression.fn !== "count") return V.fail(`${expression.fn} needs an argument`)
    const fn: Agg.AggFn = expression.arg === undefined ? "len" : expression.fn
    return { name, fn, arg: expression.arg }
  })
  if (!specs.every((s) => Partial.combinable(s.fn))) return collected(node, catalog)
  const fns = specs.map((s) => s.fn)
  // The first batch's input vectors and key columns, for result types.
  let template: { readonly inputs: ReadonlyArray<V.Vector | undefined>; readonly frame: F.Frame } | undefined
  return Stream.unwrap(
    Stream.runFoldEffect(
      batches(node.input, catalog),
      (): Partial.State | undefined => undefined,
      (state, batch) =>
        Q.attempt(() => {
          const ctx = F.context(batch)
          const inputs = specs.map((s) => (s.arg === undefined ? undefined : E.evaluateColumn(s.arg, ctx)))
          template ??= { inputs, frame: batch }
          const part = Partial.group(
            keys.map((k) => F.column(batch, k).values()),
            fns.map((fn, a) => ({ fn, vector: inputs[a] })),
            batch.length
          )
          return state === undefined ? part : Partial.merge(fns, [state, part])
        })
    ).pipe(
      Effect.flatMap((state) => {
        if (state === undefined || template === undefined) return runEmpty(node)
        const t = template
        return Q.attempt(() => {
          const keyColumns = keys.map((k, i) =>
            new F.Column(k, state.keys[i], undefined, F.column(t.frame, k).nullable)
          )
          const columns = specs.map((s, a) =>
            new F.Column(s.name, Partial.finish(s.fn, state.parts[a], t.inputs[a]), undefined)
          )
          return F.make([...keyColumns, ...columns], node._tag === "Aggregate" ? 1 : state.count)
        })
      }),
      Effect.map(Stream.succeed)
    )
  )
}

const slice = (input: Batches, offset: number, length: number | undefined): Batches =>
  Stream.suspend(() => {
    let skip = offset
    let left = length ?? Infinity
    return input.pipe(
      Stream.takeWhile(() => left > 0),
      Stream.map((batch) => {
        const start = Math.min(skip, batch.length)
        skip -= start
        const end = Math.min(batch.length, start + left)
        left -= end - start
        return F.slice(batch, start, end)
      }),
      Stream.filter((batch) => batch.length > 0)
    )
  })

/** The batches of a node's result. @internal */
export const batches = (node: Q.Node, catalog: Catalog.Service): Batches => {
  if (isRowWise(node)) {
    return Stream.mapEffect(
      batches((node as { readonly input: Q.Node }).input, catalog),
      (batch) => Q.attempt(() => Q.step(node, [batch]))
    ).pipe(Stream.filter((batch) => batch.length > 0))
  }
  switch (node._tag) {
    case "Table":
      return Stream.suspend(() => catalog.stream(node.name)).pipe(
        Stream.mapEffect((frame) => {
          const batch = frame as unknown as F.Frame
          return Q.attempt(() => (node.columns === undefined ? batch : conform(batch, node.columns)))
        })
      )
    case "Values":
      return Stream.succeed(node.frame as unknown as F.Frame)
    case "Slice":
      return node.offset >= 0 ? slice(batches(node.input, catalog), node.offset, node.length) : collected(node, catalog)
    case "Join": {
      if (node.how === "full") return collected(node, catalog)
      const right = collectFrames(batches(node.right, catalog), node.right)
      return Stream.unwrap(Effect.map(right, (r) =>
        Stream.mapEffect(
          batches(node.left, catalog),
          (batch) => Q.attempt(() => F.join(batch, r, node.on, node.how))
        )))
    }
    case "Concat":
      return node.inputs.length === 0
        ? collected(node, catalog)
        : node.inputs.map((input) => batches(input, catalog)).reduce((a, b) => Stream.concat(a, b))
    case "GroupBy":
    case "Aggregate":
      return aggregate(node, catalog)
    default:
      return collected(node, catalog)
  }
}

/** The batches of a plan's result, after optimisation. @internal */
export const stream = (plan: Plan.Node, catalog: Catalog.Service): Batches =>
  Stream.unwrap(Effect.map(Q.attempt(() => Q.optimize(plan as Q.Node)), (optimized) => batches(optimized, catalog)))

/** A plan's result as one frame, computed batch by batch. @internal */
export const collect = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<F.Frame, DataFrameError> =>
  Effect.flatMap(
    Q.attempt(() => Q.optimize(plan as Q.Node)),
    (optimized) => collectFrames(batches(optimized, catalog), optimized)
  )
