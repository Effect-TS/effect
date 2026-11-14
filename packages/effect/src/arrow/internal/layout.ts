/**
 * Layout operations on `ArrowData`: slicing (free), normalising to offset 0
 * (for writing), and concatenating (for delta dictionaries). They follow the
 * Columnar format's rules for how each layout's buffers and children relate.
 *
 * @internal
 */
import type * as ArrowData from "../ArrowData.ts"
import type * as S from "../ArrowSchema.ts"

/** @internal */
export class LayoutFailure extends Error {}

const viewOf = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength)

const isBitSet = (bits: Uint8Array, i: number) => (bits[i >> 3] & (1 << (i & 7))) !== 0

const hasValidity = (type: S.DataType) => type._tag !== "Null" && type._tag !== "RunEndEncoded"

/** Counts the zero bits in `bits[start, start + length)`. */
const countZeros = (bits: Uint8Array, start: number, length: number): number => {
  let zeros = 0
  for (let i = start; i < start + length; i++) if (!isBitSet(bits, i)) zeros++
  return zeros
}

/** Copies `length` bits starting at bit `start` into a new bitmap starting at bit 0. */
const shiftBits = (bits: Uint8Array, start: number, length: number): Uint8Array => {
  if ((start & 7) === 0) return bits.subarray(start >> 3, (start + length + 7) >> 3)
  const out = new Uint8Array((length + 7) >> 3)
  for (let i = 0; i < length; i++) if (isBitSet(bits, start + i)) out[i >> 3] |= 1 << (i & 7)
  return out
}

/** Appends bitmap `b` (from bit `bStart`) after `aLength` bits of `a` (from bit `aStart`). */
const appendBits = (
  a: Uint8Array | undefined,
  aStart: number,
  aLength: number,
  b: Uint8Array | undefined,
  bStart: number,
  bLength: number
): Uint8Array => {
  const out = new Uint8Array((aLength + bLength + 7) >> 3)
  for (let i = 0; i < aLength; i++) if (a === undefined || isBitSet(a, aStart + i)) out[i >> 3] |= 1 << (i & 7)
  for (let i = 0; i < bLength; i++) {
    const j = aLength + i
    if (b === undefined || isBitSet(b, bStart + i)) out[j >> 3] |= 1 << (j & 7)
  }
  return out
}

const fixedWidth = (type: S.DataType): number => {
  switch (type._tag) {
    case "Int":
    case "Float":
    case "Decimal":
    case "Time":
      return type.bitWidth / 8
    case "Date":
      return type.unit === "day" ? 4 : 8
    case "Timestamp":
    case "Duration":
      return 8
    case "Interval":
      return type.unit === "yearMonth" ? 4 : type.unit === "dayTime" ? 8 : 16
    case "FixedSizeBinary":
      return type.byteWidth
    default:
      return 0
  }
}

const isLargeOffsets = (type: S.DataType) =>
  type._tag === "LargeBinary" || type._tag === "LargeUtf8" || type._tag === "LargeList" ||
  type._tag === "LargeListView"

const readOffset = (buffer: Uint8Array, large: boolean, i: number): number =>
  large ? Number(viewOf(buffer).getBigInt64(i * 8, true)) : viewOf(buffer).getInt32(i * 4, true)

/** Offsets `[start, start + length]` rebased to start at 0, plus the range they covered. */
const rebaseOffsets = (buffer: Uint8Array, large: boolean, start: number, length: number) => {
  const first = length === 0 && buffer.length === 0 ? 0 : readOffset(buffer, large, start)
  const last = length === 0 && buffer.length === 0 ? 0 : readOffset(buffer, large, start + length)
  const width = large ? 8 : 4
  if (first === 0) return { offsets: buffer.subarray(start * width, (start + length + 1) * width), first, last }
  if (large) {
    const out = new BigInt64Array(length + 1)
    const base = BigInt(first)
    const view = viewOf(buffer)
    for (let i = 0; i <= length; i++) out[i] = view.getBigInt64((start + i) * 8, true) - base
    return { offsets: new Uint8Array(out.buffer), first, last }
  }
  const out = new Int32Array(length + 1)
  const view = viewOf(buffer)
  for (let i = 0; i <= length; i++) out[i] = view.getInt32((start + i) * 4, true) - first
  return { offsets: new Uint8Array(out.buffer), first, last }
}

// -----------------------------------------------------------------------------
// Slicing
// -----------------------------------------------------------------------------

/** Slots `[start, end)` of `data`, without copying. @internal */
export const slice = (data: ArrowData.ArrowData, start: number, end: number): ArrowData.ArrowData => {
  if (!(start >= 0 && start <= end && end <= data.length)) {
    throw new RangeError(`slice ${start}..${end} is outside 0..${data.length}`)
  }
  const length = end - start
  const offset = data.offset + start
  const nullCount = data.type._tag === "Null"
    ? length
    : data.validity === undefined || data.nullCount === 0 || !hasValidity(data.type)
    ? 0
    : countZeros(data.validity, offset, length)
  return { ...data, offset, length, nullCount }
}

// -----------------------------------------------------------------------------
// Normalising
// -----------------------------------------------------------------------------

/** The run index holding logical slot `i` (first run whose end is past `i`). */
const runOf = (ends: (r: number) => number, runs: number, i: number): number => {
  let lo = 0
  let hi = runs - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (ends(mid) <= i) lo = mid + 1
    else hi = mid
  }
  return lo
}

const intReader = (type: S.Int, data: ArrowData.ArrowData) => {
  const view = viewOf(data.buffers[0])
  const width = type.bitWidth / 8
  return (i: number) => {
    const at = (data.offset + i) * width
    return width === 2
      ? view.getInt16(at, true)
      : width === 4
      ? view.getInt32(at, true)
      : Number(view.getBigInt64(at, true))
  }
}

const intBytes = (type: S.Int, values: ReadonlyArray<number>): Uint8Array => {
  const a = type.bitWidth === 16
    ? Int16Array.from(values)
    : type.bitWidth === 32
    ? Int32Array.from(values)
    : BigInt64Array.from(values, (v) => BigInt(v))
  return new Uint8Array(a.buffer)
}

/**
 * Returns data equal to `data` whose own offset and every child's offset is 0,
 * as the IPC format needs. Buffers are views where the layout allows it;
 * bitmaps not starting on a byte, rebased offsets and run ends are copied.
 * Returns `data` itself when nothing changes. @internal
 */
export const normalize = (data: ArrowData.ArrowData): ArrowData.ArrowData => {
  if (isNormal(data)) return data
  // A dictionary shared by many arrays must normalise to one object, so
  // writers still see one dictionary per id.
  const cached = normalized.get(data)
  if (cached !== undefined) return cached
  const result = normalizeData(data)
  normalized.set(data, result)
  return result
}

const normalized = new WeakMap<ArrowData.ArrowData, ArrowData.ArrowData>()

const isNormal = (data: ArrowData.ArrowData): boolean =>
  data.offset === 0 && data.children.every(isNormal) && (data.dictionary === undefined || isNormal(data.dictionary)) &&
  // Children of these layouts are addressed by slot, so they must not be longer than the parent.
  (data.type._tag !== "Struct" && !(data.type._tag === "Union" && data.type.mode === "sparse") ||
    data.children.every((c) => c.length === data.length))

const normalizeData = (data: ArrowData.ArrowData): ArrowData.ArrowData => {
  const type = data.type
  const o = data.offset
  const n = data.length
  const validity = data.validity === undefined || data.nullCount === 0 ? undefined : shiftBits(data.validity, o, n)
  const base = { type, offset: 0, length: n, nullCount: data.nullCount, validity, dictionary: data.dictionary }
  const same = (next: ArrowData.ArrowData) =>
    o === 0 && next.validity === data.validity && next.buffers.every((b, i) => b === data.buffers[i]) &&
      next.children.every((c, i) => c === data.children[i]) && next.dictionary === data.dictionary
      ? data
      : next
  switch (type._tag) {
    case "Null":
      return o === 0 ? data : { ...base, nullCount: n, validity: undefined, buffers: [], children: [] }
    case "Bool":
      return same({ ...base, buffers: [shiftBits(data.buffers[0], o, n)], children: [] })
    case "Binary":
    case "Utf8":
    case "LargeBinary":
    case "LargeUtf8": {
      const { first, last, offsets } = rebaseOffsets(data.buffers[0], isLargeOffsets(type), o, n)
      const values = first === 0 && last === data.buffers[1]?.length
        ? data.buffers[1]
        : data.buffers[1].subarray(first, last)
      return same({ ...base, buffers: [offsets, values], children: [] })
    }
    case "BinaryView":
    case "Utf8View":
      return same({
        ...base,
        buffers: [o === 0 ? data.buffers[0] : data.buffers[0].subarray(o * 16, (o + n) * 16), ...data.buffers.slice(1)],
        children: []
      })
    case "List":
    case "LargeList":
    case "Map": {
      const { first, last, offsets } = rebaseOffsets(data.buffers[0], isLargeOffsets(type), o, n)
      const child = data.children[0]
      const items = first === 0 && last === child.length && child.offset === 0
        ? normalize(child)
        : normalize(slice(child, first, last))
      return same({ ...base, buffers: [offsets], children: [items] })
    }
    case "ListView":
    case "LargeListView": {
      const width = isLargeOffsets(type) ? 8 : 4
      const buffers = o === 0
        ? data.buffers
        : [data.buffers[0].subarray(o * width, (o + n) * width), data.buffers[1].subarray(o * width, (o + n) * width)]
      return same({ ...base, buffers, children: [normalize(data.children[0])] })
    }
    case "FixedSizeList": {
      const k = type.listSize
      const child = data.children[0]
      const items = o === 0 && child.length === n * k ? normalize(child) : normalize(slice(child, o * k, (o + n) * k))
      return same({ ...base, buffers: [], children: [items] })
    }
    case "Struct":
      return same({
        ...base,
        buffers: [],
        children: data.children.map((c) => o === 0 && c.length === n ? normalize(c) : normalize(slice(c, o, o + n)))
      })
    case "Union": {
      const typeIds = o === 0 ? data.buffers[0] : data.buffers[0].subarray(o, o + n)
      if (type.mode === "sparse") {
        return same({
          ...base,
          buffers: [typeIds],
          children: data.children.map((c) => o === 0 && c.length === n ? normalize(c) : normalize(slice(c, o, o + n)))
        })
      }
      const offsets = o === 0 ? data.buffers[1] : data.buffers[1].subarray(o * 4, (o + n) * 4)
      return same({ ...base, buffers: [typeIds, offsets], children: data.children.map(normalize) })
    }
    case "RunEndEncoded": {
      const [runs, values] = data.children
      const runType = type.runEnds.type as S.Int
      if (o === 0 && runs.length > 0 && intReader(runType, runs)(runs.length - 1) === n) {
        return same({ ...base, validity: undefined, buffers: [], children: [normalize(runs), normalize(values)] })
      }
      const end = intReader(runType, runs)
      const firstRun = n === 0 ? 0 : runOf(end, runs.length, o)
      const lastRun = n === 0 ? -1 : runOf(end, runs.length, o + n - 1)
      const ends: Array<number> = []
      for (let r = firstRun; r <= lastRun; r++) ends.push(Math.min(end(r), o + n) - o)
      const runEnds: ArrowData.ArrowData = {
        type: runType,
        offset: 0,
        length: ends.length,
        nullCount: 0,
        validity: undefined,
        buffers: [intBytes(runType, ends)],
        children: [],
        dictionary: undefined
      }
      return {
        ...base,
        validity: undefined,
        nullCount: 0,
        buffers: [],
        children: [runEnds, normalize(slice(values, firstRun, lastRun + 1))]
      }
    }
    case "Dictionary": {
      const width = type.indexType.bitWidth / 8
      const indices = o === 0 ? data.buffers[0] : data.buffers[0].subarray(o * width, (o + n) * width)
      const dictionary = data.dictionary === undefined ? undefined : normalize(data.dictionary)
      return same({ ...base, buffers: [indices], children: [], dictionary })
    }
    default: {
      const width = fixedWidth(type)
      const values = o === 0 && data.buffers[0].length === n * width
        ? data.buffers[0]
        : data.buffers[0].subarray(o * width, (o + n) * width)
      return same({ ...base, buffers: [values], children: [] })
    }
  }
}

// -----------------------------------------------------------------------------
// Concatenating
// -----------------------------------------------------------------------------

const concatBytes = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

/** `b`'s offsets shifted by `shift`, appended to `a`'s (both normalised, `n + 1` entries each). */
const appendOffsets = (
  a: Uint8Array,
  aLength: number,
  b: Uint8Array,
  bLength: number,
  large: boolean,
  shift: number
): Uint8Array => {
  if (large) {
    const out = new BigInt64Array(aLength + bLength + 1)
    const av = viewOf(a)
    const bv = viewOf(b)
    for (let i = 0; i <= aLength; i++) {
      out[i] = aLength === 0 && a.length === 0
        ? BigInt(0)
        : av.getBigInt64(i * 8, true)
    }
    for (let i = 1; i <= bLength; i++) out[aLength + i] = bv.getBigInt64(i * 8, true) + BigInt(shift)
    return new Uint8Array(out.buffer)
  }
  const out = new Int32Array(aLength + bLength + 1)
  const av = viewOf(a)
  const bv = viewOf(b)
  for (let i = 0; i <= aLength; i++) out[i] = aLength === 0 && a.length === 0 ? 0 : av.getInt32(i * 4, true)
  for (let i = 1; i <= bLength; i++) out[aLength + i] = bv.getInt32(i * 4, true) + shift
  return new Uint8Array(out.buffer)
}

const lastOffset = (buffer: Uint8Array, large: boolean, length: number) =>
  length === 0 && buffer.length === 0 ? 0 : readOffset(buffer, large, length)

/** Appends `right` to `left` (same type), as delta dictionaries do. @internal */
export const concat = (left: ArrowData.ArrowData, right: ArrowData.ArrowData): ArrowData.ArrowData => {
  const a = normalize(left)
  const b = normalize(right)
  const type = a.type
  const length = a.length + b.length
  const nullCount = a.nullCount + b.nullCount
  const validity = !hasValidity(type) || (a.validity === undefined && b.validity === undefined)
    ? undefined
    : appendBits(a.validity, 0, a.length, b.validity, 0, b.length)
  const base = { type, offset: 0, length, nullCount, validity, dictionary: a.dictionary }
  switch (type._tag) {
    case "Null":
      return { ...base, validity: undefined, nullCount: length, buffers: [], children: [] }
    case "Bool":
      return {
        ...base,
        buffers: [appendBits(a.buffers[0], 0, a.length, b.buffers[0], 0, b.length)],
        children: []
      }
    case "Binary":
    case "Utf8":
    case "LargeBinary":
    case "LargeUtf8": {
      const large = isLargeOffsets(type)
      const aEnd = lastOffset(a.buffers[0], large, a.length)
      const bEnd = lastOffset(b.buffers[0], large, b.length)
      return {
        ...base,
        buffers: [
          appendOffsets(a.buffers[0], a.length, b.buffers[0], b.length, large, aEnd),
          concatBytes(a.buffers[1].subarray(0, aEnd), b.buffers[1].subarray(0, bEnd))
        ],
        children: []
      }
    }
    case "BinaryView":
    case "Utf8View": {
      const shift = a.buffers.length - 1
      const views = concatBytes(a.buffers[0].subarray(0, a.length * 16), b.buffers[0].subarray(0, b.length * 16))
      const view = viewOf(views)
      for (let i = a.length; i < length; i++) {
        if (view.getInt32(i * 16, true) > 12) view.setInt32(i * 16 + 8, view.getInt32(i * 16 + 8, true) + shift, true)
      }
      return { ...base, buffers: [views, ...a.buffers.slice(1), ...b.buffers.slice(1)], children: [] }
    }
    case "List":
    case "LargeList":
    case "Map": {
      const large = isLargeOffsets(type)
      return {
        ...base,
        buffers: [appendOffsets(a.buffers[0], a.length, b.buffers[0], b.length, large, a.children[0].length)],
        children: [concat(a.children[0], b.children[0])]
      }
    }
    case "ListView":
    case "LargeListView": {
      const large = isLargeOffsets(type)
      const width = large ? 8 : 4
      const offsets = concatBytes(
        a.buffers[0].subarray(0, a.length * width),
        b.buffers[0].subarray(0, b.length * width)
      )
      const view = viewOf(offsets)
      const shift = a.children[0].length
      for (let i = a.length; i < length; i++) {
        if (large) view.setBigInt64(i * 8, view.getBigInt64(i * 8, true) + BigInt(shift), true)
        else view.setInt32(i * 4, view.getInt32(i * 4, true) + shift, true)
      }
      const sizes = concatBytes(a.buffers[1].subarray(0, a.length * width), b.buffers[1].subarray(0, b.length * width))
      return { ...base, buffers: [offsets, sizes], children: [concat(a.children[0], b.children[0])] }
    }
    case "FixedSizeList":
      return { ...base, buffers: [], children: [concat(a.children[0], b.children[0])] }
    case "Struct":
      return { ...base, buffers: [], children: a.children.map((c, k) => concat(c, b.children[k])) }
    case "Union": {
      const typeIds = concatBytes(a.buffers[0].subarray(0, a.length), b.buffers[0].subarray(0, b.length))
      const children = a.children.map((c, k) => concat(c, b.children[k]))
      if (type.mode === "sparse") return { ...base, buffers: [typeIds], children }
      const offsets = concatBytes(a.buffers[1].subarray(0, a.length * 4), b.buffers[1].subarray(0, b.length * 4))
      const view = viewOf(offsets)
      for (let i = a.length; i < length; i++) {
        const member = type.typeIds.indexOf((typeIds[i] << 24) >> 24)
        view.setInt32(i * 4, view.getInt32(i * 4, true) + a.children[member].length, true)
      }
      return { ...base, buffers: [typeIds, offsets], children }
    }
    case "RunEndEncoded": {
      const runType = type.runEnds.type as S.Int
      const ends: Array<number> = []
      const aEnd = intReader(runType, a.children[0])
      const bEnd = intReader(runType, b.children[0])
      for (let r = 0; r < a.children[0].length; r++) ends.push(aEnd(r))
      for (let r = 0; r < b.children[0].length; r++) ends.push(bEnd(r) + a.length)
      const limit = runType.bitWidth === 16 ? 32767 : runType.bitWidth === 32 ? 2147483647 : Number.MAX_SAFE_INTEGER
      if (length > limit) throw new LayoutFailure(`run ends overflow int${runType.bitWidth}`)
      const runEnds: ArrowData.ArrowData = {
        type: runType,
        offset: 0,
        length: ends.length,
        nullCount: 0,
        validity: undefined,
        buffers: [intBytes(runType, ends)],
        children: [],
        dictionary: undefined
      }
      return {
        ...base,
        validity: undefined,
        nullCount: 0,
        buffers: [],
        children: [runEnds, concat(a.children[1], b.children[1])]
      }
    }
    case "Dictionary": {
      if (a.dictionary !== b.dictionary) throw new LayoutFailure("concatenating data with different dictionaries")
      const width = type.indexType.bitWidth / 8
      return {
        ...base,
        buffers: [concatBytes(a.buffers[0].subarray(0, a.length * width), b.buffers[0].subarray(0, b.length * width))],
        children: []
      }
    }
    default: {
      const width = fixedWidth(type)
      return {
        ...base,
        buffers: [concatBytes(a.buffers[0].subarray(0, a.length * width), b.buffers[0].subarray(0, b.length * width))],
        children: []
      }
    }
  }
}
