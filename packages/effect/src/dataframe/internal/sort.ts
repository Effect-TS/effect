/**
 * Stable multi-key sorting.
 *
 * Keys are sorted least significant first, each with a stable pass, so the
 * result is ordered by the first key, then the second, and so on. Numeric
 * keys turn into unsigned words whose order matches the key order (Float64
 * keys: NaN last, `-0` equal to `0`) and go through an LSD radix sort with
 * 16-bit digits. String keys are ranked: their distinct values are sorted
 * once by UTF-8 bytes and the rows radix-sorted by rank.
 *
 * @internal
 */
import * as Hash from "./hash.ts"
import { compareBytes } from "./kernels.ts"
import * as V from "./vector.ts"

/** @internal */
export interface SortKey {
  readonly vector: V.Vector
  readonly descending: boolean
}

const SMALL = 512

/** The row order that sorts `keys`; nulls first unless `nullsLast`. @internal */
export const permutation = (keys: ReadonlyArray<SortKey>, nullsLast: boolean, n: number): Int32Array => {
  let perm: Int32Array = new Int32Array(n)
  for (let i = 0; i < n; i++) perm[i] = i
  if (n < 2) return perm
  if (n <= SMALL) return smallSort(keys, nullsLast, perm)
  for (let k = keys.length - 1; k >= 0; k--) perm = sortByKey(keys[k], nullsLast, perm)
  return perm
}

// -----------------------------------------------------------------------------
// Keys as unsigned words
// -----------------------------------------------------------------------------

/** One or two 32-bit words per row (most significant first), in row order. @internal */
export const words = (key: SortKey): { readonly hi: Uint32Array | undefined; readonly lo: Uint32Array } => {
  const v = key.vector
  const n = v.length
  if (v.kind === "list" || v.kind === "struct") return V.fail(`cannot sort by ${v.type._tag} columns`)
  const flip = key.descending ? 0xffffffff : 0
  switch (v.kind) {
    case "i32": {
      const lo = new Uint32Array(n)
      const x = v.values
      for (let i = 0; i < n; i++) lo[i] = ((x[i] ^ 0x80000000) ^ flip) >>> 0
      return { hi: undefined, lo }
    }
    case "bool": {
      const lo = new Uint32Array(n)
      const x = v.values
      for (let i = 0; i < n; i++) lo[i] = (x[i] ^ flip) >>> 0
      return { hi: undefined, lo }
    }
    case "f64": {
      const tmp = new Float64Array(n)
      const x = v.values
      for (let i = 0; i < n; i++) {
        const a = x[i]
        tmp[i] = a === 0 ? 0 : a !== a ? NaN : a
      }
      const bits = new Uint32Array(tmp.buffer)
      const hi = new Uint32Array(n)
      const lo = new Uint32Array(n)
      for (let i = 0; i < n; i++) {
        let l = bits[2 * i]
        let h = bits[2 * i + 1]
        if ((h & 0x80000000) !== 0) {
          h = ~h
          l = ~l
        } else h ^= 0x80000000
        hi[i] = (h ^ flip) >>> 0
        lo[i] = (l ^ flip) >>> 0
      }
      return { hi, lo }
    }
    case "i64": {
      const bits = new Uint32Array(v.values.buffer, v.values.byteOffset, n * 2)
      const signFlip = V.isUnsigned64(v.type) ? 0 : 0x80000000
      const hi = new Uint32Array(n)
      const lo = new Uint32Array(n)
      for (let i = 0; i < n; i++) {
        hi[i] = ((bits[2 * i + 1] ^ signFlip) ^ flip) >>> 0
        lo[i] = (bits[2 * i] ^ flip) >>> 0
      }
      return { hi, lo }
    }
    case "str": {
      const g = Hash.ids(v)
      const order = new Int32Array(g.count)
      for (let i = 0; i < g.count; i++) order[i] = i
      const off = v.offsets
      const d = v.data
      const sorted = Array.from(order).sort((a, b) => {
        const ra = g.firstRow[a]
        const rb = g.firstRow[b]
        return compareBytes(d, off[ra], off[ra + 1], d, off[rb], off[rb + 1])
      })
      const rank = new Uint32Array(g.count)
      for (let r = 0; r < sorted.length; r++) rank[sorted[r]] = r
      const lo = new Uint32Array(n)
      for (let i = 0; i < n; i++) lo[i] = (rank[g.ids[i]] ^ flip) >>> 0
      return { hi: undefined, lo }
    }
    case "null":
      return { hi: undefined, lo: new Uint32Array(n) }
  }
}

const f64Scratch = new Float64Array(1)
const f64Words = new Uint32Array(f64Scratch.buffer)

/**
 * The words of rows `perm[from..to)` written to `lo`/`hi` at `from..to`,
 * the same words as {@link words}. Only for keys whose words don't depend
 * on other rows (everything but strings).
 *
 * @internal
 */
export const fillWords = (
  key: SortKey,
  perm: Int32Array,
  from: number,
  to: number,
  lo: Uint32Array,
  hi: Uint32Array | undefined
): void => {
  const v = key.vector
  const flip = key.descending ? 0xffffffff : 0
  switch (v.kind) {
    case "i32": {
      const x = v.values
      for (let i = from; i < to; i++) lo[i] = ((x[perm[i]] ^ 0x80000000) ^ flip) >>> 0
      return
    }
    case "bool": {
      const x = v.values
      for (let i = from; i < to; i++) lo[i] = (x[perm[i]] ^ flip) >>> 0
      return
    }
    case "f64": {
      const x = v.values
      for (let i = from; i < to; i++) {
        const a = x[perm[i]]
        f64Scratch[0] = a === 0 ? 0 : a !== a ? NaN : a
        let l = f64Words[0]
        let h = f64Words[1]
        if ((h & 0x80000000) !== 0) {
          h = ~h
          l = ~l
        } else h ^= 0x80000000
        hi![i] = (h ^ flip) >>> 0
        lo[i] = (l ^ flip) >>> 0
      }
      return
    }
    case "i64": {
      const bits = new Uint32Array(v.values.buffer, v.values.byteOffset, v.length * 2)
      const signFlip = V.isUnsigned64(v.type) ? 0 : 0x80000000
      for (let i = from; i < to; i++) {
        const r = perm[i]
        hi![i] = ((bits[2 * r + 1] ^ signFlip) ^ flip) >>> 0
        lo[i] = (bits[2 * r] ^ flip) >>> 0
      }
      return
    }
    case "null":
      lo.fill(0, from, to)
      return
    case "str":
      return V.fail("string sort keys need ranks")
  }
}

/** Whether a key's words have a high word. @internal */
export const hasHighWord = (v: V.Vector): boolean => v.kind === "f64" || v.kind === "i64"

// -----------------------------------------------------------------------------
// Radix passes
// -----------------------------------------------------------------------------

const counts = new Uint32Array(65537)

/**
 * Stable LSD radix sort of `perm` by `keys` (in perm order), 16 bits per
 * pass; skips passes whose digit is constant.
 */
const radix = (perm: Int32Array, hi: Uint32Array | undefined, lo: Uint32Array): Int32Array => {
  const n = perm.length
  let p: Int32Array = perm
  let h: Uint32Array | undefined = hi
  let l: Uint32Array = lo
  let p2: Int32Array = new Int32Array(n)
  let h2: Uint32Array | undefined = hi === undefined ? undefined : new Uint32Array(n)
  let l2: Uint32Array = new Uint32Array(n)
  const passes: Array<[boolean, number]> = [[false, 0], [false, 16]]
  if (hi !== undefined) passes.push([true, 0], [true, 16])
  for (const [useHi, shift] of passes) {
    const src = useHi ? h! : l
    counts.fill(0)
    for (let i = 0; i < n; i++) counts[((src[i] >>> shift) & 0xffff) + 1]++
    // constant digit: nothing to do
    let constant = false
    for (let b = 1; b <= 65536; b++) {
      if (counts[b] === n) {
        constant = true
        break
      }
      if (counts[b] !== 0) break
    }
    if (constant) continue
    for (let b = 1; b <= 65536; b++) counts[b] += counts[b - 1]
    for (let i = 0; i < n; i++) {
      const at = counts[(src[i] >>> shift) & 0xffff]++
      p2[at] = p[i]
      l2[at] = l[i]
      if (h !== undefined) h2![at] = h[i]
    }
    ;[p, p2] = [p2, p]
    ;[l, l2] = [l2, l]
    if (h !== undefined) [h, h2] = [h2, h]
  }
  return p
}

const sortByKey = (key: SortKey, nullsLast: boolean, perm: Int32Array): Int32Array => {
  const n = perm.length
  const w = words(key)
  // keys in current perm order
  const lo = new Uint32Array(n)
  const hi = w.hi === undefined ? undefined : new Uint32Array(n)
  for (let i = 0; i < n; i++) {
    const r = perm[i]
    lo[i] = w.lo[r]
    if (hi !== undefined) hi[i] = w.hi![r]
  }
  const sorted = radix(perm, hi, lo)
  return partitionNulls(key.vector, sorted, nullsLast)
}

/** Moves null keys to the front (or back), keeping order on both sides. @internal */
export const partitionNulls = (v: V.Vector, perm: Int32Array, nullsLast: boolean): Int32Array => {
  if (v.kind !== "null" && v.valid === undefined) return perm
  const n = perm.length
  const out = new Int32Array(n)
  let nulls = 0
  for (let i = 0; i < n; i++) if (!V.isValid(v, perm[i])) nulls++
  let a = nullsLast ? 0 : nulls
  let b = nullsLast ? n - nulls : 0
  for (let i = 0; i < n; i++) {
    const r = perm[i]
    if (V.isValid(v, r)) out[a++] = r
    else out[b++] = r
  }
  return out
}

// -----------------------------------------------------------------------------
// Small inputs: one comparator sort
// -----------------------------------------------------------------------------

/** Compares two rows by the keys; ties go to the earlier row. */
const comparator = (keys: ReadonlyArray<SortKey>, nullsLast: boolean): (a: number, b: number) => number => {
  const prepared = keys.map((k) => ({ k, w: words(k) }))
  return (a, b) => {
    for (const { k, w } of prepared) {
      const av = V.isValid(k.vector, a)
      const bv = V.isValid(k.vector, b)
      if (!av || !bv) {
        if (av === bv) continue
        return (av ? 1 : -1) * (nullsLast ? -1 : 1)
      }
      if (w.hi !== undefined && w.hi[a] !== w.hi[b]) return w.hi[a] < w.hi[b] ? -1 : 1
      if (w.lo[a] !== w.lo[b]) return w.lo[a] < w.lo[b] ? -1 : 1
    }
    return a - b
  }
}

const smallSort = (keys: ReadonlyArray<SortKey>, nullsLast: boolean, perm: Int32Array): Int32Array =>
  Int32Array.from(Array.from(perm).sort(comparator(keys, nullsLast)))

/**
 * The first `k` rows of the order that sorts `keys`, without sorting the
 * rest: one pass that keeps the best `k` rows in a heap.
 *
 * @internal
 */
export const topK = (keys: ReadonlyArray<SortKey>, nullsLast: boolean, n: number, k: number): Int32Array => {
  if (k <= 0) return new Int32Array(0)
  if (n <= SMALL || k * 8 > n) return permutation(keys, nullsLast, n).subarray(0, Math.min(k, n))
  const cmp = comparator(keys, nullsLast)
  // A max-heap: the root is the worst of the best `k` rows so far.
  const heap = new Int32Array(k)
  const down = (size: number) => {
    let i = 0
    while (true) {
      const l = 2 * i + 1
      if (l >= size) return
      const r = l + 1
      const c = r < size && cmp(heap[r], heap[l]) > 0 ? r : l
      if (cmp(heap[c], heap[i]) <= 0) return
      const t = heap[c]
      heap[c] = heap[i]
      heap[i] = t
      i = c
    }
  }
  for (let i = 0; i < k; i++) {
    heap[i] = i
    let j = i
    while (j > 0) {
      const p = (j - 1) >> 1
      if (cmp(heap[j], heap[p]) <= 0) break
      const t = heap[p]
      heap[p] = heap[j]
      heap[j] = t
      j = p
    }
  }
  for (let i = k; i < n; i++) {
    if (cmp(i, heap[0]) < 0) {
      heap[0] = i
      down(k)
    }
  }
  return Int32Array.from(Array.from(heap).sort(cmp))
}
