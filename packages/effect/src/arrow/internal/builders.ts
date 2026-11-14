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
import type { Options } from "./values.ts"

interface DictionaryState {
  readonly valueType: S.DataType
  readonly unique: Map<string, number>
  readonly values: Array<unknown>
  built?: ArrowData.ArrowData
}

/**
 * One build: extensions plus the dictionaries being collected. All arrays
 * built in a session share one dictionary per id, which grows as values
 * arrive; {@link finish} attaches the final dictionaries. @internal
 */
export interface Session extends Options {
  readonly dictionaries: Map<number, DictionaryState>
}

/** @internal */
export const session = (options: Options): Session => ({ ...options, dictionaries: new Map() })

/** Placeholders standing in for dictionaries until {@link finish}. */
const pending = new WeakMap<ArrowData.ArrowData, DictionaryState>()

const builtDictionary = (state: DictionaryState, options: Options): ArrowData.ArrowData => {
  if (state.built === undefined) {
    const inner = session(options)
    const field: S.Field = { name: "", type: state.valueType, nullable: true, metadata: new Map() }
    state.built = finish(build(field, state.values, inner, ["dictionary"]), inner)
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

const fail = (path: Path, message: string): never => {
  throw new BuildFailure(message, path)
}

/** Fails at `path` + `index`; the path array is only built on failure. */
const failAt = (path: Path, index: number, message: string): never => fail([...path, index], message)

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

const toBigInt = (v: unknown, path: Path, index: number, what: string): bigint => {
  if (typeof v === "bigint") return v
  if (typeof v === "number" && Number.isInteger(v)) return BigInt(v)
  return failAt(path, index, `expected an integer (${what}), got ${describe(v)}`)
}

const outOfRange = (t: S.Int, v: unknown, path: Path, index: number): never =>
  failAt(path, index, `${v} is outside the range of ${t.signed ? "" : "u"}int${t.bitWidth}`)

const zeroBig = BigInt(0)

const intBuffer = (t: S.Int, values: ReadonlyArray<unknown>, path: Path): Uint8Array => {
  const n = values.length
  if (t.bitWidth === 64) {
    const [min, max] = intRange(t)
    const a = t.signed ? new BigInt64Array(n) : new BigUint64Array(n)
    for (let i = 0; i < n; i++) {
      const v = values[i]
      if (isNull(v)) continue
      const big = toBigInt(v, path, i, "int64")
      if (big < min || big > max) outOfRange(t, v, path, i)
      a[i] = big
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
        if (Number.isInteger(v)) outOfRange(t, v, path, i)
        failAt(path, i, `expected an integer (int${t.bitWidth}), got ${describe(v)}`)
      }
      a[i] = v
    } else if (!isNull(v)) {
      const big = toBigInt(v, path, i, `int${t.bitWidth}`)
      if (big < bigMin || big > bigMax) outOfRange(t, v, path, i)
      a[i] = Number(big)
    }
  }
  return asBytes(a)
}

const int64Buffer = (
  values: ReadonlyArray<unknown>,
  f: (v: unknown, path: Path, index: number) => bigint,
  path: Path
) => {
  const a = new BigInt64Array(values.length)
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    a[i] = isNull(v) ? zeroBig : f(v, path, i)
  }
  return asBytes(a)
}

const int32Buffer = (
  values: ReadonlyArray<unknown>,
  f: (v: unknown, path: Path, index: number) => number,
  path: Path
) => {
  const a = new Int32Array(values.length)
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    a[i] = isNull(v) ? 0 : f(v, path, i)
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
const instant = (unit: S.TimeUnit, v: unknown, path: Path, index: number): bigint => {
  if (DateTime.isDateTime(v)) {
    return floorDiv(BigInt(DateTime.toEpochMillis(v)) * unitNanos.millisecond, unitNanos[unit])
  }
  return toBigInt(v, path, index, `a DateTime or an integer in ${unit}s`)
}

const decimalWords = (t: S.Decimal, v: unknown, at: Path): bigint => {
  const path = at
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

const decimalBuffer = (t: S.Decimal, values: ReadonlyArray<unknown>, path: Path): Uint8Array => {
  const width = t.bitWidth / 8
  const out = new Uint8Array(values.length * width)
  const view = new DataView(out.buffer)
  const mask = (BigInt(1) << BigInt(64)) - BigInt(1)
  values.forEach((v, i) => {
    if (isNull(v)) return
    let n = BigInt.asUintN(t.bitWidth, decimalWords(t, v, path.concat(i)))
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

const intervalBuffer = (t: S.Interval, values: ReadonlyArray<unknown>, path: Path): Uint8Array => {
  const width = t.unit === "yearMonth" ? 4 : t.unit === "dayTime" ? 8 : 16
  const out = new Uint8Array(values.length * width)
  const view = new DataView(out.buffer)
  values.forEach((v, i) => {
    if (isNull(v)) return
    const p = [...path, i]
    const o = (typeof v === "object" ? v : fail(p, `expected an interval object, got ${describe(v)}`)) as Record<
      string,
      unknown
    >
    const int32 = (k: string) => {
      const n = Number(toBigInt(o[k] ?? 0, [...p, k], 0, "int32"))
      if (n < -2147483648 || n > 2147483647) fail([...p, k], `${n} does not fit 32 bits`)
      return n
    }
    switch (t.unit) {
      case "yearMonth":
        view.setInt32(i * 4, int32("months"), true)
        break
      case "dayTime":
        view.setInt32(i * 8, int32("days"), true)
        view.setInt32(i * 8 + 4, int32("milliseconds"), true)
        break
      case "monthDayNano":
        view.setInt32(i * 16, int32("months"), true)
        view.setInt32(i * 16 + 4, int32("days"), true)
        view.setBigInt64(i * 16 + 8, toBigInt(o.nanoseconds ?? 0, [...p, "nanoseconds"], 0, "int64"), true)
        break
    }
  })
  return out
}

// -----------------------------------------------------------------------------
// Equality keys (dictionaries, run-end encoding)
// -----------------------------------------------------------------------------

/** A string that is equal for equal values of one type. */
const keyOf = (v: unknown): string => {
  if (isNull(v)) return "null"
  switch (typeof v) {
    case "string":
      return `s${v}`
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
  if (v instanceof Map) return `m[${Array.from(v, ([k, x]) => `${keyOf(k)}:${keyOf(x)}`).join(",")}]`
  if (Array.isArray(v)) return `a[${v.map(keyOf).join(",")}]`
  if (isUnionValue(v)) return `U${v.typeId}:${keyOf(v.value)}`
  return `o{${Object.entries(v as object).map(([k, x]) => `${JSON.stringify(k)}:${keyOf(x)}`).join(",")}}`
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

const asIterable = (v: unknown, path: Path, index: number, what: string): ReadonlyArray<unknown> => {
  if (Array.isArray(v)) return v
  if (typeof v === "object" && v !== null && Symbol.iterator in v) return Array.from(v as Iterable<unknown>)
  return failAt(path, index, `expected ${what}, got ${describe(v)}`)
}

/** Builds one array of `field` from `values`. @internal */
export const build = (
  field: S.Field,
  values: ReadonlyArray<unknown>,
  options: Session,
  path: Path = []
): ArrowData.ArrowData => {
  const extensionName = field.metadata.get("ARROW:extension:name")
  const extension = extensionName === undefined ? undefined : options.extensions.get(extensionName)
  if (extension !== undefined) {
    const metadata = field.metadata.get("ARROW:extension:metadata") ?? ""
    values = values.map((v) => isNull(v) ? null : extension.encode(v, metadata))
  }
  if (!field.nullable && field.type._tag !== "Null") {
    const i = values.findIndex(isNull)
    if (i !== -1) fail([...path, i], `null in non-nullable field ${JSON.stringify(field.name)}`)
  }
  return buildType(field.type, values, options, path)
}

const childField = (f: S.Field, values: ReadonlyArray<unknown>, options: Session, path: Path) =>
  build(f, values, options, path)

const buildType = (
  type: S.DataType,
  values: ReadonlyArray<unknown>,
  options: Session,
  path: Path
): ArrowData.ArrowData => {
  const n = values.length
  switch (type._tag) {
    case "Null": {
      const i = values.findIndex((v) => !isNull(v))
      if (i !== -1) fail([...path, i], `expected null, got ${describe(values[i])}`)
      return data(type, n, { validity: undefined, nullCount: n }, [])
    }
    case "Bool": {
      const bits = new Uint8Array(Math.ceil(n / 8))
      values.forEach((v, i) => {
        if (isNull(v)) return
        if (typeof v !== "boolean") fail([...path, i], `expected a boolean, got ${describe(v)}`)
        if (v) bits[i >> 3] |= 1 << (i & 7)
      })
      return data(type, n, validityOf(values), [bits])
    }
    case "Int":
      return data(type, n, validityOf(values), [intBuffer(type, values, path)])
    case "Float": {
      const check = (v: unknown, i: number) =>
        typeof v === "number" ? v : fail([...path, i], `expected a number, got ${describe(v)}`)
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
      return data(type, n, validityOf(values), [decimalBuffer(type, values, path)])
    case "Date":
      return type.unit === "day"
        ? data(type, n, validityOf(values), [
          int32Buffer(values, (v, p, i) =>
            DateTime.isDateTime(v)
              ? Math.floor(DateTime.toEpochMillis(v) / 86_400_000)
              : Number(toBigInt(v, p, i, "a DateTime or days since the epoch")), path)
        ])
        : data(type, n, validityOf(values), [
          int64Buffer(values, (v, p, i) =>
            DateTime.isDateTime(v)
              ? BigInt(DateTime.toEpochMillis(v))
              : toBigInt(v, p, i, "a DateTime or milliseconds since the epoch"), path)
        ])
    case "Timestamp":
      return data(type, n, validityOf(values), [int64Buffer(values, (v, p, i) => instant(type.unit, v, p, i), path)])
    case "Time":
      return type.bitWidth === 32
        ? data(type, n, validityOf(values), [
          int32Buffer(values, (v, p, i) => Number(toBigInt(v, p, i, "int32")), path)
        ])
        : data(type, n, validityOf(values), [int64Buffer(values, (v, p, i) => toBigInt(v, p, i, "int64"), path)])
    case "Duration":
      return data(type, n, validityOf(values), [
        int64Buffer(values, (v, p, i) => {
          if (Duration.isDuration(v)) {
            const nanos = Option.getOrUndefined(Duration.toNanos(v))
            if (nanos === undefined) return failAt(p, i, "infinite durations cannot be stored")
            return floorDiv(nanos, unitNanos[type.unit])
          }
          return toBigInt(v, p, i, `a Duration or an integer in ${type.unit}s`)
        }, path)
      ])
    case "Interval":
      return data(type, n, validityOf(values), [intervalBuffer(type, values, path)])
    case "FixedSizeBinary": {
      const out = new Uint8Array(n * type.byteWidth)
      values.forEach((v, i) => {
        if (isNull(v)) return
        if (!(v instanceof Uint8Array)) fail([...path, i], `expected a Uint8Array, got ${describe(v)}`)
        if ((v as Uint8Array).length !== type.byteWidth) {
          fail([...path, i], `expected ${type.byteWidth} bytes, got ${(v as Uint8Array).length}`)
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
            fail([...path, i], `expected a ${isString ? "string" : "Uint8Array"}, got ${describe(v)}`)
          }
          if (isString) bytes.pushString(v as string)
          else bytes.push(v as Uint8Array)
        }
        if (!large && bytes.length > 2147483647) fail([...path, i], "more than 2 GiB of data needs a Large type")
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
          fail([...path, i], `expected a ${isString ? "string" : "Uint8Array"}, got ${describe(v)}`)
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
      const large = type._tag === "LargeList" || type._tag === "LargeListView"
      const items: Array<unknown> = []
      const offsets = large ? new BigInt64Array(n + 1) : new Int32Array(n + 1)
      const sizes = large ? new BigInt64Array(n) : new Int32Array(n)
      const starts = large ? new BigInt64Array(n) : new Int32Array(n)
      values.forEach((v, i) => {
        const start = items.length
        if (!isNull(v)) { for (const x of asIterable(v, path, i, "an array")) items.push(x) }
        offsets[i + 1] = (large ? BigInt(items.length) : items.length) as never
        starts[i] = (large ? BigInt(start) : start) as never
        sizes[i] = (large ? BigInt(items.length - start) : items.length - start) as never
      })
      const child = childField(type.child, items, options, [...path, "items"])
      return type._tag === "List" || type._tag === "LargeList"
        ? data(type, n, validityOf(values), [asBytes(offsets)], [child])
        : data(type, n, validityOf(values), [asBytes(starts), asBytes(sizes)], [child])
    }
    case "FixedSizeList": {
      const items: Array<unknown> = []
      values.forEach((v, i) => {
        if (isNull(v)) {
          for (let k = 0; k < type.listSize; k++) items.push(null)
          return
        }
        const list = asIterable(v, path, i, "an array")
        if (list.length !== type.listSize) fail([...path, i], `expected ${type.listSize} items, got ${list.length}`)
        items.push(...list)
      })
      // Items of null lists are null too; only items of valid lists must respect the child's nullability.
      const itemsOfValidLists = values.every((v, i) =>
        isNull(v) || items.slice(i * type.listSize, (i + 1) * type.listSize).every((x) => !isNull(x))
      )
      const child = childField(
        { ...type.child, nullable: type.child.nullable || itemsOfValidLists },
        items,
        options,
        [...path, "items"]
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
        if (Array.isArray(v)) {
          type.fields.forEach((_, k) => (columns[k][i] = v[k] ?? null))
          return
        }
        if (typeof v !== "object") fail([...path, i], `expected an object, got ${describe(v)}`)
        type.fields.forEach((f, k) => (columns[k][i] = (v as Record<string, unknown>)[f.name] ?? null))
      })
      const nullable = (f: S.Field, k: number) =>
        // Members of null structs are null too; only check members of valid slots.
        f.nullable ? f : { ...f, nullable: !values.some((v, i) => !isNull(v) && isNull(columns[k][i])) }
      const children = type.fields.map((f, k) => childField(nullable(f, k), columns[k], options, [...path, f.name]))
      return data(type, n, validityOf(values), [], children)
    }
    case "Map": {
      const entriesType = type.entries.type as S.Struct
      const keys: Array<unknown> = []
      const items: Array<unknown> = []
      const offsets = new Int32Array(n + 1)
      values.forEach((v, i) => {
        if (!isNull(v)) {
          const entries = v instanceof Map ? Array.from(v) : asIterable(v, path, i, "a ReadonlyMap")
          for (const e of entries) {
            const [k, x] = asIterable(e, path, i, "a [key, value] entry")
            if (isNull(k)) fail([...path, i], "map keys must not be null")
            keys.push(k)
            items.push(x)
          }
        }
        offsets[i + 1] = keys.length
      })
      const [keyField, valueField] = entriesType.fields
      const entries = data(type.entries.type, keys.length, noNulls, [], [
        childField(keyField, keys, options, [...path, "keys"]),
        childField(valueField, items, options, [...path, "values"])
      ])
      return data(type, n, validityOf(values), [asBytes(offsets)], [entries])
    }
    case "Union":
      return buildUnion(type, values, options, path)
    case "RunEndEncoded": {
      const runEnds: Array<number> = []
      const runValues: Array<unknown> = []
      let previous: string | undefined
      values.forEach((v, i) => {
        const key = keyOf(v)
        if (key === previous) {
          runEnds[runEnds.length - 1] = i + 1
        } else {
          runEnds.push(i + 1)
          runValues.push(isNull(v) ? null : v)
          previous = key
        }
      })
      return data(type, n, noNulls, [], [
        childField(type.runEnds, runEnds, options, [...path, "runEnds"]),
        childField(type.values, runValues, options, [...path, "values"])
      ])
    }
    case "Dictionary": {
      let state = options.dictionaries.get(type.id)
      if (state === undefined) {
        state = { valueType: type.valueType, unique: new Map(), values: [] }
        options.dictionaries.set(type.id, state)
      }
      const s = state
      const indices = values.map((v) => {
        if (isNull(v)) return null
        const key = keyOf(v)
        let index = s.unique.get(key)
        if (index === undefined) {
          index = s.values.length
          s.unique.set(key, index)
          s.values.push(v)
        }
        return index
      })
      const indexBuffer = intBuffer(type.indexType, indices.map((x) => x ?? 0), path)
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

const buildUnion = (
  type: S.Union,
  values: ReadonlyArray<unknown>,
  options: Session,
  path: Path
): ArrowData.ArrowData => {
  const n = values.length
  const typeIds = new Int8Array(n)
  const members = values.map((v, i) => {
    if (isUnionValue(v)) {
      const member = type.typeIds.indexOf(v.typeId)
      if (member === -1) fail([...path, i], `type id ${v.typeId} is not a member of the union`)
      return member
    }
    // A null slot goes to the first nullable member; other values to the first member that accepts them.
    const member = isNull(v)
      ? type.fields.findIndex((f) => f.nullable)
      : type.fields.findIndex((f) => accepts(f.type, v))
    if (member === -1) fail([...path, i], `no union member accepts ${describe(v)}`)
    return member
  })
  const plain = values.map((v) => isUnionValue(v) ? v.value : v)
  members.forEach((m, i) => (typeIds[i] = type.typeIds[m]))
  if (type.mode === "sparse") {
    const children = type.fields.map((f, k) =>
      build({ ...f, nullable: true }, plain.map((v, i) => members[i] === k ? v : null), options, [...path, f.name])
    )
    return data(type, n, noNulls, [asBytes(typeIds)], children)
  }
  const offsets = new Int32Array(n)
  const perMember = type.fields.map((): Array<unknown> => [])
  plain.forEach((v, i) => {
    offsets[i] = perMember[members[i]].length
    perMember[members[i]].push(v)
  })
  const children = type.fields.map((f, k) => build(f, perMember[k], options, [...path, f.name]))
  return data(type, n, noNulls, [asBytes(typeIds), asBytes(offsets)], children)
}
