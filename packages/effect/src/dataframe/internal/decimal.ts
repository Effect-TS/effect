/**
 * Decimals: unscaled 64-bit integers with a scale (`value / 10^scale`), so
 * up to 18 significant digits. Arithmetic follows Polars' result types
 * (precision 38, scales added for products, the larger scale for sums).
 * Every computed decimal is stored through `checked` (or `fit`), so a
 * value outside 64 bits fails instead of wrapping; casts make such values
 * null instead. Rescaling down rounds half to even. Scales are any 32-bit
 * integers, negative ones included; see {@link FAR} for scales far apart.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as V from "./vector.ts"

/**
 * From this many digits on, the 64 bits of storage decide a rescale, so no
 * larger power of ten is built for one: `10^20` is more than twice any
 * 64-bit value (a quotient rounds to zero, see {@link divRound}), and a
 * nonzero value times `10^20` is outside 64 bits and stays outside with a
 * 64-bit value added (see {@link factor}).
 */
const FAR = 20

const powers: Array<bigint> = []
/** `10^k` as a bigint, for `k >= 0`. Only the powers up to {@link FAR} are kept. */
const pow10 = (k: number): bigint => k <= FAR ? (powers[k] ??= BigInt(10) ** BigInt(k)) : BigInt(10) ** BigInt(k)

/**
 * What to multiply by to add `k >= 0` digits: `10^k`, or `10^FAR` from
 * {@link FAR} digits on. The product is then zero for zero and outside 64
 * bits otherwise, as it is with `10^k`, and every product is range-checked.
 */
const factor = (k: number): bigint => pow10(Math.min(k, FAR))

const I0 = BigInt(0)
const I1 = BigInt(1)
const I2 = BigInt(2)
const MAX = BigInt("9223372036854775807")
const MIN = -BigInt("9223372036854775808")
const UMAX = BigInt("18446744073709551615")

/** @internal */
export const isDecimal = (t: S.DataType): t is S.Decimal => t._tag === "Decimal"

/** Precision of results, as in Polars. */
const PRECISION = 38

/** @internal */
export const decimal = (scale: number): S.Decimal => S.decimal(PRECISION, scale)

/**
 * The common type of a decimal and another numeric type. It holds every
 * value of both exactly or not at all: the larger scale of two decimals,
 * and with an integer a scale of at least zero, as a negative scale would
 * round the integer.
 *
 * @internal
 */
export const supertype = (a: S.DataType, b: S.DataType): S.DataType | undefined => {
  if (isDecimal(a) && isDecimal(b)) {
    return a.scale === b.scale && a.precision === b.precision
      ? a
      : decimal(Math.max(a.scale, b.scale))
  }
  const [d, other] = isDecimal(a) ? [a, b] : [b as S.Decimal, a]
  if (other._tag === "Int") return decimal(Math.max(d.scale, 0))
  if (other._tag === "Float") return S.float64
  return undefined
}

const inRange = (x: bigint): boolean => x <= MAX && x >= MIN

/** `x`, or a failure when it overflows 64-bit decimal storage. @internal */
export const checked = (x: bigint): bigint => (inRange(x) ? x : V.fail("decimal value overflows 64 bits"))

/**
 * `x` as the unscaled value of a literal of `type`, or a failure when it
 * overflows 64-bit storage or has more digits than the type's precision.
 *
 * @internal
 */
export const literal = (x: bigint, type: S.Decimal): bigint => {
  const limit = factor(type.precision)
  return checked(x) < limit && -x < limit
    ? x
    : V.fail(`decimal literal ${x} has more digits than its precision ${type.precision}`)
}

/**
 * The largest power of ten a float holds is `10^308`. A larger one is
 * applied in two steps, so that a finite result isn't lost to an infinite
 * factor.
 */
const FLOAT_DIGITS = 308

/** `x * 10^scale` as a float. */
const scaleFloat = (x: number, scale: number): number =>
  // Zero is zero at any scale, also where `10^scale` is infinite.
  x === 0
    ? 0
    : scale > FLOAT_DIGITS
    ? x * 10 ** FLOAT_DIGITS * 10 ** (scale - FLOAT_DIGITS)
    : x * 10 ** scale

/**
 * `unscaled / 10^scale` as a float. Past {@link FLOAT_DIGITS} digits it
 * reads the value's decimal notation, which rounds once.
 *
 * @internal
 */
export const toNumber = (unscaled: bigint, scale: number): number =>
  // Zero is zero at any scale, also where `10^scale` is zero.
  unscaled === I0
    ? 0
    : scale > FLOAT_DIGITS
    ? Number(`${unscaled}e-${scale}`)
    : Number(unscaled) / 10 ** scale

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
  // `10^k` is more than twice `x`, which has fewer than `k` digits.
  if (k >= FAR && (inRange(x) || k > x.toString().length)) return I0
  const divisor = pow10(k)
  // Truncated towards zero; the remainder has the sign of `x`.
  const quotient = x / divisor
  const remainder = x % divisor
  const twice = (remainder < I0 ? -remainder : remainder) * I2
  if (twice < divisor || (twice === divisor && quotient % I2 === I0)) return quotient
  return x < I0 ? quotient - I1 : quotient + I1
}

/**
 * `unscaled / 10^scale` as a decimal string, all `scale` digits shown. A
 * negative scale writes its zeros out (`7` at scale `-2` is `700`).
 *
 * @internal
 */
export const format = (unscaled: bigint, scale: number): string => {
  const negative = unscaled < I0
  const digits = (negative ? -unscaled : unscaled).toString()
  if (scale <= 0) return unscaled === I0 ? digits : `${negative ? "-" : ""}${digits}${"0".repeat(-scale)}`
  const padded = digits.padStart(scale + 1, "0")
  const text = `${padded.slice(0, padded.length - scale)}.${padded.slice(padded.length - scale)}`
  return negative ? `-${text}` : text
}

/**
 * {@link format} for every value. The text has as many digits as the scale,
 * so it fails where the scale is more than a string can hold.
 */
const formatAll = (v: V.I64, type: S.Decimal): Array<string | null> => {
  try {
    return Array.from({ length: v.length }, (_, i) => (V.isValid(v, i) ? format(v.values[i], type.scale) : null))
  } catch (error) {
    if (!(error instanceof RangeError)) throw error
    return V.fail(`Decimal[${type.precision}, ${type.scale}] values are too long to write as text`)
  }
}

/**
 * The integer part of `unscaled / 10^scale`, truncated towards zero. A
 * negative scale can take it outside 64 bits (see {@link factor}).
 */
const integerPart = (unscaled: bigint, scale: number): bigint =>
  scale < 0 ? unscaled * factor(-scale) : scale >= FAR ? I0 : unscaled / pow10(scale)

/**
 * The integer `x` in unscaled units of `scale`: rounded half to even for a
 * negative scale, and possibly outside 64 bits otherwise (see {@link factor}).
 */
const toScale = (x: bigint, scale: number): bigint => scale < 0 ? divRound(x, -scale) : x * factor(scale)

const DECIMAL_SYNTAX = /^\s*([+-]?)(\d*)(?:\.(\d*))?\s*$/
/** {@link DECIMAL_SYNTAX} without the spaces around it. */
const PLAIN_SYNTAX = /^([+-]?)(\d*)(?:\.(\d*))?$/

/**
 * Parses a decimal string to unscaled units of `scale`; `undefined` when
 * invalid. `drop` removes the `k` digits a fraction has beyond the scale.
 */
const parse = (
  s: string,
  scale: number,
  syntax: RegExp = DECIMAL_SYNTAX,
  drop: (x: bigint, k: number) => bigint | undefined = divRound
): bigint | undefined => {
  const m = syntax.exec(s)
  if (m === null || (m[2] === "" && (m[3] ?? "") === "")) return undefined
  const fraction = m[3] ?? ""
  const all = BigInt(`${m[1]}${m[2] || "0"}${fraction}`)
  return fraction.length >= scale ? drop(all, fraction.length - scale) : all * factor(scale - fraction.length)
}

/** For {@link parse}: a fraction longer than the scale is invalid. */
const dropNone = (x: bigint, k: number): bigint | undefined => (k === 0 ? x : undefined)

/**
 * A decimal vector of `type` from decimal strings; `null` and `undefined`
 * are nulls. Reads plain decimal notation (`-12.34`) only: `undefined` when
 * a string has another form, more fraction digits than the scale, or a value
 * outside the type's bit width or the 64 bits of a vector.
 *
 * @internal
 */
export const fromStrings = (type: S.Decimal, values: ReadonlyArray<unknown>): V.I64 | undefined => {
  const n = values.length
  const out = new BigInt64Array(n)
  const valid = new Uint8Array(n)
  const limit = I1 << BigInt(Math.min(type.bitWidth, 64) - 1)
  let nulls = false
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v === null || v === undefined) {
      nulls = true
      continue
    }
    const x = parse(String(v), type.scale, PLAIN_SYNTAX, dropNone)
    if (x === undefined || x >= limit || x < -limit) return undefined
    out[i] = x
    valid[i] = 1
  }
  return V.i64(type, out, nulls ? valid : undefined)
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
    // From `FAR` digits on, the 64 bits of storage are the tighter limit.
    const limit = target.precision >= 1 ? factor(target.precision) : I0
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
                : x * factor(target.scale - from.scale)
              : toScale(x, target.scale)
          )
          break
        }
        case "i32":
        case "bool":
          put(i, toScale(BigInt(v.values[i]), target.scale))
          break
        case "f64": {
          const scaled = scaleFloat(v.values[i], target.scale)
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
  switch (target._tag) {
    case "Float":
      return V.f64(target, toFloat(v.values, from.scale), v.valid)
    case "Int": {
      if (target.bitWidth === 64) {
        const out = new BigInt64Array(n)
        for (let i = 0; i < n; i++) {
          const x = integerPart(v.values[i], from.scale)
          if (V.isValid(v, i) && (target.signed ? inRange(x) : x >= I0 && x <= UMAX)) {
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
        const x = integerPart(v.values[i], from.scale)
        if (x >= lo && x <= hi) {
          out[i] = Number(x)
          valid[i] = 1
        }
      }
      return V.kindOf(target) === "f64" ? V.f64(target, out, valid) : V.i32(target, Int32Array.from(out), valid)
    }
    case "Utf8":
      return V.stringsFrom(S.utf8, formatAll(v, from))
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
    const scale = aScale + bScale
    if ((scale | 0) !== scale) V.fail(`the scale ${scale} of a decimal product is not a 32-bit integer`)
    for (let i = 0; i < n; i++) out[i] = checked(a[i] * (scalar ? b[0] : b[i]))
    return { values: out, type: decimal(scale) }
  }
  const scale = Math.max(aScale, bScale)
  const fa = factor(scale - aScale)
  const fb = factor(scale - bScale)
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
  const up = factor(k)
  return V.i64(
    S.decimal(Math.min(type.precision + 1, PRECISION), type.scale),
    BigInt64Array.from(v.values, (x) => checked(divRound(x, k) * up)),
    v.valid
  )
}

/** Unscaled values as floats. @internal */
export const toFloat = (values: BigInt64Array, scale: number): Float64Array => {
  const out = new Float64Array(values.length)
  for (let i = 0; i < values.length; i++) out[i] = toNumber(values[i], scale)
  return out
}
