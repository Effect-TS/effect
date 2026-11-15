/**
 * Running plans batch by batch over streamed tables.
 *
 * Row-wise operations (filters, projections and derived columns without
 * windows, renames, `dropNulls`, `explode`, `unnest`) run on every batch as
 * it arrives, a slice from the start stops pulling batches once it has its
 * rows, joins stream their left side against the collected right side, and
 * concatenations stream their inputs one after the other. Grouping and whole-
 * table aggregation fold every batch into partial aggregates, so memory grows
 * with the number of groups, not rows (medians, distinct counts and
 * aggregates of windows collect instead). Every other operation collects its
 * inputs first.
 *
 * Every batch of a node has the column types of the node's whole result, so
 * each operation sees the values it would see over all rows at once: the
 * batches of a table, as read (converted to its declared columns, if any),
 * must have the columns of its first batch, as the batches of an Arrow
 * stream share its schema, and a concatenation converts its inputs' batches
 * to their common types, as concatenating their results would.
 *
 * @internal
 */
import * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"
import * as Sink from "../../Sink.ts"
import * as Stream from "../../Stream.ts"
import type { Catalog } from "../Catalog.ts"
import type { DataFrameError } from "../DataFrame.ts"
import type * as Plan from "../Plan.ts"
import type * as Agg from "./aggregate.ts"
import * as D from "./dtype.ts"
import * as E from "./expr.ts"
import * as F from "./frame.ts"
import * as K from "./kernels.ts"
import * as Partial from "./partial.ts"
import * as Q from "./query.ts"
import { arrowType, conform } from "./schema.ts"
import * as V from "./vector.ts"

type Batches = Stream.Stream<F.Frame, DataFrameError>

/** A table without rows: its declared columns, or none. */
const emptyTable = (node: Extract<Q.Node, { readonly _tag: "Table" }>): F.Frame =>
  F.make(
    (node.columns ?? []).map((c) => new F.Column(c.name, K.nullsOf(arrowType(c), 0), undefined, c.nullable)),
    0
  )

/** The plan over no rows (every input empty), run in place. */
const runEmpty = (node: Q.Node): Effect.Effect<F.Frame, DataFrameError> => {
  const empty = (n: Q.Node): Q.Node => {
    switch (n._tag) {
      case "Table":
        return Q.values(emptyTable(n))
      case "Values":
        return Q.values(F.slice(n.frame as unknown as F.Frame, 0, 0))
      case "Join":
        return { ...n, left: empty(n.left), right: empty(n.right) }
      case "Concat":
        return { ...n, inputs: n.inputs.map(empty) }
      default:
        return { ...n, input: empty((n as { readonly input: Q.Node }).input) } as Q.Node
    }
  }
  return Effect.flatMap(Q.attempt(() => empty(node)), Q.execute)
}

const collectFrames = (batches: Batches, node: Q.Node): Effect.Effect<F.Frame, DataFrameError> =>
  Effect.flatMap(Stream.runCollect(batches), (frames) =>
    frames.length === 0
      ? runEmpty(node)
      : Q.attempt(() => frames.length === 1 ? frames[0] : F.concat(frames)))

/** Each output row depends only on its input row, so the node runs per batch. */
const perBatch = (node: Q.Node): boolean => {
  switch (node._tag) {
    case "Filter":
    case "Select":
    case "WithColumns":
    case "Pick":
    case "Omit":
    case "Rename":
    case "DropNulls":
    case "Explode":
    case "Unnest":
      return Q.isRowWise(node)
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
  if (!Q.isRowWise(node) || !specs.every((s) => Partial.combinable(s.fn))) {
    return collected(node, catalog)
  }
  const fns = specs.map((s) => s.fn)
  return Stream.suspend(() => {
    // Whether any batch's key column may hold nulls.
    const nullable = keys.map(() => false)
    return Stream.unwrap(
      Stream.runFoldEffect(
        batches(node.input, catalog),
        (): Partial.State | undefined => undefined,
        (state, batch) =>
          Q.attempt(() => {
            const ctx = F.context(batch)
            keys.forEach((k, i) => nullable[i] ||= F.column(batch, k).nullable)
            const part = Partial.group(
              keys.map((k) => F.column(batch, k).values()),
              specs.map((s) => ({ fn: s.fn, vector: s.arg === undefined ? undefined : E.evaluateColumn(s.arg, ctx) })),
              batch.length
            )
            return state === undefined ? part : Partial.merge(fns, [state, part])
          })
      ).pipe(
        Effect.flatMap((state) =>
          state === undefined ? runEmpty(node) : Q.attempt(() => {
            const keyColumns = keys.map((k, i) => new F.Column(k, state.keys[i], undefined, nullable[i]))
            const columns = specs.map((s, a) =>
              new F.Column(s.name, Partial.finish(s.fn, state.parts[a], state.types[a]), undefined)
            )
            return F.make([...keyColumns, ...columns], state.count)
          })
        ),
        Effect.map(Stream.succeed)
      )
    )
  })
}

/**
 * The inputs' batches one after the other, converted to the inputs' common
 * types. An input's first batch gives its types (its result without rows when
 * it has none), so every input starts before the first batch is emitted.
 */
const concat = (inputs: ReadonlyArray<Q.Node>, catalog: Catalog.Service): Batches =>
  Stream.unwrap(Effect.gen(function*() {
    const peeled = yield* Effect.forEach(
      inputs,
      (input) =>
        Effect.flatMap(Stream.peel(batches(input, catalog), Sink.head()), ([first, rest]) =>
          Option.isSome(first)
            ? Effect.succeed({ first: first.value, rest: Stream.concat(Stream.succeed(first.value), rest) })
            : Effect.map(runEmpty(input), (empty) => ({ first: empty, rest: Stream.empty })))
    )
    const types = yield* Q.attempt(() => F.concat(peeled.map(({ first }) => F.slice(first, 0, 0))))
    return peeled.map(({ rest }) => Stream.mapEffect(rest, (batch) => Q.attempt(() => F.coerce(batch, types))))
      .reduce((a, b) => Stream.concat(a, b))
  }))

const describeColumns = (frame: F.Frame): string =>
  `[${frame.columns.map((c) => `${c.name}: ${D.describe(c.type)}`).join(", ")}]`

/**
 * Reads the batches of a table in turn: each converted to the declared
 * columns, if any, and checked to have the columns of the first.
 */
const reader = (table: Plan.Table) => {
  let first: F.Frame | undefined
  return (frame: F.Frame): F.Frame => {
    const batch = table.columns === undefined ? frame : conform(frame, table.columns, table.schema)
    first ??= batch
    const same = batch.columns.length === first.columns.length &&
      batch.columns.every((c, i) => c.name === first!.columns[i].name && D.sameType(c.type, first!.columns[i].type))
    return same ? batch : V.fail(
      `a batch of table ${JSON.stringify(table.name)} has columns ${describeColumns(batch)}, ` +
        `its first batch ${describeColumns(first)}: the batches of a streamed table share their columns`
    )
  }
}

const slice = (input: Batches, offset: number, length: number | undefined): Batches =>
  length === 0 ? Stream.empty : Stream.suspend(() => {
    let skip = offset
    let left = length ?? Infinity
    return input.pipe(
      Stream.map((batch) => {
        const start = Math.min(skip, batch.length)
        skip -= start
        const end = Math.min(batch.length, start + left)
        left -= end - start
        return F.slice(batch, start, end)
      }),
      Stream.takeUntil(() => left === 0)
    )
  })

/**
 * The batches of a node's result. Batches without rows stay, so a result
 * whose rows are all dropped still has the types of its columns.
 *
 * @internal
 */
export const batches = (node: Q.Node, catalog: Catalog.Service): Batches => {
  if (perBatch(node)) {
    return Stream.mapEffect(
      batches((node as { readonly input: Q.Node }).input, catalog),
      (batch) => Q.attempt(() => Q.step(node, [batch]))
    )
  }
  switch (node._tag) {
    case "Table":
      return Stream.suspend(() => {
        const read = reader(node)
        return Stream.mapEffect(
          catalog.stream(node.name),
          (frame) => Q.attempt(() => read(frame as unknown as F.Frame))
        )
      })
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
        : concat(node.inputs, catalog)
    case "GroupBy":
    case "Aggregate":
      return aggregate(node, catalog)
    default:
      return collected(node, catalog)
  }
}

/**
 * The optimised plan, with the tables it names more than once read once,
 * as frames: each run reads each table once.
 */
const prepare = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<Q.Node, DataFrameError> => {
  const repeated = [...Q.tables(plan)].flatMap(([name, n]) => n > 1 ? [name] : [])
  return Effect.forEach(
    repeated,
    (name) => Effect.map(Stream.runCollect(catalog.stream(name)), (frames) => [name, frames] as const)
  ).pipe(
    Effect.flatMap((entries) => {
      const read = new Map(entries)
      return Q.attempt(() =>
        Q.optimize(Q.mapTables(plan, (table) => {
          const frames = read.get(table.name) as ReadonlyArray<F.Frame> | undefined
          if (frames === undefined) return table
          if (frames.length === 0) return Q.values(emptyTable(table))
          const batches = frames.map(reader(table))
          return Q.values(batches.length === 1 ? batches[0] : F.concat(batches))
        }))
      )
    })
  )
}

/** The non-empty batches of a plan's result, after optimisation. @internal */
export const stream = (plan: Plan.Node, catalog: Catalog.Service): Batches =>
  Stream.unwrap(Effect.map(prepare(plan, catalog), (optimized) => batches(optimized, catalog))).pipe(
    Stream.filter((batch) => batch.length > 0)
  )

/** A plan's result as one frame, computed batch by batch. @internal */
export const collect = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<F.Frame, DataFrameError> =>
  Effect.flatMap(prepare(plan, catalog), (optimized) => collectFrames(batches(optimized, catalog), optimized))
