/**
 * Decimals: unscaled 64-bit integers with a scale (`value / 10^scale`), so
 * up to 18 significant digits. Arithmetic follows Polars' result types
 * (precision 38, scales added for products, the larger scale for sums).
 * Every computed decimal is stored through `checked` (or `fit`), so a
 * value outside 64 bits fails instead of wrapping; casts make such values
 * null instead. Rescaling down rounds half to even.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as V from "./vector.ts"

const powers: Array<bigint> = []
/** `10^k` as a bigint. */
const pow10 = (k: number): bigint => (powers[k] ??= BigInt(10) ** BigInt(k))

const I0 = BigInt(0)
const I1 = BigInt(1)
const I2 = BigInt(2)
const MAX = BigInt("9223372036854775807")
const MIN = -BigInt("9223372036854775808")

/** @internal */
export const isDecimal = (t: S.DataType): t is S.Decimal => t._tag === "Decimal"

/** Precision of results, as in Polars. */
const PRECISION = 38

/** @internal */
export const decimal = (scale: number): S.Decimal => S.decimal(PRECISION, scale)

/** The common type of a decimal and another numeric type. @internal */
export const supertype = (a: S.DataType, b: S.DataType): S.DataType | undefined => {
  if (isDecimal(a) && isDecimal(b)) {
    return a.scale === b.scale && a.precision === b.precision
      ? a
      : decimal(Math.max(a.scale, b.scale))
  }
  const [d, other] = isDecimal(a) ? [a, b] : [b as S.Decimal, a]
  if (other._tag === "Int") return decimal(d.scale)
  if (other._tag === "Float") return S.float64
  return undefined
}

const inRange = (x: bigint): boolean => x <= MAX && x >= MIN

/** `x`, or a failure when it overflows 64-bit decimal storage. @internal */
export const checked = (x: bigint): bigint => (inRange(x) ? x : V.fail("decimal value overflows 64 bits"))

const wrap = (x: bigint): bigint => BigInt.asIntN(64, x)

/**
 * How an exact result of `type` is stored in 64 bits: decimals are
 * `checked`, 64-bit integers wrap.
 *
 * @internal
 */
export const fit = (type: S.DataType): (x: bigint) => bigint => isDecimal(type) ? checked : wrap

/** Rounds `x / 10^k` half to even. */
const divRound = (x: bigint, k: number): bigint => {
  if (k === 0) return x
  const divisor = pow10(k)
  // Truncated towards zero; the remainder has the sign of `x`.
  const quotient = x / divisor
  const remainder = x % divisor
  const twice = (remainder < I0 ? -remainder : remainder) * I2
  if (twice < divisor || (twice === divisor && quotient % I2 === I0)) return quotient
  return x < I0 ? quotient - I1 : quotient + I1
}

/** `unscaled / 10^scale` as a decimal string, all `scale` digits shown. */
const format = (unscaled: bigint, scale: number): string => {
  const negative = unscaled < I0
  const digits = (negative ? -unscaled : unscaled).toString().padStart(scale + 1, "0")
  const text = scale === 0 ? digits : `${digits.slice(0, digits.length - scale)}.${digits.slice(digits.length - scale)}`
  return negative ? `-${text}` : text
}

const DECIMAL_SYNTAX = /^\s*([+-]?)(\d*)(?:\.(\d*))?\s*$/

/** Parses a decimal string to unscaled units of `scale`; `undefined` when invalid. */
const parse = (s: string, scale: number): bigint | undefined => {
  const m = DECIMAL_SYNTAX.exec(s)
  if (m === null || (m[2] === "" && (m[3] ?? "") === "")) return undefined
  const fraction = m[3] ?? ""
  const all = BigInt(`${m[2] || "0"}${fraction}`)
  const x = fraction.length >= scale ? divRound(all, fraction.length - scale) : all * pow10(scale - fraction.length)
  return m[1] === "-" ? -x : x
}

/**
 * Casts to and from decimals; `undefined` when neither side is a decimal.
 * Values that don't fit the target become null.
 *
 * @internal
 */
export const cast = (v: V.Vector, target: S.DataType): V.Vector | undefined => {
  const from = v.type
  if (!isDecimal(from) && !isDecimal(target)) return undefined
  const n = v.length
  const valid = new Uint8Array(n)
  if (isDecimal(target)) {
    const out = new BigInt64Array(n)
    // At most `precision` digits: |x| < 10^precision.
    const limit = target.precision >= 1 ? pow10(target.precision) : I0
    const put = (i: number, x: bigint | undefined) => {
      if (x !== undefined && inRange(x) && x < limit && -x < limit) {
        out[i] = x
        valid[i] = 1
      }
    }
    for (let i = 0; i < n; i++) {
      if (!V.isValid(v, i)) continue
      switch (v.kind) {
        case "i64": {
          const x = V.isUnsigned64(from) ? BigInt.asUintN(64, v.values[i]) : v.values[i]
          put(
            i,
            isDecimal(from)
              ? from.scale >= target.scale
                ? divRound(x, from.scale - target.scale)
                : x * pow10(target.scale - from.scale)
              : x * pow10(target.scale)
          )
          break
        }
        case "i32":
        case "bool":
          put(i, BigInt(v.values[i]) * pow10(target.scale))
          break
        case "f64": {
          const scaled = v.values[i] * 10 ** target.scale
          if (Number.isFinite(scaled)) {
            const floor = Math.floor(scaled)
            const rest = scaled - floor
            put(i, BigInt(rest > 0.5 || (rest === 0.5 && floor % 2 !== 0) ? floor + 1 : floor))
          }
          break
        }
        case "str":
          put(i, parse(V.decodeString(v, i), target.scale))
          break
      }
    }
    return V.i64(target, out, valid)
  }
  // from a decimal
  if (v.kind !== "i64" || !isDecimal(from)) return V.fail("expected decimal storage")
  const scale = pow10(from.scale)
  switch (target._tag) {
    case "Float":
      return V.f64(target, toFloat(v.values, from.scale), v.valid)
    case "Int": {
      if (target.bitWidth === 64) {
        const out = new BigInt64Array(n)
        for (let i = 0; i < n; i++) {
          const x = v.values[i] / scale
          if (V.isValid(v, i) && (target.signed || x >= I0)) {
            out[i] = x
            valid[i] = 1
          }
        }
        return V.i64(target, out, valid)
      }
      const [lo, hi] = V.intRange(target)
      const out = new Float64Array(n)
      for (let i = 0; i < n; i++) {
        if (!V.isValid(v, i)) continue
        const x = Number(v.values[i] / scale)
        if (x >= lo && x <= hi) {
          out[i] = x
          valid[i] = 1
        }
      }
      return V.kindOf(target) === "f64" ? V.f64(target, out, valid) : V.i32(target, Int32Array.from(out), valid)
    }
    case "Utf8":
      return V.stringsFrom(
        S.utf8,
        Array.from({ length: n }, (_, i) => (V.isValid(v, i) ? format(v.values[i], from.scale) : null))
      )
    case "Bool":
      return V.bool(Uint8Array.from(v.values, (x) => (x === I0 ? 0 : 1)), v.valid)
    default:
      return V.fail(`cannot cast a decimal to ${target._tag}`)
  }
}

/** Decimal addition, subtraction and multiplication of unscaled values. @internal */
export const arith = (
  op: "add" | "sub" | "mul",
  a: BigInt64Array,
  aScale: number,
  b: BigInt64Array,
  bScale: number,
  scalar: boolean
): { readonly values: BigInt64Array; readonly type: S.Decimal } => {
  const n = a.length
  const out = new BigInt64Array(n)
  if (op === "mul") {
    for (let i = 0; i < n; i++) out[i] = checked(a[i] * (scalar ? b[0] : b[i]))
    return { values: out, type: decimal(aScale + bScale) }
  }
  const scale = Math.max(aScale, bScale)
  const fa = pow10(scale - aScale)
  const fb = pow10(scale - bScale)
  for (let i = 0; i < n; i++) {
    const x = a[i] * fa
    const y = (scalar ? b[0] : b[i]) * fb
    out[i] = checked(op === "add" ? x + y : x - y)
  }
  return { values: out, type: decimal(scale) }
}

/**
 * Rounds to `places` decimal places, halves to even, keeping the scale. As
 * in Polars, the precision grows by one digit when values can round up.
 *
 * @internal
 */
export const round = (v: V.I64, type: S.Decimal, places: number): V.Vector => {
  if (places >= type.scale) return v
  const k = type.scale - places
  const factor = pow10(k)
  return V.i64(
    S.decimal(Math.min(type.precision + 1, PRECISION), type.scale),
    BigInt64Array.from(v.values, (x) => checked(divRound(x, k) * factor)),
    v.valid
  )
}

/** Unscaled values as floats. @internal */
export const toFloat = (values: BigInt64Array, scale: number): Float64Array => {
  const out = new Float64Array(values.length)
  const unit = 10 ** scale
  for (let i = 0; i < values.length; i++) out[i] = Number(values[i]) / unit
  return out
}
