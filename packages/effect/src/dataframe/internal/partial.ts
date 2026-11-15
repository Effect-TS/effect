/**
 * Partial aggregation: grouping a part of the rows (a row range, a stream
 * batch) into partial aggregates that combine with other parts' into the
 * aggregates of all rows.
 *
 * Counts, minima, maxima, firsts and lasts combine by aggregating the
 * partials again; sums combine from per-part sums (exact for integers and
 * decimals); means from sums and counts; variances from counts, means and
 * M2 (Chan et al.). Medians and distinct counts don't combine.
 *
 * Parts may differ in type (stream batches of untyped tables). The result
 * is the aggregate of the concatenated rows: each state keeps the smallest
 * and largest input value converted to the inputs' common type, so a value
 * that type can't hold fails as concatenating would, and `finish` gives
 * the result the type and overflow of that common type. Float results may
 * differ in rounding, as float sums of the same values in another order do.
 *
 * @internal
 */
import type * as S from "../../arrow/ArrowSchema.ts"
import * as Agg from "./aggregate.ts"
import * as Dec from "./decimal.ts"
import * as D from "./dtype.ts"
import * as Hash from "./hash.ts"
import * as K from "./kernels.ts"
import * as T from "./temporal.ts"
import * as V from "./vector.ts"

/** @internal */
export type Part =
  | { readonly _tag: "vector"; readonly vector: V.Vector }
  | { readonly _tag: "sums"; readonly sums: Agg.Sums }
  | { readonly _tag: "mean"; readonly sum: Float64Array; readonly count: Float64Array }
  | {
    readonly _tag: "moments"
    readonly count: Float64Array
    readonly mean: Float64Array
    readonly m2: Float64Array
  }
  | { readonly _tag: "none" }

const scaleOf = (t: S.DataType): number => (Dec.isDecimal(t) ? t.scale : 0)

const reaggregated = new Set<Agg.AggFn>(["count", "len", "min", "max", "first", "last"])

/** Whether partial aggregates of `fn` combine. @internal */
export const combinable = (fn: Agg.AggFn): boolean =>
  reaggregated.has(fn) || fn === "sum" || fn === "mean" || fn === "std" || fn === "variance"

/** The partial aggregate of `fn` over `v` grouped by `g`. @internal */
export const partial = (fn: Agg.AggFn, v: V.Vector | undefined, g: Agg.Grouping): Part => {
  if (reaggregated.has(fn)) return { _tag: "vector", vector: Agg.aggregate(fn, v, g) }
  if (v === undefined) return V.fail(`${fn} needs an argument`)
  switch (fn) {
    case "sum":
      return { _tag: "sums", sums: Agg.sums(v, g) }
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

/** Sums of parts whose inputs have `types`, in their common type `type`. */
const combineSums = (
  parts: ReadonlyArray<Agg.Sums>,
  types: ReadonlyArray<S.DataType>,
  type: S.DataType,
  ids: Int32Array,
  count: number
): Agg.Sums => {
  const float = type._tag === "Float"
  const out = float ? new Float64Array(count) : new Array<bigint>(count).fill(BigInt(0))
  let at = 0
  parts.forEach((p, c) => {
    if (T.isTemporal(type) && !D.sameType(types[c], type)) {
      V.fail(`sums of ${D.describe(types[c])} and ${D.describe(type)} values don't combine`)
    }
    if (float) {
      const scale = 10 ** scaleOf(types[c])
      for (let j = 0; j < p.length; j++) (out as Float64Array)[ids[at + j]] += Number(p[j]) / scale
    } else {
      const factor = Dec.pow10(scaleOf(type) - scaleOf(types[c]))
      for (let j = 0; j < p.length; j++) (out as Array<bigint>)[ids[at + j]] += (p[j] as bigint) * factor
    }
    at += p.length
  })
  return out
}

/**
 * Combines the partials of several parts: `parts[c]` holds part `c`'s
 * partials for its groups over inputs of `types[c]`, whose common type is
 * `type`; `ids` maps the concatenated groups of all parts to `count`
 * combined groups.
 *
 * @internal
 */
export const combine = (
  fn: Agg.AggFn,
  parts: ReadonlyArray<Part>,
  types: ReadonlyArray<S.DataType | undefined>,
  type: S.DataType | undefined,
  ids: Int32Array,
  count: number
): Part => {
  const grouping: Agg.Grouping = { ids, count }
  if (reaggregated.has(fn)) {
    const vectors = parts.map((p) => (p as Extract<Part, { _tag: "vector" }>).vector)
    if (fn === "count" || fn === "len") {
      return { _tag: "vector", vector: Agg.aggregate("sum", K.concat(vectors), grouping) }
    }
    return { _tag: "vector", vector: Agg.aggregate(fn, V.concat(vectors.map((v) => K.coerce(v, type!))), grouping) }
  }
  if (fn === "sum") {
    const sums = parts.map((p) => (p as Extract<Part, { _tag: "sums" }>).sums)
    return { _tag: "sums", sums: combineSums(sums, types as ReadonlyArray<S.DataType>, type!, ids, count) }
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

/** The aggregate column of a combined partial over inputs of `type`. @internal */
export const finish = (fn: Agg.AggFn, part: Part, type: S.DataType | undefined): V.Vector => {
  switch (part._tag) {
    case "vector":
      return part.vector
    case "sums":
      return Agg.sumColumn(type!, part.sums)
    case "mean":
      return Agg.meanFrom(type!, part.sum, part.count)
    case "moments":
      return Agg.varianceFrom(fn as "std" | "variance", type!, part.count, part.m2)
    case "none":
      return V.fail(`${fn} cannot be computed from partial aggregates`)
  }
}

// -----------------------------------------------------------------------------
// Grouped states
// -----------------------------------------------------------------------------

/**
 * The groups of some rows: their keys (one row per group), partial
 * aggregates and, per aggregate input, its domain: the smallest and
 * largest value in the inputs' common type.
 *
 * @internal
 */
export interface State {
  readonly keys: ReadonlyArray<V.Vector>
  readonly domains: ReadonlyArray<V.Vector | undefined>
  readonly parts: ReadonlyArray<Part>
  readonly count: number
  readonly rows: number
}

/**
 * The smallest and largest valid value of `v`, the values that decide
 * whether a numeric or temporal column converts to a type; no values for
 * other columns.
 */
const domain = (v: V.Vector): V.Vector => {
  if (v.kind !== "i32" && v.kind !== "i64" && v.kind !== "f64") return V.take(v, new Int32Array(0))
  const all = { ids: new Int32Array(v.length), count: 1 }
  return V.concat([Agg.aggregate("min", v, all), Agg.aggregate("max", v, all)])
}

/** Groups some rows; without keys, they form one group even when there are none. @internal */
export const group = (
  keys: ReadonlyArray<V.Vector>,
  inputs: ReadonlyArray<{ readonly fn: Agg.AggFn; readonly vector: V.Vector | undefined }>,
  n: number
): State => {
  const g = keys.length === 0 ? { ids: new Int32Array(n), count: 1, firstRow: new Int32Array(1) } : Hash.groups(keys, n)
  return {
    keys: keys.map((k) => V.take(k, g.firstRow)),
    domains: inputs.map(({ vector }) => vector === undefined ? undefined : domain(vector)),
    parts: inputs.map(({ fn, vector }) => partial(fn, vector, g)),
    count: g.count,
    rows: n
  }
}

/**
 * Combines states, keeping groups in order of first appearance. States
 * without rows only add their types.
 *
 * @internal
 */
export const merge = (fns: ReadonlyArray<Agg.AggFn>, states: ReadonlyArray<State>): State => {
  if (states.length === 1) return states[0]
  const keys = states[0].keys.map((_, k) => K.concat(states.map((s) => s.keys[k])))
  const domains = states[0].domains.map((d, a) =>
    d === undefined ? undefined : domain(K.concat(states.map((s) => s.domains[a]!)))
  )
  const filled = states.filter((s) => s.rows > 0)
  if (filled.length === 0) {
    return group(keys, fns.map((fn, a) => ({ fn, vector: domains[a] && V.take(domains[a], new Int32Array(0)) })), 0)
  }
  const g = Hash.groups(keys, filled.reduce((n, s) => n + s.count, 0))
  return {
    keys: keys.map((k) => V.take(k, g.firstRow)),
    domains,
    parts: fns.map((fn, a) =>
      combine(
        fn,
        filled.map((s) => s.parts[a]),
        filled.map((s) => s.domains[a]?.type),
        domains[a]?.type,
        g.ids,
        g.count
      )
    ),
    count: g.count,
    rows: filled.reduce((n, s) => n + s.rows, 0)
  }
}
