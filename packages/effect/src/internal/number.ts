import type { Option } from "../Option.js"
import * as option from "./option.js"

const one = 1 as const

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
export const sumAll = (collection: Iterable<number>): number => {
  let out = 0
  for (const n of collection) {
    out += n
  }
  return out
}
