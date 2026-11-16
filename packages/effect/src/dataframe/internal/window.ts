/**
 * Window functions: values computed from the other rows of a row's
 * partition, in row order (Polars semantics). Without a partition, the whole
 * column is one partition.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import type * as Plan from "../Plan.ts"
import type * as Agg from "./aggregate.ts"
import * as Dec from "./decimal.ts"
import * as D from "./dtype.ts"
import * as Hash from "./hash.ts"
import * as Sort from "./sort.ts"
import * as V from "./vector.ts"

/** Rows' partition ids (dense, in order of first appearance). @internal */
export type Partition = Agg.Grouping

/** One partition holding every row. @internal */
export const whole = (n: number): Partition => ({ ids: new Int32Array(n), count: n > 0 ? 1 : 0 })

const validOf = (v: V.Vector): Uint8Array | undefined =>
  v.kind === "null" ? new Uint8Array(v.length) : v.valid === undefined ? undefined : v.valid.slice()

// -----------------------------------------------------------------------------
// Cumulative
// -----------------------------------------------------------------------------

/** Running sum per partition; nulls stay null and are skipped. @internal */
export const cumSum = (v: V.Vector, p: Partition): V.Vector => {
  const n = v.length
  const ids = p.ids
  if (D.isPointInTime(v.type)) return V.fail(`cumSum is not defined for ${D.describe(v.type)}`)
  const type = D.sumType(v.type)
  const valid = validOf(v)
  switch (v.kind) {
    case "null":
      return V.nulls(n)
    case "f64":
    case "bool": {
      const x = v.values
      const acc = new Float64Array(p.count)
      const out = new Float64Array(n)
      for (let i = 0; i < n; i++) if (valid === undefined || valid[i] === 1) out[i] = acc[ids[i]] += x[i]
      V.wrapInPlace(type, out)
      V.roundFloat32InPlace(type, out)
      return V.f64(type, out, valid)
    }
    case "i32": {
      const x = v.values
      const acc = new Int32Array(p.count)
      const out = new Int32Array(n)
      for (let i = 0; i < n; i++) {
        if (valid === undefined || valid[i] === 1) out[i] = acc[ids[i]] = (acc[ids[i]] + x[i]) | 0
      }
      return V.i32(type, out, valid)
    }
    case "i64": {
      const x = v.values
      const acc = new BigInt64Array(p.count)
      const out = new BigInt64Array(n)
      const fit = Dec.fit(type)
      for (let i = 0; i < n; i++) {
        if (valid === undefined || valid[i] === 1) out[i] = acc[ids[i]] = fit(acc[ids[i]] + x[i])
      }
      return V.i64(type, out, valid)
    }
    default:
      return V.fail(`cumSum is not defined for ${D.describe(v.type)}`)
  }
}

/** Number of non-null values so far per partition (no nulls). @internal */
export const cumCount = (v: V.Vector, p: Partition): V.Vector => {
  const n = v.length
  const acc = new Float64Array(p.count)
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    if (V.isValid(v, i)) acc[p.ids[i]]++
    out[i] = acc[p.ids[i]]
  }
  return V.f64(S.uint32, out)
}

const isNaNAt = (v: V.Vector, i: number): boolean => v.kind === "f64" && v.values[i] !== v.values[i]

/** Running minimum or maximum per partition; NaNs are skipped, nulls stay null. @internal */
export const cumMinMax = (fn: "cumMin" | "cumMax", v: V.Vector, p: Partition): V.Vector => {
  const n = v.length
  const order = Sort.rowOrder(v)
  const sign = fn === "cumMin" ? -1 : 1
  const best = new Int32Array(p.count).fill(-1)
  const rows = new Int32Array(n)
  for (let i = 0; i < n; i++) {
    if (!V.isValid(v, i)) {
      rows[i] = -1
      continue
    }
    const g = p.ids[i]
    if (!isNaNAt(v, i) && (best[g] < 0 || order(i, best[g]) * sign > 0)) best[g] = i
    rows[i] = best[g] < 0 ? i : best[g]
  }
  return V.take(v, rows)
}

// -----------------------------------------------------------------------------
// Shifts
// -----------------------------------------------------------------------------

/** The value `n` rows earlier in the partition (later for negative `n`). @internal */
export const shift = (v: V.Vector, p: Partition, n: number): V.Vector => {
  const { rows, starts } = Hash.rowsByGroup(p.ids, p.count)
  const idx = new Int32Array(v.length).fill(-1)
  for (let g = 0; g < p.count; g++) {
    const s = starts[g]
    const e = starts[g + 1]
    for (let j = s; j < e; j++) {
      const k = j - n
      if (k >= s && k < e) idx[rows[j]] = rows[k]
    }
  }
  return V.take(v, idx)
}

// -----------------------------------------------------------------------------
// Rank
// -----------------------------------------------------------------------------

/** Rank within the partition; nulls get no rank. @internal */
export const rank = (v: V.Vector, p: Partition, method: Plan.RankMethod, descending: boolean): V.Vector => {
  const n = v.length
  const perm = Sort.permutation(
    [{ vector: V.i32(S.int32, p.ids), descending: false }, { vector: v, descending }],
    true,
    n
  )
  const words = Sort.words({ vector: v, descending })
  const same = (a: number, b: number) =>
    words.lo[a] === words.lo[b] && (words.hi === undefined || words.hi[a] === words.hi[b])
  const out = new Float64Array(n)
  const valid = validOf(v)
  let i = 0
  while (i < n) {
    // One partition: perm[i..end).
    const g = p.ids[perm[i]]
    let end = i
    while (end < n && p.ids[perm[end]] === g) end++
    let position = 0
    let dense = 0
    let s = i
    while (s < end && V.isValid(v, perm[s])) {
      let e = s + 1
      while (e < end && V.isValid(v, perm[e]) && same(perm[s], perm[e])) e++
      dense++
      const first = position + 1
      const last = position + (e - s)
      for (let k = s; k < e; k++) {
        const row = perm[k]
        out[row] = method === "average"
          ? (first + last) / 2
          : method === "min"
          ? first
          : method === "max"
          ? last
          : method === "dense"
          ? dense
          : position + (k - s) + 1
      }
      position = last
      s = e
    }
    i = end
  }
  return V.f64(method === "average" ? S.float64 : S.uint32, out, valid)
}

// -----------------------------------------------------------------------------
// Rolling
// -----------------------------------------------------------------------------

/**
 * An aggregate over the last `window` rows of the partition (the current row
 * included). Null when fewer than `minPeriods` of them are non-null; NaN
 * propagates.
 *
 * @internal
 */
export const rolling = (
  fn: "rollingSum" | "rollingMean" | "rollingMin" | "rollingMax",
  v: V.Vector,
  p: Partition,
  window: number,
  minPeriods: number
): V.Vector => {
  const n = v.length
  const { rows, starts } = Hash.rowsByGroup(p.ids, p.count)
  /** Calls `f` with each row and the window `rows[first..last]` ending at it. */
  const windows = (f: (row: number, first: number, last: number) => void) => {
    for (let g = 0; g < p.count; g++) {
      for (let j = starts[g]; j < starts[g + 1]; j++) f(rows[j], Math.max(starts[g], j - window + 1), j)
    }
  }
  const ok = new Uint8Array(n)
  if (fn === "rollingMin" || fn === "rollingMax") {
    const order = Sort.rowOrder(v)
    const sign = fn === "rollingMin" ? -1 : 1
    const idx = new Int32Array(n).fill(-1)
    windows((row, first, last) => {
      let best = -1
      let count = 0
      for (let k = first; k <= last; k++) {
        const r = rows[k]
        if (!V.isValid(v, r)) continue
        count++
        if (best >= 0 && isNaNAt(v, best)) continue
        if (isNaNAt(v, r) || best < 0 || order(r, best) * sign > 0) best = r
      }
      if (count >= minPeriods) idx[row] = best
    })
    return V.take(v, idx)
  }
  if (
    v.kind === "str" || v.kind === "null" || v.kind === "list" || v.kind === "struct" || D.isPointInTime(v.type) ||
    (fn === "rollingMean" && v.type._tag === "Duration")
  ) {
    return V.fail(`${fn} is not defined for ${D.describe(v.type)}`)
  }
  const type = fn === "rollingMean" ? D.meanType(v.type) : D.sumType(v.type)
  if (v.kind === "i64") {
    // Exact sums: 64-bit integers wrap and decimals fail outside 64 bits.
    const fit = Dec.fit(type)
    const unit = Dec.isDecimal(v.type) ? 10 ** v.type.scale : 1
    const sums = new BigInt64Array(n)
    const means = new Float64Array(n)
    windows((row, first, last) => {
      let sum = BigInt(0)
      let count = 0
      for (let k = first; k <= last; k++) {
        const r = rows[k]
        if (!V.isValid(v, r)) continue
        sum += v.values[r]
        count++
      }
      if (count < minPeriods) return
      ok[row] = 1
      // Zero is zero at any scale, also where `10^scale` is zero.
      if (fn === "rollingMean") means[row] = sum === BigInt(0) ? 0 : Number(sum) / unit / count
      else sums[row] = fit(sum)
    })
    return fn === "rollingMean" ? V.f64(type, means, ok) : V.i64(type, sums, ok)
  }
  const x = v.kind === "f64" ? v.values : Float64Array.from(v.values)
  const out = new Float64Array(n)
  windows((row, first, last) => {
    let sum = 0
    let count = 0
    for (let k = first; k <= last; k++) {
      const r = rows[k]
      if (!V.isValid(v, r)) continue
      sum += x[r]
      count++
    }
    if (count >= minPeriods) {
      ok[row] = 1
      out[row] = fn === "rollingMean" ? sum / count : sum
    }
  })
  if (fn === "rollingMean") return V.f64(type, out, ok)
  switch (v.kind) {
    case "i32":
      return V.i32(type, Int32Array.from(out, (a) => a | 0), ok)
    default:
      V.wrapInPlace(type, out)
      return V.f64(type, out, ok)
  }
}
