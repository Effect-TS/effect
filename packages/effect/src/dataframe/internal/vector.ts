/**
 * Physical columns used by the DataFrame kernels.
 *
 * Every Arrow type the DataFrame supports maps onto one of five physical
 * layouts, so kernels only need a loop per layout:
 *
 * - `f64`: `Float64Array` (Float32, Float64 and UInt32)
 * - `i32`: `Int32Array` (Int8, Int16, Int32, UInt8, UInt16, Date32, Time32)
 * - `i64`: `BigInt64Array` (Int64, UInt64 (bit pattern), Date64, Timestamp,
 *   Time64, Duration)
 * - `bool`: `Uint8Array` with one byte per value (0 or 1)
 * - `str`: UTF-8 bytes plus `Int32Array` offsets (Utf8, LargeUtf8, Utf8View
 *   and Binary variants)
 * - `null`: no buffers
 *
 * Validity is one byte per slot (1 = valid), `undefined` when no slot is
 * null. Values behind null slots are unspecified but always readable.
 *
 * The logical Arrow type rides along so results keep their type (an Int8 sum
 * stays Int8, a timestamp stays a timestamp).
 *
 * @internal
 */
import type * as ArrowData from "../../arrow/ArrowData.ts"
import * as S from "../../arrow/ArrowSchema.ts"
import { typed } from "../../arrow/internal/buffers.ts"

/** @internal */
export type Vector = F64 | I32 | I64 | Bool | Str | Null | List | Struct

/** @internal */
export interface F64 {
  readonly kind: "f64"
  readonly type: S.DataType
  readonly length: number
  readonly values: Float64Array
  readonly valid: Uint8Array | undefined
}
/** @internal */
export interface I32 {
  readonly kind: "i32"
  readonly type: S.DataType
  readonly length: number
  readonly values: Int32Array
  readonly valid: Uint8Array | undefined
}
/** @internal */
export interface I64 {
  readonly kind: "i64"
  readonly type: S.DataType
  readonly length: number
  readonly values: BigInt64Array
  readonly valid: Uint8Array | undefined
}
/** @internal */
export interface Bool {
  readonly kind: "bool"
  readonly type: S.DataType
  readonly length: number
  readonly values: Uint8Array
  readonly valid: Uint8Array | undefined
}
/** @internal */
export interface Str {
  readonly kind: "str"
  readonly type: S.DataType
  readonly length: number
  /** `offsets[i]..offsets[i + 1]` is slot `i`'s byte range in `data`. */
  readonly offsets: Int32Array
  readonly data: Uint8Array
  readonly valid: Uint8Array | undefined
}
/** @internal */
export interface Null {
  readonly kind: "null"
  readonly type: S.DataType
  readonly length: number
  readonly valid: Uint8Array | undefined
}

/** @internal */
/** @internal */
export interface List {
  readonly kind: "list"
  readonly type: S.DataType
  readonly length: number
  /** `offsets[i]..offsets[i + 1]` are slot `i`'s elements in `child`. */
  readonly offsets: Int32Array
  readonly child: Vector
  readonly valid: Uint8Array | undefined
}
/** @internal */
export interface Struct {
  readonly kind: "struct"
  readonly type: S.DataType
  readonly length: number
  /** One vector per field, in the type's field order. */
  readonly children: ReadonlyArray<Vector>
  readonly valid: Uint8Array | undefined
}

/** @internal */
export class DataFrameDefect extends Error {
  readonly _tag = "DataFrameDefect"
}

/** @internal */
export const fail = (message: string): never => {
  throw new DataFrameDefect(message)
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const f64 = (type: S.DataType, values: Float64Array, valid?: Uint8Array): F64 => ({
  kind: "f64",
  type,
  length: values.length,
  values,
  valid
})
/** @internal */
export const i32 = (type: S.DataType, values: Int32Array, valid?: Uint8Array): I32 => ({
  kind: "i32",
  type,
  length: values.length,
  values,
  valid
})
/** @internal */
export const i64 = (type: S.DataType, values: BigInt64Array, valid?: Uint8Array): I64 => ({
  kind: "i64",
  type,
  length: values.length,
  values,
  valid
})
/** @internal */
export const bool = (values: Uint8Array, valid?: Uint8Array): Bool => ({
  kind: "bool",
  type: S.bool,
  length: values.length,
  values,
  valid
})
/** @internal */
export const str = (type: S.DataType, offsets: Int32Array, data: Uint8Array, valid?: Uint8Array): Str => ({
  kind: "str",
  type,
  length: offsets.length - 1,
  offsets,
  data,
  valid
})
/** @internal */
export const list = (type: S.DataType, offsets: Int32Array, child: Vector, valid?: Uint8Array): List => ({
  kind: "list",
  type,
  length: offsets.length - 1,
  offsets,
  child,
  valid
})
/** @internal */
export const struct = (
  type: S.DataType,
  children: ReadonlyArray<Vector>,
  length: number,
  valid?: Uint8Array
): Struct => ({
  kind: "struct",
  type,
  length,
  children,
  valid
})
/** The element type of a list type. @internal */
export const elementType = (type: S.DataType): S.DataType =>
  type._tag === "List" || type._tag === "LargeList" ? type.child.type : fail(`expected a list, got ${type._tag}`)
/** @internal */
export const nulls = (length: number): Null => ({ kind: "null", type: S.nullType, length, valid: undefined })

/** @internal */
export const withValid = <V extends Vector>(v: V, valid: Uint8Array | undefined): V => ({ ...v, valid })

/** @internal */
export const withType = <V extends Vector>(v: V, type: S.DataType): V => ({ ...v, type })

/** Whether slot `i` holds a value. @internal */
export const isValid = (v: Vector, i: number): boolean =>
  v.kind === "null" ? false : v.valid === undefined || v.valid[i] === 1

/** Number of null slots. @internal */
export const nullCount = (v: Vector): number => {
  if (v.kind === "null") return v.length
  const valid = v.valid
  if (valid === undefined) return 0
  let n = 0
  for (let i = 0; i < v.length; i++) n += valid[i]
  return v.length - n
}

/** Drops an all-ones validity mask. @internal */
export const compactValid = (valid: Uint8Array | undefined): Uint8Array | undefined => {
  if (valid === undefined) return undefined
  for (let i = 0; i < valid.length; i++) if (valid[i] === 0) return valid
  return undefined
}

/** Validity of a slot-wise AND of two masks. @internal */
export const andValid = (
  a: Uint8Array | undefined,
  b: Uint8Array | undefined,
  length: number
): Uint8Array | undefined => {
  if (a === undefined) return b
  if (b === undefined) return a
  const out = new Uint8Array(length)
  for (let i = 0; i < length; i++) out[i] = a[i] & b[i]
  return out
}

// -----------------------------------------------------------------------------
// Physical classification of Arrow types
// -----------------------------------------------------------------------------

/** @internal */
export type Kind = Vector["kind"]

/** The physical layout of a supported logical type, or `undefined`. @internal */
export const kindOf = (type: S.DataType): Kind | undefined => {
  switch (type._tag) {
    case "Null":
      return "null"
    case "Bool":
      return "bool"
    case "Int":
      return type.bitWidth === 64 ? "i64" : type.bitWidth === 32 && !type.signed ? "f64" : "i32"
    case "Float":
      return type.bitWidth === 16 ? undefined : "f64"
    case "Utf8":
    case "LargeUtf8":
    case "Utf8View":
    case "Binary":
    case "LargeBinary":
    case "BinaryView":
      return "str"
    case "Date":
      return type.unit === "day" ? "i32" : "i64"
    case "Time":
      return type.bitWidth === 32 ? "i32" : "i64"
    case "Timestamp":
    case "Duration":
      return "i64"
    case "Dictionary":
      return kindOf(type.valueType)
    case "Decimal":
      return "i64"
    case "List":
    case "LargeList":
      return kindOf(type.child.type) === undefined ? undefined : "list"
    case "Struct":
      return type.fields.every((f) => kindOf(f.type) !== undefined) ? "struct" : undefined
    default:
      return undefined
  }
}

/** The type a column of `type` has inside a DataFrame (string variants collapse). @internal */
export const storageType = (type: S.DataType): S.DataType => {
  switch (type._tag) {
    case "LargeUtf8":
    case "Utf8View":
      return S.utf8
    case "LargeBinary":
    case "BinaryView":
      return S.binary
    case "Dictionary":
      return storageType(type.valueType)
    case "List":
    case "LargeList":
      return S.list(S.field(type.child.name, storageType(type.child.type), { nullable: type.child.nullable }))
    case "Struct":
      return S.struct(type.fields.map((f) => S.field(f.name, storageType(f.type), { nullable: f.nullable })))
    default:
      return type
  }
}

/** Wraps every value of an integer column to its logical type, in place. @internal */
export const wrapInPlace = (type: S.DataType, values: Int32Array | Float64Array): void => {
  if (type._tag !== "Int") return
  const n = values.length
  if (type.bitWidth === 8) {
    if (type.signed) { for (let i = 0; i < n; i++) values[i] = (values[i] << 24) >> 24 }
    else for (let i = 0; i < n; i++) values[i] = values[i] & 0xff
  } else if (type.bitWidth === 16) {
    if (type.signed) { for (let i = 0; i < n; i++) values[i] = (values[i] << 16) >> 16 }
    else for (let i = 0; i < n; i++) values[i] = values[i] & 0xffff
  } else if (type.bitWidth === 32 && !type.signed) {
    for (let i = 0; i < n; i++) values[i] = values[i] >>> 0
  } else if (type.bitWidth === 32) {
    for (let i = 0; i < n; i++) values[i] = values[i] | 0
  }
}

/** Rounds every value of a Float32 column, in place. @internal */
export const roundFloat32InPlace = (type: S.DataType, values: Float64Array): void => {
  if (type._tag === "Float" && type.bitWidth === 32) {
    for (let i = 0; i < values.length; i++) values[i] = Math.fround(values[i])
  }
}

/** Wraps 64-bit values to an unsigned type's bit pattern view. @internal */
export const isUnsigned64 = (type: S.DataType): boolean => type._tag === "Int" && type.bitWidth === 64 && !type.signed

// -----------------------------------------------------------------------------
// Arrow interop
// -----------------------------------------------------------------------------

const unpackBits = (bits: Uint8Array, offset: number, length: number): Uint8Array => {
  const out = new Uint8Array(length)
  if ((offset & 7) === 0) {
    const base = offset >> 3
    const full = length >> 3
    for (let b = 0; b < full; b++) {
      const byte = bits[base + b]
      const o = b << 3
      out[o] = byte & 1
      out[o + 1] = (byte >> 1) & 1
      out[o + 2] = (byte >> 2) & 1
      out[o + 3] = (byte >> 3) & 1
      out[o + 4] = (byte >> 4) & 1
      out[o + 5] = (byte >> 5) & 1
      out[o + 6] = (byte >> 6) & 1
      out[o + 7] = (byte >> 7) & 1
    }
    for (let i = full << 3; i < length; i++) out[i] = (bits[base + (i >> 3)] >> (i & 7)) & 1
    return out
  }
  for (let i = 0; i < length; i++) {
    const j = offset + i
    out[i] = (bits[j >> 3] >> (j & 7)) & 1
  }
  return out
}

/** Packs a byte-per-slot mask into an Arrow bitmap. @internal */
export const packBits = (bytes: Uint8Array): Uint8Array => {
  const n = bytes.length
  const out = new Uint8Array((n + 7) >> 3)
  const full = n >> 3
  for (let b = 0; b < full; b++) {
    const o = b << 3
    out[b] = bytes[o] | (bytes[o + 1] << 1) | (bytes[o + 2] << 2) | (bytes[o + 3] << 3) |
      (bytes[o + 4] << 4) | (bytes[o + 5] << 5) | (bytes[o + 6] << 6) | (bytes[o + 7] << 7)
  }
  for (let i = full << 3; i < n; i++) out[i >> 3] |= bytes[i] << (i & 7)
  return out
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Decodes slot `i` of a string vector. @internal */
export const decodeString = (v: Str, i: number): string => {
  const start = v.offsets[i]
  const end = v.offsets[i + 1]
  if (end === start) return ""
  // Short ASCII strings are cheaper to build by hand than through TextDecoder.
  if (end - start <= 16) {
    let s = ""
    const data = v.data
    for (let k = start; k < end; k++) {
      const c = data[k]
      if (c >= 0x80) return decoder.decode(data.subarray(start, end))
      s += String.fromCharCode(c)
    }
    return s
  }
  return decoder.decode(v.data.subarray(start, end))
}

/** Encodes a string to UTF-8. @internal */
export const encodeString = (s: string): Uint8Array => encoder.encode(s)

/** Builds a string vector from JS values (`null` for missing slots). @internal */
export const stringsFrom = (type: S.DataType, values: ReadonlyArray<string | Uint8Array | null | undefined>): Str => {
  const n = values.length
  const offsets = new Int32Array(n + 1)
  let data: Uint8Array = new Uint8Array(Math.max(16, n * 8))
  let valid: Uint8Array | undefined
  let at = 0
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v === null || v === undefined) {
      if (valid === undefined) valid = new Uint8Array(n).fill(1)
      valid[i] = 0
    } else if (typeof v === "string") {
      // At most 3 bytes per UTF-16 code unit.
      const need = at + v.length * 3
      if (need > data.length) data = grow(data, need)
      at += encoder.encodeInto(v, data.subarray(at)).written
    } else {
      const need = at + v.length
      if (need > data.length) data = grow(data, need)
      data.set(v, at)
      at += v.length
    }
    offsets[i + 1] = at
  }
  return str(type, offsets, data.subarray(0, at), valid)
}

const grow = (data: Uint8Array, need: number): Uint8Array => {
  const out = new Uint8Array(Math.max(need, data.length * 2))
  out.set(data)
  return out
}

const viewOffsets = (data: ArrowData.ArrowData, large: boolean): { offsets: Int32Array; bytes: Uint8Array } => {
  const n = data.length
  if (!large) {
    const all = typed(Int32Array, data.buffers[0])
    const first = all[data.offset]
    const bytes = data.buffers[1]
    if (first === 0) return { offsets: all.subarray(data.offset, data.offset + n + 1), bytes }
    const offsets = new Int32Array(n + 1)
    for (let i = 0; i <= n; i++) offsets[i] = all[data.offset + i] - first
    return { offsets, bytes: bytes.subarray(first) }
  }
  const all = typed(BigInt64Array, data.buffers[0])
  const first = Number(all[data.offset])
  const last = Number(all[data.offset + n])
  if (last - first > 0x7fffffff) fail("string column larger than 2 GiB")
  const offsets = new Int32Array(n + 1)
  for (let i = 0; i <= n; i++) offsets[i] = Number(all[data.offset + i]) - first
  return { offsets, bytes: data.buffers[1].subarray(first) }
}

const fromViews = (type: S.DataType, data: ArrowData.ArrowData, valid: Uint8Array | undefined): Str => {
  const n = data.length
  const views = data.buffers[0]
  const dv = new DataView(views.buffer, views.byteOffset, views.byteLength)
  let total = 0
  for (let i = 0; i < n; i++) total += dv.getInt32((data.offset + i) * 16, true)
  const out = new Uint8Array(total)
  const offsets = new Int32Array(n + 1)
  let at = 0
  for (let i = 0; i < n; i++) {
    const base = (data.offset + i) * 16
    const len = dv.getInt32(base, true)
    if (len <= 12) out.set(views.subarray(base + 4, base + 4 + len), at)
    else {
      const buffer = data.buffers[1 + dv.getInt32(base + 8, true)]
      const off = dv.getInt32(base + 12, true)
      out.set(buffer.subarray(off, off + len), at)
    }
    at += len
    offsets[i + 1] = at
  }
  return str(type, offsets, out, valid)
}

/** Converts array data to a vector. Copies only where the layouts differ. @internal */
export const fromArrowData = (data: ArrowData.ArrowData): Vector => {
  const type = data.type
  if (type._tag === "Dictionary") {
    const dictionary = data.dictionary === undefined
      ? fail("dictionary-encoded column without a dictionary")
      : fromArrowData(data.dictionary)
    const indexData: ArrowData.ArrowData = { ...data, type: type.indexType, dictionary: undefined }
    const indices = fromArrowData(indexData)
    const idx = indices.kind === "i64"
      ? Int32Array.from(indices.values, Number)
      : indices.kind === "f64"
      ? Int32Array.from(indices.values)
      : (indices as I32).values
    return take(dictionary, idx, indices.valid)
  }
  const n = data.length
  const valid = data.validity === undefined || data.nullCount === 0
    ? undefined
    : unpackBits(data.validity, data.offset, n)
  const storage = storageType(type)
  switch (type._tag) {
    case "Null":
      return nulls(n)
    case "Bool":
      return bool(unpackBits(data.buffers[0], data.offset, n), valid)
    case "Int": {
      const o = data.offset
      const b = data.buffers[0]
      switch (type.bitWidth) {
        case 8:
          return i32(
            type,
            type.signed
              ? Int32Array.from(typed(Int8Array, b).subarray(o, o + n))
              : Int32Array.from(b.subarray(o, o + n)),
            valid
          )
        case 16:
          return i32(
            type,
            Int32Array.from((type.signed ? typed(Int16Array, b) : typed(Uint16Array, b)).subarray(o, o + n)),
            valid
          )
        case 32:
          return type.signed
            ? i32(type, typed(Int32Array, b).subarray(o, o + n), valid)
            : f64(type, Float64Array.from(typed(Uint32Array, b).subarray(o, o + n)), valid)
        default:
          return i64(type, typed(BigInt64Array, b).subarray(o, o + n), valid)
      }
    }
    case "Float":
      if (type.bitWidth === 64) {
        return f64(type, typed(Float64Array, data.buffers[0]).subarray(data.offset, data.offset + n), valid)
      }
      if (type.bitWidth === 32) {
        return f64(
          type,
          Float64Array.from(typed(Float32Array, data.buffers[0]).subarray(data.offset, data.offset + n)),
          valid
        )
      }
      return fail("Float16 columns are not supported")
    case "Date":
    case "Time":
    case "Timestamp":
    case "Duration": {
      const k = kindOf(type)
      return k === "i32"
        ? i32(type, typed(Int32Array, data.buffers[0]).subarray(data.offset, data.offset + n), valid)
        : i64(type, typed(BigInt64Array, data.buffers[0]).subarray(data.offset, data.offset + n), valid)
    }
    case "Utf8":
    case "Binary":
    case "LargeUtf8":
    case "LargeBinary": {
      const { bytes, offsets } = viewOffsets(data, type._tag === "LargeUtf8" || type._tag === "LargeBinary")
      return str(storage, offsets, bytes, valid)
    }
    case "Utf8View":
    case "BinaryView":
      return fromViews(storage, data, valid)
    case "Decimal": {
      const o = data.offset
      const b = data.buffers[0]
      if (type.bitWidth === 32) {
        return i64(type, BigInt64Array.from(typed(Int32Array, b).subarray(o, o + n), BigInt), valid)
      }
      if (type.bitWidth === 64) return i64(type, typed(BigInt64Array, b).subarray(o, o + n), valid)
      // 128 or 256 bits: keep the low word when the rest only extends its sign.
      const words = type.bitWidth / 64
      const all = typed(BigInt64Array, b)
      const out = new BigInt64Array(n)
      for (let i = 0; i < n; i++) {
        const base = (o + i) * words
        const lo = all[base]
        const sign = lo < BigInt(0) ? BigInt(-1) : BigInt(0)
        for (let w = 1; w < words; w++) {
          if (all[base + w] !== sign && (valid === undefined || valid[i] === 1)) {
            return fail(`decimal values beyond 18 digits are not supported (column of ${type.bitWidth}-bit decimals)`)
          }
        }
        out[i] = lo
      }
      return i64(type, out, valid)
    }
    case "List":
    case "LargeList": {
      const raw = type._tag === "LargeList"
        ? Int32Array.from(typed(BigInt64Array, data.buffers[0]).subarray(data.offset, data.offset + n + 1), Number)
        : typed(Int32Array, data.buffers[0]).subarray(data.offset, data.offset + n + 1)
      const child = fromArrowData(data.children[0])
      const first = raw[0]
      if (first === 0) return list(storage, raw, child, valid)
      const offsets = Int32Array.from(raw, (o) => o - first)
      return list(storage, offsets, slice(child, first, raw[n]), valid)
    }
    case "Struct": {
      const children = data.children.map((c) => {
        const v = fromArrowData(c)
        return v.length === n && data.offset === 0 ? v : slice(v, data.offset, data.offset + n)
      })
      return struct(storage, children, n, valid)
    }
    default:
      return fail(`columns of type ${type._tag} are not supported`)
  }
}

/** Converts a vector to Arrow array data (offset 0). @internal */
export const toArrowData = (v: Vector): ArrowData.ArrowData => {
  const n = v.length
  const nullCount_ = nullCount(v)
  const validity = v.kind !== "null" && v.valid !== undefined && nullCount_ > 0 ? packBits(v.valid) : undefined
  const base = {
    type: v.type,
    length: n,
    offset: 0,
    nullCount: nullCount_,
    validity,
    children: [],
    dictionary: undefined
  }
  const bytes = (a: ArrayBufferView) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
  switch (v.kind) {
    case "null":
      return { ...base, validity: undefined, buffers: [] }
    case "list":
      return { ...base, buffers: [bytes(v.offsets)], children: [toArrowData(v.child)] }
    case "struct":
      return { ...base, buffers: [], children: v.children.map(toArrowData) }
    case "bool":
      return { ...base, buffers: [packBits(v.values)] }
    case "str":
      return { ...base, buffers: [bytes(v.offsets), v.data] }
    case "i64": {
      const t = v.type
      if (t._tag === "Decimal" && t.bitWidth !== 64) {
        if (t.bitWidth === 32) return { ...base, buffers: [bytes(Int32Array.from(v.values, Number))] }
        const words = t.bitWidth / 64
        const out = new BigInt64Array(n * words)
        for (let i = 0; i < n; i++) {
          out[i * words] = v.values[i]
          const sign = v.values[i] < BigInt(0) ? BigInt(-1) : BigInt(0)
          for (let w = 1; w < words; w++) out[i * words + w] = sign
        }
        return { ...base, buffers: [bytes(out)] }
      }
      return { ...base, buffers: [bytes(v.values)] }
    }
    case "i32": {
      const t = v.type
      if (t._tag === "Int" && t.bitWidth === 8) {
        return { ...base, buffers: [bytes(t.signed ? Int8Array.from(v.values) : Uint8Array.from(v.values))] }
      }
      if (t._tag === "Int" && t.bitWidth === 16) {
        return { ...base, buffers: [bytes(t.signed ? Int16Array.from(v.values) : Uint16Array.from(v.values))] }
      }
      return { ...base, buffers: [bytes(v.values)] }
    }
    case "f64": {
      const t = v.type
      if (t._tag === "Int") return { ...base, buffers: [bytes(Uint32Array.from(v.values))] }
      if (t._tag === "Float" && t.bitWidth === 32) return { ...base, buffers: [bytes(Float32Array.from(v.values))] }
      return { ...base, buffers: [bytes(v.values)] }
    }
  }
}

// -----------------------------------------------------------------------------
// Gather, slice, concat
// -----------------------------------------------------------------------------

/**
 * Gathers `indices` from `v`. A negative index produces a null slot. `valid`
 * (optional) marks additional null output slots.
 *
 * @internal
 */
export const take = (v: Vector, indices: Int32Array, extraValid?: Uint8Array): Vector => {
  const n = indices.length
  let hasMissing = false
  for (let i = 0; i < n; i++) {
    if (indices[i] < 0) {
      hasMissing = true
      break
    }
  }
  if (v.kind === "null") return nulls(n)
  let valid: Uint8Array | undefined
  const src = v.valid
  if (src !== undefined || hasMissing || extraValid !== undefined) {
    valid = new Uint8Array(n)
    if (src === undefined && !hasMissing) valid.set(extraValid!)
    else {
      for (let i = 0; i < n; i++) {
        const j = indices[i]
        valid[i] = j < 0 ? 0 : src === undefined ? 1 : src[j]
      }
      if (extraValid !== undefined) { for (let i = 0; i < n; i++) valid[i] &= extraValid[i] }
    }
  }
  switch (v.kind) {
    case "list": {
      const so = v.offsets
      const offsets = new Int32Array(n + 1)
      let total = 0
      for (let i = 0; i < n; i++) {
        const j = indices[i]
        if (j >= 0) total += so[j + 1] - so[j]
        offsets[i + 1] = total
      }
      const elements = new Int32Array(total)
      let k = 0
      for (let i = 0; i < n; i++) {
        const j = indices[i]
        if (j < 0) continue
        for (let e = so[j]; e < so[j + 1]; e++) elements[k++] = e
      }
      return list(v.type, offsets, take(v.child, elements), valid)
    }
    case "struct":
      return struct(v.type, v.children.map((c) => take(c, indices)), n, valid)
    case "f64": {
      const a = v.values
      const o = new Float64Array(n)
      if (hasMissing) { for (let i = 0; i < n; i++) o[i] = indices[i] < 0 ? 0 : a[indices[i]] }
      else for (let i = 0; i < n; i++) o[i] = a[indices[i]]
      return f64(v.type, o, valid)
    }
    case "i32": {
      const a = v.values
      const o = new Int32Array(n)
      if (hasMissing) { for (let i = 0; i < n; i++) o[i] = indices[i] < 0 ? 0 : a[indices[i]] }
      else for (let i = 0; i < n; i++) o[i] = a[indices[i]]
      return i32(v.type, o, valid)
    }
    case "i64": {
      // Gather 64-bit values as pairs of 32-bit halves: much faster than bigint reads.
      const a = new Int32Array(v.values.buffer, v.values.byteOffset, v.values.length * 2)
      const o = new Int32Array(n * 2)
      for (let i = 0; i < n; i++) {
        const j = indices[i]
        if (j >= 0) {
          o[2 * i] = a[2 * j]
          o[2 * i + 1] = a[2 * j + 1]
        }
      }
      return i64(v.type, new BigInt64Array(o.buffer), valid)
    }
    case "bool": {
      const a = v.values
      const o = new Uint8Array(n)
      if (hasMissing) { for (let i = 0; i < n; i++) o[i] = indices[i] < 0 ? 0 : a[indices[i]] }
      else for (let i = 0; i < n; i++) o[i] = a[indices[i]]
      return bool(o, valid)
    }
    case "str": {
      const offsets = new Int32Array(n + 1)
      const so = v.offsets
      let total = 0
      for (let i = 0; i < n; i++) {
        const j = indices[i]
        if (j >= 0) total += so[j + 1] - so[j]
        offsets[i + 1] = total
      }
      const data = new Uint8Array(total)
      const sd = v.data
      let i = 0
      while (i < n) {
        const j = indices[i]
        if (j < 0) {
          i++
          continue
        }
        // Copy runs of consecutive source rows in one go.
        let e = i + 1
        while (e < n && indices[e] === indices[e - 1] + 1) e++
        const s = so[j]
        const end = so[indices[e - 1] + 1]
        const at = offsets[i]
        const len = end - s
        if (len < 16) { for (let k = 0; k < len; k++) data[at + k] = sd[s + k] }
        else data.set(sd.subarray(s, end), at)
        i = e
      }
      return str(v.type, offsets, data, valid)
    }
  }
}

/** Slots `[start, end)`, sharing buffers. @internal */
export const slice = (v: Vector, start: number, end: number): Vector => {
  const valid = v.valid?.subarray(start, end)
  switch (v.kind) {
    case "list": {
      const first = v.offsets[start]
      const offsets = first === 0
        ? v.offsets.subarray(start, end + 1)
        : Int32Array.from(v.offsets.subarray(start, end + 1), (o) => o - first)
      return list(v.type, offsets, slice(v.child, first, v.offsets[end]), valid)
    }
    case "struct":
      return struct(v.type, v.children.map((c) => slice(c, start, end)), end - start, valid)
    case "null":
      return nulls(end - start)
    case "f64":
      return f64(v.type, v.values.subarray(start, end), valid)
    case "i32":
      return i32(v.type, v.values.subarray(start, end), valid)
    case "i64":
      return i64(v.type, v.values.subarray(start, end), valid)
    case "bool":
      return bool(v.values.subarray(start, end), valid)
    case "str": {
      const first = v.offsets[start]
      if (first === 0) return str(v.type, v.offsets.subarray(start, end + 1), v.data, valid)
      const offsets = new Int32Array(end - start + 1)
      for (let i = 0; i <= end - start; i++) offsets[i] = v.offsets[start + i] - first
      return str(v.type, offsets, v.data.subarray(first, v.offsets[end]), valid)
    }
  }
}

/** Concatenates vectors of the same kind and type. @internal */
export const concat = (parts: ReadonlyArray<Vector>): Vector => {
  if (parts.length === 1) return parts[0]
  const first = parts[0]
  const n = parts.reduce((s, p) => s + p.length, 0)
  let valid: Uint8Array | undefined
  if (parts.some((p) => p.kind === "null" || p.valid !== undefined)) {
    valid = new Uint8Array(n)
    let at = 0
    for (const p of parts) {
      if (p.kind !== "null") {
        if (p.valid === undefined) valid.fill(1, at, at + p.length)
        else valid.set(p.valid, at)
      }
      at += p.length
    }
  }
  const kind = parts.find((p) => p.kind !== "null")?.kind ?? "null"
  if (kind === "null") return nulls(n)
  const type = parts.find((p) => p.kind !== "null")!.type
  if (kind === "list") {
    const offsets = new Int32Array(n + 1)
    const children: Array<Vector> = []
    let row = 0
    let at = 0
    for (const p of parts) {
      if (p.kind === "list") {
        for (let i = 1; i <= p.length; i++) offsets[row + i] = at + p.offsets[i]
        at += p.offsets[p.length]
        children.push(p.child)
      } else for (let i = 1; i <= p.length; i++) offsets[row + i] = at
      row += p.length
    }
    return list(type, offsets, concat(children.length === 0 ? [nulls(0)] : children), valid)
  }
  if (kind === "struct") {
    const fields = (parts.find((p) => p.kind === "struct") as Struct).children.length
    const children = Array.from(
      { length: fields },
      (_, f) => concat(parts.map((p) => (p.kind === "struct" ? p.children[f] : nulls(p.length))))
    )
    return struct(type, children, n, valid)
  }
  const fill = <T extends Float64Array | Int32Array | BigInt64Array | Uint8Array>(out: T): T => {
    let at = 0
    for (const p of parts) {
      if (p.kind !== "null") out.set((p as F64).values as any, at)
      at += p.length
    }
    return out
  }
  switch (kind) {
    case "f64":
      return f64(type, fill(new Float64Array(n)), valid)
    case "i32":
      return i32(type, fill(new Int32Array(n)), valid)
    case "i64":
      return i64(type, fill(new BigInt64Array(n)), valid)
    case "bool":
      return bool(fill(new Uint8Array(n)), valid)
    case "str": {
      const total = parts.reduce((s, p) => s + (p.kind === "str" ? p.offsets[p.length] - p.offsets[0] : 0), 0)
      const data = new Uint8Array(total)
      const offsets = new Int32Array(n + 1)
      let at = 0
      let row = 0
      for (const p of parts) {
        if (p.kind === "str") {
          const base = p.offsets[0]
          data.set(p.data.subarray(base, p.offsets[p.length]), at)
          for (let i = 1; i <= p.length; i++) offsets[row + i] = at + p.offsets[i] - base
          at += p.offsets[p.length] - base
        } else {
          for (let i = 1; i <= p.length; i++) offsets[row + i] = at
        }
        row += p.length
      }
      return str(type, offsets, data, valid)
    }
  }
  return first
}

/** A vector of `length` copies of one value. @internal */
export const broadcast = (v: Vector, length: number): Vector => {
  if (v.length === length) return v
  if (v.length !== 1) return fail(`cannot broadcast a column of length ${v.length} to ${length}`)
  return take(v, new Int32Array(length))
}
