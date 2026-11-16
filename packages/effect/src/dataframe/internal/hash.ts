/**
 * Dense group ids: every distinct key gets an id in order of first
 * appearance. Grouping, joins, `unique` and `countDistinct` all build on it.
 *
 * Keys hash with open addressing over typed arrays. Multi-column keys are
 * grouped column by column and the per-column ids combined, so every column
 * type needs only its own single-column table.
 *
 * Float keys follow Polars: `-0` and `0` are one key, and so are all NaNs.
 * Null is a key of its own.
 *
 * @internal
 */
import * as V from "./vector.ts"

/** @internal */
export interface Groups {
  /** Group id of every row. */
  readonly ids: Int32Array
  /** Number of groups. */
  readonly count: number
  /** The first row of every group, by group id. */
  readonly firstRow: Int32Array
}

const mix = (h: number): number => {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

/** Largest table the direct (array-indexed) strategy may allocate for `n` rows. @internal */
export const directLimit = (n: number) => Math.max(1 << 16, n * 2)

/**
 * Ids for keys in `[0, range)`, by direct indexing: no hashing, one array
 * read per row.
 */
const directIds = (
  x: Int32Array,
  offset: number,
  range: number,
  valid: Uint8Array | undefined,
  n: number
): Groups => {
  const table = new Int32Array(range + 1).fill(-1)
  const ids = new Int32Array(n)
  let firstRow: Int32Array = new Int32Array(Math.min(range + 1, Math.max(64, n)))
  let count = 0
  for (let i = 0; i < n; i++) {
    const k = valid !== undefined && valid[i] === 0 ? range : x[i] - offset
    let id = table[k]
    if (id < 0) {
      if (count === firstRow.length) firstRow = growInt(firstRow)
      id = table[k] = count
      firstRow[count++] = i
    }
    ids[i] = id
  }
  return { ids, count, firstRow: firstRow.subarray(0, count) }
}

/** The smallest and largest valid value; `max < min` when there is none. @internal */
export const int32Range = (
  x: Int32Array,
  valid: Uint8Array | undefined,
  n: number
): { readonly min: number; readonly max: number } => {
  let min = 2147483647
  let max = -2147483648
  if (valid === undefined) {
    for (let i = 0; i < n; i++) {
      const v = x[i]
      if (v < min) min = v
      if (v > max) max = v
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (valid[i] === 0) continue
      const v = x[i]
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  return { min, max }
}

/** Ids for one Int32 column. */
const int32Ids = (x: Int32Array, valid: Uint8Array | undefined, n: number): Groups => {
  const { max, min } = int32Range(x, valid, n)
  if (max >= min && max - min < directLimit(n)) return directIds(x, min, max - min + 1, valid, n)
  return hashInt32Ids(x, valid, n)
}

const hashInt32Ids = (x: Int32Array, valid: Uint8Array | undefined, n: number): Groups => {
  const ids = new Int32Array(n)
  let firstRow: Int32Array = new Int32Array(64)
  let count = 0
  let nullId = -1
  let cap = 1024
  let mask = cap - 1
  let keys = new Int32Array(cap)
  let slots = new Int32Array(cap).fill(-1)
  for (let i = 0; i < n; i++) {
    if (valid !== undefined && valid[i] === 0) {
      if (nullId < 0) {
        if (count === firstRow.length) firstRow = growInt(firstRow)
        nullId = count
        firstRow[count++] = i
      }
      ids[i] = nullId
      continue
    }
    const k = x[i]
    let s = mix(k) & mask
    while (true) {
      const id = slots[s]
      if (id === -1) {
        if (count === firstRow.length) firstRow = growInt(firstRow)
        firstRow[count] = i
        slots[s] = count
        keys[s] = k
        ids[i] = count++
        if (count * 2 > cap) {
          const ok = keys
          const os = slots
          cap <<= 1
          mask = cap - 1
          keys = new Int32Array(cap)
          slots = new Int32Array(cap).fill(-1)
          for (let t = 0; t < os.length; t++) {
            const id2 = os[t]
            if (id2 === -1) continue
            let u = mix(ok[t]) & mask
            while (slots[u] !== -1) u = (u + 1) & mask
            slots[u] = id2
            keys[u] = ok[t]
          }
        }
        break
      }
      if (keys[s] === k) {
        ids[i] = id
        break
      }
      s = (s + 1) & mask
    }
  }
  return { ids, count, firstRow: firstRow.subarray(0, count) }
}

/** Ids for 64-bit keys given as (lo, hi) pairs. */
const pairIds = (pairs: Int32Array, valid: Uint8Array | undefined, n: number): Groups => {
  const ids = new Int32Array(n)
  let firstRow: Int32Array = new Int32Array(64)
  let count = 0
  let nullId = -1
  let cap = 1024
  let mask = cap - 1
  let keys = new Int32Array(cap * 2)
  let slots = new Int32Array(cap).fill(-1)
  for (let i = 0; i < n; i++) {
    if (valid !== undefined && valid[i] === 0) {
      if (nullId < 0) {
        if (count === firstRow.length) firstRow = growInt(firstRow)
        nullId = count
        firstRow[count++] = i
      }
      ids[i] = nullId
      continue
    }
    const lo = pairs[2 * i]
    const hi = pairs[2 * i + 1]
    let s = mix(lo ^ Math.imul(hi, 0x9e3779b1)) & mask
    while (true) {
      const id = slots[s]
      if (id === -1) {
        if (count === firstRow.length) firstRow = growInt(firstRow)
        firstRow[count] = i
        slots[s] = count
        keys[2 * s] = lo
        keys[2 * s + 1] = hi
        ids[i] = count++
        if (count * 2 > cap) {
          const ok = keys
          const os = slots
          cap <<= 1
          mask = cap - 1
          keys = new Int32Array(cap * 2)
          slots = new Int32Array(cap).fill(-1)
          for (let t = 0; t < os.length; t++) {
            const id2 = os[t]
            if (id2 === -1) continue
            const l = ok[2 * t]
            const h = ok[2 * t + 1]
            let u = mix(l ^ Math.imul(h, 0x9e3779b1)) & mask
            while (slots[u] !== -1) u = (u + 1) & mask
            slots[u] = id2
            keys[2 * u] = l
            keys[2 * u + 1] = h
          }
        }
        break
      }
      if (keys[2 * s] === lo && keys[2 * s + 1] === hi) {
        ids[i] = id
        break
      }
      s = (s + 1) & mask
    }
  }
  return { ids, count, firstRow: firstRow.subarray(0, count) }
}

/** `x` with `-0` as `0` and every NaN as one NaN, so equal keys have equal bits. @internal */
export const canonicalBits = (x: Float64Array, n: number): Float64Array<ArrayBuffer> => {
  const out = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const v = x[i]
    out[i] = v === 0 ? 0 : v !== v ? NaN : v
  }
  return out
}

/** Moves a table of group ids and their stored hashes into one of `cap` slots. */
const rehash = (
  slots: Int32Array,
  hashes: Int32Array,
  cap: number
): [Int32Array<ArrayBuffer>, Int32Array<ArrayBuffer>] => {
  const mask = cap - 1
  const s = new Int32Array(cap).fill(-1)
  const h = new Int32Array(cap)
  for (let t = 0; t < slots.length; t++) {
    if (slots[t] === -1) continue
    let u = hashes[t] & mask
    while (s[u] !== -1) u = (u + 1) & mask
    s[u] = slots[t]
    h[u] = hashes[t]
  }
  return [s, h]
}

const stringIds = (v: V.Str, n: number): Groups => {
  const ids = new Int32Array(n)
  let firstRow: Int32Array = new Int32Array(64)
  let count = 0
  let nullId = -1
  const valid = v.valid
  const d = v.data
  const off = v.offsets
  let cap = 1024
  let mask = cap - 1
  let slots = new Int32Array(cap).fill(-1)
  let hashes = new Int32Array(cap)
  for (let i = 0; i < n; i++) {
    if (valid !== undefined && valid[i] === 0) {
      if (nullId < 0) {
        if (count === firstRow.length) firstRow = growInt(firstRow)
        nullId = count
        firstRow[count++] = i
      }
      ids[i] = nullId
      continue
    }
    const s0 = off[i]
    const e0 = off[i + 1]
    let h = 0x811c9dc5 | 0
    for (let k = s0; k < e0; k++) h = Math.imul(h ^ d[k], 0x01000193)
    h = mix(h ^ (e0 - s0))
    let s = h & mask
    while (true) {
      const id = slots[s]
      if (id === -1) {
        if (count === firstRow.length) firstRow = growInt(firstRow)
        firstRow[count] = i
        slots[s] = count
        hashes[s] = h
        ids[i] = count++
        if (count * 2 > cap) {
          cap <<= 1
          mask = cap - 1
          ;[slots, hashes] = rehash(slots, hashes, cap)
        }
        break
      }
      if (hashes[s] === (h | 0)) {
        const r = firstRow[id]
        const s1 = off[r]
        const e1 = off[r + 1]
        if (e1 - s1 === e0 - s0) {
          let same = true
          for (let k = 0; k < e0 - s0; k++) {
            if (d[s0 + k] !== d[s1 + k]) {
              same = false
              break
            }
          }
          if (same) {
            ids[i] = id
            break
          }
        }
      }
      s = (s + 1) & mask
    }
  }
  return { ids, count, firstRow: firstRow.subarray(0, count) }
}

const smallIds = (values: Uint8Array, valid: Uint8Array | undefined, n: number): Groups => {
  const ids = new Int32Array(n)
  const map = new Int32Array(3).fill(-1)
  const firstRow = new Int32Array(3)
  let count = 0
  for (let i = 0; i < n; i++) {
    const k = valid !== undefined && valid[i] === 0 ? 2 : values[i]
    let id = map[k]
    if (id < 0) {
      id = map[k] = count
      firstRow[count++] = i
    }
    ids[i] = id
  }
  return { ids, count, firstRow: firstRow.subarray(0, count) }
}

const growInt = (a: Int32Array): Int32Array<ArrayBuffer> => {
  const out = new Int32Array(a.length * 2)
  out.set(a)
  return out
}

/** Dense ids for one column. @internal */
export const ids = (v: V.Vector): Groups => {
  const n = v.length
  switch (v.kind) {
    case "i32":
      return int32Ids(v.values, v.valid, n)
    case "f64":
      return pairIds(new Int32Array(canonicalBits(v.values, n).buffer), v.valid, n)
    case "i64":
      return pairIds(new Int32Array(v.values.buffer, v.values.byteOffset, n * 2), v.valid, n)
    case "bool":
      return smallIds(v.values, v.valid, n)
    case "str":
      return stringIds(v, n)
    case "null":
      return single(n)
    case "list":
    case "struct":
      return V.fail(`cannot group, join or deduplicate by ${v.type._tag} columns yet`)
  }
}

/** Every row in one group (none without rows). */
const single = (n: number): Groups => ({
  ids: new Int32Array(n),
  count: n > 0 ? 1 : 0,
  firstRow: new Int32Array(n > 0 ? 1 : 0)
})

/** Ids of the pairs of two id columns whose product of counts is at most `directLimit(n)`. */
const combine = (a: Groups, b: Groups, n: number): Groups => {
  if (a.count === 1) return b
  if (b.count === 1) return a
  const bc = b.count
  const ai = a.ids
  const bi = b.ids
  const keys = new Int32Array(n)
  for (let i = 0; i < n; i++) keys[i] = ai[i] * bc + bi[i]
  return directIds(keys, 0, a.count * bc, undefined, n)
}

/**
 * Ids of tuples of per-column ids, in one hashing pass: the tuple hashes as a
 * whole and compares column by column against its group's first row.
 */
const tupleIds = (cols: ReadonlyArray<Int32Array>, n: number): Groups => {
  const ids = new Int32Array(n)
  let firstRow: Int32Array = new Int32Array(64)
  let count = 0
  let cap = 1024
  let mask = cap - 1
  let slots = new Int32Array(cap).fill(-1)
  let hashes = new Int32Array(cap)
  const k = cols.length
  for (let i = 0; i < n; i++) {
    let h = 0x2545f491
    for (let c = 0; c < k; c++) h = Math.imul(h ^ cols[c][i], 0x9e3779b1) ^ (h >>> 15)
    h = mix(h)
    let s = h & mask
    while (true) {
      const id = slots[s]
      if (id === -1) {
        if (count === firstRow.length) firstRow = growInt(firstRow)
        firstRow[count] = i
        slots[s] = count
        hashes[s] = h
        ids[i] = count++
        if (count * 2 > cap) {
          cap <<= 1
          mask = cap - 1
          ;[slots, hashes] = rehash(slots, hashes, cap)
        }
        break
      }
      if (hashes[s] === (h | 0)) {
        const r = firstRow[id]
        let same = true
        for (let c = 0; c < k; c++) {
          if (cols[c][i] !== cols[c][r]) {
            same = false
            break
          }
        }
        if (same) {
          ids[i] = id
          break
        }
      }
      s = (s + 1) & mask
    }
  }
  return { ids, count, firstRow: firstRow.subarray(0, count) }
}

/** Dense ids for the rows of several key columns together. @internal */
export const groups = (keys: ReadonlyArray<V.Vector>, n: number): Groups => {
  if (keys.length === 0) return single(n)
  const parts = keys.map(ids)
  // Combine by direct indexing while the key space stays small, then hash
  // the remaining columns as one tuple.
  let acc = parts[0]
  let k = 1
  while (k < parts.length && acc.count * parts[k].count <= directLimit(n)) acc = combine(acc, parts[k++], n)
  if (k === parts.length) return acc
  return tupleIds([acc.ids, ...parts.slice(k).map((p) => p.ids)], n)
}

/**
 * The rows of every group, in row order: `rows[starts[g]..starts[g + 1])`.
 * Rows with a negative id are left out.
 *
 * @internal
 */
export const rowsByGroup = (
  ids: Int32Array,
  count: number
): { readonly starts: Int32Array; readonly rows: Int32Array } => {
  const n = ids.length
  const starts = new Int32Array(count + 1)
  for (let i = 0; i < n; i++) if (ids[i] >= 0) starts[ids[i] + 1]++
  for (let g = 0; g < count; g++) starts[g + 1] += starts[g]
  const at = starts.slice(0, count)
  const rows = new Int32Array(starts[count])
  for (let i = 0; i < n; i++) if (ids[i] >= 0) rows[at[ids[i]]++] = i
  return { starts, rows }
}

/** Rows where any key column is null. @internal */
export const anyNull = (keys: ReadonlyArray<V.Vector>, n: number): Uint8Array | undefined => {
  let out: Uint8Array | undefined
  for (const k of keys) {
    if (k.kind === "null") return new Uint8Array(n).fill(1)
    if (k.valid === undefined) continue
    if (out === undefined) out = new Uint8Array(n)
    for (let i = 0; i < n; i++) out[i] |= k.valid[i] ^ 1
  }
  return out
}
