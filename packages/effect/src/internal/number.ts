import * as Data from "../Data.js"
import * as Iterable from "../Iterable.js"
import type { Option } from "../Option.js"
import { liftThrowable } from "../Option.js"

const one = 1 as const
const zero = 0 as const

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
 * @internal
 */
export class DivisionByZeroError<A extends number = number> extends Data.TaggedError(
  "IntegerDivisionError"
)<{
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
 * @internal
 * @throws DivisionByZeroError
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
export const divide = <A extends number = number, B extends number = A>(dividend: A, divisor: A): Option<B> => {
  const safeDivide = liftThrowable(unsafeDivide)
  return safeDivide(dividend, divisor) as Option<B>
}

/** @internal */
export const increment = <A extends number = number, B extends number = A>(n: A): B => sum(n, one as A)

/** @internal */
export const decrement = <A extends number = number, B extends number = A>(n: A): B => subtract(n, one as A)

/** @internal */
export const sumAll = (collection: Iterable<number>): number => Iterable.reduce(collection, zero, sum)

/** @internal */
export const multiplyAll = (collection: Iterable<number>): number => Iterable.reduce(collection, one, multiply)

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
export const nextPow2 = (n: number): number => {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2))
  return Math.max(Math.pow(2, nextPow), 2)
}
