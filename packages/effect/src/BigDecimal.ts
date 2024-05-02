/**
 * This module provides utility functions and type class instances for working with the `BigDecimal` type in TypeScript.
 * It includes functions for basic arithmetic operations, as well as type class instances for `Equivalence` and `Order`.
 *
 * A `BigDecimal` allows storing any real number to arbitrary precision; which avoids common floating point errors
 * (such as 0.1 + 0.2 ≠ 0.3) at the cost of complexity.
 *
 * Internally, `BigDecimal` uses a `BigInt` object, paired with a 64-bit integer which determines the position of the
 * decimal point. Therefore, the precision *is not* actually arbitrary, but limited to 2<sup>63</sup> decimal places.
 *
 * It is not recommended to convert a floating point number to a decimal directly, as the floating point representation
 * may be unexpected.
 *
 * @since 2.0.0
 */

import * as Equal from "./Equal.js"
import * as equivalence from "./Equivalence.js"
import { dual, pipe } from "./Function.js"
import * as Hash from "./Hash.js"
import { type Inspectable, NodeInspectSymbol } from "./Inspectable.js"
import * as Option from "./Option.js"
import * as order from "./Order.js"
import type { Ordering } from "./Ordering.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import { hasProperty } from "./Predicate.js"

const DEFAULT_PRECISION = 100

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
  /** @internal */
  normalized?: BigDecimal
}

const BigDecimalProto: Omit<BigDecimal, "value" | "scale" | "normalized"> = {
  [TypeId]: TypeId,
  [Hash.symbol](this: BigDecimal): number {
    const normalized = normalize(this)
    return pipe(
      Hash.hash(normalized.value),
      Hash.combine(Hash.number(normalized.scale)),
      Hash.cached(this)
    )
  },
  [Equal.symbol](this: BigDecimal, that: unknown): boolean {
    return isBigDecimal(that) && equals(this, that)
  },
  toString(this: BigDecimal) {
    return `BigDecimal(${format(this)})`
  },
  toJSON(this: BigDecimal) {
    return {
      _id: "BigDecimal",
      value: String(this.value),
      scale: this.scale
    }
  },
  [NodeInspectSymbol](this: BigDecimal) {
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
export const isBigDecimal = (u: unknown): u is BigDecimal => hasProperty(u, TypeId)

/**
 * Creates a `BigDecimal` from a `bigint` value and a scale.
 *
 * @param value - The `bigint` value to create a `BigDecimal` from.
 * @param scale - The scale of the `BigDecimal`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make = (value: bigint, scale: number): BigDecimal => {
  const o = Object.create(BigDecimalProto)
  o.value = value
  o.scale = scale
  return o
}

/**
 * Internal function used to create pre-normalized `BigDecimal`s.
 *
 * @internal
 */
export const unsafeMakeNormalized = (value: bigint, scale: number): BigDecimal => {
  if (value !== bigint0 && value % bigint10 === bigint0) {
    throw new RangeError("Value must be normalized")
  }

  const o = make(value, scale)
  o.normalized = o
  return o
}

const bigint0 = BigInt(0)
const bigint1 = BigInt(1)
const bigint10 = BigInt(10)
const zero = unsafeMakeNormalized(bigint0, 0)

/**
 * Normalizes a given `BigDecimal` by removing trailing zeros.
 *
 * @param self - The `BigDecimal` to normalize.
 *
 * @example
 * import { normalize, make, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(normalize(unsafeFromString("123.00000")), normalize(make(123n, 0)))
 * assert.deepStrictEqual(normalize(unsafeFromString("12300000")), normalize(make(123n, -5)))
 *
 * @since 2.0.0
 * @category scaling
 */
export const normalize = (self: BigDecimal): BigDecimal => {
  if (self.normalized === undefined) {
    if (self.value === bigint0) {
      self.normalized = zero
    } else {
      const digits = `${self.value}`

      let trail = 0
      for (let i = digits.length - 1; i >= 0; i--) {
        if (digits[i] === "0") {
          trail++
        } else {
          break
        }
      }

      if (trail === 0) {
        self.normalized = self
      }

      const value = BigInt(digits.substring(0, digits.length - trail))
      const scale = self.scale - trail
      self.normalized = unsafeMakeNormalized(value, scale)
    }
  }

  return self.normalized
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
 * @category scaling
 */
export const scale = (self: BigDecimal, scale: number): BigDecimal => {
  if (scale > self.scale) {
    return make(self.value * bigint10 ** BigInt(scale - self.scale), scale)
  }

  if (scale < self.scale) {
    return make(self.value / bigint10 ** BigInt(self.scale - scale), scale)
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
 * import { sum, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(sum(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("5"))
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
    return make(scale(that, self.scale).value + self.value, self.scale)
  }

  if (self.scale < that.scale) {
    return make(scale(self, that.scale).value + that.value, that.scale)
  }

  return make(self.value + that.value, self.scale)
})

/**
 * Provides a multiplication operation on `BigDecimal`s.
 *
 * @param self - The first operand.
 * @param that - The second operand.
 *
 * @example
 * import { multiply, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(multiply(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("6"))
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

  return make(self.value * that.value, self.scale + that.scale)
})

/**
 * Provides a subtraction operation on `BigDecimal`s.
 *
 * @param self - The first operand.
 * @param that - The second operand.
 *
 * @example
 * import { subtract, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(subtract(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("-1"))
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
    return make(-that.value, that.scale)
  }

  if (self.scale > that.scale) {
    return make(self.value - scale(that, self.scale).value, self.scale)
  }

  if (self.scale < that.scale) {
    return make(scale(self, that.scale).value - that.value, that.scale)
  }

  return make(self.value - that.value, self.scale)
})

/**
 * Internal function used for arbitrary precision division.
 */
const divideWithPrecision = (
  num: bigint,
  den: bigint,
  scale: number,
  precision: number
): BigDecimal => {
  const numNegative = num < bigint0
  const denNegative = den < bigint0
  const negateResult = numNegative !== denNegative

  num = numNegative ? -num : num
  den = denNegative ? -den : den

  // Shift digits until numerator is larger than denominator (set scale appropriately).
  while (num < den) {
    num *= bigint10
    scale++
  }

  // First division.
  let quotient = num / den
  let remainder = num % den

  if (remainder === bigint0) {
    // No remainder, return immediately.
    return make(negateResult ? -quotient : quotient, scale)
  }

  // The quotient is guaranteed to be non-negative at this point. No need to consider sign.
  let count = `${quotient}`.length

  // Shift the remainder by 1 decimal; The quotient will be 1 digit upon next division.
  remainder *= bigint10
  while (remainder !== bigint0 && count < precision) {
    const q = remainder / den
    const r = remainder % den
    quotient = quotient * bigint10 + q
    remainder = r * bigint10

    count++
    scale++
  }

  if (remainder !== bigint0) {
    // Round final number with remainder.
    quotient += roundTerminal(remainder / den)
  }

  return make(negateResult ? -quotient : quotient, scale)
}

/**
 * Internal function used for rounding.
 *
 * Returns 1 if the most significant digit is >= 5, otherwise 0.
 *
 * This is used after dividing a number by a power of ten and rounding the last digit.
 *
 * @internal
 */
export const roundTerminal = (n: bigint): bigint => {
  const pos = n >= bigint0 ? 0 : 1
  return Number(`${n}`[pos]) < 5 ? bigint0 : bigint1
}

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
 * import { BigDecimal, Option } from "effect"
 *
 * assert.deepStrictEqual(BigDecimal.divide(BigDecimal.unsafeFromString("6"), BigDecimal.unsafeFromString("3")), Option.some(BigDecimal.unsafeFromString("2")))
 * assert.deepStrictEqual(BigDecimal.divide(BigDecimal.unsafeFromString("6"), BigDecimal.unsafeFromString("4")), Option.some(BigDecimal.unsafeFromString("1.5")))
 * assert.deepStrictEqual(BigDecimal.divide(BigDecimal.unsafeFromString("6"), BigDecimal.unsafeFromString("0")), Option.none())
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

  const scale = self.scale - that.scale
  if (self.value === that.value) {
    return Option.some(make(bigint1, scale))
  }

  return Option.some(divideWithPrecision(self.value, that.value, scale, DEFAULT_PRECISION))
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
 * import { unsafeDivide, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(unsafeDivide(unsafeFromString("6"), unsafeFromString("3")), unsafeFromString("2"))
 * assert.deepStrictEqual(unsafeDivide(unsafeFromString("6"), unsafeFromString("4")), unsafeFromString("1.5"))
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

  const scale = self.scale - that.scale
  if (self.value === that.value) {
    return make(bigint1, scale)
  }
  return divideWithPrecision(self.value, that.value, scale, DEFAULT_PRECISION)
})

/**
 * @since 2.0.0
 * @category instances
 */
export const Order: order.Order<BigDecimal> = order.make((self, that) => {
  const scmp = order.number(sign(self), sign(that))
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
 * import { lessThan, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(lessThan(unsafeFromString("2"), unsafeFromString("3")), true)
 * assert.deepStrictEqual(lessThan(unsafeFromString("3"), unsafeFromString("3")), false)
 * assert.deepStrictEqual(lessThan(unsafeFromString("4"), unsafeFromString("3")), false)
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
 * import { lessThanOrEqualTo, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(lessThanOrEqualTo(unsafeFromString("2"), unsafeFromString("3")), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(unsafeFromString("3"), unsafeFromString("3")), true)
 * assert.deepStrictEqual(lessThanOrEqualTo(unsafeFromString("4"), unsafeFromString("3")), false)
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
 * import { greaterThan, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(greaterThan(unsafeFromString("2"), unsafeFromString("3")), false)
 * assert.deepStrictEqual(greaterThan(unsafeFromString("3"), unsafeFromString("3")), false)
 * assert.deepStrictEqual(greaterThan(unsafeFromString("4"), unsafeFromString("3")), true)
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
 * import { greaterThanOrEqualTo, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(greaterThanOrEqualTo(unsafeFromString("2"), unsafeFromString("3")), false)
 * assert.deepStrictEqual(greaterThanOrEqualTo(unsafeFromString("3"), unsafeFromString("3")), true)
 * assert.deepStrictEqual(greaterThanOrEqualTo(unsafeFromString("4"), unsafeFromString("3")), true)
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
 * import { BigDecimal } from "effect"
 *
 * const between = BigDecimal.between({
 *   minimum: BigDecimal.unsafeFromString("1"),
 *   maximum: BigDecimal.unsafeFromString("5") }
 * )
 *
 * assert.deepStrictEqual(between(BigDecimal.unsafeFromString("3")), true)
 * assert.deepStrictEqual(between(BigDecimal.unsafeFromString("0")), false)
 * assert.deepStrictEqual(between(BigDecimal.unsafeFromString("6")), false)
 *
 * @since 2.0.0
 * @category predicates
 */
export const between: {
  (options: {
    minimum: BigDecimal
    maximum: BigDecimal
  }): (self: BigDecimal) => boolean
  (self: BigDecimal, options: {
    minimum: BigDecimal
    maximum: BigDecimal
  }): boolean
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
 * import { BigDecimal } from "effect"
 *
 * const clamp = BigDecimal.clamp({
 *   minimum: BigDecimal.unsafeFromString("1"),
 *   maximum: BigDecimal.unsafeFromString("5") }
 * )
 *
 * assert.deepStrictEqual(clamp(BigDecimal.unsafeFromString("3")), BigDecimal.unsafeFromString("3"))
 * assert.deepStrictEqual(clamp(BigDecimal.unsafeFromString("0")), BigDecimal.unsafeFromString("1"))
 * assert.deepStrictEqual(clamp(BigDecimal.unsafeFromString("6")), BigDecimal.unsafeFromString("5"))
 *
 * @since 2.0.0
 * @category math
 */
export const clamp: {
  (options: {
    minimum: BigDecimal
    maximum: BigDecimal
  }): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, options: {
    minimum: BigDecimal
    maximum: BigDecimal
  }): BigDecimal
} = order.clamp(Order)

/**
 * Returns the minimum between two `BigDecimal`s.
 *
 * @param self - The first `BigDecimal`.
 * @param that - The second `BigDecimal`.
 *
 * @example
 * import { min, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(min(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("2"))
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
 * import { max, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(max(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("3"))
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
 * import { sign, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(sign(unsafeFromString("-5")), -1)
 * assert.deepStrictEqual(sign(unsafeFromString("0")), 0)
 * assert.deepStrictEqual(sign(unsafeFromString("5")), 1)
 *
 * @since 2.0.0
 * @category math
 */
export const sign = (n: BigDecimal): Ordering => n.value === bigint0 ? 0 : n.value < bigint0 ? -1 : 1

/**
 * Determines the absolute value of a given `BigDecimal`.
 *
 * @param n - The `BigDecimal` to determine the absolute value of.
 *
 * @example
 * import { abs, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(abs(unsafeFromString("-5")), unsafeFromString("5"))
 * assert.deepStrictEqual(abs(unsafeFromString("0")), unsafeFromString("0"))
 * assert.deepStrictEqual(abs(unsafeFromString("5")), unsafeFromString("5"))
 *
 * @since 2.0.0
 * @category math
 */
export const abs = (n: BigDecimal): BigDecimal => n.value < bigint0 ? make(-n.value, n.scale) : n

/**
 * Provides a negate operation on `BigDecimal`s.
 *
 * @param n - The `BigDecimal` to negate.
 *
 * @example
 * import { negate, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(negate(unsafeFromString("3")), unsafeFromString("-3"))
 * assert.deepStrictEqual(negate(unsafeFromString("-6")), unsafeFromString("6"))
 *
 * @since 2.0.0
 * @category math
 */
export const negate = (n: BigDecimal): BigDecimal => make(-n.value, n.scale)

/**
 * Returns the remainder left over when one operand is divided by a second operand.
 *
 * If the divisor is `0`, the result will be `None`.
 *
 * @param self - The dividend.
 * @param divisor - The divisor.
 *
 * @example
 * import { BigDecimal, Option } from "effect"
 *
 * assert.deepStrictEqual(BigDecimal.remainder(BigDecimal.unsafeFromString("2"), BigDecimal.unsafeFromString("2")), Option.some(BigDecimal.unsafeFromString("0")))
 * assert.deepStrictEqual(BigDecimal.remainder(BigDecimal.unsafeFromString("3"), BigDecimal.unsafeFromString("2")), Option.some(BigDecimal.unsafeFromString("1")))
 * assert.deepStrictEqual(BigDecimal.remainder(BigDecimal.unsafeFromString("-4"), BigDecimal.unsafeFromString("2")), Option.some(BigDecimal.unsafeFromString("0")))
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
  return Option.some(make(scale(self, max).value % scale(divisor, max).value, max))
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
 * import { unsafeRemainder, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(unsafeRemainder(unsafeFromString("2"), unsafeFromString("2")), unsafeFromString("0"))
 * assert.deepStrictEqual(unsafeRemainder(unsafeFromString("3"), unsafeFromString("2")), unsafeFromString("1"))
 * assert.deepStrictEqual(unsafeRemainder(unsafeFromString("-4"), unsafeFromString("2")), unsafeFromString("0"))
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
  return make(scale(self, max).value % scale(divisor, max).value, max)
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
 * Creates a `BigDecimal` from a `bigint` value.
 *
 * @param value - The `bigint` value to create a `BigDecimal` from.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromBigInt = (n: bigint): BigDecimal => make(n, 0)

/**
 * Creates a `BigDecimal` from a `number` value.
 *
 * It is not recommended to convert a floating point number to a decimal directly,
 * as the floating point representation may be unexpected.
 *
 * @param value - The `number` value to create a `BigDecimal` from.
 *
 * @example
 * import { fromNumber, make } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(fromNumber(123), make(123n, 0))
 * assert.deepStrictEqual(fromNumber(123.456), make(123456n, 3))
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromNumber = (n: number): BigDecimal => {
  const [lead, trail = ""] = `${n}`.split(".")
  return make(BigInt(`${lead}${trail}`), trail.length)
}

/**
 * Parses a numerical `string` into a `BigDecimal`.
 *
 * @param s - The `string` to parse.
 *
 * @example
 * import { BigDecimal, Option } from "effect"
 *
 * assert.deepStrictEqual(BigDecimal.fromString("123"), Option.some(BigDecimal.make(123n, 0)))
 * assert.deepStrictEqual(BigDecimal.fromString("123.456"), Option.some(BigDecimal.make(123456n, 3)))
 * assert.deepStrictEqual(BigDecimal.fromString("123.abc"), Option.none())
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

  return Option.some(make(BigInt(digits), scale))
}

/**
 * Parses a numerical `string` into a `BigDecimal`.
 *
 * @param s - The `string` to parse.
 *
 * @example
 * import { unsafeFromString, make } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(unsafeFromString("123"), make(123n, 0))
 * assert.deepStrictEqual(unsafeFromString("123.456"), make(123456n, 3))
 * assert.throws(() => unsafeFromString("123.abc"))
 *
 * @since 2.0.0
 * @category constructors
 */
export const unsafeFromString = (s: string): BigDecimal =>
  Option.getOrThrowWith(fromString(s), () => new Error("Invalid numerical string"))

/**
 * Formats a given `BigDecimal` as a `string`.
 *
 * @param normalized - The `BigDecimal` to format.
 *
 * @example
 * import { format, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(format(unsafeFromString("-5")), "-5")
 * assert.deepStrictEqual(format(unsafeFromString("123.456")), "123.456")
 * assert.deepStrictEqual(format(unsafeFromString("-0.00000123")), "-0.00000123")
 *
 * @since 2.0.0
 * @category conversions
 */
export const format = (n: BigDecimal): string => {
  const negative = n.value < bigint0
  const absolute = negative ? `${n.value}`.substring(1) : `${n.value}`

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
  return negative ? `-${complete}` : complete
}

/**
 * Converts a `BigDecimal` to a `number`.
 *
 * This function will produce incorrect results if the `BigDecimal` exceeds the 64-bit range of a `number`.
 *
 * @param n - The `BigDecimal` to convert.
 *
 * @example
 * import { unsafeToNumber, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(unsafeToNumber(unsafeFromString("123.456")), 123.456)
 *
 * @since 2.0.0
 * @category conversions
 */
export const unsafeToNumber = (n: BigDecimal): number => Number(format(n))

/**
 * Checks if a given `BigDecimal` is an integer.
 *
 * @param n - The `BigDecimal` to check.
 *
 * @example
 * import { isInteger, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(isInteger(unsafeFromString("0")), true)
 * assert.deepStrictEqual(isInteger(unsafeFromString("1")), true)
 * assert.deepStrictEqual(isInteger(unsafeFromString("1.1")), false)
 *
 * @since 2.0.0
 * @category predicates
 */
export const isInteger = (n: BigDecimal): boolean => normalize(n).scale <= 0

/**
 * Checks if a given `BigDecimal` is `0`.
 *
 * @param n - The `BigDecimal` to check.
 *
 * @example
 * import { isZero, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(isZero(unsafeFromString("0")), true)
 * assert.deepStrictEqual(isZero(unsafeFromString("1")), false)
 *
 * @since 2.0.0
 * @category predicates
 */
export const isZero = (n: BigDecimal): boolean => n.value === bigint0

/**
 * Checks if a given `BigDecimal` is negative.
 *
 * @param n - The `BigDecimal` to check.
 *
 * @example
 * import { isNegative, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(isNegative(unsafeFromString("-1")), true)
 * assert.deepStrictEqual(isNegative(unsafeFromString("0")), false)
 * assert.deepStrictEqual(isNegative(unsafeFromString("1")), false)
 *
 * @since 2.0.0
 * @category predicates
 */
export const isNegative = (n: BigDecimal): boolean => n.value < bigint0

/**
 * Checks if a given `BigDecimal` is positive.
 *
 * @param n - The `BigDecimal` to check.
 *
 * @example
 * import { isPositive, unsafeFromString } from "effect/BigDecimal"
 *
 * assert.deepStrictEqual(isPositive(unsafeFromString("-1")), false)
 * assert.deepStrictEqual(isPositive(unsafeFromString("0")), false)
 * assert.deepStrictEqual(isPositive(unsafeFromString("1")), true)
 *
 * @since 2.0.0
 * @category predicates
 */
export const isPositive = (n: BigDecimal): boolean => n.value > bigint0
