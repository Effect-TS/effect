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
import type { UnionValue } from "../ArrowColumn.ts"
import type * as ArrowData from "../ArrowData.ts"
import * as S from "../ArrowSchema.ts"
import * as Layout from "./layout.ts"
import * as Values from "./values.ts"

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
 * arrive; {@link finish} attaches the final dictionaries, so it must be given
 * the session the array was built in. @internal
 */
export interface Session extends Values.Options {
  readonly dictionaries: Map<number, DictionaryState>
}

/** @internal */
export const session = (options: Values.Options): Session => ({ ...options, dictionaries: new Map() })

const builtDictionary = (state: DictionaryState, s: Session): ArrowData.ArrowData => {
  if (state.built === undefined) {
    const inner = session(s)
    const field = S.field("", state.valueType)
    state.built = finish(buildField(field, state.values, inner, (k) => state.at[k](state.slot[k])), inner)
  }
  return state.built
}

/** Attaches the session's final dictionaries to `data` and its children. @internal */
export const finish = (data: ArrowData.ArrowData, s: Session): ArrowData.ArrowData => {
  const dictionary = data.type._tag === "Dictionary"
    ? builtDictionary(s.dictionaries.get(data.type.id)!, s)
    : data.dictionary
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
export const isUnionValue = (u: unknown): u is UnionValue<unknown> => Predicate.isTagged(u, "UnionValue")

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

/** Fails with a `BuildFailure` at `path` when `type` is invalid (union type ids, decimal precision and scale). @internal */
export const checkType = (type: S.DataType, path: Path): void =>
  Layout.checkType(type, (message) => fail(path, message))

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
    if (typeof v === "number" && Number.isInteger(v)) {
      if (v < min || v > max) outOfRange(t, v, at, i)
      a[i] = v
    } else if (!isNull(v)) {
      const big = toBigInt(v, at, i, `int${t.bitWidth}`)
      if (big < bigMin || big > bigMax) outOfRange(t, v, at, i)
      a[i] = Number(big)
    }
  }
  return asBytes(a)
}

/** Signed 32- or 64-bit storage (`t`) of non-null values through `f`, range-checked. */
const storedInts = (
  t: S.Int,
  values: ReadonlyArray<unknown>,
  f: (v: unknown, at: At, index: number) => bigint,
  at: At
) => {
  const a = t.bitWidth === 64 ? new BigInt64Array(values.length) : new Int32Array(values.length)
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (!isNull(v)) {
      const big = checked(t, f(v, at, i), at, i)
      a[i] = (t.bitWidth === 64 ? big : Number(big)) as never
    }
  }
  return asBytes(a)
}

/** A DateTime as an integer count of `unit`, or a raw integer already in `unit`. */
const instant = (unit: S.TimeUnit, v: unknown, at: At, index: number): bigint => {
  if (DateTime.isDateTime(v)) {
    return Values.floorDiv(
      BigInt(DateTime.toEpochMillis(v)) * Values.nanosPerUnit.millisecond,
      Values.nanosPerUnit[unit]
    )
  }
  return toBigInt(v, at, index, `a DateTime or an integer in ${unit}s`)
}

/**
 * The unscaled integer of `v` at the scale of `t`. It must be exact and have
 * at most as many digits as the precision: below `limit`, 10^precision, which
 * fits every bit width (`Layout.checkDecimal`).
 */
const unscaledDecimal = (t: S.Decimal, limit: bigint, v: unknown, path: Path): bigint => {
  if (!BigDecimal.isBigDecimal(v)) return fail(path, `expected a BigDecimal, got ${describe(v)}`)
  if (v.value === BigInt(0)) return v.value
  const places = v.scale - t.scale
  let unscaled: bigint
  if (places <= 0) {
    // Every place added is a digit more; past the precision the power is not needed, and may not fit a bigint
    unscaled = -places < t.precision ? v.value * BigInt(10) ** BigInt(-places) : limit
  } else {
    // A multiple of 10^places has more digits than that; checked first, as the power may not fit a bigint
    const digits = String(v.value).length - (v.value < BigInt(0) ? 1 : 0)
    const divisor = digits > places ? BigInt(10) ** BigInt(places) : undefined
    if (divisor === undefined || v.value % divisor !== BigInt(0)) {
      return fail(path, `${BigDecimal.format(v)} has more than ${t.scale} decimal places`)
    }
    unscaled = v.value / divisor
  }
  if (unscaled >= limit || unscaled <= -limit) {
    fail(path, `${BigDecimal.format(v)} has more than ${t.precision} digits at scale ${t.scale}`)
  }
  return unscaled
}

const decimalBuffer = (t: S.Decimal, values: ReadonlyArray<unknown>, at: At): Uint8Array => {
  const width = t.bitWidth / 8
  const out = new Uint8Array(values.length * width)
  const view = new DataView(out.buffer)
  const mask = (BigInt(1) << BigInt(64)) - BigInt(1)
  const limit = BigInt(10) ** BigInt(t.precision)
  values.forEach((v, i) => {
    if (isNull(v)) return
    let n = BigInt.asUintN(t.bitWidth, unscaledDecimal(t, limit, v, at(i)))
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

/** The members of each interval unit and their storage, in layout order. */
const intervalParts: Record<S.IntervalUnit, ReadonlyArray<readonly [string, S.Int]>> = {
  yearMonth: [["months", S.int32]],
  dayTime: [["days", S.int32], ["milliseconds", S.int32]],
  monthDayNano: [["months", S.int32], ["days", S.int32], ["nanoseconds", S.int64]]
}

const intervalBuffer = (t: S.Interval, values: ReadonlyArray<unknown>, at: At): Uint8Array => {
  const parts = intervalParts[t.unit]
  const width = parts.reduce((w, [, type]) => w + type.bitWidth / 8, 0)
  const out = new Uint8Array(values.length * width)
  const view = new DataView(out.buffer)
  values.forEach((v, i) => {
    if (isNull(v)) return
    const o = (typeof v === "object" ? v : failAt(at, i, `expected an interval object, got ${describe(v)}`)) as Record<
      string,
      unknown
    >
    let position = i * width
    for (const [k, type] of parts) {
      const partAt = () => [...at(i), k]
      const big = checked(type, toBigInt(o[k] ?? 0, partAt, 0, `int${type.bitWidth}`), partAt, 0)
      if (type.bitWidth === 64) view.setBigInt64(position, big, true)
      else view.setInt32(position, Number(big), true)
      position += type.bitWidth / 8
    }
  })
  return out
}

// -----------------------------------------------------------------------------
// Equality keys (dictionaries, run-end encoding)
// -----------------------------------------------------------------------------

/**
 * A key for the storage value `v` of `field`: values with equal keys are
 * stored alike. Values that cannot be stored as `field` have none, so they are
 * never merged with another.
 */
const keyOf = (field: S.Field, v: unknown): string | undefined => isNull(v) ? "null" : typeKey(field.type, v)

const joinKeys = (keys: ReadonlyArray<string | undefined>): string | undefined =>
  keys.includes(undefined) ? undefined : JSON.stringify(keys)

/** The key of a non-null `v` built as `type`; see {@link keyOf}. */
const typeKey = (type: S.DataType, v: unknown): string | undefined => {
  switch (type._tag) {
    case "List":
    case "LargeList":
    case "ListView":
    case "LargeListView":
    case "FixedSizeList":
      return Array.isArray(v) ? joinKeys(Array.from(v, (x) => keyOf(type.child, x))) : undefined
    case "Map": {
      const [keyField, valueField] = (type.entries.type as S.Struct).fields
      return Array.isArray(v)
        ? joinKeys(
          v.map((e) => Array.isArray(e) ? joinKeys([keyOf(keyField, e[0]), keyOf(valueField, e[1])]) : undefined)
        )
        : undefined
    }
    case "Struct":
      return typeof v === "object" && v !== null
        ? joinKeys(type.fields.map((f, k) => keyOf(f, memberValue(v, f, k))))
        : undefined
    case "Union": {
      const member = memberOf(type, v)
      return member === -1
        ? undefined
        : joinKeys([String(member), keyOf(type.fields[member], isUnionValue(v) ? v.value : v)])
    }
    case "Interval":
      return typeof v === "object" && v !== null
        ? joinKeys(intervalParts[type.unit].map(([k]) => scalarKey((v as Record<string, unknown>)[k] ?? 0)))
        : undefined
    case "RunEndEncoded":
      return keyOf(type.values, v)
    case "Dictionary":
      return typeKey(type.valueType, v)
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
// Storage values
// -----------------------------------------------------------------------------

type Store = (v: unknown) => unknown

/**
 * How to turn a value of `field` into its storage value, the only form the
 * builders read: extension values encoded and iterables read into arrays, at
 * every level. Structs and unions with members to convert become arrays of
 * members by position and `UnionValue`s. `undefined` when every value is its
 * own storage value. Values that do not fit are kept for the builders to
 * reject.
 */
const storeOf = (field: S.Field, s: Session): Store | undefined => {
  const ext = Values.extensionOf(field, s)
  const store = typeStoreOf(field.type, s)
  if (ext === undefined) return store && ((v) => isNull(v) ? null : store(v))
  return (v) => {
    if (isNull(v)) return null
    const encoded = ext.extension.encode(v, ext.metadata)
    return store === undefined || isNull(encoded) ? encoded : store(encoded)
  }
}

const typeStoreOf = (type: S.DataType, s: Session): Store | undefined => {
  switch (type._tag) {
    case "List":
    case "LargeList":
    case "ListView":
    case "LargeListView":
    case "FixedSizeList": {
      const item = storeOf(type.child, s)
      return (v) => !isIterable(v) ? v : item !== undefined ? mapAll(v, item) : Array.isArray(v) ? v : Array.from(v)
    }
    case "Map": {
      const [key, value] = (type.entries.type as S.Struct).fields.map((f) => storeOf(f, s) ?? identity)
      return (v) =>
        isIterable(v)
          ? mapAll(v, (e) => {
            if (!isIterable(e)) return e
            const [k, x] = e
            return [key(k), value(x)]
          })
          : v
    }
    case "Struct": {
      const members = type.fields.map((f) => storeOf(f, s))
      if (members.every((m) => m === undefined)) return undefined
      return (v) =>
        typeof v === "object"
          ? type.fields.map((f, k) => {
            const member = memberValue(v as object, f, k)
            const store = members[k]
            return store === undefined ? member : store(member)
          })
          : v
    }
    case "Union": {
      const members = type.fields.map((f) => storeOf(f, s))
      if (members.every((m) => m === undefined)) return undefined
      return (v) => {
        const member = memberOf(type, v)
        const store = member === -1 ? undefined : members[member]
        if (store === undefined) return v
        const value = store(isUnionValue(v) ? v.value : v)
        return { _tag: "UnionValue", typeId: type.typeIds[member], value } satisfies UnionValue<unknown>
      }
    }
    case "RunEndEncoded":
      return storeOf(type.values, s)
    case "Dictionary":
      return typeStoreOf(type.valueType, s)
    default:
      return undefined
  }
}

const identity = (v: unknown) => v

/** `f` of each item, reading holes as `undefined`. */
const mapAll = (items: Iterable<unknown>, f: Store): Array<unknown> => {
  const array = Array.isArray(items) ? items : Array.from(items)
  const out = new Array(array.length)
  for (let i = 0; i < array.length; i++) out[i] = f(array[i])
  return out
}

/** `values` as an array without holes. */
const dense = (values: Iterable<unknown>): ReadonlyArray<unknown> =>
  Array.isArray(values) && !values.includes(undefined) ? values : Array.from(values)

const isIterable = (v: unknown): v is Iterable<unknown> => typeof v === "object" && v !== null && Symbol.iterator in v

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

const asArray = (v: unknown, at: At, index: number, what: string): ReadonlyArray<unknown> =>
  Array.isArray(v) ? v : failAt(at, index, `expected ${what}, got ${describe(v)}`)

/** Member `k`, named by `f`, of the struct value `v` (an object, or an array by position). */
const memberValue = (v: object, f: S.Field, k: number): unknown =>
  (Array.isArray(v) ? v[k] : Values.getProperty(v, f.name)) ?? null

/** Fails at slot `i` unless `v` is a string. */
const expectString = (v: unknown, at: At, i: number): string =>
  typeof v === "string" ? v : failAt(at, i, `expected a string, got ${describe(v)}`)

/** Fails at slot `i` unless `v` is a `Uint8Array`. */
const expectBytes = (v: unknown, at: At, i: number): Uint8Array =>
  v instanceof Uint8Array ? v : failAt(at, i, `expected a Uint8Array, got ${describe(v)}`)

/** Locates item `j` of lists laid out by `offsets` as its slot's location plus its index in the list. */
const itemAt = (at: At, offsets: ArrayLike<number>): At => (j) => {
  const i = Values.slotOf(offsets, j)
  return [...at(i), j - offsets[i]]
}

const memberAt = (at: At, name: string | number): At => (i) => [...at(i), name]

/**
 * Builds one array of `field` from `values`; `at` locates each value in the
 * input. Each value is converted to its storage value once (see
 * {@link storeOf}), and holes read as nulls. @internal
 */
export const build = (field: S.Field, values: Iterable<unknown>, options: Session, at: At): ArrowData.ArrowData => {
  const store = storeOf(field, options)
  return buildField(field, store === undefined ? dense(values) : mapAll(values, store), options, at)
}

/**
 * Builds one array of `field` from storage `values`. Only the slots where
 * `used` holds must respect the field's nullability; the others stand for
 * null parents or other union members.
 */
const buildField = (
  field: S.Field,
  values: ReadonlyArray<unknown>,
  options: Session,
  at: At,
  used: (index: number) => boolean = () => true
): ArrowData.ArrowData => {
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
  /** An array of `type` with the validity of `values`. */
  const array = (buffers: ReadonlyArray<Uint8Array>, children?: ReadonlyArray<ArrowData.ArrowData>) =>
    data(type, n, validityOf(values), buffers, children)
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
      return array([bits])
    }
    case "Int":
      return array([intBuffer(type, values, at)])
    case "Float": {
      const check = (v: unknown, i: number) =>
        typeof v === "number" ? v : failAt(at, i, `expected a number, got ${describe(v)}`)
      if (type.bitWidth === 16) {
        const out = new Uint8Array(n * 2)
        const view = new DataView(out.buffer)
        values.forEach((v, i) => !isNull(v) && (view as any).setFloat16(i * 2, check(v, i), true))
        return array([out])
      }
      const a = type.bitWidth === 32 ? new Float32Array(n) : new Float64Array(n)
      values.forEach((v, i) => (a[i] = isNull(v) ? 0 : check(v, i)))
      return array([asBytes(a)])
    }
    case "Decimal":
      return array([decimalBuffer(type, values, at)])
    case "Date": {
      const day = type.unit === "day"
      return array([
        storedInts(day ? S.int32 : S.int64, values, (v, a, i) => {
          if (!DateTime.isDateTime(v)) {
            return toBigInt(v, a, i, `a DateTime or ${day ? "days" : "milliseconds"} since the epoch`)
          }
          const ms = DateTime.toEpochMillis(v)
          return BigInt(day ? Math.floor(ms / 86_400_000) : ms)
        }, at)
      ])
    }
    case "Timestamp":
      return array([storedInts(S.int64, values, (v, a, i) => instant(type.unit, v, a, i), at)])
    case "Time": {
      const storage = type.bitWidth === 32 ? S.int32 : S.int64
      return array([storedInts(storage, values, (v, a, i) => toBigInt(v, a, i, `int${type.bitWidth}`), at)])
    }
    case "Duration":
      return array([
        storedInts(S.int64, values, (v, a, i) => {
          if (Duration.isDuration(v)) {
            const nanos = Option.getOrUndefined(Duration.toNanos(v))
            if (nanos === undefined) return failAt(a, i, "infinite durations cannot be stored")
            return Values.floorDiv(nanos, Values.nanosPerUnit[type.unit])
          }
          return toBigInt(v, a, i, `a Duration or an integer in ${type.unit}s`)
        }, at)
      ])
    case "Interval":
      return array([intervalBuffer(type, values, at)])
    case "FixedSizeBinary": {
      const out = new Uint8Array(n * type.byteWidth)
      values.forEach((v, i) => {
        if (isNull(v)) return
        const b = expectBytes(v, at, i)
        if (b.length !== type.byteWidth) failAt(at, i, `expected ${type.byteWidth} bytes, got ${b.length}`)
        out.set(b, i * type.byteWidth)
      })
      return array([out])
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
          if (isString) bytes.pushString(expectString(v, at, i))
          else bytes.push(expectBytes(v, at, i))
        }
        if (!large && bytes.length > 2147483647) failAt(at, i, "more than 2 GiB of data needs a Large type")
        offsets[i + 1] = large ? BigInt(bytes.length) : bytes.length as never
      })
      return array([asBytes(offsets), bytes.finish()])
    }
    case "BinaryView":
    case "Utf8View": {
      const isString = type._tag === "Utf8View"
      const views = new Uint8Array(n * 16)
      const view = new DataView(views.buffer)
      const bytes = new Bytes()
      values.forEach((v, i) => {
        if (isNull(v)) return
        const b = isString ? encoder.encode(expectString(v, at, i)) : expectBytes(v, at, i)
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
      return array(data_.length > 0 ? [views, data_] : [views])
    }
    case "List":
    case "LargeList":
    case "ListView":
    case "LargeListView": {
      const items: Array<unknown> = []
      const offsets = new Float64Array(n + 1)
      values.forEach((v, i) => {
        if (!isNull(v)) { for (const x of asArray(v, at, i, "an array")) items.push(x) }
        offsets[i + 1] = items.length
      })
      const child = buildField(type.child, items, options, itemAt(at, offsets))
      const ints = (a: Float64Array) =>
        asBytes(
          type._tag === "LargeList" || type._tag === "LargeListView"
            ? BigInt64Array.from(a, BigInt)
            : Int32Array.from(a)
        )
      if (type._tag === "List" || type._tag === "LargeList") {
        return array([ints(offsets)], [child])
      }
      const sizes = offsets.subarray(1).map((end, i) => end - offsets[i])
      return array([ints(offsets.subarray(0, n)), ints(sizes)], [child])
    }
    case "FixedSizeList": {
      const items: Array<unknown> = []
      values.forEach((v, i) => {
        if (isNull(v)) {
          for (let k = 0; k < type.listSize; k++) items.push(null)
          return
        }
        const list = asArray(v, at, i, "an array")
        if (list.length !== type.listSize) failAt(at, i, `expected ${type.listSize} items, got ${list.length}`)
        items.push(...list)
      })
      const size = type.listSize
      const child = buildField(
        type.child,
        items,
        options,
        (j) => [...at(Math.floor(j / size)), j % size],
        (j) => !isNull(values[Math.floor(j / size)])
      )
      return array([], [child])
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
        buildField(f, columns[k], options, memberAt(at, f.name), (i) => !isNull(values[i]))
      )
      return array([], children)
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
          for (const e of asArray(v, at, i, "a ReadonlyMap")) {
            const [k, x] = asArray(e, inSlot, keys.length, "a [key, value] entry")
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
        buildField(keyField, keys, options, memberAt(entryAt, 0)),
        buildField(valueField, items, options, memberAt(entryAt, 1))
      ])
      return array([asBytes(offsets)], [entries])
    }
    case "Union":
      return buildUnion(type, values, options, at)
    case "RunEndEncoded": {
      const runEnds: Array<number> = []
      const runValues: Array<unknown> = []
      let previous: string | undefined
      values.forEach((v, i) => {
        const key = keyOf(type.values, v)
        if (key !== undefined && key === previous) {
          runEnds[runEnds.length - 1] = i + 1
        } else {
          runEnds.push(i + 1)
          runValues.push(v)
          previous = key
        }
      })
      // Run `r` starts where the previous run ends.
      const runAt: At = (r) => at(r === 0 ? 0 : runEnds[r - 1])
      return data(type, n, noNulls, [], [
        buildField(type.runEnds, runEnds, options, runAt),
        buildField(type.values, runValues, options, runAt)
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
        const key = typeKey(type.valueType, v)
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
      return array([intBuffer(type.indexType, indices, at)])
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
      buildField(f, plain.map((v, i) => members[i] === k ? v : null), options, at, (i) => members[i] === k)
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
    buildField(f, perMember[k], options, (j) => at(members.findIndex((m, i) => m === k && offsets[i] === j)))
  )
  return data(type, n, noNulls, [asBytes(typeIds), asBytes(offsets)], children)
}
