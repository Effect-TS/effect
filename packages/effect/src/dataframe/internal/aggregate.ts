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
import * as Sort from "./sort.ts"
import * as T from "./temporal.ts"
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

/**
 * The kernel of an aggregate call with argument `arg`: `count` without an
 * argument counts rows; every other function needs one.
 *
 * @internal
 */
export const kernel = (fn: AggFn, arg: unknown): AggFn =>
  arg !== undefined ? fn : fn === "count" ? "len" : V.fail(`${fn} needs an argument`)

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
      const { rows, starts } = Hash.rowsByGroup(ids, groups)
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

const sum = (v: V.Vector, g: Grouping): V.Vector => sumColumn(v.type, sums(v, g))

/**
 * Per-group sums of the valid values: Float64 for float columns, exact
 * integers (unscaled for decimals) for every other column `sum` takes.
 *
 * @internal
 */
export type Sums = Float64Array | ReadonlyArray<bigint>

/** Per-group {@link Sums} of a column. @internal */
export const sums = (v: V.Vector, g: Grouping): Sums => {
  const ids = g.ids
  const n = ids.length
  if (D.isPointInTime(v.type)) return V.fail(`sum is not defined for ${D.describe(v.type)}`)
  switch (v.kind) {
    case "null":
      return new Array<bigint>(g.count).fill(I0)
    case "i64": {
      const x = V.isUnsigned64(v.type) ? new BigUint64Array(v.values.buffer, v.values.byteOffset, v.length) : v.values
      const acc = new Array<bigint>(g.count).fill(I0)
      for (let i = 0; i < n; i++) if (V.isValid(v, i)) acc[ids[i]] += x[i]
      return acc
    }
    case "f64":
    case "i32":
    case "bool": {
      const x = v.values
      const acc = new Float64Array(g.count)
      const valid = v.valid
      if (valid === undefined) { for (let i = 0; i < n; i++) acc[ids[i]] += x[i] }
      else for (let i = 0; i < n; i++) if (valid[i] === 1) acc[ids[i]] += x[i]
      // Integers accumulate exactly in Float64 up to 2^53.
      return v.type._tag === "Float" ? acc : Array.from(acc, BigInt)
    }
    default:
      return V.fail(`sum is not defined for ${D.describe(v.type)}`)
  }
}

/**
 * The `sum` column of an input of type `inputType` from its {@link Sums}:
 * integer sums wrap to the sum type, decimal sums fail outside 64 bits.
 *
 * @internal
 */
export const sumColumn = (inputType: S.DataType, sums: Sums): V.Vector => {
  const type = D.sumType(inputType)
  if (sums instanceof Float64Array || type._tag === "Float") {
    const out = Float64Array.from(sums as ArrayLike<number | bigint>, Number)
    V.roundFloat32InPlace(type, out)
    return V.f64(type, out)
  }
  switch (V.kindOf(type)) {
    case "null":
      return V.i32(S.int32, new Int32Array(sums.length))
    case "i32":
      return V.i32(type, Int32Array.from(sums, (x) => Number(BigInt.asIntN(32, x))))
    case "f64":
      return V.f64(type, Float64Array.from(sums, (x) => Number(BigInt.asUintN(32, x))))
    default:
      return V.i64(type, BigInt64Array.from(sums, Dec.fit(type)))
  }
}

/**
 * Every value as a float, with validity. Durations and points in time are
 * not numbers: their integers count units, which a mean would lose.
 */
const asFloat = (v: V.Vector): { readonly x: Float64Array; readonly valid: Uint8Array | undefined } => {
  if (T.isTemporal(v.type)) {
    return V.fail(`expected a numeric column, got ${D.describe(v.type)}`)
  }
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
  const { valid, x } = asFloat(v)
  return sumCountOf(x, valid, g)
}

const sumCountOf = (
  x: Float64Array,
  valid: Uint8Array | undefined,
  g: Grouping
): { readonly sum: Float64Array; readonly count: Float64Array } => {
  const ids = g.ids
  const n = ids.length
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
  const { count, sum } = sumCountOf(x, valid, g)
  for (let k = 0; k < groups; k++) sum[k] /= count[k]
  const m2 = new Float64Array(groups)
  for (let i = 0; i < n; i++) {
    if (valid !== undefined && valid[i] === 0) continue
    const d = x[i] - sum[ids[i]]
    m2[ids[i]] += d * d
  }
  return { count, mean: sum, m2 }
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
      const cmp = Sort.rowOrder(v)
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
