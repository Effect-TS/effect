/**
 * Compiles a reader `(index) => value` for one array, following the value
 * mapping documented in `ArrowColumn`.
 *
 * @internal
 */
import * as BigDecimal from "../../BigDecimal.ts"
import * as DateTime from "../../DateTime.ts"
import * as Duration from "../../Duration.ts"
import * as InternalDateTime from "../../internal/dateTime.ts"
import * as Option from "../../Option.ts"
import type * as ArrowData from "../ArrowData.ts"
import type * as ArrowExtension from "../ArrowExtension.ts"
import type * as S from "../ArrowSchema.ts"
import * as Buffers from "./buffers.ts"

/** @internal */
export type Reader = (index: number) => unknown

/** @internal */
export interface Options {
  readonly extensions: ReadonlyMap<string, ArrowExtension.ArrowExtension<any, any>>
}

/** @internal */
export const options = (
  input: { readonly extensions?: Iterable<ArrowExtension.ArrowExtension<any, any>> | undefined } | undefined
): Options => ({
  extensions: new Map(Array.from(input?.extensions ?? [], (e) => [e.name, e] as const))
})

const utf8Decoder = new TextDecoder("utf-8")

/**
 * Decodes `bytes[start..end]`. Short ASCII strings are built directly, which
 * is about twice as fast as a `TextDecoder` call per value.
 */
const decodeUtf8 = (bytes: Uint8Array, start: number, end: number): string => {
  if (end - start <= 32) {
    let out = ""
    for (let i = start; i < end; i++) {
      const c = bytes[i]
      if (c > 127) return utf8Decoder.decode(bytes.subarray(start, end))
      out += String.fromCharCode(c)
    }
    return out
  }
  return utf8Decoder.decode(bytes.subarray(start, end))
}

const typed = Buffers.typed

const viewOf = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength)

/** Reads 32- or 64-bit offsets as numbers. */
const offsetsOf = (bytes: Uint8Array, large: boolean): (i: number) => number => {
  if (!large) {
    const a = typed(Int32Array, bytes)
    return (i) => a[i]
  }
  const a = typed(BigInt64Array, bytes)
  return (i) => Number(a[i])
}

const intReader = (type: S.Int, bytes: Uint8Array, offset: number): Reader => {
  switch (type.bitWidth) {
    case 8: {
      const a = type.signed ? typed(Int8Array, bytes) : bytes
      return (i) => a[i + offset]
    }
    case 16: {
      const a = type.signed ? typed(Int16Array, bytes) : typed(Uint16Array, bytes)
      return (i) => a[i + offset]
    }
    case 32: {
      const a = type.signed ? typed(Int32Array, bytes) : typed(Uint32Array, bytes)
      return (i) => a[i + offset]
    }
    case 64: {
      const a = type.signed ? typed(BigInt64Array, bytes) : typed(BigUint64Array, bytes)
      return (i) => a[i + offset]
    }
  }
}

/** Reads a raw integer column as numbers (indices, run ends). */
const intAsNumber = (type: S.Int, bytes: Uint8Array, offset: number): (i: number) => number => {
  const read = intReader(type, bytes, offset)
  return type.bitWidth === 64 ? (i) => Number(read(i) as bigint) : (read as (i: number) => number)
}

const decimalReader = (type: S.Decimal, bytes: Uint8Array, offset: number): Reader => {
  const scale = type.scale
  if (type.bitWidth === 32) {
    const a = typed(Int32Array, bytes)
    return (i) => BigDecimal.make(BigInt(a[i + offset]), scale)
  }
  if (type.bitWidth === 64) {
    const a = typed(BigInt64Array, bytes)
    return (i) => BigDecimal.make(a[i + offset], scale)
  }
  const words = type.bitWidth / 64
  const a = typed(BigUint64Array, bytes)
  const bits = BigInt(type.bitWidth)
  const shift = BigInt(64)
  return (i) => {
    const base = (i + offset) * words
    let v = a[base + words - 1]
    for (let w = words - 2; w >= 0; w--) v = (v << shift) | a[base + w]
    return BigDecimal.make(BigInt.asIntN(Number(bits), v), scale)
  }
}

const msPerDay = 86_400_000

// The range DateTime accepts for zoned values; Utc values may use the full Date range.
const minZonedMillis = -8640000000000000 + 12 * 60 * 60 * 1000
const maxZonedMillis = 8640000000000000 - 14 * 60 * 60 * 1000

/** A `DateTime.Utc` without the `Date` round trip `DateTime.makeUnsafe` makes. */
const utc = (ms: number): DateTime.Utc =>
  ms >= -8640000000000000 && ms <= 8640000000000000 ? InternalDateTime.makeUtc(ms) : DateTime.makeUnsafe(ms)

const zoned = (ms: number, zone: DateTime.TimeZone): DateTime.Zoned =>
  ms >= minZonedMillis && ms <= maxZonedMillis
    ? InternalDateTime.makeZonedProto(ms, zone)
    : DateTime.makeZonedUnsafe(ms, { timeZone: zone })
const bigThousand = BigInt(1000)
const bigMillion = BigInt(1_000_000)

/** Epoch milliseconds of a raw timestamp in `unit`, rounding toward negative infinity. */
const toMillis = (unit: S.TimeUnit, raw: bigint): number => {
  switch (unit) {
    case "second":
      return Number(raw) * 1000
    case "millisecond":
      return Number(raw)
    case "microsecond": {
      const q = raw / bigThousand
      return Number(raw < 0 && q * bigThousand !== raw ? q - BigInt(1) : q)
    }
    case "nanosecond": {
      const q = raw / bigMillion
      return Number(raw < 0 && q * bigMillion !== raw ? q - BigInt(1) : q)
    }
  }
}

const nanosPerUnit: Record<S.TimeUnit, bigint> = {
  second: BigInt(1_000_000_000),
  millisecond: BigInt(1_000_000),
  microsecond: BigInt(1000),
  nanosecond: BigInt(1)
}

/** Exact for every 64-bit value: the duration is built from bigint nanoseconds. */
const durationOf = (unit: S.TimeUnit, raw: bigint): Duration.Duration => Duration.nanos(raw * nanosPerUnit[unit])

const intervalReader = (type: S.Interval, bytes: Uint8Array, offset: number): Reader => {
  switch (type.unit) {
    case "yearMonth": {
      const a = typed(Int32Array, bytes)
      return (i) => ({ months: a[i + offset] })
    }
    case "dayTime": {
      const a = typed(Int32Array, bytes)
      return (i) => ({ days: a[(i + offset) * 2], milliseconds: a[(i + offset) * 2 + 1] })
    }
    case "monthDayNano": {
      const view = viewOf(bytes)
      return (i) => {
        const at = (i + offset) * 16
        return {
          months: view.getInt32(at, true),
          days: view.getInt32(at + 4, true),
          nanoseconds: view.getBigInt64(at + 8, true)
        }
      }
    }
  }
}

/** Decoded dictionaries, per options (extensions change the values) and dictionary. */
const dictionaryValues = new WeakMap<Options, WeakMap<ArrowData.ArrowData, ReadonlyArray<unknown>>>()

/**
 * Compiles a reader for `data` of `field`. Invalid slots read as `null`.
 * Extension types registered in `options` decode their storage values.
 *
 * @internal
 */
export const reader = (field: S.Field, data: ArrowData.ArrowData, options: Options): Reader => {
  const plain = readerFor(field.type, data, options)
  const extensionName = field.metadata.get("ARROW:extension:name")
  const extension = extensionName === undefined ? undefined : options.extensions.get(extensionName)
  if (extension === undefined) return plain
  const metadata = field.metadata.get("ARROW:extension:metadata") ?? ""
  return (i) => {
    const v = plain(i)
    return v === null ? null : extension.decode(v, metadata)
  }
}

const withValidity = (data: ArrowData.ArrowData, read: Reader): Reader => {
  const validity = data.validity
  if (validity === undefined || data.nullCount === 0) return read
  const offset = data.offset
  return (i) => {
    const bit = i + offset
    return (validity[bit >> 3] & (1 << (bit & 7))) === 0 ? null : read(i)
  }
}

const readerFor = (type: S.DataType, data: ArrowData.ArrowData, options: Options): Reader => {
  const offset = data.offset
  const buffers = data.buffers
  switch (type._tag) {
    case "Null":
      return () => null
    case "Bool": {
      const bits = buffers[0]
      return withValidity(data, (i) => (bits[(i + offset) >> 3] & (1 << ((i + offset) & 7))) !== 0)
    }
    case "Int":
      return withValidity(data, intReader(type, buffers[0], offset))
    case "Float": {
      if (type.bitWidth === 16) {
        const view = viewOf(buffers[0])
        return withValidity(data, (i) => (view as any).getFloat16((i + offset) * 2, true))
      }
      const a = type.bitWidth === 32 ? typed(Float32Array, buffers[0]) : typed(Float64Array, buffers[0])
      return withValidity(data, (i) => a[i + offset])
    }
    case "Decimal":
      return withValidity(data, decimalReader(type, buffers[0], offset))
    case "Date": {
      if (type.unit === "day") {
        const a = typed(Int32Array, buffers[0])
        return withValidity(data, (i) => utc(a[i + offset] * msPerDay))
      }
      const a = typed(BigInt64Array, buffers[0])
      return withValidity(data, (i) => utc(Number(a[i + offset])))
    }
    case "Timestamp": {
      const a = typed(BigInt64Array, buffers[0])
      const unit = type.unit
      const zone = type.timezone === undefined
        ? undefined
        : Option.getOrUndefined(DateTime.zoneFromString(type.timezone))
      return withValidity(
        data,
        zone === undefined
          ? (i) => utc(toMillis(unit, a[i + offset]))
          : (i) => zoned(toMillis(unit, a[i + offset]), zone)
      )
    }
    case "Time": {
      if (type.bitWidth === 32) {
        const a = typed(Int32Array, buffers[0])
        return withValidity(data, (i) => a[i + offset])
      }
      const a = typed(BigInt64Array, buffers[0])
      return withValidity(data, (i) => a[i + offset])
    }
    case "Duration": {
      const a = typed(BigInt64Array, buffers[0])
      const unit = type.unit
      return withValidity(data, (i) => durationOf(unit, a[i + offset]))
    }
    case "Interval":
      return withValidity(data, intervalReader(type, buffers[0], offset))
    case "Binary":
    case "LargeBinary":
    case "Utf8":
    case "LargeUtf8": {
      const at = offsetsOf(buffers[0], type._tag === "LargeBinary" || type._tag === "LargeUtf8")
      const bytes = buffers[1]
      return type._tag === "Binary" || type._tag === "LargeBinary"
        ? withValidity(data, (i) => bytes.subarray(at(i + offset), at(i + offset + 1)))
        : withValidity(data, (i) => decodeUtf8(bytes, at(i + offset), at(i + offset + 1)))
    }
    case "FixedSizeBinary": {
      const bytes = buffers[0]
      const w = type.byteWidth
      return withValidity(data, (i) => bytes.subarray((i + offset) * w, (i + offset + 1) * w))
    }
    case "BinaryView":
    case "Utf8View": {
      const views = buffers[0]
      const view = viewOf(views)
      const isString = type._tag === "Utf8View"
      return withValidity(data, (i) => {
        const at = (i + offset) * 16
        const size = view.getInt32(at, true)
        if (size <= 12) {
          return isString
            ? decodeUtf8(views, at + 4, at + 4 + size)
            : views.subarray(at + 4, at + 4 + size)
        }
        const source = buffers[1 + view.getInt32(at + 8, true)]
        const start = view.getInt32(at + 12, true)
        return isString ? decodeUtf8(source, start, start + size) : source.subarray(start, start + size)
      })
    }
    case "List":
    case "LargeList": {
      const at = offsetsOf(buffers[0], type._tag === "LargeList")
      const item = reader(type.child, data.children[0], options)
      return withValidity(data, (i) => {
        const start = at(i + offset)
        const end = at(i + offset + 1)
        const out: Array<unknown> = new Array(end > start ? end - start : 0)
        for (let k = start; k < end; k++) out[k - start] = item(k)
        return out
      })
    }
    case "ListView":
    case "LargeListView": {
      const large = type._tag === "LargeListView"
      const at = offsetsOf(buffers[0], large)
      const size = offsetsOf(buffers[1], large)
      const item = reader(type.child, data.children[0], options)
      return withValidity(data, (i) => {
        const start = at(i + offset)
        const end = start + size(i + offset)
        const out: Array<unknown> = []
        for (let k = start; k < end; k++) out.push(item(k))
        return out
      })
    }
    case "FixedSizeList": {
      const n = type.listSize
      const item = reader(type.child, data.children[0], options)
      return withValidity(data, (i) => {
        const out: Array<unknown> = new Array(n)
        const start = (i + offset) * n
        for (let k = 0; k < n; k++) out[k] = item(start + k)
        return out
      })
    }
    case "Struct": {
      const names = type.fields.map((f) => f.name)
      const members = type.fields.map((f, k) => reader(f, data.children[k], options))
      return withValidity(data, (i) => {
        const out: Record<string, unknown> = {}
        for (let k = 0; k < names.length; k++) out[names[k]] = members[k](i + offset)
        return out
      })
    }
    case "Map": {
      const at = offsetsOf(buffers[0], false)
      const entriesType = type.entries.type as S.Struct
      const entries = data.children[0]
      const key = reader(entriesType.fields[0], entries.children[0], options)
      const value = reader(entriesType.fields[1], entries.children[1], options)
      return withValidity(data, (i) => {
        const out = new Map<unknown, unknown>()
        const end = at(i + offset + 1)
        for (let k = at(i + offset); k < end; k++) out.set(key(k + entries.offset), value(k + entries.offset))
        return out
      })
    }
    case "Union": {
      const ids = typed(Int8Array, buffers[0])
      const members = type.fields.map((f, k) => reader(f, data.children[k], options))
      const memberOf = new Int8Array(128).fill(-1)
      type.typeIds.forEach((code, k) => (memberOf[code] = k))
      if (type.mode === "sparse") {
        return withValidity(data, (i) => members[memberOf[ids[i + offset]]](i + offset))
      }
      const offsets = typed(Int32Array, buffers[1])
      return withValidity(data, (i) => members[memberOf[ids[i + offset]]](offsets[i + offset]))
    }
    case "RunEndEncoded": {
      const runs = data.children[0]
      const runEnd = intAsNumber(type.runEnds.type as S.Int, runs.buffers[0], runs.offset)
      const value = reader(type.values, data.children[1], options)
      const n = runs.length
      return (i) => {
        const logical = i + offset
        let lo = 0
        let hi = n - 1
        while (lo < hi) {
          const mid = (lo + hi) >>> 1
          if (runEnd(mid) <= logical) lo = mid + 1
          else hi = mid
        }
        return value(lo)
      }
    }
    case "Dictionary": {
      const dictionary = data.dictionary!
      const index = intAsNumber(type.indexType, buffers[0], offset)
      const valueField: S.Field = { name: "", type: type.valueType, nullable: true, metadata: new Map() }
      let cache = dictionaryValues.get(options)
      if (cache === undefined) dictionaryValues.set(options, cache = new WeakMap())
      const byDictionary = cache
      // Decoded once per dictionary (shared by every array that uses it), resolved once per reader.
      let values: ReadonlyArray<unknown> | undefined
      const resolve = (): ReadonlyArray<unknown> => {
        let decoded = byDictionary.get(dictionary)
        if (decoded === undefined) {
          const read = reader(valueField, dictionary, options)
          decoded = new Array(dictionary.length)
          for (let k = 0; k < dictionary.length; k++) (decoded as Array<unknown>)[k] = read(k)
          byDictionary.set(dictionary, decoded)
        }
        return values = decoded
      }
      return withValidity(data, (i) => (values ?? resolve())[index(i)])
    }
  }
}

/**
 * Iterates `length(c)` values of each chunk `c` through `readerOf(c)`, without
 * a generator (about four times cheaper per value). @internal
 */
export const iterate = <A>(
  chunks: number,
  lengthOf: (chunk: number) => number,
  readerOf: (chunk: number) => (index: number) => A
): Iterator<A> => {
  let chunk = -1
  let index = 0
  let length = 0
  let read: ((index: number) => A) | undefined
  return {
    next() {
      while (index >= length) {
        if (++chunk >= chunks) return { done: true, value: undefined }
        index = 0
        length = lengthOf(chunk)
        read = readerOf(chunk)
      }
      return { done: false, value: read!(index++) }
    }
  }
}
