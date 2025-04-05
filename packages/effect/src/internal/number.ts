import * as Iterable from "../Iterable.js"
import type { Option } from "../Option.js"
import * as option from "./option.js"

const one = 1 as const
const zero = 0 as const

/** @internal */
export const sum = (self: number, that: number): number => self + that

/** @internal */
export const subtract = (minuend: number, subtrahend: number): number => minuend - subtrahend

/** @internal */
export const multiply = (multiplier: number, multiplicand: number): number => multiplier * multiplicand

/** @internal */
export const unsafeDivide = (dividend: number, divisor: number): number => dividend / divisor

/** @internal */
export const divide = (dividend: number, divisor: number): Option<number> =>
  divisor === 0 //
    ? option.none
    : option.some(unsafeDivide(dividend, divisor))

/** @internal */
export const increment = (n: number): number => n + one

/** @internal */
export const decrement = (n: number): number => n - one

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
