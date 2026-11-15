/**
 * Partial aggregation: grouping a part of the rows (a row range, a stream
 * batch) into partial aggregates that combine with other parts' into the
 * aggregates of all rows.
 *
 * Sums, counts, minima, maxima, firsts and lasts combine by aggregating the
 * partials again; means combine from sums and counts; variances from counts,
 * means and M2 (Chan et al.). Medians and distinct counts don't combine.
 *
 * @internal
 */
import * as Agg from "./aggregate.ts"
import * as Hash from "./hash.ts"
import * as V from "./vector.ts"

/** @internal */
export type Part =
  | { readonly _tag: "vector"; readonly vector: V.Vector }
  | { readonly _tag: "mean"; readonly sum: Float64Array; readonly count: Float64Array }
  | {
    readonly _tag: "moments"
    readonly count: Float64Array
    readonly mean: Float64Array
    readonly m2: Float64Array
  }
  | { readonly _tag: "none" }

const reaggregated = new Set<Agg.AggFn>(["sum", "count", "len", "min", "max", "first", "last"])

/** Whether partial aggregates of `fn` combine. @internal */
export const combinable = (fn: Agg.AggFn): boolean =>
  reaggregated.has(fn) || fn === "mean" || fn === "std" || fn === "variance"

/** The partial aggregate of `fn` over `v` grouped by `g`. @internal */
export const partial = (fn: Agg.AggFn, v: V.Vector | undefined, g: Agg.Grouping): Part => {
  if (reaggregated.has(fn)) return { _tag: "vector", vector: Agg.aggregate(fn, v, g) }
  if (v === undefined) return V.fail(`${fn} needs an argument`)
  switch (fn) {
    case "mean": {
      const { count, sum } = Agg.sumCount(v, g)
      return { _tag: "mean", sum, count }
    }
    case "std":
    case "variance":
      return { _tag: "moments", ...Agg.moments(v, g) }
    default:
      return { _tag: "none" }
  }
}

/**
 * Combines the partials of several parts: `parts[c]` holds part `c`'s
 * partials for its groups, `ids` maps the concatenated groups of all parts
 * to `count` combined groups.
 *
 * @internal
 */
export const combine = (fn: Agg.AggFn, parts: ReadonlyArray<Part>, ids: Int32Array, count: number): Part => {
  const grouping: Agg.Grouping = { ids, count }
  if (reaggregated.has(fn)) {
    const vectors = parts.map((p) => (p as Extract<Part, { _tag: "vector" }>).vector)
    const merge = fn === "count" || fn === "len" ? "sum" : fn
    return { _tag: "vector", vector: Agg.aggregate(merge, V.concat(vectors), grouping) }
  }
  if (fn === "mean") {
    const sum = new Float64Array(count)
    const total = new Float64Array(count)
    let at = 0
    for (const p of parts as ReadonlyArray<Extract<Part, { _tag: "mean" }>>) {
      for (let j = 0; j < p.sum.length; j++) {
        sum[ids[at + j]] += p.sum[j]
        total[ids[at + j]] += p.count[j]
      }
      at += p.sum.length
    }
    return { _tag: "mean", sum, count: total }
  }
  if (fn === "std" || fn === "variance") {
    const n = new Float64Array(count)
    const mean = new Float64Array(count)
    const m2 = new Float64Array(count)
    let at = 0
    for (const p of parts as ReadonlyArray<Extract<Part, { _tag: "moments" }>>) {
      for (let j = 0; j < p.count.length; j++) {
        const nb = p.count[j]
        if (nb === 0) continue
        const g = ids[at + j]
        const na = n[g]
        const nab = na + nb
        const delta = p.mean[j] - mean[g]
        mean[g] += delta * nb / nab
        m2[g] += p.m2[j] + delta * delta * na * nb / nab
        n[g] = nab
      }
      at += p.count.length
    }
    return { _tag: "moments", count: n, mean, m2 }
  }
  return V.fail(`${fn} cannot be computed from partial aggregates`)
}

/** The aggregate column of a combined partial. @internal */
export const finish = (fn: Agg.AggFn, part: Part, input: V.Vector | undefined): V.Vector => {
  switch (part._tag) {
    case "vector":
      return part.vector
    case "mean":
      return Agg.meanFrom(input!.type, part.sum, part.count)
    case "moments":
      return Agg.varianceFrom(fn as "std" | "variance", input!.type, part.count, part.m2)
    case "none":
      return V.fail(`${fn} cannot be computed from partial aggregates`)
  }
}

// -----------------------------------------------------------------------------
// Grouped states
// -----------------------------------------------------------------------------

/** The groups of some rows: their keys (one row per group) and partial aggregates. @internal */
export interface State {
  readonly keys: ReadonlyArray<V.Vector>
  readonly parts: ReadonlyArray<Part>
  readonly count: number
}

/** Groups some rows. @internal */
export const group = (
  keys: ReadonlyArray<V.Vector>,
  inputs: ReadonlyArray<{ readonly fn: Agg.AggFn; readonly vector: V.Vector | undefined }>,
  n: number
): State => {
  const g = Hash.groups(keys, n)
  return {
    keys: keys.map((k) => V.take(k, g.firstRow)),
    parts: inputs.map(({ fn, vector }) => partial(fn, vector, g)),
    count: g.count
  }
}

/** Combines states, keeping groups in order of first appearance. @internal */
export const merge = (fns: ReadonlyArray<Agg.AggFn>, states: ReadonlyArray<State>): State => {
  if (states.length === 1) return states[0]
  const total = states.reduce((s, x) => s + x.count, 0)
  const keys = states[0].keys.map((_, k) => V.concat(states.map((s) => s.keys[k])))
  const g = Hash.groups(keys, total)
  return {
    keys: keys.map((k) => V.take(k, g.firstRow)),
    parts: fns.map((fn, a) => combine(fn, states.map((s) => s.parts[a]), g.ids, g.count)),
    count: g.count
  }
}
