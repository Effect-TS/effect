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
import * as S from "../ArrowSchema.ts"
import * as Buffers from "./buffers.ts"
import * as Layout from "./layout.ts"

/** @internal */
export type Reader = (index: number) => unknown

/** @internal */
export interface Options {
  readonly extensions: ReadonlyMap<string, ArrowExtension.ArrowExtension<any, any>>
  /** Read storage values: stored integers instead of `DateTime`, `Duration` and `BigDecimal`, no extension decoding. */
  readonly storage: boolean
}

/** @internal */
export const options = (
  input: {
    readonly extensions?: Iterable<ArrowExtension.ArrowExtension<any, any>> | undefined
    readonly representation?: "domain" | "storage" | undefined
  } | undefined
): Options => ({
  extensions: new Map(Array.from(input?.extensions ?? [], (e) => [e.name, e] as const)),
  storage: input?.representation === "storage"
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

/** Reads the unscaled value of a decimal. */
const unscaledReader = (type: S.Decimal, bytes: Uint8Array, offset: number): (i: number) => bigint => {
  if (type.bitWidth === 32) {
    const a = typed(Int32Array, bytes)
    return (i) => BigInt(a[i + offset])
  }
  if (type.bitWidth === 64) {
    const a = typed(BigInt64Array, bytes)
    return (i) => a[i + offset]
  }
  const words = type.bitWidth / 64
  const a = typed(BigUint64Array, bytes)
  const bits = BigInt(type.bitWidth)
  const shift = BigInt(64)
  return (i) => {
    const base = (i + offset) * words
    let v = a[base + words - 1]
    for (let w = words - 2; w >= 0; w--) v = (v << shift) | a[base + w]
    return BigInt.asIntN(Number(bits), v)
  }
}

const msPerDay = 86_400_000

// The range DateTime accepts: the `Date` range for Utc values, narrowed by the largest offsets for zoned ones.
const maxMillis = 8640000000000000
const minZonedMillis = -maxMillis + 12 * 60 * 60 * 1000
const maxZonedMillis = maxMillis - 14 * 60 * 60 * 1000

/** A `DateTime.Utc`, or `raw` (the stored integer) outside the range `DateTime` accepts. */
const utc = (ms: number, raw: number | bigint): DateTime.Utc | number | bigint =>
  ms >= -maxMillis && ms <= maxMillis ? InternalDateTime.makeUtc(ms) : raw

/** A `DateTime.Zoned`, or `raw` (the stored integer) outside the range `DateTime` accepts. */
const zoned = (ms: number, zone: DateTime.TimeZone, raw: bigint): DateTime.Zoned | bigint =>
  ms >= minZonedMillis && ms <= maxZonedMillis ? InternalDateTime.makeZonedProto(ms, zone) : raw

const bigThousand = BigInt(1000)
const bigMillion = BigInt(1_000_000)

/** Epoch milliseconds of a raw timestamp in `unit`, rounding toward negative infinity. */
const toMillis = (unit: S.TimeUnit, raw: bigint): number => {
  switch (unit) {
    case "second":
      return Number(raw) * 1000
    case "millisecond":
      return Number(raw)
    case "microsecond":
      return Number(floorDiv(raw, bigThousand))
    case "nanosecond":
      return Number(floorDiv(raw, bigMillion))
  }
}

/** `a / b` rounded toward negative infinity, for `b > 0`. @internal */
export const floorDiv = (a: bigint, b: bigint): bigint => {
  const q = a / b
  return a < BigInt(0) && q * b !== a ? q - BigInt(1) : q
}

/** @internal */
export const nanosPerUnit: Record<S.TimeUnit, bigint> = {
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

/** Decoded dictionaries, per options (extensions and the representation change the values) and dictionary. */
const dictionaryValues = new WeakMap<Options, WeakMap<ArrowData.ArrowData, ReadonlyArray<unknown>>>()

/**
 * Compiles a reader for `data` of `field`. Invalid slots read as `null`.
 * Extension types registered in `options` decode their storage values, unless
 * storage values are asked for.
 *
 * @internal
 */
export const reader = (field: S.Field, data: ArrowData.ArrowData, options: Options): Reader => {
  const plain = readerFor(field.type, data, options)
  const ext = options.storage ? undefined : extensionOf(field, options)
  if (ext === undefined) return plain
  const { extension, metadata } = ext
  return (i) => {
    const v = plain(i)
    return v === null ? null : extension.decode(v, metadata)
  }
}

/** The extension registered in `options` for `field`, with the field's extension metadata. @internal */
export const extensionOf = (
  field: S.Field,
  options: Options
): { readonly extension: ArrowExtension.ArrowExtension<any, any>; readonly metadata: string } | undefined => {
  const name = field.metadata.get("ARROW:extension:name")
  const extension = name === undefined ? undefined : options.extensions.get(name)
  return extension === undefined
    ? undefined
    : { extension, metadata: field.metadata.get("ARROW:extension:metadata") ?? "" }
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
  const storage = options.storage
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
    case "Decimal": {
      const unscaled = unscaledReader(type, buffers[0], offset)
      const scale = type.scale
      return withValidity(data, storage ? unscaled : (i) => BigDecimal.make(unscaled(i), scale))
    }
    case "Date": {
      if (type.unit === "day") {
        const a = typed(Int32Array, buffers[0])
        return withValidity(
          data,
          storage ? (i) => a[i + offset] : (i) => utc(a[i + offset] * msPerDay, a[i + offset])
        )
      }
      const a = typed(BigInt64Array, buffers[0])
      return withValidity(data, storage ? (i) => a[i + offset] : (i) => utc(Number(a[i + offset]), a[i + offset]))
    }
    case "Timestamp": {
      const a = typed(BigInt64Array, buffers[0])
      if (storage) return withValidity(data, (i) => a[i + offset])
      const unit = type.unit
      const zone = type.timezone === undefined
        ? undefined
        : Option.getOrUndefined(DateTime.zoneFromString(type.timezone))
      return withValidity(
        data,
        zone === undefined
          ? (i) => utc(toMillis(unit, a[i + offset]), a[i + offset])
          : (i) => zoned(toMillis(unit, a[i + offset]), zone, a[i + offset])
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
      return withValidity(data, storage ? (i) => a[i + offset] : (i) => durationOf(unit, a[i + offset]))
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
      return withValidity(data, (i) => items(item, at(i + offset), at(i + offset + 1)))
    }
    case "ListView":
    case "LargeListView": {
      const large = type._tag === "LargeListView"
      const at = offsetsOf(buffers[0], large)
      const size = offsetsOf(buffers[1], large)
      const item = reader(type.child, data.children[0], options)
      return withValidity(data, (i) => {
        const start = at(i + offset)
        return items(item, start, start + size(i + offset))
      })
    }
    case "FixedSizeList": {
      const n = type.listSize
      const item = reader(type.child, data.children[0], options)
      return withValidity(data, (i) => items(item, (i + offset) * n, (i + offset + 1) * n))
    }
    case "Struct": {
      const names = type.fields.map((f) => f.name)
      const members = type.fields.map((f, k) => reader(f, data.children[k], options))
      return withValidity(data, record(names, members, offset))
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
      return (i) => value(Layout.runOf(runEnd, n, i + offset))
    }
    case "Dictionary": {
      const dictionary = data.dictionary!
      const index = intAsNumber(type.indexType, buffers[0], offset)
      const valueField = S.field("", type.valueType)
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

/** Items `start` (inclusive) to `end` (exclusive) through `item`. */
const items = (item: Reader, start: number, end: number): Array<unknown> => {
  const out = new Array(end > start ? end - start : 0)
  for (let k = start; k < end; k++) out[k - start] = item(k)
  return out
}

/** Reads slot `i` as an object with `names[k]` set to `members[k](i + offset)`. @internal */
export const record =
  (names: ReadonlyArray<string>, members: ReadonlyArray<Reader>, offset: number) =>
  (i: number): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (let k = 0; k < names.length; k++) setProperty(out, names[k], members[k](i + offset))
    return out
  }

/** The index `i` with `starts[i] <= x < starts[i + 1]` (the last one when several match). @internal */
export const slotOf = (starts: ArrayLike<number>, x: number): number => {
  let lo = 0
  let hi = starts.length - 2
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1
    if (starts[mid] <= x) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * Sets `out[name]` as an own property, also when `name` is `__proto__`
 * (which assignment would treat as the prototype). @internal
 */
export const setProperty = (out: Record<string, unknown>, name: string, value: unknown): void => {
  if (name === "__proto__") {
    Object.defineProperty(out, name, { value, writable: true, enumerable: true, configurable: true })
  } else out[name] = value
}

/** Reads `v[name]`, where `__proto__` is only ever an own property. @internal */
export const getProperty = (v: object, name: string): unknown =>
  name === "__proto__" && !Object.hasOwn(v, name) ? undefined : (v as Record<string, unknown>)[name]

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
