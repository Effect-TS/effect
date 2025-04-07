import * as Brand from "../Brand.js"
import * as Data from "../Data.js"
import * as Iterable from "../Iterable.js"
import type { Option } from "../Option.js"
import { liftThrowable } from "../Option.js"
import * as Predicate from "../Predicate.js"

/** @internal */
export type NaN = number & Brand.Brand<"NaN">

/** @internal */
export const IntConstructor = Brand.refined<number & Brand.Brand<"Int">>(
  (n) => Predicate.isNumber(n) && !Number.isNaN(n) && Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

/** @internal */
export type Int = Brand.Brand.FromConstructor<typeof IntConstructor>

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
      divisor: 0,
      type: "DivisionByZero",
      message: `Division by zero: ${dividend} / 0`
    })

  /** @internal */
  static readonly indeterminateForm: () => DivisionByZeroError = () =>
    new DivisionByZeroError({
      dividend: 0,
      divisor: 0,
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
 * declare type _t3 = typeof sumAll<Int.Int>
 * //           ^? Int -> Int
 * declare type _t4 = typeof sumAll<Int.Int, number>
 * //           ^? Int -> number
 * ```
 */
export const sumAll = <A extends number = number, B extends number = A>(
  collection: Iterable<A>
): B => Iterable.reduce<A, B>(collection, 0 as B, (acc, n) => sum(acc, n as unknown as B))

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
 * declare type _t3 = typeof multiplyAll<Int.Int>
 * //           ^? Int -> Int
 * declare type _t4 = typeof multiplyAll<Int.Int, number>
 * //           ^? Int -> number
 * ```
 */
export const multiplyAll = <A extends number = number, B extends number = A>(
  collection: Iterable<A>
): B => Iterable.reduce<A, B>(collection, 1 as B, (acc, n) => multiply(acc, n as unknown as B))

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
