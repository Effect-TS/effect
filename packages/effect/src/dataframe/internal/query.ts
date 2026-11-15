/**
 * Running plans: resolving tables, rewriting the plan, and executing it.
 *
 * Execution is a post-order walk that calls the frame operations. Before it,
 * `optimize` rewrites the plan so less work happens:
 *
 * - predicates move below the operations they commute with (sorts,
 *   projections, derived columns they don't read, group keys, either side of
 *   a join, every input of a concat), and filters that meet merge;
 * - slices move below row-wise operations, and a slice of a sort becomes a
 *   top-k selection;
 * - columns nothing reads are dropped at the inputs, and derived columns and
 *   aggregates nothing reads are not computed.
 *
 * @internal
 */
import * as Effect from "../../Effect.ts"
import type { Catalog } from "../Catalog.ts"
import { DataFrameError } from "../DataFrame.ts"
import type * as Plan from "../Plan.ts"
import * as E from "./expr.ts"
import * as F from "./frame.ts"
import { conform } from "./schema.ts"
import * as Streaming from "./stream.ts"
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

/** @internal */
export const toError = (cause: unknown): DataFrameError =>
  new DataFrameError({ message: cause instanceof Error ? cause.message : String(cause), cause })

/** Runs a kernel computation, turning its failures into `DataFrameError`s. @internal */
export const attempt = <A>(f: () => A): Effect.Effect<A, DataFrameError> => {
  try {
    return Effect.succeed(f())
  } catch (cause) {
    if (cause instanceof V.DataFrameDefect) return Effect.fail(toError(cause))
    if (cause instanceof DataFrameError) return Effect.fail(cause)
    throw cause
  }
}

// -----------------------------------------------------------------------------
// Resolving tables
// -----------------------------------------------------------------------------

const values = (frame: F.Frame): Node => ({ _tag: "Values", frame: frame as any })
const frameOf = (node: { readonly frame: unknown }): F.Frame => node.frame as F.Frame

/** Replaces every `Table` with the catalog's frame. @internal */
export const resolve = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<Node, DataFrameError> => {
  const names = new Set<string>()
  const collect = (node: Plan.Node): void => {
    switch (node._tag) {
      case "Table":
        names.add(node.name)
        return
      case "Values":
        return
      case "Join":
        collect(node.left)
        collect(node.right)
        return
      case "Concat":
        for (const n of node.inputs) collect(n)
        return
      default:
        collect(node.input)
    }
  }
  collect(plan)
  if (names.size === 0) return Effect.succeed(plan as Node)
  return Effect.forEach([...names], (name) =>
    catalog.table(name).pipe(
      Effect.map((df) => [name, df as unknown as F.Frame] as const)
    )).pipe(
      Effect.flatMap((entries) => {
        const tables = new Map(entries)
        const replace = (node: Plan.Node): Node => {
          switch (node._tag) {
            case "Table": {
              const frame = tables.get(node.name)!
              return values(node.columns === undefined ? frame : conform(frame, node.columns))
            }
            case "Values":
              return node
            case "Join":
              return { ...node, left: replace(node.left), right: replace(node.right) }
            case "Concat":
              return { ...node, inputs: node.inputs.map(replace) }
            default:
              return { ...node, input: replace(node.input) } as Node
          }
        }
        return attempt(() => replace(plan))
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
 *
 * @internal
 */
export const names = (node: Node): ReadonlyArray<string> | undefined => {
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
    case "Explode":
      return names(node.input)
    case "Unnest":
      return undefined
    case "Unpivot":
      return [...node.index, node.variable, node.value]
  }
}

// -----------------------------------------------------------------------------
// Optimisation
// -----------------------------------------------------------------------------

/** @internal */
export const optimize = (plan: Node): Node => prune(pushSlices(pushFilters(plan)), undefined)

const conjuncts = (e: Plan.Expression): Array<Plan.Expression> =>
  e._tag === "Call" && e.fn === "and" && e.args.length === 2
    ? [...conjuncts(e.args[0]), ...conjuncts(e.args[1])]
    : [e]

const and = (es: ReadonlyArray<Plan.Expression>): Plan.Expression =>
  es.reduce((a, b) => ({ _tag: "Call", fn: "and", args: [a, b] }))

const subset = (a: Set<string>, b: ReadonlySet<string> | ReadonlyArray<string>): boolean => {
  const s = b instanceof Set ? b : new Set(b as ReadonlyArray<string>)
  for (const x of a) if (!s.has(x)) return false
  return true
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

const pushFilters = (node: Node): Node => {
  const optimized = mapChildren(node, pushFilters)
  return optimized._tag === "Filter" ? push(optimized.input, conjuncts(optimized.predicate)) : optimized
}

const filtered = (input: Node, predicates: ReadonlyArray<Plan.Expression>): Node =>
  predicates.length === 0 ? input : { _tag: "Filter", input, predicate: and(predicates) }

/** Places each predicate as deep as it can go below `node`. */
const push = (node: Node, predicates: ReadonlyArray<Plan.Expression>): Node => {
  if (predicates.length === 0) return node
  const split = (canPush: (refs: Set<string>, p: Plan.Expression) => boolean) => {
    const down: Array<Plan.Expression> = []
    const here: Array<Plan.Expression> = []
    for (const p of predicates) (canPush(E.columns(p), p) ? down : here).push(p)
    return { down, here }
  }
  switch (node._tag) {
    case "Filter":
      return push(node.input, [...conjuncts(node.predicate), ...predicates])
    case "Sort":
    case "DropNulls":
    case "Pick":
    case "Omit":
      return { ...node, input: push(node.input, predicates) }
    case "Rename": {
      const inverse = new Map(Object.entries(node.mapping).map(([from, to]) => [to, from]))
      const renamed = predicates.map((p) =>
        E.mapColumns(p, (name) => ({ _tag: "Column", name: inverse.get(name) ?? name }))
      )
      return { ...node, input: push(node.input, renamed) }
    }
    case "WithColumns": {
      if (!node.columns.every((c) => E.isRowWise(c.expression))) return filtered(node, predicates)
      const added = new Set(node.columns.map((c) => c.name))
      const { down, here } = split((refs) => [...refs].every((r) => !added.has(r)))
      return filtered({ ...node, input: push(node.input, down) }, here)
    }
    case "Select": {
      if (!node.columns.every((c) => E.isRowWise(c.expression))) return filtered(node, predicates)
      const byName = new Map(node.columns.map((c) => [c.name, c.expression]))
      const { down, here } = split((refs) => [...refs].every((r) => byName.get(r)?._tag === "Column"))
      const inlined = down.map((p) => E.mapColumns(p, (name) => byName.get(name)!))
      return filtered({ ...node, input: push(node.input, inlined) }, here)
    }
    case "Unique": {
      const columns = node.columns
      const { down, here } = split((refs) => columns === undefined || subset(refs, columns))
      return filtered({ ...node, input: push(node.input, down) }, here)
    }
    case "GroupBy": {
      const { down, here } = split((refs) => subset(refs, node.keys))
      return filtered({ ...node, input: push(node.input, down) }, here)
    }
    case "Concat":
      return { ...node, inputs: node.inputs.map((input) => push(input, predicates)) }
    case "Join": {
      const leftNames = names(node.left)
      const rightNames = names(node.right)
      if (node.how === "full" || leftNames === undefined || rightNames === undefined) return filtered(node, predicates)
      const left = new Set(leftNames)
      const right = new Set(rightNames)
      const toLeft: Array<Plan.Expression> = []
      const toRight: Array<Plan.Expression> = []
      const here: Array<Plan.Expression> = []
      for (const p of predicates) {
        const refs = E.columns(p)
        if (node.how === "inner" && subset(refs, node.on)) {
          toLeft.push(p)
          toRight.push(p)
        } else if (subset(refs, left)) toLeft.push(p)
        else if (node.how === "inner" && subset(refs, right)) toRight.push(p)
        else here.push(p)
      }
      return filtered({ ...node, left: push(node.left, toLeft), right: push(node.right, toRight) }, here)
    }
    default:
      return filtered(node, predicates)
  }
}

const isRowWise = (node: Node): boolean =>
  ((node._tag === "Select" || node._tag === "WithColumns") && node.columns.every((c) => E.isRowWise(c.expression))) ||
  node._tag === "Rename" || node._tag === "Pick" || node._tag === "Omit"

const pushSlices = (node: Node): Node => {
  const optimized = mapChildren(node, pushSlices)
  return optimized._tag === "Slice" ? slice(optimized.input, optimized.offset, optimized.length) : optimized
}

const slice = (input: Node, offset: number, length: number | undefined): Node => {
  if (isRowWise(input)) {
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

const union = (required: Required, ...more: ReadonlyArray<Iterable<string>>): Required => {
  if (required === undefined) return undefined
  const out = new Set(required)
  for (const m of more) for (const x of m) out.add(x)
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
      return { ...node, input: prune(node.input, union(required, E.columns(node.predicate))) }
    case "Sort":
    case "TopK":
      return { ...node, input: prune(node.input, union(required, exprColumns(node.keys.map((k) => k.expression)))) }
    case "Slice":
      return { ...node, input: prune(node.input, required) }
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
      const below = all.filter((n) => !drop.has(n) && (required === undefined || required.has(n)))
      return { ...node, input: prune(node.input, new Set(below.length === 0 ? all.slice(0, 1) : below)) }
    }
    case "Rename": {
      if (required === undefined) return { ...node, input: prune(node.input, undefined) }
      const inverse = new Map(Object.entries(node.mapping).map(([from, to]) => [to, from]))
      return { ...node, input: prune(node.input, new Set([...required].map((n) => inverse.get(n) ?? n))) }
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
      return `Select ${named(node.columns)}`
    case "WithColumns":
      return `WithColumns ${named(node.columns)}`
    case "Sort":
      return `Sort ${keys(node.keys)}${node.nullsLast ? " nulls last" : ""}`
    case "TopK":
      return `TopK ${node.limit} ${keys(node.keys)}${node.nullsLast ? " nulls last" : ""}`
    case "Slice":
      return `Slice offset ${node.offset}${node.length === undefined ? "" : ` length ${node.length}`}`
    case "Unique":
      return `Unique${node.columns === undefined ? "" : ` ${list(node.columns)}`}`
    case "DropNulls":
      return `DropNulls${node.columns === undefined ? "" : ` ${list(node.columns)}`}`
    case "Pick":
      return `Pick ${list(node.columns)}`
    case "Omit":
      return `Omit ${list(node.columns)}`
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
      return `Explode ${node.column}`
    case "Unnest":
      return `Unnest ${node.column}`
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
      const start = node.offset < 0 ? Math.max(0, n + node.offset) : Math.min(node.offset, n)
      return F.slice(input, start, node.length === undefined ? n : start + node.length)
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

/** The names of the tables a plan reads. @internal */
export const tables = (plan: Plan.Node): Set<string> => {
  const out = new Set<string>()
  const walk = (node: Node): void => {
    if (node._tag === "Table") out.add(node.name)
    for (const c of children(node)) walk(c)
  }
  walk(plan as Node)
  return out
}

/**
 * Resolves, optimises and runs a plan. Plans that read streamed tables run
 * batch by batch (see `stream.ts`).
 *
 * @internal
 */
export const collect = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<F.Frame, DataFrameError> =>
  [...tables(plan)].some(catalog.streaming)
    ? Streaming.collect(plan, catalog).pipe(
      Effect.withSpan("dataframe.Query", {
        attributes: { "dataframe.operations": count(plan), "dataframe.streaming": true }
      })
    )
    : resolve(plan, catalog).pipe(
      Effect.flatMap((resolved) => attempt(() => optimize(resolved))),
      Effect.flatMap(execute),
      Effect.withSpan("dataframe.Query", { attributes: { "dataframe.operations": count(plan) } })
    )

/** The optimised plan, as text. @internal */
export const explain = (plan: Plan.Node, catalog: Catalog.Service): Effect.Effect<string, DataFrameError> =>
  resolve(plan, catalog).pipe(Effect.flatMap((resolved) => attempt(() => show(optimize(resolved)))))

const count = (node: Plan.Node): number => 1 + children(node as Node).reduce((n, c) => n + count(c as Plan.Node), 0)
