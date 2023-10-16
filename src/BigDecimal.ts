/**
 * This module provides utility functions and type class instances for working with the `BigDecimal` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */

import * as BigI from "./BigInt"
import * as Cause from "./Cause"
import * as Either from "./Either"
import * as Equal from "./Equal"
import * as equivalence from "./Equivalence"
import { dual } from "./Function"
import * as Hash from "./Hash"
import { type Inspectable, NodeInspectSymbol, toString } from "./Inspectable"
import * as order from "./Order"
import type { Ordering } from "./Ordering"
import { type Pipeable, pipeArguments } from "./Pipeable"

const TypeId: unique symbol = Symbol.for("effect/BigDecimal")

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
    return Hash.structure({ value: this.value, scale: this.scale })
  },
  [Equal.symbol](this: BigDecimal, that: unknown): boolean {
    return isBigDecimal(that) && equals(this, that)
  },
  toString(this: BigDecimal) {
    return toString(this.toJSON())
  },
  toJSON(this: BigDecimal) {
    return { _id: "BigDecimal", value: this.value, scale: this.scale }
  },
  [NodeInspectSymbol]() {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
} as const

/**
 * @since 2.0.0
 * @category guards
 */
export const isBigDecimal = (u: unknown): u is BigDecimal => typeof u === "object" && u !== null && TypeId in u

/**
 * Creates a `BigDecimal` from a `bigint` value and a scale.
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

const zero = make(0n)

/**
 * Parses a numerical `string` into a `BigDecimal`.
 *
 * @since 2.0.0
 * @category constructors
 * @example
 * import { parse, make } from 'effect/BigDecimal'
 * import { getOrThrow } from 'effect/Either'
 *
 * assert.deepStrictEqual(getOrThrow(parse('123')), make(123n))
 * assert.deepStrictEqual(getOrThrow(parse('123.456')), make(123.456))
 */
export const parse = (s: string): Either.Either<Cause.IllegalArgumentException, BigDecimal> => {
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
    return Either.right(zero)
  }

  if (!/^(?:\+|-)?\d+$/.test(digits)) {
    return Either.left(Cause.IllegalArgumentException(`Invalid numerical string ${s}`))
  }

  return Either.right(scaled(BigInt(digits), scale))
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const normalize = (self: BigDecimal): BigDecimal => {
  if (self.value === 0n) {
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
 * @since 2.0.0
 * @category constructors
 */
export const scale = (self: BigDecimal, scale: number): BigDecimal => {
  if (self.value === 0n) {
    return scaled(0n, scale)
  }

  if (scale > self.scale) {
    return scaled(self.value * 10n ** BigInt(scale - self.scale), scale)
  }

  if (scale < self.scale) {
    return scaled(self.value / 10n ** BigInt(self.scale - scale), scale)
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
 * @category math
 * @since 2.0.0
 */
export const sum: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === 0n) {
    return self
  }

  if (self.value === 0n) {
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
 * import { multiply, make, equals } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(multiply(make(2n), make(3n)), make(6n))
 *
 * @category math
 * @since 2.0.0
 */
export const multiply: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === 0n || self.value === 0n) {
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
 * @category math
 * @since 2.0.0
 */
export const subtract: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
} = dual(2, (self: BigDecimal, that: BigDecimal): BigDecimal => {
  if (that.value === 0n) {
    return self
  }

  if (self.value === 0n) {
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
 * @param self - The dividend operand.
 * @param that - The divisor operand.
 *
 * @example
 * import { divide, make } from 'effect/BigDecimal'
 * import { getOrThrow } from 'effect/Either'
 *
 * assert.deepStrictEqual(getOrThrow(divide(make(6n), make(3n))), make(2n))
 * assert.deepStrictEqual(getOrThrow(divide(make(6n), make(4n))), make(1n))
 *
 * @category math
 * @since 2.0.0
 */
export const divide: {
  (that: BigDecimal): (self: BigDecimal) => Either.Either<Cause.IllegalArgumentException, BigDecimal>
  (self: BigDecimal, that: BigDecimal): Either.Either<Cause.IllegalArgumentException, BigDecimal>
} = dual(2, (self: BigDecimal, that: BigDecimal): Either.Either<Cause.IllegalArgumentException, BigDecimal> => {
  if (that.value === 0n) {
    return Either.left(Cause.IllegalArgumentException("Division by zero"))
  }

  if (self.value === 0n) {
    return Either.right(zero)
  }

  return Either.right(scaled(self.value / that.value, self.scale - that.scale))
})

/**
 * @category instances
 * @since 2.0.0
 */
export const Order: order.Order<BigDecimal> = order.make((self, that) => {
  const scmp = order.number(BigI.sign(self.value), BigI.sign(that.value))
  if (scmp !== 0) {
    return scmp
  }

  if (self.scale > that.scale) {
    return order.bigint(scale(that, self.scale).value, self.value)
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
 * @category predicates
 * @since 2.0.0
 */
export const lessThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.lessThan(Order)

/**
 * Returns a function that checks if a given `BigDecimal` is less than or equal to the provided one.
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
 * @category predicates
 * @since 2.0.0
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
 * @category predicates
 * @since 2.0.0
 */
export const greaterThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = order.greaterThan(Order)

/**
 * Returns a function that checks if a given `BigDecimal` is greater than or equal to the provided one.
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
 * @category predicates
 * @since 2.0.0
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
 * @category predicates
 * @since 2.0.0
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
 * @category math
 * @since 2.0.0
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
 * @category math
 * @since 2.0.0
 */
export const abs = (n: BigDecimal): BigDecimal => scaled(BigI.abs(n.value), n.scale)

/**
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: equivalence.Equivalence<BigDecimal> = equivalence.make((self, that) => {
  if (self.scale > that.scale) {
    return scale(that, self.scale).value === that.value
  }

  if (self.scale < that.scale) {
    return scale(self, that.scale).value === that.value
  }

  return self.value === that.value
})

/**
 * @since 2.0.0
 * @category predicates
 */
export const equals: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
} = dual(2, (self: BigDecimal, that: BigDecimal): boolean => Equivalence(self, that))

/**
 * @since 2.0.0
 * @category constructor
 * @example
 * import { format, make } from 'effect/BigDecimal'
 *
 * assert.deepStrictEqual(format(make(-5n)), '-5')
 * assert.deepStrictEqual(format(make(123.456)), '123.456')
 * assert.deepStrictEqual(format(make(-0.00000123)), '-0.00000123')
 */
export const format = (self: BigDecimal): string => {
  const absolute = `${BigI.abs(self.value)}`
  const sign = BigI.sign(self.value) === -1 ? "-" : ""

  let before: string
  let after: string

  if (self.scale >= absolute.length) {
    before = "0"
    after = "0".repeat(self.scale - absolute.length) + absolute
  } else {
    const location = absolute.length - self.scale
    if (location > absolute.length) {
      const zeros = location - absolute.length
      before = "0".repeat(zeros)
      after = ""
    } else {
      after = absolute.slice(location)
      before = absolute.slice(0, location)
    }
  }

  const complete = after === "" ? before : `${before}.${after}`
  return `${sign}${complete}`
}
