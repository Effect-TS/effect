/**
 * Value and level decoders for the Parquet encodings
 * (https://github.com/apache/parquet-format/blob/apache-parquet-format-2.14.0/Encodings.md).
 *
 * Every decoder reads from `bytes[pos, end)` and throws a {@link Failure} instead of
 * reading past `end`. Values come out dense: one entry per non-null value.
 *
 * @internal
 */

/** @internal */
export class Failure {
  readonly kind: "Malformed" | "Unsupported" | "Limit"
  readonly message: string
  constructor(kind: "Malformed" | "Unsupported" | "Limit", message: string) {
    this.kind = kind
    this.message = message
  }
}

/** @internal */
export const fail = (kind: Failure["kind"], message: string): never => {
  throw new Failure(kind, message)
}

/**
 * How a physical type's values are held while decoding: `bool` one byte (0 or 1) per
 * value, `fixed` `width` bytes per value (INT96 and FIXED_LEN_BYTE_ARRAY), `bytes`
 * offsets into concatenated data (BYTE_ARRAY).
 *
 * @internal
 */
export type Kind =
  | { readonly tag: "bool" }
  | { readonly tag: "i32" | "f32"; readonly width: 4 }
  | { readonly tag: "i64" | "f64"; readonly width: 8 }
  | { readonly tag: "fixed"; readonly width: number }
  | { readonly tag: "bytes" }

/** @internal */
export interface Binary {
  readonly offsets: Int32Array
  readonly data: Uint8Array
}

/** @internal */
export type Dense = Uint8Array | Int32Array | BigInt64Array | Float32Array | Float64Array | Binary

/** Bytes of BYTE_ARRAY data a column chunk may still produce. @internal */
export interface Budget {
  left: number
}

const spend = (budget: Budget, n: number): void => {
  if (n > budget.left) fail("Limit", "the column chunk's BYTE_ARRAY values exceed maxBinaryLength")
  budget.left -= n
}

const POW2: Array<number> = []
for (let i = 0; i <= 64; i++) POW2.push(2 ** i)

const littleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1

/** Reads `n` little-endian values of `width` bytes into a fresh typed array. */
const fixedLE = <A>(
  bytes: Uint8Array,
  pos: number,
  n: number,
  width: number,
  make: (buffer: ArrayBuffer, length: number) => A,
  get: (view: DataView, at: number) => number | bigint
): A => {
  const copy = bytes.slice(pos, pos + n * width)
  const out = make(copy.buffer, n)
  if (!littleEndian) {
    const view = new DataView(copy.buffer)
    const target = out as unknown as Array<number | bigint>
    for (let i = 0; i < n; i++) target[i] = get(view, i * width)
  }
  return out
}

const fromLE = (kind: Kind, bytes: Uint8Array, pos: number, n: number): Dense => {
  switch (kind.tag) {
    case "i32":
      return fixedLE(bytes, pos, n, 4, (b, l) => new Int32Array(b, 0, l), (v, at) => v.getInt32(at, true))
    case "f32":
      return fixedLE(bytes, pos, n, 4, (b, l) => new Float32Array(b, 0, l), (v, at) => v.getFloat32(at, true))
    case "i64":
      return fixedLE(bytes, pos, n, 8, (b, l) => new BigInt64Array(b, 0, l), (v, at) => v.getBigInt64(at, true))
    case "f64":
      return fixedLE(bytes, pos, n, 8, (b, l) => new Float64Array(b, 0, l), (v, at) => v.getFloat64(at, true))
    default:
      return bytes.slice(pos, pos + n * (kind as { readonly width: number }).width)
  }
}

/**
 * Reads values of up to 32 bits packed from the least significant bit of each byte, as
 * the RLE/bit-packed hybrid and DELTA_BINARY_PACKED store them. The caller checks that
 * the bytes are there.
 */
class BitReader {
  private buffer = 0
  private bits = 0
  private readonly bytes: Uint8Array
  private pos: number
  constructor(bytes: Uint8Array, pos: number) {
    this.bytes = bytes
    this.pos = pos
  }
  read(width: number): number {
    while (this.bits < width) {
      this.buffer += this.bytes[this.pos++] * POW2[this.bits]
      this.bits += 8
    }
    const value = this.buffer % POW2[width]
    this.buffer = (this.buffer - value) / POW2[width]
    this.bits -= width
    return value
  }
}

/** An unsigned LEB128 varint of at most 32 bits, and where it ends. */
const uleb32 = (bytes: Uint8Array, pos: number, end: number, what: string): readonly [number, number] => {
  let result = 0
  for (let shift = 0; shift < 35; shift += 7) {
    if (pos >= end) return fail("Malformed", `${what} is truncated`)
    const b = bytes[pos++]
    result += (b & 0x7f) * POW2[shift]
    if (b < 0x80) {
      if (result > 0xffffffff) break
      return [result, pos]
    }
  }
  return fail("Malformed", `${what} is longer than 32 bits`)
}

const BIG_7 = BigInt(7)
const BIG_1 = BigInt(1)
const BIG_0x7f = BigInt(0x7f)

/** A zigzag ULEB128 varint of at most 64 bits, and where it ends. */
const zigzag64 = (bytes: Uint8Array, pos: number, end: number, what: string): readonly [bigint, number] => {
  let result = BigInt(0)
  for (let i = 0; i < 10; i++) {
    if (pos >= end) return fail("Malformed", `${what} is truncated`)
    const b = bytes[pos++]
    if (i === 9 && b > 1) break
    result |= (BigInt(b) & BIG_0x7f) << (BIG_7 * BigInt(i))
    if (b < 0x80) return [(result >> BIG_1) ^ -(result & BIG_1), pos]
  }
  return fail("Malformed", `${what} is longer than 64 bits`)
}

/** The bit width of values from 0 to `max`. @internal */
export const bitWidth = (max: number): number => max === 0 ? 0 : 32 - Math.clz32(max)

/**
 * Decodes `n` values of the RLE/bit-packed hybrid (no length prefix) into `out`, and
 * returns where the runs ended.
 *
 * @internal
 */
export const hybrid = (
  bytes: Uint8Array,
  pos: number,
  end: number,
  width: number,
  n: number,
  out: Uint8Array | Int32Array,
  what: string
): number => {
  const valueBytes = (width + 7) >> 3
  let i = 0
  while (i < n) {
    if (pos >= end) fail("Malformed", `${what} end after ${i} of ${n} values`)
    const [header, start] = uleb32(bytes, pos, end, `${what} run header`)
    const runLength = Math.floor(header / 2)
    if (runLength === 0) fail("Malformed", `${what} has a run of length 0`)
    if (header % 2 === 1) {
      // runLength groups of 8 values, each group `width` bytes
      const take = Math.min(runLength * 8, n - i)
      if (Math.ceil(take * width / 8) > end - start) fail("Malformed", `${what} has a truncated bit-packed run`)
      const reader = new BitReader(bytes, start)
      for (let k = 0; k < take; k++) out[i++] = reader.read(width)
      pos = Math.min(start + runLength * width, end)
    } else {
      if (valueBytes > end - start) fail("Malformed", `${what} has a truncated RLE run`)
      let value = 0
      for (let k = 0; k < valueBytes; k++) value += bytes[start + k] * POW2[8 * k]
      if (value >= POW2[width]) fail("Malformed", `${what} has an RLE value wider than ${width} bits`)
      const stop = Math.min(i + runLength, n)
      out.fill(value, i, stop)
      i = stop
      pos = start + valueBytes
    }
  }
  return pos
}

/**
 * Decodes `n` values of the deprecated BIT_PACKED level encoding (most significant bit
 * first, no runs), and returns where they end.
 *
 * @internal
 */
export const bitPacked = (
  bytes: Uint8Array,
  pos: number,
  end: number,
  width: number,
  n: number,
  out: Uint8Array,
  what: string
): number => {
  const size = Math.ceil(n * width / 8)
  if (size > end - pos) fail("Malformed", `${what} need ${size} bytes`)
  let at = pos
  let bit = 0
  for (let i = 0; i < n; i++) {
    let value = 0
    for (let k = 0; k < width; k++) {
      value = (value << 1) | ((bytes[at] >> (7 - bit)) & 1)
      if (++bit === 8) {
        bit = 0
        at++
      }
    }
    out[i] = value
  }
  return pos + size
}

/** Reads the 4-byte little-endian length that prefixes some hybrid runs, and returns where the runs end. @internal */
export const lengthPrefix = (bytes: Uint8Array, pos: number, end: number, what: string): number => {
  if (end - pos < 4) fail("Malformed", `${what} length is truncated`)
  const length = (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0
  if (length > end - pos - 4) fail("Malformed", `${what} of ${length} bytes is longer than the page`)
  return pos + 4 + length
}

const readLength = (bytes: Uint8Array, pos: number): number =>
  (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0

/**
 * Decodes `n` PLAIN values.
 *
 * @internal
 */
export const plain = (kind: Kind, bytes: Uint8Array, pos: number, end: number, n: number, budget: Budget): Dense => {
  switch (kind.tag) {
    case "bool": {
      if (Math.ceil(n / 8) > end - pos) fail("Malformed", `PLAIN BOOLEAN values need ${Math.ceil(n / 8)} bytes`)
      const out = new Uint8Array(n)
      for (let i = 0; i < n; i++) out[i] = (bytes[pos + (i >> 3)] >> (i & 7)) & 1
      return out
    }
    case "bytes": {
      let total = 0
      let p = pos
      for (let i = 0; i < n; i++) {
        if (end - p < 4) fail("Malformed", `PLAIN BYTE_ARRAY value ${i} of ${n} is truncated`)
        const length = readLength(bytes, p)
        p += 4
        if (length > end - p) fail("Malformed", `PLAIN BYTE_ARRAY value ${i} of ${length} bytes is truncated`)
        p += length
        total += length
      }
      spend(budget, total)
      const offsets = new Int32Array(n + 1)
      const data = new Uint8Array(total)
      p = pos
      for (let i = 0, at = 0; i < n; i++) {
        const length = readLength(bytes, p)
        data.set(bytes.subarray(p + 4, p + 4 + length), at)
        p += 4 + length
        offsets[i + 1] = at += length
      }
      return { offsets, data }
    }
    default: {
      const size = n * kind.width
      if (size > end - pos) fail("Malformed", `PLAIN values need ${size} bytes`)
      return fromLE(kind, bytes, pos, n)
    }
  }
}

/**
 * Decodes `n` BYTE_STREAM_SPLIT values, which fill the rest of the page.
 *
 * @internal
 */
export const byteStreamSplit = (kind: Kind, bytes: Uint8Array, pos: number, end: number, n: number): Dense => {
  const width = (kind as { readonly width: number }).width
  if (end - pos !== n * width) {
    fail("Malformed", `BYTE_STREAM_SPLIT data of ${end - pos} bytes is not ${n} values of ${width} bytes`)
  }
  const joined = new Uint8Array(n * width)
  for (let k = 0; k < width; k++) {
    const stream = pos + k * n
    for (let i = 0; i < n; i++) joined[i * width + k] = bytes[stream + i]
  }
  return fromLE(kind, joined, 0, n)
}

/**
 * Decodes a DELTA_BINARY_PACKED stream that must hold exactly `n` values, and returns
 * them with where the stream ends.
 *
 * @internal
 */
export const deltaBinaryPacked: {
  (bytes: Uint8Array, pos: number, end: number, n: number, wide: false): readonly [Int32Array, number]
  (bytes: Uint8Array, pos: number, end: number, n: number, wide: true): readonly [BigInt64Array, number]
} = ((bytes: Uint8Array, pos: number, end: number, n: number, wide: boolean) => {
  const what = "DELTA_BINARY_PACKED header"
  const [blockSize, p1] = uleb32(bytes, pos, end, what)
  const [miniblocks, p2] = uleb32(bytes, p1, end, what)
  const [total, p3] = uleb32(bytes, p2, end, what)
  const [first, p4] = zigzag64(bytes, p3, end, what)
  if (blockSize === 0 || blockSize % 128 !== 0) {
    fail("Malformed", `DELTA_BINARY_PACKED block size ${blockSize} is not a multiple of 128`)
  }
  if (miniblocks === 0 || blockSize % miniblocks !== 0 || (blockSize / miniblocks) % 32 !== 0) {
    fail(
      "Malformed",
      `DELTA_BINARY_PACKED blocks of ${blockSize} values can't hold ${miniblocks} miniblocks of a multiple of 32 values`
    )
  }
  if (total !== n) fail("Malformed", `DELTA_BINARY_PACKED holds ${total} values, expected ${n}`)
  const perMiniblock = blockSize / miniblocks
  const maxWidth = wide ? 64 : 32
  const out = wide ? new BigInt64Array(n) : new Int32Array(n)
  pos = p4
  if (n === 0) return [out, pos]
  let last32 = Number(BigInt.asIntN(32, first))
  let last64 = BigInt.asIntN(64, first)
  if (wide) (out as BigInt64Array)[0] = last64
  else (out as Int32Array)[0] = last32
  let i = 1
  while (i < n) {
    const [minDelta, widths] = zigzag64(bytes, pos, end, "DELTA_BINARY_PACKED block")
    if (miniblocks > end - widths) fail("Malformed", "DELTA_BINARY_PACKED miniblock bit widths are truncated")
    pos = widths + miniblocks
    const minDelta32 = Number(BigInt.asIntN(32, minDelta))
    for (let m = 0; m < miniblocks && i < n; m++) {
      const width = bytes[widths + m]
      if (width > maxWidth) {
        fail("Malformed", `DELTA_BINARY_PACKED miniblock bit width ${width} is wider than ${maxWidth}`)
      }
      const size = perMiniblock * width / 8
      if (size > end - pos) fail("Malformed", "DELTA_BINARY_PACKED miniblock is truncated")
      const reader = new BitReader(bytes, pos)
      const take = Math.min(perMiniblock, n - i)
      if (wide) {
        const target = out as BigInt64Array
        for (let k = 0; k < take; k++) {
          const delta = width <= 32
            ? BigInt(reader.read(width))
            : BigInt(reader.read(32)) | (BigInt(reader.read(width - 32)) << BigInt(32))
          target[i++] = last64 = BigInt.asIntN(64, last64 + minDelta + delta)
        }
      } else {
        const target = out as Int32Array
        for (let k = 0; k < take; k++) target[i++] = last32 = (last32 + minDelta32 + reader.read(width)) | 0
      }
      pos += size
    }
  }
  return [out, pos]
}) as never

const lengths = (
  bytes: Uint8Array,
  pos: number,
  end: number,
  n: number,
  what: string
): readonly [Int32Array, number] => {
  const [values, next] = deltaBinaryPacked(bytes, pos, end, n, false)
  for (let i = 0; i < n; i++) if (values[i] < 0) fail("Malformed", `${what} ${values[i]} is negative`)
  return [values, next]
}

/**
 * Decodes `n` DELTA_LENGTH_BYTE_ARRAY values, and returns them with where they end.
 *
 * @internal
 */
export const deltaLengthByteArray = (
  bytes: Uint8Array,
  pos: number,
  end: number,
  n: number,
  budget: Budget
): readonly [Binary, number] => {
  const [sizes, start] = lengths(bytes, pos, end, n, "DELTA_LENGTH_BYTE_ARRAY length")
  const offsets = new Int32Array(n + 1)
  let total = 0
  for (let i = 0; i < n; i++) {
    total += sizes[i]
    if (total > end - start) fail("Malformed", "DELTA_LENGTH_BYTE_ARRAY data is truncated")
    offsets[i + 1] = total
  }
  spend(budget, total)
  return [{ offsets, data: bytes.slice(start, start + total) }, start + total]
}

/**
 * Decodes `n` DELTA_BYTE_ARRAY values.
 *
 * @internal
 */
export const deltaByteArray = (bytes: Uint8Array, pos: number, end: number, n: number, budget: Budget): Binary => {
  const [prefixes, next] = lengths(bytes, pos, end, n, "DELTA_BYTE_ARRAY prefix length")
  const [suffixes] = deltaLengthByteArray(bytes, next, end, n, budget)
  const offsets = new Int32Array(n + 1)
  let total = 0
  for (let i = 0; i < n; i++) {
    const prefix = prefixes[i]
    if (i === 0 ? prefix !== 0 : prefix > offsets[i] - offsets[i - 1]) {
      fail("Malformed", `DELTA_BYTE_ARRAY value ${i} has a prefix of ${prefix} bytes, longer than the value before it`)
    }
    total += prefix + suffixes.offsets[i + 1] - suffixes.offsets[i]
    offsets[i + 1] = total
  }
  spend(budget, total - suffixes.data.length)
  const out = new Uint8Array(total)
  for (let i = 0; i < n; i++) {
    const at = offsets[i]
    const prefix = prefixes[i]
    if (prefix > 0) out.copyWithin(at, offsets[i - 1], offsets[i - 1] + prefix)
    out.set(suffixes.data.subarray(suffixes.offsets[i], suffixes.offsets[i + 1]), at + prefix)
  }
  return { offsets, data: out }
}

/**
 * Converts BYTE_ARRAY values that must all be `width` bytes long to fixed-width values.
 *
 * @internal
 */
export const toFixed = (values: Binary, width: number, what: string): Uint8Array => {
  const n = values.offsets.length - 1
  for (let i = 0; i < n; i++) {
    const length = values.offsets[i + 1] - values.offsets[i]
    if (length !== width) fail("Malformed", `${what} value ${i} has ${length} bytes, not ${width}`)
  }
  return values.data
}

/** The number of values in `dense`. @internal */
export const lengthOf = (kind: Kind, dense: Dense): number =>
  kind.tag === "bytes"
    ? (dense as Binary).offsets.length - 1
    : kind.tag === "fixed"
    ? (dense as Uint8Array).length / kind.width
    : (dense as Uint8Array).length

/**
 * Looks up dictionary `indices` in `dictionary`.
 *
 * @internal
 */
export const gather = (kind: Kind, dictionary: Dense, indices: Int32Array, budget: Budget): Dense => {
  const size = lengthOf(kind, dictionary)
  const n = indices.length
  for (let i = 0; i < n; i++) {
    const index = indices[i]
    if (index < 0 || index >= size) {
      fail("Malformed", `dictionary index ${index >>> 0} is out of range for a dictionary of ${size} values`)
    }
  }
  switch (kind.tag) {
    case "bytes": {
      const dict = dictionary as Binary
      const offsets = new Int32Array(n + 1)
      let total = 0
      for (let i = 0; i < n; i++) offsets[i + 1] = total += dict.offsets[indices[i] + 1] - dict.offsets[indices[i]]
      spend(budget, total)
      const data = new Uint8Array(total)
      for (let i = 0; i < n; i++) {
        data.set(dict.data.subarray(dict.offsets[indices[i]], dict.offsets[indices[i] + 1]), offsets[i])
      }
      return { offsets, data }
    }
    case "fixed": {
      const dict = dictionary as Uint8Array
      const width = kind.width
      const out = new Uint8Array(n * width)
      for (let i = 0; i < n; i++) out.set(dict.subarray(indices[i] * width, (indices[i] + 1) * width), i * width)
      return out
    }
    default: {
      const dict = dictionary as Int32Array
      const out = new (dict.constructor as Int32ArrayConstructor)(n)
      for (let i = 0; i < n; i++) out[i] = dict[indices[i]]
      return out
    }
  }
}

/**
 * Concatenates dense values decoded page by page.
 *
 * @internal
 */
export const concat = (kind: Kind, chunks: ReadonlyArray<Dense>): Dense => {
  if (chunks.length === 1) return chunks[0]
  if (kind.tag === "bytes") {
    const parts = chunks as ReadonlyArray<Binary>
    let count = 0
    let total = 0
    for (const part of parts) {
      count += part.offsets.length - 1
      total += part.data.length
    }
    const offsets = new Int32Array(count + 1)
    const data = new Uint8Array(total)
    let i = 0
    let at = 0
    for (const part of parts) {
      for (let k = 1; k < part.offsets.length; k++) offsets[++i] = at + part.offsets[k]
      data.set(part.data, at)
      at += part.data.length
    }
    return { offsets, data }
  }
  const parts = chunks as ReadonlyArray<Int32Array>
  let total = 0
  for (const part of parts) total += part.length
  const out = new (empty(kind).constructor as Int32ArrayConstructor)(total)
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

/** No values of `kind`. @internal */
export const empty = (kind: Kind): Dense => {
  switch (kind.tag) {
    case "i32":
      return new Int32Array(0)
    case "i64":
      return new BigInt64Array(0)
    case "f32":
      return new Float32Array(0)
    case "f64":
      return new Float64Array(0)
    case "bytes":
      return { offsets: new Int32Array(1), data: new Uint8Array(0) }
    default:
      return new Uint8Array(0)
  }
}
