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
 * Every batch of a node has the column types of the node's whole result: a
 * table's batches (converted to its declared columns, if any) must share the
 * columns of its first, and a concatenation converts its inputs to their
 * common types.
 *
 * A node has at least one batch, possibly without rows, unless its columns
 * are unknown: they depend on a table without declared columns of which no
 * batch was read. Where no batch is read, a declared table's result is its
 * declared columns without rows. Operations that need unknown columns
 * (collecting, concatenating, joining, aggregating) fail, asking for them to
 * be declared.
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
import * as Agg from "./aggregate.ts"
import * as D from "./dtype.ts"
import * as E from "./expr.ts"
import * as F from "./frame.ts"
import * as Partial from "./partial.ts"
import * as Q from "./query.ts"
import { arrowType, conform } from "./schema.ts"
import * as V from "./vector.ts"

type Batches = Stream.Stream<F.Frame, DataFrameError>

/** Where a run reads the batches of its tables. */
type Tables = Pick<Catalog.Service, "stream">

const reads = (node: Q.Node): boolean => node._tag === "Table" || Q.children(node).some(reads)

/**
 * What a node's columns depend on besides declared ones, so that they are
 * unknown without reading its tables: tables without declared columns, and
 * pivots without declared columns over tables (they take theirs from the
 * values).
 */
const undeclared = (node: Q.Node): ReadonlyArray<string> => [
  ...(node._tag === "Table" && node.columns === undefined ? [`table ${JSON.stringify(node.name)}`] : []),
  ...(node._tag === "Pivot" && node.columns === undefined && reads(node.input)
    ? [`the pivot on ${JSON.stringify(node.on)}`]
    : []),
  ...Q.children(node).flatMap(undeclared)
]

/**
 * The result of a node that reads no batch of its tables, as one batch: the
 * node run over its tables' declared columns without rows. No batch when its
 * columns are unknown.
 */
const unread = (node: Q.Node): Batches => {
  if (undeclared(node).length > 0) return Stream.empty
  const empty = (n: Q.Node): Q.Node => {
    switch (n._tag) {
      case "Table":
        return Q.values(F.empty(n.columns!.map((c) => ({ name: c.name, type: arrowType(c), nullable: c.nullable }))))
      case "Values":
        return n
      case "Join":
        return { ...n, left: empty(n.left), right: empty(n.right) }
      case "Concat":
        return { ...n, inputs: n.inputs.map(empty) }
      default:
        return { ...n, input: empty((n as { readonly input: Q.Node }).input) } as Q.Node
    }
  }
  return Stream.fromEffect(Effect.flatMap(Q.attempt(() => empty(node)), Q.execute))
}

/** Fails for a node without batches, whose columns are unknown. */
const unknownColumns = (node: Q.Node): Effect.Effect<never, DataFrameError> =>
  Q.attempt(() =>
    V.fail(
      `the columns of a result without rows are unknown, as no batch they depend on was read: ` +
        `declare the columns of ${[...new Set(undeclared(node))].join(" and ")}`
    )
  )

const collectFrames = (batches: Batches, node: Q.Node): Effect.Effect<F.Frame, DataFrameError> =>
  Effect.flatMap(Stream.runCollect(batches), (frames) =>
    frames.length === 0
      ? unknownColumns(node)
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
const collected = (node: Q.Node, catalog: Tables): Batches =>
  Stream.fromEffect(
    Effect.flatMap(
      Effect.forEach(Q.children(node), (c) => collectFrames(batches(c, catalog), c)),
      (inputs) => Q.attempt(() => Q.step(node, inputs))
    )
  )

const aggregate = (
  node: Extract<Q.Node, { readonly _tag: "GroupBy" | "Aggregate" }>,
  catalog: Tables
): Batches => {
  const keys = node._tag === "GroupBy" ? node.keys : []
  const specs = node.aggregates.map(({ expression, name }) => {
    if (expression._tag !== "AggregateCall") return V.fail(`${name} is not an aggregate expression`)
    return { name, fn: Agg.kernel(expression.fn, expression.arg), arg: expression.arg }
  })
  if (!Q.isRowWise(node) || !specs.every((s) => Partial.combinable(s.fn))) {
    return collected(node, catalog)
  }
  const fns = specs.map((s) => s.fn)
  return Stream.suspend(() => {
    // Whether any batch's key column may hold nulls.
    const nullable = keys.map(() => false)
    return Stream.fromEffect(
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
          state === undefined ? unknownColumns(node.input) : Q.attempt(() => {
            const keyColumns = keys.map((k, i) => new F.Column(k, state.keys[i], undefined, nullable[i]))
            const columns = specs.map((s, a) =>
              new F.Column(s.name, Partial.finish(s.fn, state.parts[a], state.types[a]), undefined)
            )
            return F.make([...keyColumns, ...columns], state.count)
          })
        )
      )
    )
  })
}

/**
 * The inputs' batches one after the other, converted to the inputs' common
 * types. An input's first batch gives its types, so every input starts before
 * the first batch is emitted.
 */
const concat = (inputs: ReadonlyArray<Q.Node>, catalog: Tables): Batches =>
  Stream.unwrap(Effect.gen(function*() {
    const peeled = yield* Effect.forEach(
      inputs,
      (input) =>
        Effect.flatMap(Stream.peel(batches(input, catalog), Sink.head()), ([first, rest]) =>
          Option.isSome(first)
            ? Effect.succeed({ first: first.value, rest: Stream.concat(Stream.succeed(first.value), rest) })
            : unknownColumns(input))
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
  Stream.suspend(() => {
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
 * The batches of a node's result: at least one unless its columns are
 * unknown. Batches without rows stay, so a result whose rows are all dropped
 * still has the types of its columns.
 */
const batches = (node: Q.Node, catalog: Tables): Batches => {
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
      }).pipe(Stream.orElseIfEmpty(() => unread(node)))
    case "Values":
      return Stream.succeed(node.frame as unknown as F.Frame)
    case "Slice":
      if (node.length === 0) return unread(node)
      return node.offset >= 0 ? slice(batches(node.input, catalog), node.offset, node.length) : collected(node, catalog)
    case "TopK":
      return node.limit === 0 ? unread(node) : collected(node, catalog)
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
 * The optimised plan, and its tables with those it names more than once read
 * into memory on first use: each run reads each table at most once, and only
 * if a node needs its batches.
 */
const prepare = (
  plan: Plan.Node,
  catalog: Catalog.Service
): Effect.Effect<readonly [Q.Node, Tables], DataFrameError> =>
  Effect.gen(function*() {
    const optimized = yield* Q.attempt(() => Q.optimize(plan as Q.Node))
    const read = new Map<string, ReturnType<Tables["stream"]>>()
    for (const [name, n] of Q.tables(optimized as Plan.Node)) {
      if (n > 1) {
        read.set(
          name,
          Stream.unwrap(Effect.map(yield* Effect.cached(Stream.runCollect(catalog.stream(name))), Stream.fromIterable))
        )
      }
    }
    return [optimized, { stream: (name: string) => read.get(name) ?? catalog.stream(name) }] as const
  })

/** The non-empty batches of a plan's result, after optimisation. @internal */
export const stream = (plan: Plan.Node, catalog: Catalog.Service): Batches =>
  Stream.unwrap(Effect.map(prepare(plan, catalog), ([optimized, read]) => batches(optimized, read))).pipe(
    Stream.filter((batch) => batch.length > 0)
  )

/** A plan's result as one frame, computed batch by batch. @internal */
export const collect = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<F.Frame, DataFrameError> =>
  Effect.flatMap(
    prepare(plan, catalog),
    ([optimized, read]) => collectFrames(batches(optimized, read), optimized)
  )
