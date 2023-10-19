/**
 * This module provides utility functions and type class instances for working with the `BigDecimal` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */

import * as BigI from "./BigInt"
import * as Equal from "./Equal"
import * as equivalence from "./Equivalence"
import { dual, pipe } from "./Function"
import * as Hash from "./Hash"
import { type Inspectable, NodeInspectSymbol } from "./Inspectable"
import * as Option from "./Option"
import * as order from "./Order"
import type { Ordering } from "./Ordering"
import { type Pipeable, pipeArguments } from "./Pipeable"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TypeId: unique symbol = Symbol.for("effect/BigDecimal")

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface BigDecimal extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly value: bigint
  readonly scale: number
}

const BigDecimalProto: Omit<BigDecimal, "value" | "scale"> = {
  [TypeId]: TypeId,
  [Hash.symbol](this: BigDecimal): number {
    const normalized = normalize(this)
    return pipe(
      Hash.hash(normalized.value),
      Hash.combine(Hash.number(normalized.scale))
    )
  },
  [Equal.symbol](this: BigDecimal, that: unknown): boolean {
    return isBigDecimal(that) && equals(this, that)
  },
  toString(this: BigDecimal) {
    return toString(this)
  },
  toJSON(this: BigDecimal) {
    return toString(this)
  },
  [NodeInspectSymbol]() {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
} as const

/**
 * Checks if a given value is a `BigDecimal`.
 *
 * @param u - The value to check.
 *
 * @since 2.0.0
 * @category guards
 */
export const isBigDecimal = (u: unknown): u is BigDecimal => typeof u === "object" && u !== null && TypeId in u

/**
 * Creates a `BigDecimal` from a `bigint` value and a scale.
 *
 * @param value - The `bigint` value to create a `BigDecimal` from.
 * @param scale - The scale of the `BigDecimal`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const scaled = (value: bigint, scale: number): BigDecimal => {
  const o = Object.create(BigDecimalProto)
  o.value = value
  o.scale = scale
  return o
}

/**
 * Creates a `BigDecimal` from a `bigint` or `number` value.
 *
 * @param value - The `bigint` or `number` value to create a `BigDecimal` from.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make = (value: bigint | number): BigDecimal => {
  if (typeof value === "number") {
    const [lead, trail = ""] = `${value}`.split(".")
    return scaled(BigInt(`${lead}${trail}`), trail.length)
  }

  return scaled(value, 0)
}

const bigint0 = BigInt(0)
const bigint10 = BigInt(10)
const zero = make(bigint0)

/**
 * Parses a numerical `string` into a `BigDecimal`.
 *
 * @param s - The `string` to parse.
 *
 * @example
 * import { fromString, make } from 'effect/BigDecimal'
 * import { some, none } from 'effect/Option'
 *
 * assert.deepStrictEqual(fromString('123'), some(make(123n)))
 * assert.deepStrictEqual(fromString('123.456'), some(make(123.456)))
 * assert.deepStrictEqual(fromString('123.abc'), none())
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromString = (s: string): Option.Option<BigDecimal> => {
  let digits: string
  let scale: number

  const dot = s.search(/\./)
  if (dot !== -1) {
    const lead = s.slice(0, dot)
    const trail = s.slice(dot + 1)
    digits = `${lead}${trail}`
    scale = trail.length
  } else {
    digits = s
    scale = 0
  }

  if (digits === "") {
    // TODO: This mimics the BigInt constructor behavior. Should this be `Option.none()`?
    return Option.some(zero)
  }

  if (!/^(?:\+|-)?\d+$/.test(digits)) {
    return Option.none()
  }

  return Option.some(scaled(BigInt(digits), scale))
}

/**
 * Normalizes a given `BigDecimal` by removing trailing zeros.
 *
 * @param self - The `BigDecimal` to normalize.
 *
 * @example
 * import { normalize, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(normalize(make(123.456)), make(123.456))
 * assert.deepStrictEqual(normalize(make(123.456000)), make(123.456))
 * assert.deepStrictEqual(normalize(make(123.000456)), make(123.000456))
 * assert.deepStrictEqual(normalize(make(123.000000)), make(123))
 *
 * @since 2.0.0
 * @category constructors
 */
export const normalize = (self: BigDecimal): BigDecimal => {
  if (self.value === bigint0) {
    return zero
  }

  const digits = `${self.value}`.split("")

  let trail = 0
  for (let i = digits.length - 1; i >= 0; i--) {
    if (digits[i] === "0") {
      trail++
    } else {
      break
    }
  }

  if (trail === 0) {
    return self
  }

  digits.splice(digits.length - trail)
  const value = BigInt(digits.join(""))
  const scale = self.scale - trail

  return scaled(value, scale)
}

/**
 * Scales a given `BigDecimal` to the specified scale.
 *
 * If the given scale is smaller than the current scale, the value will be rounded down to
 * the nearest integer.
 *
 * @param self - The `BigDecimal` to scale.
 * @param scale - The scale to scale to.
 *
 * @since 2.0.0
 * @category constructors
 */
export const scale = (self: BigDecimal, scale: number): BigDecimal => {
  if (scale > self.scale) {
    return scaled(self.value * bigint10 ** BigInt(scale - self.scale), scale)
  }

  if (scale < self.scale) {
    return scaled(self.value / bigint10 ** BigInt(self.scale - scale), scale)
  }

  return self
}

/**
 * Provides an addition operation on `BigDecimal`s.
 *
 * @param self - The first operand.
 * @param that - The second operand.
 *
 * @example
 * import { sum, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(sum(make(2n), make(3n)), make(5n))
 *
 * @since 2.0.0
 * @category math
 */
export const sum: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === bigint0) {
    return self
  }

  if (self.value === bigint0) {
    return that
  }

  if (self.scale > that.scale) {
    return scaled(scale(that, self.scale).value + self.value, self.scale)
  }

  if (self.scale < that.scale) {
    return scaled(scale(self, that.scale).value + that.value, that.scale)
  }

  return scaled(self.value + that.value, self.scale)
})

/**
 * Provides a multiplication operation on `BigDecimal`s.
 *
 * @param self - The first operand.
 * @param that - The second operand.
 *
 * @example
 * import { multiply, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(multiply(make(2n), make(3n)), make(6n))
 *
 * @since 2.0.0
 * @category math
 */
export const multiply: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === bigint0 || self.value === bigint0) {
    return zero
  }

  return scaled(self.value * that.value, self.scale + that.scale)
})

/**
 * Provides a subtraction operation on `BigDecimal`s.
 *
 * @param self - The first operand.
 * @param that - The second operand.
 *
 * @example
 * import { subtract, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(subtract(make(2n), make(3n)), make(-1n))
 *
 * @since 2.0.0
 * @category math
 */
export const subtract: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === bigint0) {
    return self
  }

  if (self.value === bigint0) {
    return scaled(-that.value, that.scale)
  }

  if (self.scale > that.scale) {
    return scaled(self.value - scale(that, self.scale).value, self.scale)
  }

  if (self.scale < that.scale) {
    return scaled(scale(self, that.scale).value - that.value, that.scale)
  }

  return scaled(self.value - that.value, self.scale)
})

/**
 * Provides a division operation on `BigDecimal`s.
 *
 * If the dividend is not a multiple of the divisor the result will be a `BigDecimal` value
 * which represents the integer division rounded down to the nearest integer.
 *
 * If the divisor is `0`, the result will be `None`.
 *
 * @param self - The dividend operand.
 * @param that - The divisor operand.
 *
 * @example
 * import { divide, make } from 'effect/BigDecimal'
 * import { some, none } from 'effect/Option'
 *
 * assert.deepStrictEqual(divide(make(6n), make(3n)), some(make(2n)))
 * assert.deepStrictEqual(divide(make(6n), make(4n)), some(make(1n)))
 * assert.deepStrictEqual(divide(make(6n), make(0n)), none())
 *
 * @since 2.0.0
 * @category math
 */
export const divide: {
  (that: BigDecimal): (self: BigDecimal) => Option.Option<BigDecimal>
  (self: BigDecimal, that: BigDecimal): Option.Option<BigDecimal>
} = dual(2, (self: BigDecimal, that: BigDecimal): Option.Option<BigDecimal> => {
  if (that.value === bigint0) {
    return Option.none()
  }

  if (self.value === bigint0) {
    return Option.some(zero)
  }

  return Option.some(scaled(self.value / that.value, self.scale - that.scale))
})

/**
 * Provides an unsafe division operation on `BigDecimal`s.
 *
 * If the dividend is not a multiple of the divisor the result will be a `BigDecimal` value
 * which represents the integer division rounded down to the nearest integer.
 *
 * Throws a `RangeError` if the divisor is `0`.
 *
 * @param self - The dividend operand.
 * @param that - The divisor operand.as
 *
 * @example
 * import { unsafeDivide, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(unsafeDivide(make(6n), make(3n)), make(2n))
 * assert.deepStrictEqual(unsafeDivide(make(6n), make(4n)), make(1n))
 *
 * @since 2.0.0
 * @category math
 */
export const unsafeDivide: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === bigint0) {
    throw new RangeError("Division by zero")
  }

  if (self.value === bigint0) {
    return zero
  }

  return scaled(self.value / that.value, self.scale - that.scale)
})

/**
 * @since 2.0.0
 * @category instances
 */
export const Order: order.Order<BigDecimal> = order.make((self, that) => {
  const scmp = order.number(BigI.sign(self.value), BigI.sign(that.value))
  if (scmp !== 0) {
    return scmp
  }

  if (self.scale > that.scale) {
    return order.bigint(self.value, scale(that, self.scale).value)
  }

  if (self.scale < that.scale) {
    return order.bigint(scale(self, that.scale).value, that.value)
  }

  return order.bigint(self.value, that.value)
})

/**
 * Returns `true` if the first argument is less than the second, otherwise `false`.
 *
 * @param self - The first argument.
 * @param that - The second argument.
 *
 * @example
 * import { lessThan, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(lessThan(make(2n), make(3n)), true)
 * assert.deepStrictEqual(lessThan(make(3n), make(3n)), false)
 * assert.deepStrictEqual(lessThan(make(4n), make(3n)), false)
 *
 * @since 2.0.0
 * @category predicates
 */
export const lessThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.lessThan(Order)

/**
 * Checks if a given `BigDecimal` is less than or equal to the provided one.
 *
 * @param self - The first `BigDecimal` to compare with.
 * @param that - The second `BigDecimal` to compare with.
 *
 * @example
 * import { lessThanOrEqualTo, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(lessThanOrEqualTo(make(2n), make(3n)), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(make(3n), make(3n)), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(make(4n), make(3n)), false)
 *
 * @since 2.0.0
 * @category predicates
 */
export const lessThanOrEqualTo: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.lessThanOrEqualTo(Order)

/**
 * Returns `true` if the first argument is greater than the second, otherwise `false`.
 *
 * @param self - The first argument.
 * @param that - The second argument.
 *
 * @example
 * import { greaterThan, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(greaterThan(make(2n), make(3n)), false)
 * assert.deepStrictEqual(greaterThan(make(3n), make(3n)), false)
 * assert.deepStrictEqual(greaterThan(make(4n), make(3n)), true)
 *
 * @since 2.0.0
 * @category predicates
 */
export const greaterThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.greaterThan(Order)

/**
 * Checks if a given `BigDecimal` is greater than or equal to the provided one.
 *
 * @param self - The first `BigDecimal` to compare with.
 * @param that - The second `BigDecimal` to compare with.
 *
 * @example
 * import { greaterThanOrEqualTo, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(greaterThanOrEqualTo(make(2n), make(3n)), false)
 * assert.deepStrictEqual(greaterThanOrEqualTo(make(3n), make(3n)), true)
 * assert.deepStrictEqual(greaterThanOrEqualTo(make(4n), make(3n)), true)
 *
 * @since 2.0.0
 * @category predicates
 */
export const greaterThanOrEqualTo: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.greaterThanOrEqualTo(Order)

/**
 * Checks if a `BigDecimal` is between a `minimum` and `maximum` value (inclusive).
 *
 * @param self - The `number` to check.
 * @param minimum - The `minimum` value to check.
 * @param maximum - The `maximum` value to check.
 *
 * @example
 * import { between, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(between(make(0n), make(5n))(make(3n)), true)
 * assert.deepStrictEqual(between(make(0n), make(5n))(make(-1n)), false)
 * assert.deepStrictEqual(between(make(0n), make(5n))(make(6n)), false)
 *
 * @since 2.0.0
 * @category predicates
 */
export const between: {
  (minimum: BigDecimal, maximum: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, minimum: BigDecimal, maximum: BigDecimal): boolean
} = order.between(Order)

/**
 * Restricts the given `BigDecimal` to be within the range specified by the `minimum` and `maximum` values.
 *
 * - If the `BigDecimal` is less than the `minimum` value, the function returns the `minimum` value.
 * - If the `BigDecimal` is greater than the `maximum` value, the function returns the `maximum` value.
 * - Otherwise, it returns the original `BigDecimal`.
 *
 * @param self - The `BigDecimal` to be clamped.
 * @param minimum - The lower end of the range.
 * @param maximum - The upper end of the range.
 *
 * @example
 * import { clamp, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(clamp(make(0n), make(5n))(make(3n)), make(3n))
 * assert.deepStrictEqual(clamp(make(0n), make(5n))(make(-1n)), make(0n))
 * assert.deepStrictEqual(clamp(make(0n), make(5n))(make(6n)), make(5n))
 *
 * @since 2.0.0
 * @category math
 */
export const clamp: {
  (minimum: BigDecimal, maximum: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, minimum: BigDecimal, maximum: BigDecimal): BigDecimal
} = order.clamp(Order)

/**
 * Returns the minimum between two `BigDecimal`s.
 *
 * @param self - The first `BigDecimal`.
 * @param that - The second `BigDecimal`.
 *
 * @example
 * import { min, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(min(make(2n), make(3n)), make(2n))
 *
 * @since 2.0.0
 * @category math
 */
export const min: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = order.min(Order)

/**
 * Returns the maximum between two `BigDecimal`s.
 *
 * @param self - The first `BigDecimal`.
 * @param that - The second `BigDecimal`.
 *
 * @example
 * import { max, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(max(make(2n), make(3n)), make(3n))
 *
 * @since 2.0.0
 * @category math
 */
export const max: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = order.max(Order)

/**
 * Determines the sign of a given `BigDecimal`.
 *
 * @param n - The `BigDecimal` to determine the sign of.
 *
 * @example
 * import { sign, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(sign(make(-5n)), -1)
 * assert.deepStrictEqual(sign(make(0n)), 0)
 * assert.deepStrictEqual(sign(make(5n)), 1)
 *
 * @since 2.0.0
 * @category math
 */
export const sign = (n: BigDecimal): Ordering => Order(n, zero)

/**
 * Determines the absolute value of a given `BigDecimal`.
 *
 * @param n - The `BigDecimal` to determine the absolute value of.
 *
 * @example
 * import { abs, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(abs(make(-5n)), make(5n))
 * assert.deepStrictEqual(abs(make(0n)), make(0n))
 * assert.deepStrictEqual(abs(make(5n)), make(5n))
 *
 * @since 2.0.0
 * @category math
 */
export const abs = (n: BigDecimal): BigDecimal => scaled(BigI.abs(n.value), n.scale)

/**
 * Provides a negate operation on `BigDecimal`s.
 *
 * @param n - The `BigDecimal` to negate.
 *
 * @example
 * import { negate, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(negate(make(3n)), make(-3n))
 * assert.deepStrictEqual(negate(make(-6n)), make(6n))
 *
 * @since 2.0.0
 * @category math
 */
export const negate = (n: BigDecimal): BigDecimal => scaled(-n.value, n.scale)

/**
 * Returns the remainder left over when one operand is divided by a second operand.
 *
 * If the divisor is `0`, the result will be `None`.
 *
 * @param self - The dividend.
 * @param divisor - The divisor.
 *
 * @example
 * import { remainder, make } from 'effect/BigDecimal'as
 * import { some, none } from 'effect/Option'
 *
 * assert.deepStrictEqual(remainder(make(2), make(2)), some(make(0)))
 * assert.deepStrictEqual(remainder(make(3), make(2)), some(make(1)))
 * assert.deepStrictEqual(remainder(make(-4), make(2)), some(make(0)))
 *
 * @since 2.0.0
 * @category math
 */
export const remainder: {
  (divisor: BigDecimal): (self: BigDecimal) => Option.Option<BigDecimal>
  (self: BigDecimal, divisor: BigDecimal): Option.Option<BigDecimal>
} = dual(2, (self: BigDecimal, divisor: BigDecimal): Option.Option<BigDecimal> => {
  if (divisor.value === bigint0) {
    return Option.none()
  }

  const max = Math.max(self.scale, divisor.scale)
  return Option.some(scaled(scale(self, max).value % scale(divisor, max).value, max))
})

/**
 * Returns the remainder left over when one operand is divided by a second operand.
 *
 * Throws a `RangeError` if the divisor is `0`.
 *
 * @param self - The dividend.
 * @param divisor - The divisor.
 *
 * @example
 * import { unsafeRemainder, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(unsafeRemainder(make(2), make(2)), make(0))
 * assert.deepStrictEqual(unsafeRemainder(make(3), make(2)), make(1))
 * assert.deepStrictEqual(unsafeRemainder(make(-4), make(2)), make(0))
 *
 * @since 2.0.0
 * @category math
 */
export const unsafeRemainder: {
  (divisor: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, divisor: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, divisor: BigDecimal): BigDecimal => {
  if (divisor.value === bigint0) {
    throw new RangeError("Division by zero")
  }

  const max = Math.max(self.scale, divisor.scale)
  return scaled(scale(self, max).value % scale(divisor, max).value, max)
})

/**
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: equivalence.Equivalence<BigDecimal> = equivalence.make((self, that) => {
  if (self.scale > that.scale) {
    return scale(that, self.scale).value === self.value
  }

  if (self.scale < that.scale) {
    return scale(self, that.scale).value === that.value
  }

  return self.value === that.value
})

/**
 * Checks if two `BigDecimal`s are equal.
 *
 * @since 2.0.0
 * @category predicates
 */
export const equals: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = dual(2, (self: BigDecimal, that: BigDecimal): boolean => Equivalence(self, that))

/**
 * Formats a given `BigDecimal` as a `string`.
 *
 * @param n - The `BigDecimal` to format.
 *
 * @example
 * import { toString, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(toString(make(-5n)), '-5')
 * assert.deepStrictEqual(toString(make(123.456)), '123.456')
 * assert.deepStrictEqual(toString(make(-0.00000123)), '-0.00000123')
 *
 * @since 2.0.0
 * @category conversions
 */
export const toString = (n: BigDecimal): string => {
  const absolute = `${BigI.abs(n.value)}`
  const sign = BigI.sign(n.value) === -1 ? "-" : ""

  let before: string
  let after: string

  if (n.scale >= absolute.length) {
    before = "0"
    after = "0".repeat(n.scale - absolute.length) + absolute
  } else {
    const location = absolute.length - n.scale
    if (location > absolute.length) {
      const zeros = location - absolute.length
      before = `${absolute}${"0".repeat(zeros)}`
      after = ""
    } else {
      after = absolute.slice(location)
      before = absolute.slice(0, location)
    }
  }

  const complete = after === "" ? before : `${before}.${after}`
  return `${sign}${complete}`
}

/**
 * Converts a `BigDecimal` to a `number`.
 *
 * This function will produce incorrect results if the `BigDecimal` exceeds the 64-bit range of a `number`.
 *
 * @param n - The `BigDecimal` to convert.
 *
 * @example
 * import { toNumber, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(toNumber(make(123.456)), 123.456)
 *
 * @since 2.0.0
 * @category conversions
 */
export const unsafeToNumber = (n: BigDecimal): number => Number(toString(n))
