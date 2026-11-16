/**
 * Running plans: resolving tables, rewriting the plan, and executing it.
 *
 * Execution is a post-order walk that calls the frame operations. Before it,
 * `optimize` rewrites the plan so less work happens:
 *
 * - row-wise predicates move below the row-wise operations they commute
 *   with (sorts, projections, derived columns they don't read, group keys,
 *   either side of a join), and filters that meet merge. A predicate only
 *   moves where it sees the values it sees in place: it stays above a concat
 *   (whose inputs may differ in type from their concatenation), and one on
 *   join keys moves to the left side only (the side whose keys the join
 *   keeps);
 * - slices move below row-wise operations that keep every row in place, and
 *   a slice of a sort becomes a top-k selection;
 * - columns nothing reads are dropped at the inputs, and derived columns and
 *   aggregates nothing reads are not computed.
 *
 * An operation is row-wise when its expressions are (see `isRowWise`): a
 * window in a predicate, a sort key or a derived column sees every row of its
 * input, so moving a filter or slice below it changes its result.
 *
 * @internal
 */
import * as Effect from "../../Effect.ts"
import type { Catalog } from "../Catalog.ts"
import { DataFrameError } from "../DataFrame.ts"
import type * as Plan from "../Plan.ts"
import * as E from "./expr.ts"
import * as F from "./frame.ts"
import * as Streaming from "./stream.ts"
import { conform } from "./table.ts"
import * as V from "./vector.ts"

/** A sort that only keeps its first `limit` rows. @internal */
export interface TopK {
  readonly _tag: "TopK"
  readonly input: Node
  readonly keys: ReadonlyArray<Plan.SortKey>
  readonly nullsLast: boolean
  readonly limit: number
}

/** Plans after optimisation. @internal */
export type Node =
  | Exclude<Plan.Node, { readonly input: Plan.Node } | Plan.Join | Plan.Concat>
  | Rebuild<Extract<Plan.Node, { readonly input: Plan.Node }>>
  | Omit<Plan.Join, "left" | "right"> & { readonly left: Node; readonly right: Node }
  | Omit<Plan.Concat, "inputs"> & { readonly inputs: ReadonlyArray<Node> }
  | TopK

type Rebuild<N> = N extends { readonly input: Plan.Node } ? Omit<N, "input"> & { readonly input: Node } : never

/** Runs a kernel computation, turning its failures into `DataFrameError`s. @internal */
export const attempt = <A>(f: () => A): Effect.Effect<A, DataFrameError> => {
  try {
    return Effect.succeed(f())
  } catch (cause) {
    if (cause instanceof V.DataFrameDefect) return Effect.fail(new DataFrameError({ message: cause.message, cause }))
    if (cause instanceof DataFrameError) return Effect.fail(cause)
    throw cause
  }
}

/** Runs a kernel computation, throwing its failures as `DataFrameError`s. @internal */
export const unsafe = <A>(f: () => A): A => {
  try {
    return f()
  } catch (cause) {
    throw cause instanceof V.DataFrameDefect ? new DataFrameError({ message: cause.message, cause }) : cause
  }
}

/** @internal */
export const children = (node: Node): ReadonlyArray<Node> => {
  switch (node._tag) {
    case "Values":
    case "Table":
      return []
    case "Join":
      return [node.left, node.right]
    case "Concat":
      return node.inputs
    default:
      return [node.input]
  }
}

const mapChildren = (node: Node, f: (child: Node) => Node): Node => {
  switch (node._tag) {
    case "Values":
    case "Table":
      return node
    case "Join":
      return { ...node, left: f(node.left), right: f(node.right) }
    case "Concat":
      return { ...node, inputs: node.inputs.map(f) }
    default:
      return { ...node, input: f(node.input) } as Node
  }
}

// -----------------------------------------------------------------------------
// Resolving tables
// -----------------------------------------------------------------------------

/** A frame as a plan node. @internal */
export const values = (frame: F.Frame): Node => ({ _tag: "Values", frame: frame as any })
const frameOf = (node: { readonly frame: unknown }): F.Frame => node.frame as F.Frame

/** How many times a plan names each table. @internal */
export const tables = (plan: Plan.Node): Map<string, number> => {
  const out = new Map<string, number>()
  const walk = (node: Node): void => {
    if (node._tag === "Table") out.set(node.name, (out.get(node.name) ?? 0) + 1)
    for (const c of children(node)) walk(c)
  }
  walk(plan as Node)
  return out
}

/** A plan with each `Table` replaced by `f` of it. @internal */
export const mapTables = (plan: Node, f: (table: Plan.Table) => Node): Node => {
  const replace = (node: Node): Node => node._tag === "Table" ? f(node) : mapChildren(node, replace)
  return replace(plan)
}

/** A table's frame, checked against and narrowed to its declared columns. */
const tableValues = (table: Plan.Table, frame: F.Frame): Node =>
  values(table.columns === undefined ? frame : conform(frame, table.columns, table.checks))

/** Replaces every `Table` with the catalog's frame, reading each table once. */
const resolve = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<Node, DataFrameError> => {
  const names = [...tables(plan).keys()]
  if (names.length === 0) return Effect.succeed(plan as Node)
  return Effect.forEach(
    names,
    (name) => Effect.map(catalog.table(name), (df) => [name, df as unknown as F.Frame] as const)
  )
    .pipe(
      Effect.flatMap((entries) => {
        const frames = new Map(entries)
        return attempt(() => mapTables(plan as Node, (table) => tableValues(table, frames.get(table.name)!)))
      })
    )
}

// -----------------------------------------------------------------------------
// Column names
// -----------------------------------------------------------------------------

const namesCache = new WeakMap<object, { readonly names: ReadonlyArray<string> | undefined }>()

/**
 * The output column names of a resolved plan, or `undefined` when they
 * depend on the data (a pivot without declared columns).
 */
const names = (node: Node): ReadonlyArray<string> | undefined => {
  const cached = namesCache.get(node)
  if (cached !== undefined) return cached.names
  const result = computeNames(node)
  namesCache.set(node, { names: result })
  return result
}

const computeNames = (node: Node): ReadonlyArray<string> | undefined => {
  switch (node._tag) {
    case "Values":
      return frameOf(node).columns.map((c) => c.name)
    case "Table":
      return node.columns?.map((c) => c.name)
    case "Filter":
    case "Sort":
    case "TopK":
    case "Slice":
    case "Unique":
    case "DropNulls":
    case "Explode":
      return names(node.input)
    case "Select":
      return node.columns.map((c) => c.name)
    case "WithColumns": {
      const input = names(node.input)
      if (input === undefined) return undefined
      const existing = new Set(input)
      return [...input, ...node.columns.map((c) => c.name).filter((n) => !existing.has(n))]
    }
    case "Pick":
      return node.columns
    case "Omit": {
      const drop = new Set(node.columns)
      return names(node.input)?.filter((n) => !drop.has(n))
    }
    case "Rename":
      return names(node.input)?.map((n) => node.mapping[n] ?? n)
    case "GroupBy":
      return [...node.keys, ...node.aggregates.map((a) => a.name)]
    case "Aggregate":
      return node.aggregates.map((a) => a.name)
    case "Join": {
      const left = names(node.left)
      if (node.how === "semi" || node.how === "anti") return left
      const right = names(node.right)
      if (left === undefined || right === undefined) return undefined
      const on = new Set(node.on)
      return [...left, ...right.filter((n) => !on.has(n))]
    }
    case "Concat":
      return node.inputs.length === 0 ? [] : names(node.inputs[0])
    case "Pivot":
      return node.columns === undefined ? undefined : [...node.index, ...node.columns]
    case "Unnest":
      return undefined
    case "Unpivot":
      return [...node.index, node.variable, node.value]
  }
}

// -----------------------------------------------------------------------------
// Optimisation
// -----------------------------------------------------------------------------

/** The expressions an operation evaluates over its input rows. */
const expressions = (node: Node): ReadonlyArray<Plan.Expression> => {
  switch (node._tag) {
    case "Filter":
      return [node.predicate]
    case "Select":
    case "WithColumns":
      return node.columns.map((c) => c.expression)
    case "Sort":
    case "TopK":
      return node.keys.map((k) => k.expression)
    case "GroupBy":
    case "Aggregate":
      return node.aggregates.map((a) => a.expression._tag === "AggregateCall" ? a.expression.arg : a.expression)
        .filter((e) => e !== undefined)
    default:
      return []
  }
}

/**
 * Whether an operation's expressions are row-wise (for aggregations, their
 * arguments). Only such operations let filters and slices move below them,
 * and run batch by batch.
 *
 * @internal
 */
export const isRowWise = (node: Node): boolean => expressions(node).every(E.isRowWise)

/** @internal */
export const optimize = (plan: Node): Node => prune(pushSlices(pushFilters(plan)), undefined)

const conjuncts = (e: Plan.Expression): Array<Plan.Expression> =>
  e._tag === "Call" && e.fn === "and" && e.args.length === 2
    ? [...conjuncts(e.args[0]), ...conjuncts(e.args[1])]
    : [e]

const and = (es: ReadonlyArray<Plan.Expression>): Plan.Expression =>
  es.reduce((a, b) => ({ _tag: "Call", fn: "and", args: [a, b] }))

const subset = (a: Set<string>, b: ReadonlySet<string>): boolean => {
  for (const x of a) if (!b.has(x)) return false
  return true
}

const inverse = (mapping: { readonly [from: string]: string }): Map<string, string> =>
  new Map(Object.entries(mapping).map(([from, to]) => [to, from]))

const pushFilters = (node: Node): Node => {
  const optimized = mapChildren(node, pushFilters)
  return optimized._tag === "Filter" ? push(optimized.input, conjuncts(optimized.predicate)) : optimized
}

const filtered = (input: Node, predicates: ReadonlyArray<Plan.Expression>): Node =>
  predicates.length === 0 ? input : { _tag: "Filter", input, predicate: and(predicates) }

/**
 * Places each predicate as deep as it can go below `node`. Predicates that
 * are not row-wise (windows) depend on exactly the rows they see, so a set
 * containing one stays where it is.
 */
const push = (node: Node, predicates: ReadonlyArray<Plan.Expression>): Node => {
  if (predicates.length === 0) return node
  if (!predicates.every(E.isRowWise) || !isRowWise(node)) return filtered(node, predicates)
  /** Pushes the predicates reading only columns that pass `ok` into the input, rewritten. */
  const below = (ok: (name: string) => boolean, rewrite = (p: Plan.Expression) => p): Node => {
    const down: Array<Plan.Expression> = []
    const here: Array<Plan.Expression> = []
    for (const p of predicates) ([...E.columns(p)].every(ok) ? down : here).push(p)
    const input = push((node as { readonly input: Node }).input, down.map(rewrite))
    return filtered({ ...node, input } as Node, here)
  }
  switch (node._tag) {
    case "Filter":
      return push(node.input, [...conjuncts(node.predicate), ...predicates])
    case "Sort":
    case "DropNulls":
    case "Pick":
    case "Omit":
      return below(() => true)
    case "Rename": {
      const from = inverse(node.mapping)
      return below(() => true, (p) => E.mapColumns(p, (name) => ({ _tag: "Column", name: from.get(name) ?? name })))
    }
    case "WithColumns": {
      const added = new Set(node.columns.map((c) => c.name))
      return below((r) => !added.has(r))
    }
    case "Select": {
      const byName = new Map(node.columns.map((c) => [c.name, c.expression]))
      return below((r) => byName.get(r)?._tag === "Column", (p) => E.mapColumns(p, (name) => byName.get(name)!))
    }
    case "Unique": {
      const columns = node.columns
      return below((r) => columns === undefined || columns.includes(r))
    }
    case "GroupBy":
      return below((r) => node.keys.includes(r))
    case "Join": {
      const leftNames = names(node.left)
      const rightNames = names(node.right)
      if (node.how === "full" || leftNames === undefined || rightNames === undefined) return filtered(node, predicates)
      const left = new Set(leftNames)
      // The join keeps the left side's keys, which the right side's may differ from in type.
      const right = new Set(rightNames.filter((n) => !node.on.includes(n)))
      const toLeft: Array<Plan.Expression> = []
      const toRight: Array<Plan.Expression> = []
      const here: Array<Plan.Expression> = []
      for (const p of predicates) {
        const refs = E.columns(p)
        if (subset(refs, left)) toLeft.push(p)
        else if (node.how === "inner" && subset(refs, right)) toRight.push(p)
        else here.push(p)
      }
      return filtered({ ...node, left: push(node.left, toLeft), right: push(node.right, toRight) }, here)
    }
    default:
      return filtered(node, predicates)
  }
}

/** One output row per input row, in order, so a slice can move below it. */
const keepsRows = (node: Node): boolean =>
  (node._tag === "Select" || node._tag === "WithColumns" || node._tag === "Rename" || node._tag === "Pick" ||
    node._tag === "Omit") && isRowWise(node)

const pushSlices = (node: Node): Node => {
  const optimized = mapChildren(node, pushSlices)
  return optimized._tag === "Slice" ? slice(optimized.input, optimized.offset, optimized.length) : optimized
}

const slice = (input: Node, offset: number, length: number | undefined): Node => {
  if (keepsRows(input)) {
    return { ...input, input: slice((input as { readonly input: Node }).input, offset, length) } as Node
  }
  if (input._tag === "Slice" && input.offset >= 0 && offset >= 0) {
    const inner = input.length === undefined ? Infinity : input.length
    const remaining = Math.max(0, inner - offset)
    const combined = Math.min(remaining, length === undefined ? Infinity : length)
    return slice(input.input, input.offset + offset, combined === Infinity ? undefined : combined)
  }
  if (input._tag === "Sort" && offset >= 0 && length !== undefined) {
    const topK: Node = {
      _tag: "TopK",
      input: input.input,
      keys: input.keys,
      nullsLast: input.nullsLast,
      limit: offset + length
    }
    return offset === 0 ? topK : { _tag: "Slice", input: topK, offset, length }
  }
  return { _tag: "Slice", input, offset, length }
}

type Required = ReadonlySet<string> | undefined

const union = (required: Required, more: Iterable<string>): Required => {
  if (required === undefined) return undefined
  const out = new Set(required)
  for (const x of more) out.add(x)
  return out
}

const exprColumns = (es: ReadonlyArray<Plan.Expression>): Set<string> => {
  const out = new Set<string>()
  for (const e of es) E.columns(e, out)
  return out
}

/** Keeps at least one item, so a frame never loses its row count. */
const keep = <A>(all: ReadonlyArray<A>, wanted: (a: A) => boolean): ReadonlyArray<A> => {
  const kept = all.filter(wanted)
  return kept.length === 0 && all.length > 0 ? [all[0]] : kept
}

/** Drops columns nothing reads. `required` undefined means all. */
const prune = (node: Node, required: Required): Node => {
  switch (node._tag) {
    case "Values": {
      if (required === undefined) return node
      const all = names(node)!
      const kept = keep(all, (n) => required.has(n))
      return kept.length === all.length ? node : { _tag: "Pick", input: node, columns: kept }
    }
    case "Table":
      return node
    case "Filter":
    case "Sort":
    case "TopK":
    case "Slice":
      return { ...node, input: prune(node.input, union(required, exprColumns(expressions(node)))) }
    case "Unique":
    case "DropNulls":
      return {
        ...node,
        input: prune(node.input, node.columns === undefined ? undefined : union(required, node.columns))
      }
    case "Select": {
      const columns = required === undefined ? node.columns : keep(node.columns, (c) => required.has(c.name))
      return { ...node, columns, input: prune(node.input, exprColumns(columns.map((c) => c.expression))) }
    }
    case "WithColumns": {
      if (required === undefined) return { ...node, input: prune(node.input, undefined) }
      const columns = node.columns.filter((c) => required.has(c.name))
      const produced = new Set(columns.map((c) => c.name))
      const below = new Set([...required].filter((n) => !produced.has(n)))
      const input = prune(node.input, union(below, exprColumns(columns.map((c) => c.expression))))
      return columns.length === 0 ? input : { ...node, columns, input }
    }
    case "Pick": {
      const columns = required === undefined ? node.columns : keep(node.columns, (c) => required.has(c))
      return { ...node, columns, input: prune(node.input, new Set(columns)) }
    }
    case "Omit": {
      const all = names(node.input)
      if (all === undefined) return { ...node, input: prune(node.input, undefined) }
      const drop = new Set(node.columns)
      const below = keep(all, (n) => !drop.has(n) && (required === undefined || required.has(n)))
      return { ...node, input: prune(node.input, new Set(below)) }
    }
    case "Rename": {
      if (required === undefined) return { ...node, input: prune(node.input, undefined) }
      const from = inverse(node.mapping)
      return { ...node, input: prune(node.input, new Set([...required].map((n) => from.get(n) ?? n))) }
    }
    case "GroupBy": {
      const aggregates = required === undefined
        ? node.aggregates
        : node.aggregates.filter((a) => required.has(a.name))
      return {
        ...node,
        aggregates,
        input: prune(node.input, new Set([...node.keys, ...exprColumns(aggregates.map((a) => a.expression))]))
      }
    }
    case "Aggregate": {
      const aggregates = required === undefined
        ? node.aggregates
        : keep(node.aggregates, (a) => required.has(a.name))
      return { ...node, aggregates, input: prune(node.input, exprColumns(aggregates.map((a) => a.expression))) }
    }
    case "Join": {
      const side = (input: Node): Required => {
        const all = names(input)
        if (required === undefined || all === undefined) return undefined
        const available = new Set(all)
        return new Set([...node.on, ...[...required].filter((n) => available.has(n))])
      }
      const right = node.how === "semi" || node.how === "anti" ? new Set(node.on) : side(node.right)
      return { ...node, left: prune(node.left, side(node.left)), right: prune(node.right, right) }
    }
    case "Concat":
      return { ...node, inputs: node.inputs.map((input) => prune(input, required)) }
    case "Pivot":
      return { ...node, input: prune(node.input, new Set([...node.index, node.on, node.values])) }
    case "Explode":
      return { ...node, input: prune(node.input, union(required, [node.column])) }
    case "Unnest":
      return { ...node, input: prune(node.input, undefined) }
    case "Unpivot":
      return { ...node, input: prune(node.input, new Set([...node.index, ...node.on])) }
  }
}

// -----------------------------------------------------------------------------
// Explaining
// -----------------------------------------------------------------------------

const list = (items: ReadonlyArray<string>) => `[${items.join(", ")}]`
const named = (items: ReadonlyArray<Plan.Named>) => list(items.map((c) => `${c.name} = ${E.show(c.expression)}`))
const keys = (items: ReadonlyArray<Plan.SortKey>) =>
  list(items.map((k) => `${k.descending ? "desc" : "asc"}(${E.show(k.expression)})`))

const line = (node: Node): string => {
  switch (node._tag) {
    case "Values": {
      const f = frameOf(node)
      return `Values ${f.length} rows ${list(f.columns.map((c) => c.name))}`
    }
    case "Table":
      return `Table ${node.name}${node.columns === undefined ? "" : ` ${list(node.columns.map((c) => c.name))}`}`
    case "Filter":
      return `Filter ${E.show(node.predicate)}`
    case "Select":
    case "WithColumns":
      return `${node._tag} ${named(node.columns)}`
    case "Sort":
      return `Sort ${keys(node.keys)}${node.nullsLast ? " nulls last" : ""}`
    case "TopK":
      return `TopK ${node.limit} ${keys(node.keys)}${node.nullsLast ? " nulls last" : ""}`
    case "Slice":
      return `Slice offset ${node.offset}${node.length === undefined ? "" : ` length ${node.length}`}`
    case "Unique":
    case "DropNulls":
      return `${node._tag}${node.columns === undefined ? "" : ` ${list(node.columns)}`}`
    case "Pick":
    case "Omit":
      return `${node._tag} ${list(node.columns)}`
    case "Rename":
      return `Rename ${list(Object.entries(node.mapping).map(([a, b]) => `${a} -> ${b}`))}`
    case "GroupBy":
      return `GroupBy ${list(node.keys)} ${named(node.aggregates)}`
    case "Aggregate":
      return `Aggregate ${named(node.aggregates)}`
    case "Join":
      return `Join ${node.how} on ${list(node.on)}`
    case "Concat":
      return `Concat`
    case "Pivot":
      return `Pivot on ${node.on} index ${list(node.index)} ${node.aggregate}(${node.values})${
        node.columns === undefined ? "" : ` columns ${list(node.columns)}`
      }`
    case "Unpivot":
      return `Unpivot ${list(node.on)} index ${list(node.index)} as ${node.variable}, ${node.value}`
    case "Explode":
    case "Unnest":
      return `${node._tag} ${node.column}`
  }
}

/** A plan as an indented tree, one operation per line. @internal */
export const show = (node: Node | Plan.Node, indent = ""): string =>
  [indent + line(node as Node), ...children(node as Node).map((c) => show(c, indent + "  "))].join("\n")

// -----------------------------------------------------------------------------
// Execution
// -----------------------------------------------------------------------------

const exprs = (items: ReadonlyArray<Plan.Named>): { [name: string]: Plan.Expression } => {
  const out: { [name: string]: Plan.Expression } = {}
  for (const c of items) out[c.name] = c.expression
  return out
}

const sortKeys = (items: ReadonlyArray<Plan.SortKey>) =>
  items.map((k) => ({ node: k.expression, descending: k.descending }))

/** Runs one operation over its inputs. @internal */
export const step = (node: Node, inputs: ReadonlyArray<F.Frame>): F.Frame => {
  const input = inputs[0]
  switch (node._tag) {
    case "Values":
      return frameOf(node)
    case "Table":
      return V.fail(`table ${node.name} is not resolved`)
    case "Filter":
      return F.filter(input, node.predicate)
    case "Select":
      return F.select(input, exprs(node.columns))
    case "WithColumns":
      return F.withColumns(input, exprs(node.columns))
    case "Sort":
      return F.sort(input, sortKeys(node.keys), node.nullsLast)
    case "TopK":
      return F.sort(input, sortKeys(node.keys), node.nullsLast, node.limit)
    case "Slice": {
      const n = input.length
      const from = node.offset < 0 ? n + node.offset : node.offset
      const start = Math.min(Math.max(from, 0), n)
      const end = node.length === undefined ? n : Math.min(Math.max(from + node.length, start), n)
      return F.slice(input, start, end)
    }
    case "Unique":
      return F.unique(input, node.columns)
    case "DropNulls":
      return F.dropNulls(input, node.columns)
    case "Pick":
      return F.pick(input, node.columns)
    case "Omit":
      return F.omit(input, node.columns)
    case "Rename":
      return F.rename(input, node.mapping)
    case "GroupBy":
      return F.groupBy(input, node.keys, exprs(node.aggregates))
    case "Aggregate":
      return F.aggregate(input, exprs(node.aggregates))
    case "Join":
      return F.join(inputs[0], inputs[1], node.on, node.how)
    case "Concat":
      return inputs.length === 0 ? V.fail("concat needs at least one input") : F.concat(inputs)
    case "Pivot":
      return F.pivot(input, node)
    case "Unpivot":
      return F.unpivot(input, node)
    case "Explode":
      return F.explode(input, node.column)
    case "Unnest":
      return F.unnest(input, node.column)
  }
}

/** Yield to other fibers when an operation ran for longer than this (ms). */
const SLICE = 10

/** Runs a resolved plan, yielding between long-running operations. @internal */
export const execute = (plan: Node): Effect.Effect<F.Frame, DataFrameError> => {
  let last = performance.now()
  const run = (node: Node): Effect.Effect<F.Frame, DataFrameError> =>
    Effect.flatMap(
      Effect.forEach(children(node), run),
      (inputs) => {
        const result = attempt(() => step(node, inputs))
        const now = performance.now()
        if (now - last < SLICE) return result
        last = now
        return Effect.tap(result, () => Effect.yieldNow)
      }
    )
  return run(plan)
}

/**
 * Resolves, optimises and runs a plan. Plans that read streamed tables run
 * batch by batch (see `stream.ts`).
 *
 * @internal
 */
export const collect = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<F.Frame, DataFrameError> => {
  const streaming = isStreaming(plan, catalog)
  const result = streaming
    ? Streaming.collect(plan, catalog)
    : resolve(plan, catalog).pipe(
      Effect.flatMap((resolved) => attempt(() => optimize(resolved))),
      Effect.flatMap(execute)
    )
  return result.pipe(Effect.withSpan("dataframe.Query", {
    attributes: { "dataframe.operations": count(plan), ...(streaming ? { "dataframe.streaming": true } : {}) }
  }))
}

/**
 * The optimised plan that runs, as text. Plans over streamed tables show
 * them as `Table` nodes, without reading them.
 *
 * @internal
 */
export const explain = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<string, DataFrameError> =>
  Effect.flatMap(
    isStreaming(plan, catalog) ? Effect.succeed(plan as Node) : resolve(plan, catalog),
    (resolved) => attempt(() => show(optimize(resolved)))
  )

const isStreaming = (plan: Plan.Node, catalog: Catalog.Service): boolean =>
  [...tables(plan).keys()].some(catalog.streaming)

const count = (node: Plan.Node): number => 1 + children(node as Node).reduce((n, c) => n + count(c as Plan.Node), 0)
