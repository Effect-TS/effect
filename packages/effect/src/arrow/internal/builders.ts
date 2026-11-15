/**
 * Builds `ArrowData` from JavaScript values, accepting what the readers in
 * `values.ts` return (plus raw integers for temporal types, which keep full
 * precision).
 *
 * @internal
 */
import * as BigDecimal from "../../BigDecimal.ts"
import * as DateTime from "../../DateTime.ts"
import * as Duration from "../../Duration.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import type * as ArrowData from "../ArrowData.ts"
import type * as S from "../ArrowSchema.ts"
import * as Layout from "./layout.ts"
import type { Options } from "./values.ts"

interface DictionaryState {
  readonly valueType: S.DataType
  readonly unique: Map<string, number>
  readonly values: Array<unknown>
  /** Where each value first occurred: `at[k](slot[k])`. */
  readonly at: Array<At>
  readonly slot: Array<number>
  built?: ArrowData.ArrowData
}

/**
 * One build: extensions plus the dictionaries being collected. All arrays
 * built in a session share one dictionary per id, which grows as values
 * arrive; {@link finish} attaches the final dictionaries. @internal
 */
export interface Session extends Options {
  readonly dictionaries: Map<number, DictionaryState>
  /** The items of each non-array iterable read so far, so one-shot iterables can be read again. */
  readonly items: WeakMap<object, ReadonlyArray<unknown>>
}

/** @internal */
export const session = (options: Options): Session => ({ ...options, dictionaries: new Map(), items: new WeakMap() })

/** Placeholders standing in for dictionaries until {@link finish}. */
const pending = new WeakMap<ArrowData.ArrowData, DictionaryState>()

const builtDictionary = (state: DictionaryState, s: Session): ArrowData.ArrowData => {
  if (state.built === undefined) {
    const inner: Session = { ...s, dictionaries: new Map() }
    const field: S.Field = { name: "", type: state.valueType, nullable: true, metadata: new Map() }
    state.built = finish(build(field, state.values, inner, (k) => state.at[k](state.slot[k])), inner)
  }
  return state.built
}

/** Replaces dictionary placeholders with the session's final dictionaries. @internal */
export const finish = (data: ArrowData.ArrowData, s: Session): ArrowData.ArrowData => {
  const state = data.dictionary === undefined ? undefined : pending.get(data.dictionary)
  const dictionary = state === undefined ? data.dictionary : builtDictionary(state, s)
  let changed = dictionary !== data.dictionary
  const children = data.children.map((c) => {
    const next = finish(c, s)
    if (next !== c) changed = true
    return next
  })
  return changed ? { ...data, dictionary, children } : data
}

/** @internal */
export class BuildFailure extends Error {
  readonly path: ReadonlyArray<string | number>
  constructor(message: string, path: ReadonlyArray<string | number>) {
    super(message)
    this.path = path
  }
}

/** @internal */
export interface UnionValue {
  readonly _tag: "UnionValue"
  readonly typeId: number
  readonly value: unknown
}

/** @internal */
export const isUnionValue = (u: unknown): u is UnionValue => Predicate.isTagged(u, "UnionValue")

type Path = ReadonlyArray<string | number>

/**
 * Locates value `index` of the array being built, from the top of the input
 * (row, column, members, item indices). Only called on failure. @internal
 */
export type At = (index: number) => Path

const fail = (path: Path, message: string): never => {
  throw new BuildFailure(message, path)
}

const failAt = (at: At, index: number, message: string): never => fail(at(index), message)

/** Fails with a `BuildFailure` at `path` when `type` is invalid (union type ids). @internal */
export const checkType = (type: S.DataType, path: Path): void =>
  Layout.checkUnions(type, (message) => fail(path, message))

const describe = (v: unknown) =>
  v === null ? "null" : typeof v === "object" ? (v.constructor?.name ?? "object") : `${typeof v} ${String(v)}`

const isNull = (v: unknown) => v === null || v === undefined

// -----------------------------------------------------------------------------
// Byte helpers
// -----------------------------------------------------------------------------

class Bytes {
  bytes = new Uint8Array(64)
  length = 0
  /** Appends the UTF-8 bytes of `s` without an intermediate array. */
  pushString(s: string) {
    this.ensure(s.length * 3)
    this.length += encoder.encodeInto(s, this.bytes.subarray(this.length)).written
  }
  push(chunk: Uint8Array) {
    this.ensure(chunk.length)
    this.bytes.set(chunk, this.length)
    this.length += chunk.length
  }
  ensure(n: number) {
    if (this.length + n <= this.bytes.length) return
    let size = this.bytes.length * 2
    while (size < this.length + n) size *= 2
    const next = new Uint8Array(size)
    next.set(this.bytes.subarray(0, this.length))
    this.bytes = next
  }
  /** The written bytes; a view when the unused tail is small, a trimmed copy otherwise. */
  finish(): Uint8Array {
    return this.bytes.length - this.length <= this.length >> 2
      ? this.bytes.subarray(0, this.length)
      : this.bytes.slice(0, this.length)
  }
}

const encoder = new TextEncoder()

const validityOf = (values: ReadonlyArray<unknown>): { validity: Uint8Array | undefined; nullCount: number } => {
  let nullCount = 0
  for (const v of values) if (isNull(v)) nullCount++
  if (nullCount === 0) return { validity: undefined, nullCount }
  const validity = new Uint8Array(Math.ceil(values.length / 8))
  values.forEach((v, i) => {
    if (!isNull(v)) validity[i >> 3] |= 1 << (i & 7)
  })
  return { validity, nullCount }
}

const asBytes = (a: ArrayBufferView) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)

// -----------------------------------------------------------------------------
// Scalars
// -----------------------------------------------------------------------------

const intRange = (t: S.Int): readonly [bigint, bigint] => {
  const bits = BigInt(t.bitWidth)
  return t.signed
    ? [-(BigInt(1) << (bits - BigInt(1))), (BigInt(1) << (bits - BigInt(1))) - BigInt(1)]
    : [BigInt(0), (BigInt(1) << bits) - BigInt(1)]
}

const toBigInt = (v: unknown, at: At, index: number, what: string): bigint => {
  if (typeof v === "bigint") return v
  if (typeof v === "number" && Number.isInteger(v)) return BigInt(v)
  return failAt(at, index, `expected an integer (${what}), got ${describe(v)}`)
}

const outOfRange = (t: S.Int, v: unknown, at: At, index: number): never =>
  failAt(at, index, `${v} is outside the range of ${t.signed ? "" : "u"}int${t.bitWidth}`)

const int32: S.Int = { _tag: "Int", bitWidth: 32, signed: true }
const int64: S.Int = { _tag: "Int", bitWidth: 64, signed: true }

/** `big`, failing when it does not fit `t`. */
const checked = (t: S.Int, big: bigint, at: At, index: number): bigint => {
  const [min, max] = intRange(t)
  return big < min || big > max ? outOfRange(t, big, at, index) : big
}

const intBuffer = (t: S.Int, values: ReadonlyArray<unknown>, at: At): Uint8Array => {
  const n = values.length
  if (t.bitWidth === 64) {
    const a = t.signed ? new BigInt64Array(n) : new BigUint64Array(n)
    for (let i = 0; i < n; i++) {
      const v = values[i]
      if (!isNull(v)) a[i] = checked(t, toBigInt(v, at, i, "int64"), at, i)
    }
    return asBytes(a)
  }
  // Numbers are checked as numbers; only bigint input goes through bigint comparisons.
  const [bigMin, bigMax] = intRange(t)
  const min = Number(bigMin)
  const max = Number(bigMax)
  const a = t.bitWidth === 8
    ? (t.signed ? new Int8Array(n) : new Uint8Array(n))
    : t.bitWidth === 16
    ? (t.signed ? new Int16Array(n) : new Uint16Array(n))
    : (t.signed ? new Int32Array(n) : new Uint32Array(n))
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (typeof v === "number") {
      if (!(Number.isInteger(v) && v >= min && v <= max)) {
        if (Number.isInteger(v)) outOfRange(t, v, at, i)
        failAt(at, i, `expected an integer (int${t.bitWidth}), got ${describe(v)}`)
      }
      a[i] = v
    } else if (!isNull(v)) {
      const big = toBigInt(v, at, i, `int${t.bitWidth}`)
      if (big < bigMin || big > bigMax) outOfRange(t, v, at, i)
      a[i] = Number(big)
    }
  }
  return asBytes(a)
}

/** Signed 64-bit storage of non-null values through `f`, range-checked. */
const int64Buffer = (
  values: ReadonlyArray<unknown>,
  f: (v: unknown, at: At, index: number) => bigint,
  at: At
) => {
  const a = new BigInt64Array(values.length)
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!isNull(v)) a[i] = checked(int64, f(v, at, i), at, i)
  }
  return asBytes(a)
}

/** Signed 32-bit storage of non-null values through `f`, range-checked. */
const int32Buffer = (
  values: ReadonlyArray<unknown>,
  f: (v: unknown, at: At, index: number) => bigint,
  at: At
) => {
  const a = new Int32Array(values.length)
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!isNull(v)) a[i] = Number(checked(int32, f(v, at, i), at, i))
  }
  return asBytes(a)
}

const unitNanos: Record<S.TimeUnit, bigint> = {
  second: BigInt(1_000_000_000),
  millisecond: BigInt(1_000_000),
  microsecond: BigInt(1000),
  nanosecond: BigInt(1)
}

const floorDiv = (a: bigint, b: bigint) => {
  const q = a / b
  return a < BigInt(0) && q * b !== a ? q - BigInt(1) : q
}

/** A DateTime as an integer count of `unit`, or a raw integer already in `unit`. */
const instant = (unit: S.TimeUnit, v: unknown, at: At, index: number): bigint => {
  if (DateTime.isDateTime(v)) {
    return floorDiv(BigInt(DateTime.toEpochMillis(v)) * unitNanos.millisecond, unitNanos[unit])
  }
  return toBigInt(v, at, index, `a DateTime or an integer in ${unit}s`)
}

const decimalWords = (t: S.Decimal, v: unknown, path: Path): bigint => {
  if (!BigDecimal.isBigDecimal(v)) return fail(path, `expected a BigDecimal, got ${describe(v)}`)
  let unscaled: bigint
  if (v.scale <= t.scale) {
    unscaled = v.value * BigInt(10) ** BigInt(t.scale - v.scale)
  } else {
    const divisor = BigInt(10) ** BigInt(v.scale - t.scale)
    if (v.value % divisor !== BigInt(0)) fail(path, `${BigDecimal.format(v)} has more than ${t.scale} decimal places`)
    unscaled = v.value / divisor
  }
  // Precision is not enforced, as in the reference implementations; the value must fit the bit width.
  const limit = BigInt(1) << BigInt(t.bitWidth - 1)
  if (unscaled >= limit || unscaled < -limit) fail(path, `${BigDecimal.format(v)} does not fit decimal${t.bitWidth}`)
  return unscaled
}

const decimalBuffer = (t: S.Decimal, values: ReadonlyArray<unknown>, at: At): Uint8Array => {
  const width = t.bitWidth / 8
  const out = new Uint8Array(values.length * width)
  const view = new DataView(out.buffer)
  const mask = (BigInt(1) << BigInt(64)) - BigInt(1)
  values.forEach((v, i) => {
    if (isNull(v)) return
    let n = BigInt.asUintN(t.bitWidth, decimalWords(t, v, at(i)))
    if (width === 4) {
      view.setUint32(i * 4, Number(n), true)
      return
    }
    for (let w = 0; w < width / 8; w++) {
      view.setBigUint64(i * width + w * 8, n & mask, true)
      n >>= BigInt(64)
    }
  })
  return out
}

const intervalBuffer = (t: S.Interval, values: ReadonlyArray<unknown>, at: At): Uint8Array => {
  const width = t.unit === "yearMonth" ? 4 : t.unit === "dayTime" ? 8 : 16
  const out = new Uint8Array(values.length * width)
  const view = new DataView(out.buffer)
  values.forEach((v, i) => {
    if (isNull(v)) return
    const o = (typeof v === "object" ? v : failAt(at, i, `expected an interval object, got ${describe(v)}`)) as Record<
      string,
      unknown
    >
    const part = (type: S.Int, k: string) => {
      const partAt = () => [...at(i), k]
      return checked(type, toBigInt(o[k] ?? 0, partAt, 0, `int${type.bitWidth}`), partAt, 0)
    }
    switch (t.unit) {
      case "yearMonth":
        view.setInt32(i * 4, Number(part(int32, "months")), true)
        break
      case "dayTime":
        view.setInt32(i * 8, Number(part(int32, "days")), true)
        view.setInt32(i * 8 + 4, Number(part(int32, "milliseconds")), true)
        break
      case "monthDayNano":
        view.setInt32(i * 16, Number(part(int32, "months")), true)
        view.setInt32(i * 16 + 4, Number(part(int32, "days")), true)
        view.setBigInt64(i * 16 + 8, part(int64, "nanoseconds"), true)
        break
    }
  })
  return out
}

// -----------------------------------------------------------------------------
// Equality keys (dictionaries, run-end encoding)
// -----------------------------------------------------------------------------

/**
 * A key for building `v` as `field`, read as {@link build} reads it: values
 * with equal keys are stored alike. Values that cannot be read as `field` have
 * none, so they are never merged with another.
 */
const keyOf = (field: S.Field, v: unknown, s: Session): string | undefined => {
  const encode = encoderOf(field, s)
  return isNull(v) ? "null" : typeKey(field.type, encode === undefined ? v : encode(v), s)
}

const joinKeys = (keys: ReadonlyArray<string | undefined>): string | undefined =>
  keys.includes(undefined) ? undefined : JSON.stringify(keys)

const intervalParts = {
  yearMonth: ["months"],
  dayTime: ["days", "milliseconds"],
  monthDayNano: ["months", "days", "nanoseconds"]
}

/** The key of a non-null `v` built as `type`; see {@link keyOf}. */
const typeKey = (type: S.DataType, v: unknown, s: Session): string | undefined => {
  switch (type._tag) {
    case "List":
    case "LargeList":
    case "ListView":
    case "LargeListView":
    case "FixedSizeList": {
      const items = itemsOf(v, s)
      return items && joinKeys(Array.from(items, (x) => keyOf(type.child, x, s)))
    }
    case "Map": {
      const [keyField, valueField] = (type.entries.type as S.Struct).fields
      const entries = itemsOf(v, s)
      return entries && joinKeys(Array.from(entries, (e) => {
        const entry = itemsOf(e, s)
        return entry && joinKeys([keyOf(keyField, entry[0], s), keyOf(valueField, entry[1], s)])
      }))
    }
    case "Struct":
      return typeof v === "object" && v !== null
        ? joinKeys(type.fields.map((f, k) => keyOf(f, memberValue(v, f, k), s)))
        : undefined
    case "Union": {
      const member = memberOf(type, v)
      return member === -1
        ? undefined
        : joinKeys([String(member), keyOf(type.fields[member], isUnionValue(v) ? v.value : v, s)])
    }
    case "Interval":
      return typeof v === "object" && v !== null
        ? joinKeys(intervalParts[type.unit].map((k) => scalarKey((v as Record<string, unknown>)[k] ?? 0)))
        : undefined
    case "RunEndEncoded":
      return keyOf(type.values, v, s)
    case "Dictionary":
      return typeKey(type.valueType, v, s)
    default:
      return scalarKey(v)
  }
}

const scalarKey = (v: unknown): string | undefined => {
  switch (typeof v) {
    case "string":
      return `s${JSON.stringify(v)}`
    case "number":
      return Object.is(v, -0) ? "n-0" : `n${v}`
    case "bigint":
      return `b${v}`
    case "boolean":
      return `t${v}`
  }
  if (v instanceof Uint8Array) return `u${Array.from(v).join(",")}`
  if (DateTime.isDateTime(v)) {
    return `d${DateTime.toEpochMillis(v)}${DateTime.isZoned(v) ? DateTime.formatIsoZoned(v) : ""}`
  }
  if (BigDecimal.isBigDecimal(v)) return `D${BigDecimal.format(BigDecimal.normalize(v))}`
  if (Duration.isDuration(v)) return `T${String(Duration.toNanos(v))}`
  return undefined
}

// -----------------------------------------------------------------------------
// Builders
// -----------------------------------------------------------------------------

const data = (
  type: S.DataType,
  length: number,
  validity: { validity: Uint8Array | undefined; nullCount: number },
  buffers: ReadonlyArray<Uint8Array>,
  children: ReadonlyArray<ArrowData.ArrowData> = [],
  dictionary?: ArrowData.ArrowData
): ArrowData.ArrowData => ({
  type,
  length,
  offset: 0,
  nullCount: validity.nullCount,
  validity: validity.validity,
  buffers,
  children,
  dictionary
})

const noNulls = { validity: undefined, nullCount: 0 }

/** The items of an array or other iterable object, each iterable read once per session. */
const itemsOf = (v: unknown, s: Session): ReadonlyArray<unknown> | undefined => {
  if (Array.isArray(v)) return v
  if (typeof v !== "object" || v === null || !(Symbol.iterator in v)) return undefined
  let items = s.items.get(v)
  if (items === undefined) s.items.set(v, items = Array.from(v as Iterable<unknown>))
  return items
}

const asIterable = (v: unknown, s: Session, at: At, index: number, what: string): ReadonlyArray<unknown> =>
  itemsOf(v, s) ?? failAt(at, index, `expected ${what}, got ${describe(v)}`)

/** Member `k`, named by `f`, of the struct value `v` (an object, or an array by position). */
const memberValue = (v: object, f: S.Field, k: number): unknown =>
  (Array.isArray(v) ? v[k] : (v as Record<string, unknown>)[f.name]) ?? null

const encoderOf = (field: S.Field, options: Options): ((v: unknown) => unknown) | undefined => {
  const name = field.metadata.get("ARROW:extension:name")
  const extension = name === undefined ? undefined : options.extensions.get(name)
  if (extension === undefined) return undefined
  const metadata = field.metadata.get("ARROW:extension:metadata") ?? ""
  return (v) => extension.encode(v, metadata)
}

/** The slot `i` with `offsets[i] <= item < offsets[i + 1]`. */
const slotOf = (offsets: ArrayLike<number>, item: number): number => {
  let lo = 0
  let hi = offsets.length - 2
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1
    if (offsets[mid] <= item) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** Locates item `j` of lists laid out by `offsets` as its slot's location plus its index in the list. */
const itemAt = (at: At, offsets: ArrayLike<number>): At => (j) => {
  const i = slotOf(offsets, j)
  return [...at(i), j - offsets[i]]
}

const memberAt = (at: At, name: string | number): At => (i) => [...at(i), name]

/**
 * Builds one array of `field` from `values`; `at` locates each value in the
 * input. Only the slots where `used` holds must respect the field's
 * nullability; the others stand for null parents or other union members.
 * @internal
 */
export const build = (
  field: S.Field,
  values: ReadonlyArray<unknown>,
  options: Session,
  at: At,
  used: (index: number) => boolean = () => true
): ArrowData.ArrowData => {
  const encode = encoderOf(field, options)
  if (encode !== undefined) values = values.map((v) => isNull(v) ? null : encode(v))
  if (!field.nullable && field.type._tag !== "Null") {
    const i = values.findIndex((v, i) => isNull(v) && used(i))
    if (i !== -1) failAt(at, i, `null in non-nullable field ${JSON.stringify(field.name)}`)
  }
  return buildType(field.type, values, options, at)
}

const buildType = (
  type: S.DataType,
  values: ReadonlyArray<unknown>,
  options: Session,
  at: At
): ArrowData.ArrowData => {
  const n = values.length
  switch (type._tag) {
    case "Null": {
      const i = values.findIndex((v) => !isNull(v))
      if (i !== -1) failAt(at, i, `expected null, got ${describe(values[i])}`)
      return data(type, n, { validity: undefined, nullCount: n }, [])
    }
    case "Bool": {
      const bits = new Uint8Array(Math.ceil(n / 8))
      values.forEach((v, i) => {
        if (isNull(v)) return
        if (typeof v !== "boolean") failAt(at, i, `expected a boolean, got ${describe(v)}`)
        if (v) bits[i >> 3] |= 1 << (i & 7)
      })
      return data(type, n, validityOf(values), [bits])
    }
    case "Int":
      return data(type, n, validityOf(values), [intBuffer(type, values, at)])
    case "Float": {
      const check = (v: unknown, i: number) =>
        typeof v === "number" ? v : failAt(at, i, `expected a number, got ${describe(v)}`)
      if (type.bitWidth === 16) {
        const out = new Uint8Array(n * 2)
        const view = new DataView(out.buffer)
        values.forEach((v, i) => !isNull(v) && (view as any).setFloat16(i * 2, check(v, i), true))
        return data(type, n, validityOf(values), [out])
      }
      const a = type.bitWidth === 32 ? new Float32Array(n) : new Float64Array(n)
      values.forEach((v, i) => (a[i] = isNull(v) ? 0 : check(v, i)))
      return data(type, n, validityOf(values), [asBytes(a)])
    }
    case "Decimal":
      return data(type, n, validityOf(values), [decimalBuffer(type, values, at)])
    case "Date":
      return type.unit === "day"
        ? data(type, n, validityOf(values), [
          int32Buffer(values, (v, a, i) =>
            DateTime.isDateTime(v)
              ? BigInt(Math.floor(DateTime.toEpochMillis(v) / 86_400_000))
              : toBigInt(v, a, i, "a DateTime or days since the epoch"), at)
        ])
        : data(type, n, validityOf(values), [
          int64Buffer(values, (v, a, i) =>
            DateTime.isDateTime(v)
              ? BigInt(DateTime.toEpochMillis(v))
              : toBigInt(v, a, i, "a DateTime or milliseconds since the epoch"), at)
        ])
    case "Timestamp":
      return data(type, n, validityOf(values), [int64Buffer(values, (v, a, i) => instant(type.unit, v, a, i), at)])
    case "Time":
      return type.bitWidth === 32
        ? data(type, n, validityOf(values), [
          int32Buffer(values, (v, a, i) => toBigInt(v, a, i, "int32"), at)
        ])
        : data(type, n, validityOf(values), [int64Buffer(values, (v, a, i) => toBigInt(v, a, i, "int64"), at)])
    case "Duration":
      return data(type, n, validityOf(values), [
        int64Buffer(values, (v, a, i) => {
          if (Duration.isDuration(v)) {
            const nanos = Option.getOrUndefined(Duration.toNanos(v))
            if (nanos === undefined) return failAt(a, i, "infinite durations cannot be stored")
            return floorDiv(nanos, unitNanos[type.unit])
          }
          return toBigInt(v, a, i, `a Duration or an integer in ${type.unit}s`)
        }, at)
      ])
    case "Interval":
      return data(type, n, validityOf(values), [intervalBuffer(type, values, at)])
    case "FixedSizeBinary": {
      const out = new Uint8Array(n * type.byteWidth)
      values.forEach((v, i) => {
        if (isNull(v)) return
        if (!(v instanceof Uint8Array)) failAt(at, i, `expected a Uint8Array, got ${describe(v)}`)
        if ((v as Uint8Array).length !== type.byteWidth) {
          failAt(at, i, `expected ${type.byteWidth} bytes, got ${(v as Uint8Array).length}`)
        }
        out.set(v as Uint8Array, i * type.byteWidth)
      })
      return data(type, n, validityOf(values), [out])
    }
    case "Binary":
    case "LargeBinary":
    case "Utf8":
    case "LargeUtf8": {
      const large = type._tag === "LargeBinary" || type._tag === "LargeUtf8"
      const isString = type._tag === "Utf8" || type._tag === "LargeUtf8"
      const bytes = new Bytes()
      const offsets = large ? new BigInt64Array(n + 1) : new Int32Array(n + 1)
      values.forEach((v, i) => {
        if (!isNull(v)) {
          if (isString ? typeof v !== "string" : !(v instanceof Uint8Array)) {
            failAt(at, i, `expected a ${isString ? "string" : "Uint8Array"}, got ${describe(v)}`)
          }
          if (isString) bytes.pushString(v as string)
          else bytes.push(v as Uint8Array)
        }
        if (!large && bytes.length > 2147483647) failAt(at, i, "more than 2 GiB of data needs a Large type")
        offsets[i + 1] = large ? BigInt(bytes.length) : bytes.length as never
      })
      return data(type, n, validityOf(values), [asBytes(offsets), bytes.finish()])
    }
    case "BinaryView":
    case "Utf8View": {
      const isString = type._tag === "Utf8View"
      const views = new Uint8Array(n * 16)
      const view = new DataView(views.buffer)
      const bytes = new Bytes()
      values.forEach((v, i) => {
        if (isNull(v)) return
        if (isString ? typeof v !== "string" : !(v instanceof Uint8Array)) {
          failAt(at, i, `expected a ${isString ? "string" : "Uint8Array"}, got ${describe(v)}`)
        }
        const b = isString ? encoder.encode(v as string) : v as Uint8Array
        view.setInt32(i * 16, b.length, true)
        if (b.length <= 12) {
          views.set(b, i * 16 + 4)
        } else {
          views.set(b.subarray(0, 4), i * 16 + 4)
          view.setInt32(i * 16 + 8, 0, true)
          view.setInt32(i * 16 + 12, bytes.length, true)
          bytes.push(b)
        }
      })
      const data_ = bytes.finish()
      return data(type, n, validityOf(values), data_.length > 0 ? [views, data_] : [views])
    }
    case "List":
    case "LargeList":
    case "ListView":
    case "LargeListView": {
      const items: Array<unknown> = []
      const offsets = new Float64Array(n + 1)
      values.forEach((v, i) => {
        if (!isNull(v)) { for (const x of asIterable(v, options, at, i, "an array")) items.push(x) }
        offsets[i + 1] = items.length
      })
      const child = build(type.child, items, options, itemAt(at, offsets))
      const ints = (a: Float64Array) =>
        asBytes(
          type._tag === "LargeList" || type._tag === "LargeListView"
            ? BigInt64Array.from(a, BigInt)
            : Int32Array.from(a)
        )
      if (type._tag === "List" || type._tag === "LargeList") {
        return data(type, n, validityOf(values), [ints(offsets)], [child])
      }
      const sizes = offsets.subarray(1).map((end, i) => end - offsets[i])
      return data(type, n, validityOf(values), [ints(offsets.subarray(0, n)), ints(sizes)], [child])
    }
    case "FixedSizeList": {
      const items: Array<unknown> = []
      values.forEach((v, i) => {
        if (isNull(v)) {
          for (let k = 0; k < type.listSize; k++) items.push(null)
          return
        }
        const list = asIterable(v, options, at, i, "an array")
        if (list.length !== type.listSize) failAt(at, i, `expected ${type.listSize} items, got ${list.length}`)
        items.push(...list)
      })
      const size = type.listSize
      const child = build(
        type.child,
        items,
        options,
        (j) => [...at(Math.floor(j / size)), j % size],
        (j) => !isNull(values[Math.floor(j / size)])
      )
      return data(type, n, validityOf(values), [], [child])
    }
    case "Struct": {
      const columns = type.fields.map((): Array<unknown> => new Array(n))
      values.forEach((v, i) => {
        if (isNull(v)) {
          for (const c of columns) c[i] = null
          return
        }
        if (typeof v !== "object") failAt(at, i, `expected an object, got ${describe(v)}`)
        type.fields.forEach((f, k) => (columns[k][i] = memberValue(v as object, f, k)))
      })
      const children = type.fields.map((f, k) =>
        build(f, columns[k], options, memberAt(at, f.name), (i) => !isNull(values[i]))
      )
      return data(type, n, validityOf(values), [], children)
    }
    case "Map": {
      const entriesType = type.entries.type as S.Struct
      const keys: Array<unknown> = []
      const items: Array<unknown> = []
      const offsets = new Int32Array(n + 1)
      let slot = 0
      const inSlot: At = (j) => [...at(slot), j - offsets[slot]]
      values.forEach((v, i) => {
        slot = i
        if (!isNull(v)) {
          for (const e of asIterable(v, options, at, i, "a ReadonlyMap")) {
            const [k, x] = asIterable(e, options, inSlot, keys.length, "a [key, value] entry")
            if (isNull(k)) failAt(inSlot, keys.length, "map keys must not be null")
            keys.push(k)
            items.push(x)
          }
        }
        offsets[i + 1] = keys.length
      })
      const entryAt = itemAt(at, offsets)
      const [keyField, valueField] = entriesType.fields
      const entries = data(type.entries.type, keys.length, noNulls, [], [
        build(keyField, keys, options, memberAt(entryAt, 0)),
        build(valueField, items, options, memberAt(entryAt, 1))
      ])
      return data(type, n, validityOf(values), [asBytes(offsets)], [entries])
    }
    case "Union":
      return buildUnion(type, values, options, at)
    case "RunEndEncoded": {
      const runEnds: Array<number> = []
      const runValues: Array<unknown> = []
      let previous: string | undefined
      values.forEach((v, i) => {
        const key = keyOf(type.values, v, options)
        if (key !== undefined && key === previous) {
          runEnds[runEnds.length - 1] = i + 1
        } else {
          runEnds.push(i + 1)
          runValues.push(isNull(v) ? null : v)
          previous = key
        }
      })
      // Run `r` starts where the previous run ends.
      const runAt: At = (r) => at(r === 0 ? 0 : runEnds[r - 1])
      return data(type, n, noNulls, [], [
        build(type.runEnds, runEnds, options, runAt),
        build(type.values, runValues, options, runAt)
      ])
    }
    case "Dictionary": {
      let state = options.dictionaries.get(type.id)
      if (state === undefined) {
        state = { valueType: type.valueType, unique: new Map(), values: [], at: [], slot: [] }
        options.dictionaries.set(type.id, state)
      }
      const s = state
      const indices = values.map((v, i) => {
        if (isNull(v)) return null
        const key = typeKey(type.valueType, v, options)
        let index = key === undefined ? undefined : s.unique.get(key)
        if (index === undefined) {
          index = s.values.length
          if (key !== undefined) s.unique.set(key, index)
          s.values.push(v)
          s.at.push(at)
          s.slot.push(i)
        }
        return index
      })
      const indexBuffer = intBuffer(type.indexType, indices.map((x) => x ?? 0), at)
      const placeholder: ArrowData.ArrowData = {
        type: type.valueType,
        length: 0,
        offset: 0,
        nullCount: 0,
        validity: undefined,
        buffers: [],
        children: [],
        dictionary: undefined
      }
      pending.set(placeholder, s)
      return data(type, n, validityOf(values), [indexBuffer], [], placeholder)
    }
  }
}

/** Whether `v` fits `type` well enough to pick a union member for it. */
const accepts = (type: S.DataType, v: unknown): boolean => {
  switch (type._tag) {
    case "Null":
      return isNull(v)
    case "Bool":
      return typeof v === "boolean"
    case "Int":
      return typeof v === "bigint" || (typeof v === "number" && Number.isInteger(v))
    case "Float":
      return typeof v === "number"
    case "Decimal":
      return BigDecimal.isBigDecimal(v)
    case "Date":
    case "Timestamp":
      return DateTime.isDateTime(v)
    case "Duration":
      return Duration.isDuration(v)
    case "Utf8":
    case "LargeUtf8":
    case "Utf8View":
      return typeof v === "string"
    case "Binary":
    case "LargeBinary":
    case "BinaryView":
      return v instanceof Uint8Array
    case "FixedSizeBinary":
      return v instanceof Uint8Array && v.length === type.byteWidth
    case "List":
    case "LargeList":
    case "ListView":
    case "LargeListView":
    case "FixedSizeList":
      return Array.isArray(v)
    case "Map":
      return v instanceof Map
    case "Dictionary":
      return accepts(type.valueType, v)
    case "RunEndEncoded":
      return accepts(type.values.type, v)
    default:
      return typeof v === "object" && v !== null && !Array.isArray(v)
  }
}

/**
 * The member a union slot holds: the one a `UnionValue` names, the first
 * nullable member for null, otherwise the first member that accepts `v`;
 * -1 when there is none.
 */
const memberOf = (type: S.Union, v: unknown): number =>
  isUnionValue(v)
    ? type.typeIds.indexOf(v.typeId)
    : isNull(v)
    ? type.fields.findIndex((f) => f.nullable)
    : type.fields.findIndex((f) => accepts(f.type, v))

const buildUnion = (
  type: S.Union,
  values: ReadonlyArray<unknown>,
  options: Session,
  at: At
): ArrowData.ArrowData => {
  const n = values.length
  const typeIds = new Int8Array(n)
  const members = values.map((v, i) => {
    const member = memberOf(type, v)
    if (member !== -1) return member
    return failAt(
      at,
      i,
      isUnionValue(v) ? `type id ${v.typeId} is not a member of the union` : `no union member accepts ${describe(v)}`
    )
  })
  const plain = values.map((v) => isUnionValue(v) ? v.value : v)
  members.forEach((m, i) => (typeIds[i] = type.typeIds[m]))
  if (type.mode === "sparse") {
    const children = type.fields.map((f, k) =>
      build(f, plain.map((v, i) => members[i] === k ? v : null), options, at, (i) => members[i] === k)
    )
    return data(type, n, noNulls, [asBytes(typeIds)], children)
  }
  const offsets = new Int32Array(n)
  const perMember = type.fields.map((): Array<unknown> => [])
  plain.forEach((v, i) => {
    offsets[i] = perMember[members[i]].length
    perMember[members[i]].push(v)
  })
  // Value `j` of member `k` comes from the slot that holds member `k` at offset `j`.
  const children = type.fields.map((f, k) =>
    build(f, perMember[k], options, (j) => at(members.findIndex((m, i) => m === k && offsets[i] === j)))
  )
  return data(type, n, noNulls, [asBytes(typeIds), asBytes(offsets)], children)
}
