/**
 * Element-wise kernels. Each kernel has one loop per physical layout and
 * operand shape (column/column, column/scalar), written out so that V8 sees
 * monomorphic typed-array access in every loop.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as Dec from "./decimal.ts"
import * as D from "./dtype.ts"
import * as T from "./temporal.ts"
import * as V from "./vector.ts"

const I0 = BigInt(0)
const I1 = BigInt(1)
const I2 = BigInt(2)
const I63 = BigInt(63)
const I64 = BigInt(64)

/**
 * An evaluated expression: a vector of the frame's length, or a scalar (a
 * vector of length 1) that broadcasts.
 *
 * @internal
 */
export interface Value {
  readonly vector: V.Vector
  readonly scalar: boolean
  readonly dynamic: D.Dynamic
}

/** @internal */
export const column = (vector: V.Vector): Value => ({ vector, scalar: false, dynamic: undefined })

/** @internal */
export const scalar = (vector: V.Vector, dynamic: D.Dynamic = undefined): Value => ({ vector, scalar: true, dynamic })

/** Expands a scalar to `length` slots. @internal */
export const materialize = (value: Value, length: number): V.Vector =>
  value.scalar ? V.broadcast(value.vector, length) : value.vector

const scalarNull = (value: Value): boolean => value.scalar && !V.isValid(value.vector, 0)

/** Validity of a binary result. @internal */
const resultValid = (a: Value, b: Value, length: number): Uint8Array | undefined | "all-null" => {
  if (scalarNull(a) || scalarNull(b)) return "all-null"
  const av = a.scalar ? undefined : a.vector.valid
  const bv = b.scalar ? undefined : b.vector.valid
  return V.andValid(av, bv, length)
}

// -----------------------------------------------------------------------------
// Null vectors of any type
// -----------------------------------------------------------------------------

/** A vector of `length` nulls with the layout of `type`. @internal */
export const nullsOf = (type: S.DataType, length: number): V.Vector => {
  const valid = new Uint8Array(length)
  switch (V.kindOf(type)) {
    case "f64":
      return V.f64(type, new Float64Array(length), valid)
    case "i32":
      return V.i32(type, new Int32Array(length), valid)
    case "i64":
      return V.i64(type, new BigInt64Array(length), valid)
    case "bool":
      return V.bool(new Uint8Array(length), valid)
    case "str":
      return V.str(type, new Int32Array(length + 1), new Uint8Array(0), valid)
    case "list":
      return V.list(type, new Int32Array(length + 1), nullsOf(V.elementType(type), 0), valid)
    case "struct": {
      const fields = (type as S.Struct).fields
      return V.struct(type, fields.map((f) => nullsOf(f.type, length)), length, valid)
    }
    default:
      return V.nulls(length)
  }
}

// -----------------------------------------------------------------------------
// Casts
// -----------------------------------------------------------------------------

const intRange = (t: S.DataType): [number, number] => {
  if (t._tag !== "Int") return [-Infinity, Infinity]
  if (t.signed) {
    const max = 2 ** (t.bitWidth - 1)
    return [-max, max - 1]
  }
  return [0, 2 ** t.bitWidth - 1]
}

const FLOAT_SYNTAX = /^[+-]?(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|inf|infinity|nan)$/i
const INT_SYNTAX = /^[+-]?\d+$/

const formatNumber = (x: number): string => String(x)

/**
 * Converts `v` to `target`. Values that don't fit become null (Polars'
 * non-strict casts).
 *
 * @internal
 */
export const cast = (v: V.Vector, target: S.DataType): V.Vector => {
  if (D.sameType(v.type, target)) return v
  const n = v.length
  if (v.kind === "null") return nullsOf(target, n)
  const temporal = T.cast(v, target)
  if (temporal !== undefined) return temporal
  const decimal = Dec.cast(v, target)
  if (decimal !== undefined) return decimal
  const targetKind = V.kindOf(target)
  if (targetKind === undefined) return V.fail(`cannot cast to ${target._tag}`)
  let valid = v.valid === undefined ? undefined : v.valid.slice()
  const invalidate = (i: number) => {
    if (valid === undefined) valid = new Uint8Array(n).fill(1)
    valid[i] = 0
  }
  // Same physical layout and both temporal/integer: reinterpret.
  if (
    targetKind === v.kind && (v.kind === "i32" || v.kind === "i64") &&
    (!D.isInteger(target) || !D.isInteger(v.type)) && target._tag !== "Float"
  ) {
    return V.withType(v, target)
  }
  if (targetKind === "str") {
    if (target._tag === "Binary" && v.kind === "str") return V.withType(v, target)
    const out: Array<string | null> = new Array(n)
    for (let i = 0; i < n; i++) {
      if (!V.isValid(v, i)) out[i] = null
      else {
        switch (v.kind) {
          case "f64":
            out[i] = formatNumber(v.values[i])
            break
          case "i32":
            out[i] = String(v.values[i])
            break
          case "i64":
            out[i] = (V.isUnsigned64(v.type) ? BigInt.asUintN(64, v.values[i]) : v.values[i]).toString()
            break
          case "bool":
            out[i] = v.values[i] === 1 ? "true" : "false"
            break
          case "str":
            out[i] = V.decodeString(v, i)
            break
        }
      }
    }
    return V.stringsFrom(target, out)
  }
  if (targetKind === "bool") {
    const out = new Uint8Array(n)
    switch (v.kind) {
      case "f64":
      case "i32": {
        const a = v.values
        for (let i = 0; i < n; i++) out[i] = a[i] !== 0 ? 1 : 0
        break
      }
      case "i64": {
        const a = v.values
        for (let i = 0; i < n; i++) out[i] = a[i] !== I0 ? 1 : 0
        break
      }
      case "str":
        for (let i = 0; i < n; i++) {
          if (!V.isValid(v, i)) continue
          const s = V.decodeString(v, i)
          if (s === "true") out[i] = 1
          else if (s !== "false") invalidate(i)
        }
        break
      case "bool":
        return v
    }
    return V.bool(out, V.compactValid(valid))
  }
  // numeric targets: read every source slot as a number (or bigint for i64 targets)
  const [lo, hi] = intRange(target)
  const isIntTarget = D.isInteger(target) || (target._tag !== "Float" && targetKind !== "f64")
  if (targetKind === "i64") {
    const out = new BigInt64Array(n)
    const unsigned = V.isUnsigned64(target)
    for (let i = 0; i < n; i++) {
      if (valid !== undefined && valid[i] === 0) continue
      switch (v.kind) {
        case "i64": {
          const x = v.values[i]
          if (unsigned && !V.isUnsigned64(v.type) && x < I0) invalidate(i)
          else if (!unsigned && V.isUnsigned64(v.type) && x < I0) invalidate(i)
          else out[i] = x
          break
        }
        case "f64":
        case "i32": {
          const x = Math.trunc(v.values[i])
          if (!Number.isFinite(x) || x < (unsigned ? 0 : -(2 ** 63)) || x >= (unsigned ? 2 ** 64 : 2 ** 63)) {
            invalidate(i)
          } else out[i] = BigInt.asIntN(64, BigInt(x))
          break
        }
        case "bool":
          out[i] = BigInt(v.values[i])
          break
        case "str": {
          const s = V.decodeString(v, i)
          if (!INT_SYNTAX.test(s)) invalidate(i)
          else {
            const x = BigInt(s)
            if (x < (unsigned ? I0 : -(I2 ** I63)) || x >= (unsigned ? I2 ** I64 : I2 ** I63)) invalidate(i)
            else out[i] = BigInt.asIntN(64, x)
          }
          break
        }
      }
    }
    return V.i64(target, out, V.compactValid(valid))
  }
  const out = targetKind === "i32" ? new Int32Array(n) : new Float64Array(n)
  for (let i = 0; i < n; i++) {
    if (valid !== undefined && valid[i] === 0) continue
    let x: number
    switch (v.kind) {
      case "f64":
      case "i32":
        x = v.values[i]
        break
      case "i64":
        x = Number(V.isUnsigned64(v.type) ? BigInt.asUintN(64, v.values[i]) : v.values[i])
        break
      case "bool":
        x = v.values[i]
        break
      case "str": {
        const s = V.decodeString(v, i)
        if (isIntTarget ? !INT_SYNTAX.test(s) : !FLOAT_SYNTAX.test(s)) {
          invalidate(i)
          continue
        }
        const lower = s.toLowerCase()
        x = lower.endsWith("nan") ? NaN : lower.endsWith("inf") || lower.endsWith("infinity")
          ? (s.startsWith("-") ? -Infinity : Infinity)
          : Number(s)
        break
      }
      case "list":
      case "struct":
        return V.fail(`cannot cast ${D.describe(v.type)} to ${D.describe(target)}`)
    }
    if (isIntTarget) {
      const t = Math.trunc(x)
      if (!Number.isFinite(t) || t < lo || t > hi) {
        invalidate(i)
        continue
      }
      out[i] = t
    } else {
      out[i] = x
    }
  }
  if (target._tag === "Float" && target.bitWidth === 32) V.roundFloat32InPlace(target, out as Float64Array)
  return targetKind === "i32"
    ? V.i32(target, out as Int32Array, V.compactValid(valid))
    : V.f64(target, out as Float64Array, V.compactValid(valid))
}

/** Casts a value, keeping its shape. @internal */
export const castValue = (value: Value, target: S.DataType): Value =>
  D.sameType(value.vector.type, target)
    ? value
    : { vector: cast(value.vector, target), scalar: value.scalar, dynamic: undefined }

// -----------------------------------------------------------------------------
// Arithmetic
// -----------------------------------------------------------------------------

/** @internal */
export type ArithOp = "add" | "sub" | "mul" | "div" | "floorDiv" | "mod"

const unify = (op: string, a: Value, b: Value) => {
  const st = D.supertype(a.vector.type, a.dynamic, b.vector.type, b.dynamic)
  if (st === undefined || !(D.isNumeric(st.type) || st.type._tag === "Null")) {
    return V.fail(`${op} is not defined for ${D.describe(a.vector.type)} and ${D.describe(b.vector.type)}`)
  }
  return st
}

/** Relabels a value's vector (same storage). */
const relabel = (value: Value, type: S.DataType): Value => ({ ...value, vector: V.withType(value.vector, type) })

/**
 * Arithmetic with dates, timestamps and durations, on their integers:
 * differences of dates or timestamps are durations, durations shift
 * timestamps, durations add up and scale by integers. Mixed units use the
 * coarser one.
 */
const temporalArith = (op: ArithOp, a: Value, b: Value, length: number): Value => {
  const at = a.vector.type
  const bt = b.vector.type
  const unsupported = () => V.fail(`${op} is not defined for ${D.describe(at)} and ${D.describe(bt)}`)
  const asInt = (v: Value, type: S.DataType) => relabel(castValue(v, type), S.int64)
  const point = (t: S.DataType) => t._tag === "Date" || t._tag === "Timestamp"
  if (op === "sub" && point(at) && point(bt)) {
    if (at._tag === "Date" && bt._tag === "Date") {
      const ts = S.timestamp("microsecond")
      return relabel(arith("sub", asInt(a, ts), asInt(b, ts), length), S.duration("microsecond"))
    }
    const st = T.supertype(at, bt) as S.Timestamp | undefined
    if (st === undefined) return unsupported()
    return relabel(arith("sub", asInt(a, st), asInt(b, st), length), S.duration(st.unit))
  }
  if ((op === "add" || op === "sub") && at._tag === "Timestamp" && bt._tag === "Duration") {
    const unit = T.coarser(at.unit, bt.unit)
    const ts = S.timestamp(unit, at.timezone)
    return relabel(arith(op, asInt(a, ts), asInt(b, S.duration(unit)), length), ts)
  }
  if (op === "add" && at._tag === "Duration" && bt._tag === "Timestamp") return temporalArith(op, b, a, length)
  if ((op === "add" || op === "sub") && at._tag === "Duration" && bt._tag === "Duration") {
    const d = S.duration(T.coarser(at.unit, bt.unit))
    return relabel(arith(op, asInt(a, d), asInt(b, d), length), d)
  }
  if (op === "mul" && at._tag === "Duration" && D.isInteger(bt)) {
    return relabel(arith("mul", relabel(a, S.int64), castValue(b, S.int64), length), at)
  }
  if (op === "mul" && bt._tag === "Duration" && D.isInteger(at)) return temporalArith(op, b, a, length)
  return unsupported()
}

/**
 * Arithmetic with decimals: exact for `add`, `sub` and `mul` (Polars result
 * types); other operations and mixes with floats run on floats.
 */
const decimalArith = (op: ArithOp, a: Value, b: Value, length: number): Value => {
  const st = D.supertype(a.vector.type, a.dynamic, b.vector.type, b.dynamic)
  if (st === undefined) {
    return V.fail(`${op} is not defined for ${D.describe(a.vector.type)} and ${D.describe(b.vector.type)}`)
  }
  if (!Dec.isDecimal(st.type) || (op !== "add" && op !== "sub" && op !== "mul")) {
    return arith(op, castValue(a, S.float64), castValue(b, S.float64), length)
  }
  const asDecimal = (v: Value): Value => (Dec.isDecimal(v.vector.type) ? v : castValue(v, Dec.decimal(0)))
  let left = asDecimal(a)
  const right = asDecimal(b)
  const n = left.scalar && right.scalar ? 1 : length
  if (left.scalar && !right.scalar) left = column(materialize(left, n))
  const valid = resultValid(left, right, n)
  const ls = (left.vector.type as S.Decimal).scale
  const rs = (right.vector.type as S.Decimal).scale
  const result = Dec.arith(
    op,
    (left.vector as V.I64).values,
    ls,
    (right.vector as V.I64).values,
    rs,
    right.scalar && !left.scalar
  )
  if (valid === "all-null") return { vector: nullsOf(result.type, n), scalar: a.scalar && b.scalar, dynamic: undefined }
  return { vector: V.i64(result.type, result.values, valid), scalar: a.scalar && b.scalar, dynamic: undefined }
}

/** @internal */
export const arith = (op: ArithOp, a: Value, b: Value, length: number): Value => {
  if (T.isTemporal(a.vector.type) || T.isTemporal(b.vector.type)) return temporalArith(op, a, b, length)
  if (Dec.isDecimal(a.vector.type) || Dec.isDecimal(b.vector.type)) return decimalArith(op, a, b, length)
  let { dynamic, type } = unify(op, a, b)
  if (op === "div") {
    type = D.divisionType(type)
    dynamic = dynamic === undefined ? undefined : "float"
  }
  if (type._tag === "Null") type = S.int32
  const n = a.scalar && b.scalar ? 1 : length
  const valid = resultValid(a, b, n)
  if (valid === "all-null") return { vector: nullsOf(type, n), scalar: a.scalar && b.scalar, dynamic }
  // A scalar on the left: materialise it (rare) so kernels only see col op col / col op scalar.
  let left = castValue(a, type)
  const right = castValue(b, type)
  if (left.scalar && !right.scalar) left = column(materialize(left, n))
  const lv = left.vector
  const rv = right.vector
  const rs = right.scalar
  let out: V.Vector
  let nullOut: Uint8Array | undefined
  switch (lv.kind) {
    case "f64": {
      const x = lv.values
      const o = new Float64Array(n)
      const unsigned32 = type._tag === "Int"
      if (rs) arithF64Scalar(op, x, (rv as V.F64).values[0], o, n, unsigned32)
      else arithF64(op, x, (rv as V.F64).values, o, n, unsigned32)
      V.roundFloat32InPlace(type, o)
      out = V.f64(type, o, valid)
      break
    }
    case "i32": {
      const x = lv.values
      const o = new Int32Array(n)
      if (op === "floorDiv" || op === "mod") {
        nullOut = new Uint8Array(n).fill(1)
        intDivMod(op, x, (rv as V.I32).values, rs, o, n, nullOut)
      } else if (rs) arithI32Scalar(op, x, (rv as V.I32).values[0], o, n)
      else arithI32(op, x, (rv as V.I32).values, o, n)
      V.wrapInPlace(type, o)
      out = V.i32(type, o, valid)
      break
    }
    case "i64": {
      const x = lv.values
      const y = (rv as V.I64).values
      const o = new BigInt64Array(n)
      const unsigned = V.isUnsigned64(type)
      for (let i = 0; i < n; i++) {
        let p = x[i]
        let q = rs ? y[0] : y[i]
        if (unsigned) {
          p = BigInt.asUintN(64, p)
          q = BigInt.asUintN(64, q)
        }
        let r: bigint
        switch (op) {
          case "add":
            r = p + q
            break
          case "sub":
            r = p - q
            break
          case "mul":
            r = p * q
            break
          default: {
            if (q === I0) {
              if (nullOut === undefined) nullOut = new Uint8Array(n).fill(1)
              nullOut[i] = 0
              r = I0
              break
            }
            let d = p / q
            if ((p % q !== I0) && ((p < I0) !== (q < I0))) d -= I1
            r = op === "floorDiv" ? d : p - d * q
          }
        }
        o[i] = BigInt.asIntN(64, r)
      }
      out = V.i64(type, o, valid)
      break
    }
    default:
      return V.fail(`${op} is not defined for ${D.describe(type)}`)
  }
  if (nullOut !== undefined) out = V.withValid(out, V.compactValid(V.andValid(out.valid, nullOut, n)))
  return { vector: out, scalar: a.scalar && b.scalar, dynamic }
}

/** Float modulo as Polars computes it: `a - b * floor(a / b)`. */
const floatMod = (a: number, b: number): number => a - b * Math.floor(a / b)

const floorMod = (a: number, b: number): number => {
  const r = a % b
  return r !== 0 && (r < 0) !== (b < 0) ? r + b : r
}

const arithF64 = (op: ArithOp, x: Float64Array, y: Float64Array, o: Float64Array, n: number, u32: boolean) => {
  switch (op) {
    case "add":
      for (let i = 0; i < n; i++) o[i] = x[i] + y[i]
      break
    case "sub":
      for (let i = 0; i < n; i++) o[i] = x[i] - y[i]
      break
    case "mul":
      if (u32) { for (let i = 0; i < n; i++) o[i] = Math.imul(x[i], y[i]) >>> 0 }
      else for (let i = 0; i < n; i++) o[i] = x[i] * y[i]
      break
    case "div":
      for (let i = 0; i < n; i++) o[i] = x[i] / y[i]
      break
    case "floorDiv":
      if (u32) { for (let i = 0; i < n; i++) o[i] = Math.floor(x[i] / y[i]) }
      else for (let i = 0; i < n; i++) o[i] = Math.floor(x[i] / y[i])
      break
    case "mod":
      if (u32) { for (let i = 0; i < n; i++) o[i] = floorMod(x[i], y[i]) }
      else for (let i = 0; i < n; i++) o[i] = floatMod(x[i], y[i])
      break
  }
  if (u32) { for (let i = 0; i < n; i++) o[i] = o[i] >>> 0 }
}

const arithF64Scalar = (op: ArithOp, x: Float64Array, y: number, o: Float64Array, n: number, u32: boolean) => {
  switch (op) {
    case "add":
      for (let i = 0; i < n; i++) o[i] = x[i] + y
      break
    case "sub":
      for (let i = 0; i < n; i++) o[i] = x[i] - y
      break
    case "mul":
      if (u32) { for (let i = 0; i < n; i++) o[i] = Math.imul(x[i], y) >>> 0 }
      else for (let i = 0; i < n; i++) o[i] = x[i] * y
      break
    case "div":
      for (let i = 0; i < n; i++) o[i] = x[i] / y
      break
    case "floorDiv":
      for (let i = 0; i < n; i++) o[i] = Math.floor(x[i] / y)
      break
    case "mod":
      if (u32) { for (let i = 0; i < n; i++) o[i] = floorMod(x[i], y) }
      else for (let i = 0; i < n; i++) o[i] = floatMod(x[i], y)
      break
  }
  if (u32) { for (let i = 0; i < n; i++) o[i] = o[i] >>> 0 }
}

const arithI32 = (op: ArithOp, x: Int32Array, y: Int32Array, o: Int32Array, n: number) => {
  switch (op) {
    case "add":
      for (let i = 0; i < n; i++) o[i] = (x[i] + y[i]) | 0
      break
    case "sub":
      for (let i = 0; i < n; i++) o[i] = (x[i] - y[i]) | 0
      break
    case "mul":
      for (let i = 0; i < n; i++) o[i] = Math.imul(x[i], y[i])
      break
  }
}

const arithI32Scalar = (op: ArithOp, x: Int32Array, y: number, o: Int32Array, n: number) => {
  switch (op) {
    case "add":
      for (let i = 0; i < n; i++) o[i] = (x[i] + y) | 0
      break
    case "sub":
      for (let i = 0; i < n; i++) o[i] = (x[i] - y) | 0
      break
    case "mul":
      for (let i = 0; i < n; i++) o[i] = Math.imul(x[i], y)
      break
  }
}

const intDivMod = (
  op: "floorDiv" | "mod",
  x: Int32Array,
  y: Int32Array,
  ys: boolean,
  o: Int32Array,
  n: number,
  valid: Uint8Array
) => {
  for (let i = 0; i < n; i++) {
    const a = x[i]
    const b = ys ? y[0] : y[i]
    if (b === 0) {
      valid[i] = 0
      continue
    }
    if (op === "floorDiv") o[i] = Math.floor(a / b) | 0
    else o[i] = floorMod(a, b) | 0
  }
}

/** Unary numeric operations. @internal */
export const unaryNumeric = (op: "neg" | "abs" | "sqrt" | "round", a: Value, decimals = 0): Value => {
  const v = a.vector
  const n = v.length
  if (v.kind === "null") return a
  if (op === "sqrt" && v.kind !== "f64") return unaryNumeric(op, castValue(a, S.float64))
  switch (v.kind) {
    case "f64": {
      const x = v.values
      const o = new Float64Array(n)
      if (op === "neg") { for (let i = 0; i < n; i++) o[i] = -x[i] }
      else if (op === "abs") { for (let i = 0; i < n; i++) o[i] = Math.abs(x[i]) }
      else if (op === "sqrt") { for (let i = 0; i < n; i++) o[i] = Math.sqrt(x[i]) }
      else if (D.isFloat(v.type)) roundHalfEven(x, o, decimals)
      else o.set(x)
      if (v.type._tag === "Int") V.wrapInPlace(v.type, o)
      V.roundFloat32InPlace(v.type, o)
      return { vector: V.f64(v.type, o, v.valid), scalar: a.scalar, dynamic: a.dynamic }
    }
    case "i32": {
      const x = v.values
      const o = new Int32Array(n)
      if (op === "neg") { for (let i = 0; i < n; i++) o[i] = -x[i] | 0 }
      else if (op === "abs") { for (let i = 0; i < n; i++) o[i] = Math.abs(x[i]) | 0 }
      else o.set(x)
      V.wrapInPlace(v.type, o)
      return { vector: V.i32(v.type, o, v.valid), scalar: a.scalar, dynamic: a.dynamic }
    }
    case "i64": {
      const x = v.values
      const o = new BigInt64Array(n)
      if (op === "neg") { for (let i = 0; i < n; i++) o[i] = BigInt.asIntN(64, -x[i]) }
      else if (op === "abs") { for (let i = 0; i < n; i++) o[i] = BigInt.asIntN(64, x[i] < I0 ? -x[i] : x[i]) }
      else o.set(x)
      return { vector: V.i64(v.type, o, v.valid), scalar: a.scalar, dynamic: a.dynamic }
    }
    default:
      return V.fail(`${op} is not defined for ${D.describe(v.type)}`)
  }
}

const roundHalfEven = (x: Float64Array, o: Float64Array, decimals: number) => {
  const scale = 10 ** decimals
  for (let i = 0; i < x.length; i++) {
    const v = x[i]
    if (!Number.isFinite(v)) {
      o[i] = v
      continue
    }
    const y = decimals === 0 ? v : v * scale
    let r = Math.round(y)
    // Math.round rounds halves up; move exact halves to the even neighbour.
    if (r - y === 0.5 && r % 2 !== 0) r -= 1
    if (r === 0 && (y < 0 || Object.is(y, -0))) r = -0
    o[i] = decimals === 0 ? r : r / scale
  }
}

// -----------------------------------------------------------------------------
// Comparisons
// -----------------------------------------------------------------------------

/** @internal */
export type CompareOp = "eq" | "neq" | "lt" | "lte" | "gt" | "gte"

const mirror: Record<CompareOp, CompareOp> = { eq: "eq", neq: "neq", lt: "gt", lte: "gte", gt: "lt", gte: "lte" }

/** Lexicographic comparison of two byte ranges. @internal */
export const compareBytes = (
  a: Uint8Array,
  as: number,
  ae: number,
  b: Uint8Array,
  bs: number,
  be: number
): number => {
  const la = ae - as
  const lb = be - bs
  const l = la < lb ? la : lb
  for (let k = 0; k < l; k++) {
    const d = a[as + k] - b[bs + k]
    if (d !== 0) return d
  }
  return la - lb
}

const fromOrdering = (op: CompareOp, c: number): number => {
  switch (op) {
    case "eq":
      return c === 0 ? 1 : 0
    case "neq":
      return c !== 0 ? 1 : 0
    case "lt":
      return c < 0 ? 1 : 0
    case "lte":
      return c <= 0 ? 1 : 0
    case "gt":
      return c > 0 ? 1 : 0
    case "gte":
      return c >= 0 ? 1 : 0
  }
}

/** @internal */
export const compare = (op: CompareOp, a: Value, b: Value, length: number): Value => {
  if (a.scalar && !b.scalar) return compare(mirror[op], b, a, length)
  const at = a.vector.type
  const bt = b.vector.type
  const n = a.scalar ? 1 : length
  let left = a
  let right = b
  if (D.isNumeric(at) && D.isNumeric(bt) && !D.sameType(at, bt)) {
    const st = D.supertype(at, a.dynamic, bt, b.dynamic)!.type
    // Compare mixed widths as Float64 unless both are 64-bit integers.
    const target = V.kindOf(st) === "i64" && V.kindOf(at) === "i64" && V.kindOf(bt) === "i64" ? st : S.float64
    left = castValue(a, V.kindOf(st) === "i32" ? st : target)
    right = castValue(b, V.kindOf(st) === "i32" ? st : target)
  } else if (at._tag === "Null" || bt._tag === "Null") {
    return { vector: nullsOf(S.bool, n), scalar: a.scalar, dynamic: undefined }
  } else if ((Dec.isDecimal(at) || Dec.isDecimal(bt)) && !D.sameType(at, bt)) {
    const st = D.supertype(at, a.dynamic, bt, b.dynamic)
    if (st === undefined) return V.fail(`cannot compare ${D.describe(at)} with ${D.describe(bt)}`)
    left = castValue(a, st.type)
    right = castValue(b, st.type)
  } else if ((T.isTemporal(at) || T.isTemporal(bt)) && !D.sameType(at, bt)) {
    const st = T.supertype(at, bt)
    if (st === undefined) return V.fail(`cannot compare ${D.describe(at)} with ${D.describe(bt)}`)
    left = castValue(a, st)
    right = castValue(b, st)
  } else if (!D.sameType(at, bt) && !(D.isBinaryLike(at) && D.isBinaryLike(bt))) {
    return V.fail(`cannot compare ${D.describe(at)} with ${D.describe(bt)}`)
  }
  const valid = resultValid(left, right, n)
  if (valid === "all-null") return { vector: nullsOf(S.bool, n), scalar: a.scalar, dynamic: undefined }
  const o = new Uint8Array(n)
  const lv = left.vector
  const rv = right.vector
  const rs = right.scalar
  switch (lv.kind) {
    case "f64":
      if (rs) compareF64Scalar(op, lv.values, (rv as V.F64).values[0], o, n)
      else compareF64(op, lv.values, (rv as V.F64).values, o, n)
      break
    case "i32":
      if (rs) compareI32Scalar(op, lv.values, (rv as V.I32).values[0], o, n)
      else compareI32(op, lv.values, (rv as V.I32).values, o, n)
      break
    case "bool": {
      const x = lv.values
      const y = (rv as V.Bool).values
      for (let i = 0; i < n; i++) o[i] = fromOrdering(op, x[i] - y[rs ? 0 : i])
      break
    }
    case "i64": {
      const unsigned = V.isUnsigned64(lv.type)
      const x = new Int32Array(lv.values.buffer, lv.values.byteOffset, n * 2)
      const yv = (rv as V.I64).values
      const y = new Int32Array(yv.buffer, yv.byteOffset, yv.length * 2)
      for (let i = 0; i < n; i++) {
        const j = rs ? 0 : i
        const xh = x[2 * i + 1]
        const yh = y[2 * j + 1]
        let c: number
        if (xh !== yh) c = unsigned ? (xh >>> 0) - (yh >>> 0) : xh - yh
        else c = (x[2 * i] >>> 0) - (y[2 * j] >>> 0)
        o[i] = fromOrdering(op, c)
      }
      break
    }
    case "str": {
      const r = rv as V.Str
      const ao = lv.offsets
      const ad = lv.data
      const bo = r.offsets
      const bd = r.data
      if (rs && (op === "eq" || op === "neq")) {
        const bs = bo[0]
        const blen = bo[1] - bs
        const yes = op === "eq" ? 1 : 0
        for (let i = 0; i < n; i++) {
          const s = ao[i]
          if (ao[i + 1] - s !== blen) {
            o[i] = 1 - yes
            continue
          }
          let same = 1
          for (let k = 0; k < blen; k++) {
            if (ad[s + k] !== bd[bs + k]) {
              same = 0
              break
            }
          }
          o[i] = same === 1 ? yes : 1 - yes
        }
      } else {
        for (let i = 0; i < n; i++) {
          const j = rs ? 0 : i
          o[i] = fromOrdering(op, compareBytes(ad, ao[i], ao[i + 1], bd, bo[j], bo[j + 1]))
        }
      }
      break
    }
    default:
      return V.fail(`cannot compare ${D.describe(at)}`)
  }
  return { vector: V.bool(o, valid), scalar: a.scalar, dynamic: undefined }
}

// Float64 comparisons use a total order: NaN equals NaN and sorts above every
// other value, as in Polars.
const compareF64 = (op: CompareOp, x: Float64Array, y: Float64Array, o: Uint8Array, n: number) => {
  switch (op) {
    case "eq":
      for (let i = 0; i < n; i++) {
        const a = x[i]
        const b = y[i]
        o[i] = +(a === b || (a !== a && b !== b))
      }
      break
    case "neq":
      for (let i = 0; i < n; i++) {
        const a = x[i]
        const b = y[i]
        o[i] = +!(a === b || (a !== a && b !== b))
      }
      break
    case "lt":
      for (let i = 0; i < n; i++) {
        const a = x[i]
        const b = y[i]
        o[i] = +(a < b || (b !== b && a === a))
      }
      break
    case "gte":
      for (let i = 0; i < n; i++) {
        const a = x[i]
        const b = y[i]
        o[i] = +!(a < b || (b !== b && a === a))
      }
      break
    case "gt":
      for (let i = 0; i < n; i++) {
        const a = x[i]
        const b = y[i]
        o[i] = +(a > b || (a !== a && b === b))
      }
      break
    case "lte":
      for (let i = 0; i < n; i++) {
        const a = x[i]
        const b = y[i]
        o[i] = +!(a > b || (a !== a && b === b))
      }
      break
  }
}

const compareF64Scalar = (op: CompareOp, x: Float64Array, b: number, o: Uint8Array, n: number) => {
  if (b !== b) {
    // Against NaN: only NaN is equal; everything else is smaller.
    for (let i = 0; i < n; i++) {
      const isNaN = x[i] !== x[i]
      o[i] = op === "eq" || op === "gte" || op === "lte"
        ? +(op === "lte" ? true : isNaN)
        : op === "neq" || op === "lt"
        ? +!isNaN
        : 0
    }
    return
  }
  switch (op) {
    case "eq":
      for (let i = 0; i < n; i++) o[i] = +(x[i] === b)
      break
    case "neq":
      for (let i = 0; i < n; i++) o[i] = +(x[i] !== b)
      break
    case "lt":
      for (let i = 0; i < n; i++) o[i] = +(x[i] < b)
      break
    case "lte":
      for (let i = 0; i < n; i++) o[i] = +(x[i] <= b)
      break
    case "gt":
      for (let i = 0; i < n; i++) {
        const a = x[i]
        o[i] = +(a > b || a !== a)
      }
      break
    case "gte":
      for (let i = 0; i < n; i++) {
        const a = x[i]
        o[i] = +(a >= b || a !== a)
      }
      break
  }
}

const compareI32 = (op: CompareOp, x: Int32Array, y: Int32Array, o: Uint8Array, n: number) => {
  switch (op) {
    case "eq":
      for (let i = 0; i < n; i++) o[i] = +(x[i] === y[i])
      break
    case "neq":
      for (let i = 0; i < n; i++) o[i] = +(x[i] !== y[i])
      break
    case "lt":
      for (let i = 0; i < n; i++) o[i] = +(x[i] < y[i])
      break
    case "lte":
      for (let i = 0; i < n; i++) o[i] = +(x[i] <= y[i])
      break
    case "gt":
      for (let i = 0; i < n; i++) o[i] = +(x[i] > y[i])
      break
    case "gte":
      for (let i = 0; i < n; i++) o[i] = +(x[i] >= y[i])
      break
  }
}

const compareI32Scalar = (op: CompareOp, x: Int32Array, b: number, o: Uint8Array, n: number) => {
  switch (op) {
    case "eq":
      for (let i = 0; i < n; i++) o[i] = +(x[i] === b)
      break
    case "neq":
      for (let i = 0; i < n; i++) o[i] = +(x[i] !== b)
      break
    case "lt":
      for (let i = 0; i < n; i++) o[i] = +(x[i] < b)
      break
    case "lte":
      for (let i = 0; i < n; i++) o[i] = +(x[i] <= b)
      break
    case "gt":
      for (let i = 0; i < n; i++) o[i] = +(x[i] > b)
      break
    case "gte":
      for (let i = 0; i < n; i++) o[i] = +(x[i] >= b)
      break
  }
}

// -----------------------------------------------------------------------------
// Boolean logic (Kleene)
// -----------------------------------------------------------------------------

const asBool = (value: Value, length: number): V.Bool => {
  const v = materialize(value, length)
  if (v.kind === "bool") return v
  if (v.kind === "null") return V.bool(new Uint8Array(length), new Uint8Array(length))
  return V.fail(`expected a boolean expression, got ${D.describe(v.type)}`)
}

/** @internal */
export const logical = (op: "and" | "or", a: Value, b: Value, length: number): Value => {
  const n = a.scalar && b.scalar ? 1 : length
  const x = asBool(a, n)
  const y = asBool(b, n)
  const o = new Uint8Array(n)
  const xv = x.values
  const yv = y.values
  if (x.valid === undefined && y.valid === undefined) {
    if (op === "and") { for (let i = 0; i < n; i++) o[i] = xv[i] & yv[i] }
    else for (let i = 0; i < n; i++) o[i] = xv[i] | yv[i]
    return { vector: V.bool(o), scalar: a.scalar && b.scalar, dynamic: undefined }
  }
  const valid = new Uint8Array(n)
  const xa = x.valid
  const ya = y.valid
  for (let i = 0; i < n; i++) {
    const p = xa === undefined ? 1 : xa[i]
    const q = ya === undefined ? 1 : ya[i]
    const pv = xv[i] & p
    const qv = yv[i] & q
    if (op === "and") {
      // false wins over null
      const definitelyFalse = (p === 1 && pv === 0) || (q === 1 && qv === 0)
      o[i] = pv & qv
      valid[i] = definitelyFalse || (p === 1 && q === 1) ? 1 : 0
    } else {
      const definitelyTrue = pv === 1 || qv === 1
      o[i] = pv | qv
      valid[i] = definitelyTrue || (p === 1 && q === 1) ? 1 : 0
    }
  }
  return { vector: V.bool(o, V.compactValid(valid)), scalar: a.scalar && b.scalar, dynamic: undefined }
}

/** @internal */
export const not = (a: Value): Value => {
  const v = a.vector
  if (v.kind === "null") return a
  if (v.kind !== "bool") return V.fail(`not is not defined for ${D.describe(v.type)}`)
  const o = new Uint8Array(v.length)
  const x = v.values
  for (let i = 0; i < o.length; i++) o[i] = x[i] ^ 1
  return { vector: V.bool(o, v.valid), scalar: a.scalar, dynamic: undefined }
}

/** @internal */
export const isNull = (a: Value, negate: boolean): Value => {
  const v = a.vector
  const o = new Uint8Array(v.length)
  if (v.kind === "null") o.fill(negate ? 0 : 1)
  else if (v.valid === undefined) o.fill(negate ? 1 : 0)
  else if (negate) o.set(v.valid)
  else for (let i = 0; i < o.length; i++) o[i] = v.valid[i] ^ 1
  return { vector: V.bool(o), scalar: a.scalar, dynamic: undefined }
}

/** @internal */
export const isNaN_ = (a: Value): Value => {
  const v = a.vector
  const o = new Uint8Array(v.length)
  if (v.kind === "f64" && v.type._tag === "Float") {
    const x = v.values
    for (let i = 0; i < o.length; i++) o[i] = +(x[i] !== x[i])
  } else if (v.kind !== "f64" && v.kind !== "i32" && v.kind !== "i64" && v.kind !== "null") {
    return V.fail(`isNaN is not defined for ${D.describe(v.type)}`)
  }
  return {
    vector: V.bool(o, v.kind === "null" ? new Uint8Array(v.length) : v.valid),
    scalar: a.scalar,
    dynamic: undefined
  }
}

// -----------------------------------------------------------------------------
// Conditionals
// -----------------------------------------------------------------------------

/**
 * `cond ? then : otherwise` per slot; a null condition takes `otherwise`.
 *
 * @internal
 */
export const when = (cond: Value, then: Value, otherwise: Value, length: number): Value => {
  const st = D.supertype(then.vector.type, then.dynamic, otherwise.vector.type, otherwise.dynamic)
  if (st === undefined) {
    return V.fail(
      `when branches have incompatible types ${D.describe(then.vector.type)} and ${D.describe(otherwise.vector.type)}`
    )
  }
  const allScalar = cond.scalar && then.scalar && otherwise.scalar
  const n = allScalar ? 1 : length
  const c = asBool(cond, n)
  const mask = new Int32Array(n)
  const cv = c.values
  const ca = c.valid
  for (let i = 0; i < n; i++) mask[i] = (cv[i] & (ca === undefined ? 1 : ca[i])) === 1 ? 0 : 1
  const branches = [materialize(castValue(then, st.type), n), materialize(castValue(otherwise, st.type), n)]
  return { vector: select(branches, mask), scalar: allScalar, dynamic: st.dynamic }
}

/** Picks slot `i` from `branches[choice[i]]`; all branches share a type. @internal */
export const select = (branches: ReadonlyArray<V.Vector>, choice: Int32Array): V.Vector => {
  const n = choice.length
  const first = branches.find((b) => b.kind !== "null") ?? branches[0]
  if (first.kind === "null") return V.nulls(n)
  if (first.kind === "list" || first.kind === "struct") {
    // Nested values: gather slot i from the chosen branch.
    const all = V.concat(branches.map((b) => (b.kind === "null" ? nullsOf(first.type, n) : b)))
    const indices = new Int32Array(n)
    for (let i = 0; i < n; i++) indices[i] = choice[i] * n + i
    return V.take(all, indices)
  }
  const valid = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const b = branches[choice[i]]
    valid[i] = V.isValid(b, i) ? 1 : 0
  }
  switch (first.kind) {
    case "f64":
    case "i32":
    case "bool":
    case "i64": {
      const out = first.kind === "f64"
        ? new Float64Array(n)
        : first.kind === "i32"
        ? new Int32Array(n)
        : first.kind === "bool"
        ? new Uint8Array(n)
        : new BigInt64Array(n)
      for (let i = 0; i < n; i++) {
        const b = branches[choice[i]]
        if (b.kind !== "null") (out as any)[i] = (b as V.F64).values[i]
      }
      const vector = first.kind === "f64"
        ? V.f64(first.type, out as Float64Array)
        : first.kind === "i32"
        ? V.i32(first.type, out as Int32Array)
        : first.kind === "bool"
        ? V.bool(out as Uint8Array)
        : V.i64(first.type, out as BigInt64Array)
      return V.withValid(vector, V.compactValid(valid))
    }
    case "str": {
      const indices = new Int32Array(n)
      // Concatenate branches, then gather from the concatenation.
      const strs = branches.map((b) => b.kind === "str" ? b : nullsOf(first.type, n))
      const all = V.concat(strs)
      for (let i = 0; i < n; i++) indices[i] = choice[i] * n + i
      return V.withValid(V.take(all, indices), V.compactValid(valid))
    }
  }
}

/** First non-null value per slot. @internal */
export const coalesce = (values: ReadonlyArray<Value>, length: number): Value => {
  let acc = values[0]
  let type = acc.vector.type
  let dynamic = acc.dynamic
  for (const v of values.slice(1)) {
    const st = D.supertype(type, dynamic, v.vector.type, v.dynamic)
    if (st === undefined) return V.fail(`coalesce arguments have incompatible types`)
    type = st.type
    dynamic = st.dynamic
  }
  const allScalar = values.every((v) => v.scalar)
  const n = allScalar ? 1 : length
  const vectors = values.map((v) => materialize(castValue(v, type), n))
  const choice = new Int32Array(n)
  for (let i = 0; i < n; i++) {
    let k = 0
    while (k < vectors.length - 1 && !V.isValid(vectors[k], i)) k++
    choice[i] = k
  }
  acc = { vector: select(vectors, choice), scalar: allScalar, dynamic }
  return acc
}

// -----------------------------------------------------------------------------
// Membership
// -----------------------------------------------------------------------------

/** @internal */
export const isIn = (a: Value, candidates: ReadonlyArray<unknown>): Value => {
  const v = a.vector
  const n = v.length
  const o = new Uint8Array(n)
  switch (v.kind) {
    case "str": {
      const encoded = candidates.filter((c): c is string => typeof c === "string").map(V.encodeString)
      for (let i = 0; i < n; i++) {
        const s = v.offsets[i]
        const e = v.offsets[i + 1]
        for (const c of encoded) {
          if (compareBytes(v.data, s, e, c, 0, c.length) === 0) {
            o[i] = 1
            break
          }
        }
      }
      break
    }
    case "f64":
    case "i32": {
      const set = new Set(candidates.filter((c) => typeof c === "number").map((c) => (c as number) === 0 ? 0 : c))
      const hasNaN = candidates.some((c) => typeof c === "number" && Number.isNaN(c))
      const x = v.values
      for (let i = 0; i < n; i++) o[i] = +(set.has(x[i] === 0 ? 0 : x[i]) || (hasNaN && x[i] !== x[i]))
      break
    }
    case "i64": {
      const set = new Set(
        candidates.filter((c) => typeof c === "bigint" || typeof c === "number").map((c) => BigInt(c as any))
      )
      for (let i = 0; i < n; i++) o[i] = +set.has(v.values[i])
      break
    }
    case "bool": {
      const t = candidates.includes(true)
      const f = candidates.includes(false)
      for (let i = 0; i < n; i++) o[i] = +(v.values[i] === 1 ? t : f)
      break
    }
    case "null":
      return { vector: nullsOf(S.bool, n), scalar: a.scalar, dynamic: undefined }
  }
  return { vector: V.bool(o, v.valid), scalar: a.scalar, dynamic: undefined }
}

// -----------------------------------------------------------------------------
// Strings
// -----------------------------------------------------------------------------

const asStr = (value: Value, name: string): V.Str => {
  const v = value.vector
  if (v.kind === "str") return v
  return V.fail(`${name} is not defined for ${D.describe(v.type)}`)
}

/** Number of code points. @internal */
export const strLength = (a: Value): Value => {
  if (a.vector.kind === "null") {
    return { vector: nullsOf(S.uint32, a.vector.length), scalar: a.scalar, dynamic: undefined }
  }
  const v = asStr(a, "length")
  const n = v.length
  const o = new Float64Array(n)
  const d = v.data
  const off = v.offsets
  for (let i = 0; i < n; i++) {
    let c = 0
    for (let k = off[i]; k < off[i + 1]; k++) c += (d[k] & 0xc0) !== 0x80 ? 1 : 0
    o[i] = c
  }
  return { vector: V.f64(S.uint32, o, v.valid), scalar: a.scalar, dynamic: undefined }
}

/** @internal */
export const strMap = (a: Value, f: (s: string) => string): Value => {
  if (a.vector.kind === "null") return a
  const v = asStr(a, "string function")
  const out: Array<string | null> = new Array(v.length)
  for (let i = 0; i < v.length; i++) out[i] = V.isValid(v, i) ? f(V.decodeString(v, i)) : null
  return { vector: V.stringsFrom(v.type, out), scalar: a.scalar, dynamic: undefined }
}

/** @internal */
export const strMatch = (a: Value, mode: "includes" | "startsWith" | "endsWith", pattern: string): Value => {
  if (a.vector.kind === "null") {
    return { vector: nullsOf(S.bool, a.vector.length), scalar: a.scalar, dynamic: undefined }
  }
  const v = asStr(a, mode)
  const p = V.encodeString(pattern)
  const m = p.length
  const n = v.length
  const o = new Uint8Array(n)
  const d = v.data
  const off = v.offsets
  for (let i = 0; i < n; i++) {
    const s = off[i]
    const e = off[i + 1]
    if (e - s < m) continue
    if (mode === "startsWith" || mode === "endsWith") {
      const at = mode === "startsWith" ? s : e - m
      let ok = 1
      for (let k = 0; k < m; k++) {
        if (d[at + k] !== p[k]) {
          ok = 0
          break
        }
      }
      o[i] = ok
    } else {
      outer: for (let at = s; at <= e - m; at++) {
        for (let k = 0; k < m; k++) if (d[at + k] !== p[k]) continue outer
        o[i] = 1
        break
      }
    }
  }
  return { vector: V.bool(o, v.valid), scalar: a.scalar, dynamic: undefined }
}

/** Concatenation; a null argument makes the slot null. @internal */
export const strConcat = (values: ReadonlyArray<Value>, length: number): Value => {
  const allScalar = values.every((v) => v.scalar)
  const n = allScalar ? 1 : length
  const parts = values.map((v) => {
    const vector = materialize(v, n)
    return vector.kind === "str" ? vector : (cast(vector, S.utf8) as V.Str | V.Null)
  })
  let valid: Uint8Array | undefined
  for (const p of parts) {
    if (p.kind === "null") valid = new Uint8Array(n)
    else valid = V.andValid(valid, p.valid, n)
  }
  const offsets = new Int32Array(n + 1)
  let total = 0
  for (let i = 0; i < n; i++) {
    for (const p of parts) if (p.kind === "str") total += p.offsets[i + 1] - p.offsets[i]
    offsets[i + 1] = total
  }
  const data = new Uint8Array(total)
  for (let i = 0; i < n; i++) {
    let at = offsets[i]
    for (const p of parts) {
      if (p.kind !== "str") continue
      const s = p.offsets[i]
      const e = p.offsets[i + 1]
      data.set(p.data.subarray(s, e), at)
      at += e - s
    }
  }
  return { vector: V.str(S.utf8, offsets, data, valid), scalar: allScalar, dynamic: undefined }
}
