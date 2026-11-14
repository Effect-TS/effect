/**
 * Decimals: unscaled 64-bit integers with a scale (`value / 10^scale`), so
 * up to 18 significant digits. Arithmetic follows Polars' result types
 * (precision 38, scales added for products, the larger scale for sums) and
 * fails instead of overflowing 64 bits. Rescaling down rounds half to even.
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as V from "./vector.ts"

const powers: Array<bigint> = []
/** `10^k` as a bigint. @internal */
export const pow10 = (k: number): bigint => (powers[k] ??= BigInt(10) ** BigInt(k))

const MAX = BigInt("9223372036854775807")
const MIN = -BigInt("9223372036854775808")

/** @internal */
export const isDecimal = (t: S.DataType): t is S.Decimal => t._tag === "Decimal"

/** Precision of results, as in Polars. @internal */
export const PRECISION = 38

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

const checked = (x: bigint): bigint => (x > MAX || x < MIN ? V.fail("decimal value does not fit 18 digits") : x)

/** Rounds `x / 10^k` half to even. */
const divRound = (x: bigint, k: number): bigint => {
  if (k === 0) return x
  const d = pow10(k)
  let q = x / d
  const r = x - q * d
  const twice = (r < BigInt(0) ? -r : r) * BigInt(2)
  if (twice > d || (twice === d && q % BigInt(2) !== BigInt(0))) q += x < BigInt(0) ? BigInt(-1) : BigInt(1)
  return q
}

/** `unscaled / 10^scale` as a decimal string, all `scale` digits shown. @internal */
export const format = (unscaled: bigint, scale: number): string => {
  const negative = unscaled < BigInt(0)
  const digits = (negative ? -unscaled : unscaled).toString().padStart(scale + 1, "0")
  const text = scale === 0 ? digits : `${digits.slice(0, digits.length - scale)}.${digits.slice(digits.length - scale)}`
  return negative ? `-${text}` : text
}

const DECIMAL_SYNTAX = /^\s*([+-]?)(\d*)(?:\.(\d*))?\s*$/

/** Parses a decimal string to unscaled units of `scale`; `undefined` when invalid. @internal */
export const parse = (s: string, scale: number): bigint | undefined => {
  const m = DECIMAL_SYNTAX.exec(s)
  if (m === null || (m[2] === "" && (m[3] ?? "") === "")) return undefined
  const fraction = m[3] ?? ""
  const all = BigInt(`${m[2] || "0"}${fraction}`)
  const x = fraction.length >= scale ? divRound(all, fraction.length - scale) : all * pow10(scale - fraction.length)
  return m[1] === "-" ? -x : x
}

const digitsOf = (x: bigint): number => (x < BigInt(0) ? -x : x).toString().length

const fits = (x: bigint, t: S.Decimal): boolean => x <= MAX && x >= MIN && digitsOf(x) <= t.precision

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
    const put = (i: number, x: bigint | undefined) => {
      if (x !== undefined && fits(x, target)) {
        out[i] = x
        valid[i] = 1
      }
    }
    for (let i = 0; i < n; i++) {
      if (!V.isValid(v, i)) continue
      switch (v.kind) {
        case "i64":
          put(
            i,
            isDecimal(from)
              ? from.scale >= target.scale
                ? divRound(v.values[i], from.scale - target.scale)
                : v.values[i] * pow10(target.scale - from.scale)
              : v.values[i] * pow10(target.scale)
          )
          break
        case "i32":
          put(i, BigInt(v.values[i]) * pow10(target.scale))
          break
        case "f64": {
          const x = v.values[i]
          if (Number.isFinite(x)) {
            const scaled = x * 10 ** target.scale
            const r = Math.round(scaled)
            // round half to even
            const even = Math.abs(scaled - Math.trunc(scaled)) === 0.5 && r % 2 !== 0 ? r - Math.sign(scaled) : r
            put(i, BigInt(even))
          }
          break
        }
        case "str":
          put(i, parse(V.decodeString(v, i), target.scale))
          break
        case "bool":
          put(i, BigInt(v.values[i]) * pow10(target.scale))
          break
      }
    }
    return V.i64(target, out, valid)
  }
  // from a decimal
  if (v.kind !== "i64" || !isDecimal(from)) return V.fail("expected decimal storage")
  const scale = pow10(from.scale)
  switch (target._tag) {
    case "Float": {
      const out = new Float64Array(n)
      for (let i = 0; i < n; i++) out[i] = Number(v.values[i]) / 10 ** from.scale
      return V.f64(target, out, v.valid)
    }
    case "Int": {
      if (target.bitWidth === 64) {
        return V.i64(target, BigInt64Array.from(v.values, (x) => x / scale), v.valid)
      }
      const lo = target.signed ? -(2 ** (target.bitWidth - 1)) : 0
      const hi = target.signed ? 2 ** (target.bitWidth - 1) - 1 : 2 ** target.bitWidth - 1
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
      return V.bool(Uint8Array.from(v.values, (x) => (x === BigInt(0) ? 0 : 1)), v.valid)
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

/** Unscaled values as floats. @internal */
export const toFloat = (values: BigInt64Array, scale: number): Float64Array =>
  Float64Array.from(values, (x) => Number(x) / 10 ** scale)
