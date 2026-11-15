/**
 * Result types of expressions: numeric supertypes and literal adoption,
 * following Polars where the TypeScript types allow it.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as Dec from "./decimal.ts"
import * as T from "./temporal.ts"

/**
 * A literal that has not committed to a width yet. Like Polars' dynamic
 * literals, an integer literal adopts the integer type of the column it
 * meets, and a float literal adopts Float32 next to a Float32 column.
 *
 * @internal
 */
export type Dynamic = "int" | "float" | undefined

/** @internal */
export const isNumeric = (t: S.DataType): t is S.Int | S.Float => t._tag === "Int" || t._tag === "Float"
/** @internal */
export const isInteger = (t: S.DataType): t is S.Int => t._tag === "Int"
/** @internal */
export const isFloat = (t: S.DataType): t is S.Float => t._tag === "Float"
/** @internal */
export const isBinaryLike = (t: S.DataType): boolean => t._tag === "Utf8" || t._tag === "Binary"

/** @internal */
export const sameType = (a: S.DataType, b: S.DataType): boolean => {
  if (a._tag !== b._tag) return false
  switch (a._tag) {
    case "Int":
      return a.bitWidth === (b as S.Int).bitWidth && a.signed === (b as S.Int).signed
    case "Float":
      return a.bitWidth === (b as S.Float).bitWidth
    case "Date":
      return a.unit === (b as S.Date).unit
    case "Time":
      return a.unit === (b as S.Time).unit
    case "Timestamp":
      return a.unit === (b as S.Timestamp).unit && (a.timezone ?? null) === ((b as S.Timestamp).timezone ?? null)
    case "Duration":
      return a.unit === (b as S.Duration).unit
    case "Decimal":
      return a.precision === (b as S.Decimal).precision && a.scale === (b as S.Decimal).scale
    case "List":
    case "LargeList":
      return sameType(a.child.type, (b as S.List).child.type)
    case "Struct": {
      const fields = (b as S.Struct).fields
      return a.fields.length === fields.length &&
        a.fields.every((f, i) => f.name === fields[i].name && sameType(f.type, fields[i].type))
    }
    default:
      return true
  }
}

/** The default type of a literal value. @internal */
export const literalType = (value: unknown): { readonly type: S.DataType; readonly dynamic: Dynamic } => {
  switch (typeof value) {
    case "number":
      return Number.isInteger(value) && value >= -2147483648 && value <= 2147483647 && !Object.is(value, -0)
        ? { type: S.int32, dynamic: "int" }
        : { type: S.float64, dynamic: "float" }
    case "bigint":
      return { type: S.int64, dynamic: undefined }
    case "string":
      return { type: S.utf8, dynamic: undefined }
    case "boolean":
      return { type: S.bool, dynamic: undefined }
    default:
      return { type: S.nullType, dynamic: undefined }
  }
}

const intSupertype = (a: S.Int, b: S.Int): S.DataType => {
  if (a.signed === b.signed) return a.bitWidth >= b.bitWidth ? a : b
  const [s, u] = a.signed ? [a, b] : [b, a]
  if (s.bitWidth > u.bitWidth) return s
  // Polars widens to the next signed width; beyond 32 bits that is a
  // bigint, which the number-typed API can't express, so use Float64.
  return u.bitWidth === 8 ? S.int16 : u.bitWidth === 16 ? S.int32 : u.bitWidth === 32 ? S.float64 : S.int64
}

/**
 * The common type of two operands. Returns `undefined` when they have none.
 *
 * @internal
 */
export const supertype = (
  a: S.DataType,
  ad: Dynamic,
  b: S.DataType,
  bd: Dynamic
): { readonly type: S.DataType; readonly dynamic: Dynamic } | undefined => {
  if (a._tag === "Null") return { type: b, dynamic: bd }
  if (b._tag === "Null") return { type: a, dynamic: ad }
  if (Dec.isDecimal(a) || Dec.isDecimal(b)) {
    const t = Dec.supertype(a, b)
    return t === undefined ? undefined : { type: t, dynamic: undefined }
  }
  if (isNumeric(a) && isNumeric(b)) {
    if (ad !== undefined && bd !== undefined) {
      return ad === "float" || bd === "float"
        ? { type: S.float64, dynamic: "float" }
        : { type: S.int32, dynamic: "int" }
    }
    if (ad !== undefined || bd !== undefined) {
      const [lit, col] = ad !== undefined ? [ad, b] : [bd, a]
      if (lit === "int") return { type: col, dynamic: undefined }
      // float literal
      return { type: col._tag === "Float" ? col : S.float64, dynamic: undefined }
    }
    if (a._tag === "Int" && b._tag === "Int") return { type: intSupertype(a, b), dynamic: undefined }
    const f32 = (t: S.DataType) => t._tag === "Float" ? t.bitWidth === 32 : (t as S.Int).bitWidth <= 16
    return { type: f32(a) && f32(b) ? S.float32 : S.float64, dynamic: undefined }
  }
  if (T.isTemporal(a) || T.isTemporal(b)) {
    if (sameType(a, b)) return { type: a, dynamic: undefined }
    const t = T.supertype(a, b)
    return t === undefined ? undefined : { type: t, dynamic: undefined }
  }
  if (sameType(a, b)) return { type: a, dynamic: undefined }
  return undefined
}

/** Type of a true division. @internal */
export const divisionType = (t: S.DataType): S.DataType =>
  t._tag === "Float" && t.bitWidth === 32 ? S.float32 : S.float64

/** Type of `sum` over a column of type `t`. @internal */
export const sumType = (t: S.DataType): S.DataType => {
  if (t._tag === "Bool") return S.uint32
  if (t._tag === "Decimal") return Dec.decimal(t.scale)
  if (t._tag === "Int" && t.bitWidth < 32) return S.int32
  return t
}

/** Type of `mean`, `median`, `std` and `var` over a column of type `t`. @internal */
export const meanType = (t: S.DataType): S.DataType => t._tag === "Float" && t.bitWidth === 32 ? S.float32 : S.float64

/** @internal */
export const describe = (t: S.DataType): string => {
  switch (t._tag) {
    case "Int":
      return `${t.signed ? "Int" : "UInt"}${t.bitWidth}`
    case "Float":
      return `Float${t.bitWidth}`
    case "Timestamp":
      return `Timestamp[${unitName[t.unit]}${t.timezone === undefined ? "" : `, ${t.timezone}`}]`
    case "Duration":
      return `Duration[${unitName[t.unit]}]`
    case "Decimal":
      return `Decimal[${t.precision}, ${t.scale}]`
    default:
      return t._tag
  }
}

const unitName: Record<S.TimeUnit, string> = { second: "s", millisecond: "ms", microsecond: "us", nanosecond: "ns" }

/** Names accepted by `Expr.cast`. @internal */
export const castTargets: Record<string, S.DataType> = {
  Int8: S.int8,
  Int16: S.int16,
  Int32: S.int32,
  Int64: S.int64,
  UInt8: S.uint8,
  UInt16: S.uint16,
  UInt32: S.uint32,
  UInt64: S.uint64,
  Float32: S.float32,
  Float64: S.float64,
  Utf8: S.utf8,
  Bool: S.bool,
  Date: S.date("day"),
  "Timestamp[s]": S.timestamp("second"),
  "Timestamp[ms]": S.timestamp("millisecond"),
  "Timestamp[us]": S.timestamp("microsecond"),
  "Timestamp[ns]": S.timestamp("nanosecond"),
  "Duration[s]": S.duration("second"),
  "Duration[ms]": S.duration("millisecond"),
  "Duration[us]": S.duration("microsecond"),
  "Duration[ns]": S.duration("nanosecond")
}
