/**
 * Grouped aggregation kernels. Every kernel takes the input column (one value
 * per row), the group id of every row and the group count, and returns one
 * value per group.
 *
 * Null inputs are skipped. Over a group without values `sum` is 0, `count`
 * is 0 and the other aggregates are null. `min`/`max` skip NaN unless every
 * value is NaN; `sum` and `mean` propagate it. This matches Polars.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as Dec from "./decimal.ts"
import * as D from "./dtype.ts"
import * as Hash from "./hash.ts"
import { compareBytes } from "./kernels.ts"
import * as V from "./vector.ts"

const I0 = BigInt(0)

/** @internal */
export type AggFn =
  | "sum"
  | "mean"
  | "min"
  | "max"
  | "count"
  | "len"
  | "first"
  | "last"
  | "countDistinct"
  | "std"
  | "variance"
  | "median"
  | "list"

/** @internal */
export interface Grouping {
  readonly ids: Int32Array
  readonly count: number
}

const validCounts = (v: V.Vector, g: Grouping): Float64Array => {
  const out = new Float64Array(g.count)
  const ids = g.ids
  const n = ids.length
  if (v.kind === "null") return out
  const valid = v.valid
  if (valid === undefined) { for (let i = 0; i < n; i++) out[ids[i]]++ }
  else for (let i = 0; i < n; i++) out[ids[i]] += valid[i]
  return out
}

const invalidWhereZero = (counts: Float64Array): Uint8Array | undefined => {
  let valid: Uint8Array | undefined
  for (let g = 0; g < counts.length; g++) {
    if (counts[g] === 0) {
      if (valid === undefined) valid = new Uint8Array(counts.length).fill(1)
      valid[g] = 0
    }
  }
  return valid
}

/** @internal */
export const aggregate = (fn: AggFn, v: V.Vector | undefined, g: Grouping): V.Vector => {
  const ids = g.ids
  const n = ids.length
  const groups = g.count
  if (fn === "len") {
    const out = new Float64Array(groups)
    for (let i = 0; i < n; i++) out[ids[i]]++
    return V.f64(S.uint32, out)
  }
  if (v === undefined) return V.fail(`${fn} needs an argument`)
  switch (fn) {
    case "list": {
      // Each group's values, in row order.
      const starts = new Int32Array(groups + 1)
      for (let i = 0; i < n; i++) starts[ids[i] + 1]++
      for (let k = 0; k < groups; k++) starts[k + 1] += starts[k]
      const at = starts.slice(0, groups)
      const rows = new Int32Array(n)
      for (let i = 0; i < n; i++) rows[at[ids[i]]++] = i
      return V.list(S.list(S.field("item", v.type)), starts, V.take(v, rows))
    }
    case "count":
      return V.f64(S.uint32, validCounts(v, g))
    case "first":
    case "last": {
      const rows = new Int32Array(groups).fill(-1)
      if (fn === "first") { for (let i = n - 1; i >= 0; i--) rows[ids[i]] = i }
      else for (let i = 0; i < n; i++) rows[ids[i]] = i
      return V.take(v, rows)
    }
    case "countDistinct": {
      const values = Hash.ids(v)
      const distinct = Hash.groups([V.i32(S.int32, ids), V.i32(S.int32, values.ids)], n)
      const out = new Float64Array(groups)
      for (let d = 0; d < distinct.count; d++) out[ids[distinct.firstRow[d]]]++
      return V.f64(S.uint32, out)
    }
    case "sum":
      return sum(v, g)
    case "mean":
      return mean(v, g)
    case "min":
    case "max":
      return minMax(fn, v, g)
    case "std":
    case "variance":
      return variance(fn, v, g)
    case "median":
      return median(v, g)
  }
}

const sum = (v: V.Vector, g: Grouping): V.Vector => {
  const ids = g.ids
  const n = ids.length
  const groups = g.count
  const type = D.sumType(v.type)
  switch (v.kind) {
    case "null":
      return V.i32(S.int32, new Int32Array(groups))
    case "f64": {
      const x = v.values
      const acc = new Float64Array(groups)
      const valid = v.valid
      if (valid === undefined) { for (let i = 0; i < n; i++) acc[ids[i]] += x[i] }
      else for (let i = 0; i < n; i++) if (valid[i] === 1) acc[ids[i]] += x[i]
      V.wrapInPlace(type, acc)
      V.roundFloat32InPlace(type, acc)
      return V.f64(type, acc)
    }
    case "i32": {
      const x = v.values
      // Accumulate in Float64 (exact up to 2^53), then wrap to Int32.
      const acc = new Float64Array(groups)
      const valid = v.valid
      if (valid === undefined) { for (let i = 0; i < n; i++) acc[ids[i]] += x[i] }
      else for (let i = 0; i < n; i++) if (valid[i] === 1) acc[ids[i]] += x[i]
      const out = new Int32Array(groups)
      for (let k = 0; k < groups; k++) out[k] = Number(BigInt.asIntN(32, BigInt(acc[k])))
      return V.i32(type, out)
    }
    case "bool": {
      const x = v.values
      const acc = new Float64Array(groups)
      for (let i = 0; i < n; i++) if (V.isValid(v, i)) acc[ids[i]] += x[i]
      return V.f64(S.uint32, acc)
    }
    case "i64": {
      const x = v.values
      const acc = new Array<bigint>(groups).fill(I0)
      const valid = v.valid
      for (let i = 0; i < n; i++) if (valid === undefined || valid[i] === 1) acc[ids[i]] += x[i]
      const out = new BigInt64Array(groups)
      for (let k = 0; k < groups; k++) out[k] = BigInt.asIntN(64, acc[k])
      return V.i64(type, out)
    }
    default:
      return V.fail(`sum is not defined for ${D.describe(v.type)}`)
  }
}

/** Every value as a float, with validity. */
const asFloat = (v: V.Vector): { readonly x: Float64Array; readonly valid: Uint8Array | undefined } => {
  switch (v.kind) {
    case "f64":
      return { x: v.values, valid: v.valid }
    case "i32":
      return { x: Float64Array.from(v.values), valid: v.valid }
    case "i64":
      if (v.type._tag === "Decimal") return { x: Dec.toFloat(v.values, v.type.scale), valid: v.valid }
      return {
        x: V.isUnsigned64(v.type)
          ? Float64Array.from(new BigUint64Array(v.values.buffer, v.values.byteOffset, v.length), Number)
          : Float64Array.from(v.values, Number),
        valid: v.valid
      }
    case "bool":
      return { x: Float64Array.from(v.values), valid: v.valid }
    case "null":
      return { x: new Float64Array(v.length), valid: new Uint8Array(v.length) }
    default:
      return V.fail(`expected a numeric column, got ${D.describe(v.type)}`)
  }
}

/**
 * Per-group count and sum of the valid values, as floats: the parts of a
 * mean that combine across row ranges.
 *
 * @internal
 */
export const sumCount = (
  v: V.Vector,
  g: Grouping
): { readonly sum: Float64Array; readonly count: Float64Array } => {
  const ids = g.ids
  const n = ids.length
  const { valid, x } = asFloat(v)
  const sum = new Float64Array(g.count)
  const count = new Float64Array(g.count)
  if (valid === undefined) {
    for (let i = 0; i < n; i++) {
      const k = ids[i]
      sum[k] += x[i]
      count[k]++
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (valid[i] === 0) continue
      const k = ids[i]
      sum[k] += x[i]
      count[k]++
    }
  }
  return { sum, count }
}

/** The mean column from per-group sums and counts (consumes `sum`). @internal */
export const meanFrom = (inputType: S.DataType, sum: Float64Array, count: Float64Array): V.Vector => {
  for (let k = 0; k < sum.length; k++) sum[k] /= count[k]
  const type = D.meanType(inputType)
  V.roundFloat32InPlace(type, sum)
  return V.f64(type, sum, invalidWhereZero(count))
}

const mean = (v: V.Vector, g: Grouping): V.Vector => {
  const { count, sum } = sumCount(v, g)
  return meanFrom(v.type, sum, count)
}

/**
 * Per-group count, mean and sum of squared deviations from the mean (M2):
 * the parts of a variance that combine across row ranges.
 *
 * @internal
 */
export const moments = (
  v: V.Vector,
  g: Grouping
): { readonly count: Float64Array; readonly mean: Float64Array; readonly m2: Float64Array } => {
  const ids = g.ids
  const n = ids.length
  const { valid, x } = asFloat(v)
  const groups = g.count
  const { count, sum } = sumCount(v, g)
  const m = sum
  for (let k = 0; k < groups; k++) m[k] = sum[k] / count[k]
  const m2 = new Float64Array(groups)
  for (let i = 0; i < n; i++) {
    if (valid !== undefined && valid[i] === 0) continue
    const d = x[i] - m[ids[i]]
    m2[ids[i]] += d * d
  }
  return { count, mean: m, m2 }
}

/** The std or variance column from per-group counts and M2. @internal */
export const varianceFrom = (
  fn: "std" | "variance",
  inputType: S.DataType,
  count: Float64Array,
  m2: Float64Array
): V.Vector => {
  const groups = count.length
  const out = new Float64Array(groups)
  let outValid: Uint8Array | undefined
  for (let k = 0; k < groups; k++) {
    if (count[k] < 2) {
      if (outValid === undefined) outValid = new Uint8Array(groups).fill(1)
      outValid[k] = 0
      continue
    }
    const vr = m2[k] / (count[k] - 1)
    out[k] = fn === "std" ? Math.sqrt(vr) : vr
  }
  const type = D.meanType(inputType)
  V.roundFloat32InPlace(type, out)
  return V.f64(type, out, outValid)
}

const variance = (fn: "std" | "variance", v: V.Vector, g: Grouping): V.Vector => {
  const { count, m2 } = moments(v, g)
  return varianceFrom(fn, v.type, count, m2)
}

const minMax = (fn: "min" | "max", v: V.Vector, g: Grouping): V.Vector => {
  if (v.kind === "list" || v.kind === "struct") return V.fail(`${fn} is not defined for ${v.type._tag} columns`)
  const ids = g.ids
  const n = ids.length
  const groups = g.count
  const isMin = fn === "min"
  switch (v.kind) {
    case "null":
      return V.nulls(groups)
    case "f64": {
      const x = v.values
      const valid = v.valid
      const acc = new Float64Array(groups).fill(NaN)
      const seen = new Uint8Array(groups)
      for (let i = 0; i < n; i++) {
        if (valid !== undefined && valid[i] === 0) continue
        const k = ids[i]
        const a = x[i]
        seen[k] = 1
        if (a !== a) continue
        const c = acc[k]
        if (c !== c || (isMin ? a < c : a > c)) acc[k] = a
      }
      return V.f64(v.type, acc, V.compactValid(seen))
    }
    case "i32": {
      const x = v.values
      const valid = v.valid
      const acc = new Int32Array(groups)
      const seen = new Uint8Array(groups)
      for (let i = 0; i < n; i++) {
        if (valid !== undefined && valid[i] === 0) continue
        const k = ids[i]
        const a = x[i]
        if (seen[k] === 0) {
          seen[k] = 1
          acc[k] = a
        } else if (isMin ? a < acc[k] : a > acc[k]) acc[k] = a
      }
      return V.i32(v.type, acc, V.compactValid(seen))
    }
    case "bool": {
      const x = v.values
      const acc = new Uint8Array(groups).fill(isMin ? 1 : 0)
      const seen = new Uint8Array(groups)
      for (let i = 0; i < n; i++) {
        if (!V.isValid(v, i)) continue
        const k = ids[i]
        seen[k] = 1
        acc[k] = isMin ? acc[k] & x[i] : acc[k] | x[i]
      }
      return V.bool(acc, V.compactValid(seen))
    }
    case "i64":
    case "str": {
      // Track the best row per group, then gather it.
      const best = new Int32Array(groups).fill(-1)
      const cmp = rowComparator(v)
      for (let i = 0; i < n; i++) {
        if (!V.isValid(v, i)) continue
        const k = ids[i]
        const b = best[k]
        if (b < 0 || (isMin ? cmp(i, b) < 0 : cmp(i, b) > 0)) best[k] = i
      }
      return V.take(v, best)
    }
  }
}

const rowComparator = (v: V.I64 | V.Str): (a: number, b: number) => number => {
  if (v.kind === "str") {
    const d = v.data
    const o = v.offsets
    return (a, b) => compareBytes(d, o[a], o[a + 1], d, o[b], o[b + 1])
  }
  const x = v.values
  if (V.isUnsigned64(v.type)) {
    const u = new BigUint64Array(x.buffer, x.byteOffset, x.length)
    return (a, b) => (u[a] < u[b] ? -1 : u[a] > u[b] ? 1 : 0)
  }
  return (a, b) => (x[a] < x[b] ? -1 : x[a] > x[b] ? 1 : 0)
}

const median = (v: V.Vector, g: Grouping): V.Vector => {
  const ids = g.ids
  const n = ids.length
  const groups = g.count
  const { valid, x } = asFloat(v)
  // Counting sort of the present values by group, then a numeric sort per group.
  const start = new Int32Array(groups + 1)
  for (let i = 0; i < n; i++) if (valid === undefined || valid[i] === 1) start[ids[i] + 1]++
  for (let k = 0; k < groups; k++) start[k + 1] += start[k]
  const values = new Float64Array(start[groups])
  const fill = start.slice(0, groups)
  for (let i = 0; i < n; i++) if (valid === undefined || valid[i] === 1) values[fill[ids[i]]++] = x[i]
  const out = new Float64Array(groups)
  const outValid = new Uint8Array(groups)
  for (let k = 0; k < groups; k++) {
    const s = start[k]
    const len = start[k + 1] - s
    if (len === 0) continue
    const group = values.subarray(s, s + len)
    group.sort()
    const mid = len >> 1
    out[k] = len % 2 === 1 ? group[mid] : (group[mid - 1] + group[mid]) / 2
    outValid[k] = 1
  }
  const type = D.meanType(v.type)
  V.roundFloat32InPlace(type, out)
  return V.f64(type, out, V.compactValid(outValid))
}
