import * as Brand from "../Brand.js"
import * as Data from "../Data.js"
import * as _Iterable from "../Iterable.js"
import type { Option } from "../Option.js"
import { liftThrowable } from "../Option.js"
import * as Predicate from "../Predicate.js"

/** @internal */
export const IntegerConstructor = Brand.refined<
  number & Brand.Brand<"Integer">
>(
  (n) => Predicate.isNumber(n) && !Number.isNaN(n) && Number.isInteger(n),
  (n) => Brand.error(`Expected (${n}) to be an integer`)
)

/** @internal */
export type Integer = Brand.Brand.FromConstructor<typeof IntegerConstructor>

/** @internal */
const PositiveNumberConstructor = Brand.refined<
  number & Brand.Brand<"PositiveNumber">
>(
  (n) => n >= 0,
  (n) => Brand.error(`Expected (${n}) to be a greater than or equal to (0)`)
)

/** @internal */
export const NaturalNumberConstructor = Brand.all(
  IntegerConstructor,
  PositiveNumberConstructor
)

/** @internal */
export type NaturalNumber = Brand.Brand.FromConstructor<
  typeof NaturalNumberConstructor
>

/** @internal */
export const zero: NaturalNumber = NaturalNumberConstructor(0)

/** @internal */
export const one: NaturalNumber = NaturalNumberConstructor(1)

/** @internal */
export const sum = <A extends number = number, B extends number = A>(
  self: A,
  that: A
): B => (self + that) as B

/** @internal */
export const subtract = <A extends number = number, B extends number = A>(
  minuend: A,
  subtrahend: A
): B => (minuend - subtrahend) as B

/** @internal */
export const multiply = <A extends number = number, B extends number = A>(
  multiplier: A,
  multiplicand: A
): B => (multiplier * multiplicand) as B

/** @internal */
export const negate = <A extends number = number, B extends number = A>(n: A) => multiply<A, B>(n, -1 as A)

/**
 * Represents errors that can occur during division operations.
 *
 * @internal
 */
export class DivisionByZeroError<
  A extends number = number
> extends Data.TaggedError("IntegerDivisionError")<{
  readonly dividend: A
  readonly divisor: number
  readonly type: "DivisionByZero" | "IndeterminateForm"
  readonly message: string
}> {
  /** @internal */
  static readonly divisionByZero: <A extends number = number>(
    dividend: A
  ) => DivisionByZeroError = (dividend) =>
    new DivisionByZeroError({
      dividend,
      divisor: zero,
      type: "DivisionByZero",
      message: `Division by zero: ${dividend} / 0`
    })

  /** @internal */
  static readonly indeterminateForm: () => DivisionByZeroError = () =>
    new DivisionByZeroError({
      dividend: zero,
      divisor: zero,
      type: "IndeterminateForm",
      message: `Indeterminate form: division of zero by zero`
    })
}

/**
 * @throws DivisionByZeroError
 * @internal
 */
export const unsafeDivide = <A extends number = number, B extends number = A>(
  dividend: A,
  divisor: A
): B => {
  if (divisor === 0) {
    if (dividend === 0) {
      throw DivisionByZeroError.indeterminateForm()
    }
    throw DivisionByZeroError.divisionByZero(dividend)
  }
  return (dividend / divisor) as B
}

/** @internal */
export const divide = <A extends number = number, B extends number = A>(
  dividend: A,
  divisor: A
): Option<B> => {
  const safeDivide = liftThrowable(unsafeDivide)
  return safeDivide(dividend, divisor) as Option<B>
}

/** @internal */
export const increment = <A extends number = number, B extends number = A>(
  n: A
): B => sum(n, 1 as A)

/** @internal */
export const decrement = <A extends number = number, B extends number = A>(
  n: A
): B => subtract(n, 1 as A)

/**
 * @internal
 *
 * ```ts
 * declare type _t0 = typeof sumAll
 * //           ^? number -> number
 * declare type _t1 = typeof sumAll<number>
 * //           ^? number -> number
 * declare type _t2 = typeof sumAll<number, number>
 * //           ^? number -> number
 * declare type _t3 = typeof sumAll<Integer.Integer>
 * //           ^? Integer -> Integer
 * declare type _t4 = typeof sumAll<Integer.Integer, number>
 * //           ^? Integer -> number
 * ```
 */
export const sumAll = <A extends number = number, B extends number = A>(
  collection: Iterable<A>
): B => _Iterable.reduce<A, B>(collection, 0 as B, (acc, n) => sum(acc, n as unknown as B))

/**
 * @internal
 *
 * ```ts
 * declare type _t0 = typeof multiplyAll
 * //           ^? number -> number
 * declare type _t1 = typeof multiplyAll<number>
 * //           ^? number -> number
 * declare type _t2 = typeof multiplyAll<number, number>
 * //           ^? number -> number
 * declare type _t3 = typeof multiplyAll<Integer.Integer>
 * //           ^? Integer -> Integer
 * declare type _t4 = typeof multiplyAll<Integer.Integer, number>
 * //           ^? Integer -> number
 * ```
 */
export const multiplyAll = <A extends number = number, B extends number = A>(
  collection: Iterable<A>
): B => _Iterable.reduce<A, B>(collection, 1 as B, (acc, n) => multiply(acc, n as unknown as B))

/** @internal */
export const remainder = (dividend: number, divisor: number): number => {
  // https://stackoverflow.com/questions/3966484/why-does-modulus-operator-return-fractional-number-in-javascript/31711034#31711034
  const selfDecCount = (dividend.toString().split(".")[1] || "").length
  const divisorDecCount = (divisor.toString().split(".")[1] || "").length
  const decCount = selfDecCount > divisorDecCount ? selfDecCount : divisorDecCount
  const selfInt = parseInt(dividend.toFixed(decCount).replace(".", ""))
  const divisorInt = parseInt(divisor.toFixed(decCount).replace(".", ""))
  return (selfInt % divisorInt) / Math.pow(10, decCount)
}

/** @internal */
export const pow = <A extends Integer = Integer, B extends Integer = A>(
  base: A,
  exponent: NaturalNumber
): B => Math.pow(base, exponent) as B

/**
 * @privateRemarks
 * For any `n ∈ ℤ`, `n² ≥ 0`
 *
 * **Examples**:
 *
 * - `5² = 25` (positive)
 * - `(-5)² = 25` (positive)
 * - `0² = 0` (zero)
 *
 * @internal
 */
export const square = <A extends Integer = Integer>(base: A): NaturalNumber =>
  pow<A, NaturalNumber>(base, NaturalNumberConstructor(2))

/**
 * @privateRemarks
 * For any `n ∈ ℤ`, `n³` **preserves the sign of `n`**
 *
 * **Examples**:
 *
 * - `5³ = 125` (positive)
 * - `(-5)³ = -125` (negative)
 * - `0³ = 0` (zero)
 *
 * @internal
 */
export const cube: {
  <A extends Integer = Integer>(n: A): A
} = (n) => pow(n, NaturalNumberConstructor(3))
