---
title: BigDecimal.ts
nav_order: 1
parent: Modules
---

## BigDecimal overview

This module provides utility functions and type class instances for working with the `BigDecimal` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for `Equivalence` and `Order`.

A `BigDecimal` allows storing any real number to arbitrary precision; which avoids common floating point errors
(such as 0.1 + 0.2 ≠ 0.3) at the cost of complexity.

Internally, `BigDecimal` uses a `BigInt` object, paired with a 64-bit integer which determines the position of the
decimal point. Therefore, the precision _is not_ actually arbitrary, but limited to 2<sup>63</sup> decimal places.

It is not recommended to convert a floating point number to a decimal directly, as the floating point representation
may be unexpected.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [fromBigInt](#frombigint)
  - [fromNumber](#fromnumber)
  - [fromString](#fromstring)
  - [make](#make)
  - [unsafeFromString](#unsafefromstring)
- [conversions](#conversions)
  - [toString](#tostring)
  - [unsafeToNumber](#unsafetonumber)
- [guards](#guards)
  - [isBigDecimal](#isbigdecimal)
- [instances](#instances)
  - [Equivalence](#equivalence)
  - [Order](#order)
- [math](#math)
  - [abs](#abs)
  - [clamp](#clamp)
  - [divide](#divide)
  - [max](#max)
  - [min](#min)
  - [multiply](#multiply)
  - [negate](#negate)
  - [remainder](#remainder)
  - [sign](#sign)
  - [subtract](#subtract)
  - [sum](#sum)
  - [unsafeDivide](#unsafedivide)
  - [unsafeRemainder](#unsaferemainder)
- [models](#models)
  - [BigDecimal (interface)](#bigdecimal-interface)
- [predicates](#predicates)
  - [between](#between)
  - [equals](#equals)
  - [greaterThan](#greaterthan)
  - [greaterThanOrEqualTo](#greaterthanorequalto)
  - [isInteger](#isinteger)
  - [isNegative](#isnegative)
  - [isPositive](#ispositive)
  - [isZero](#iszero)
  - [lessThan](#lessthan)
  - [lessThanOrEqualTo](#lessthanorequalto)
- [scaling](#scaling)
  - [normalize](#normalize)
  - [scale](#scale)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)
- [symbols](#symbols)
  - [TypeId](#typeid)

---

# constructors

## fromBigInt

Creates a `BigDecimal` from a `bigint` value.

**Signature**

```ts
export declare const fromBigInt: (n: bigint) => BigDecimal
```

Added in v2.0.0

## fromNumber

Creates a `BigDecimal` from a `number` value.

It is not recommended to convert a floating point number to a decimal directly,
as the floating point representation may be unexpected.

**Signature**

```ts
export declare const fromNumber: (n: number) => BigDecimal
```

**Example**

```ts
import { fromNumber, make } from "effect/BigDecimal"

assert.deepStrictEqual(fromNumber(123), make(123n, 0))
assert.deepStrictEqual(fromNumber(123.456), make(123456n, 3))
```

Added in v2.0.0

## fromString

Parses a numerical `string` into a `BigDecimal`.

**Signature**

```ts
export declare const fromString: (s: string) => Option.Option<BigDecimal>
```

**Example**

```ts
import { fromString, make } from "effect/BigDecimal"
import { some, none } from "effect/Option"

assert.deepStrictEqual(fromString("123"), some(make(123n, 0)))
assert.deepStrictEqual(fromString("123.456"), some(make(123456n, 3)))
assert.deepStrictEqual(fromString("123.abc"), none())
```

Added in v2.0.0

## make

Creates a `BigDecimal` from a `bigint` value and a scale.

**Signature**

```ts
export declare const make: (value: bigint, scale: number) => BigDecimal
```

Added in v2.0.0

## unsafeFromString

Parses a numerical `string` into a `BigDecimal`.

**Signature**

```ts
export declare const unsafeFromString: (s: string) => BigDecimal
```

**Example**

```ts
import { unsafeFromString, make } from "effect/BigDecimal"

assert.deepStrictEqual(unsafeFromString("123"), make(123n, 0))
assert.deepStrictEqual(unsafeFromString("123.456"), make(123456n, 3))
assert.throws(() => unsafeFromString("123.abc"))
```

Added in v2.0.0

# conversions

## toString

Formats a given `BigDecimal` as a `string`.

**Signature**

```ts
export declare const toString: (n: BigDecimal) => string
```

**Example**

```ts
import { toString, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(toString(unsafeFromString("-5")), "-5")
assert.deepStrictEqual(toString(unsafeFromString("123.456")), "123.456")
assert.deepStrictEqual(toString(unsafeFromString("-0.00000123")), "-0.00000123")
```

Added in v2.0.0

## unsafeToNumber

Converts a `BigDecimal` to a `number`.

This function will produce incorrect results if the `BigDecimal` exceeds the 64-bit range of a `number`.

**Signature**

```ts
export declare const unsafeToNumber: (n: BigDecimal) => number
```

**Example**

```ts
import { unsafeToNumber, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(unsafeToNumber(unsafeFromString("123.456")), 123.456)
```

Added in v2.0.0

# guards

## isBigDecimal

Checks if a given value is a `BigDecimal`.

**Signature**

```ts
export declare const isBigDecimal: (u: unknown) => u is BigDecimal
```

Added in v2.0.0

# instances

## Equivalence

**Signature**

```ts
export declare const Equivalence: equivalence.Equivalence<BigDecimal>
```

Added in v2.0.0

## Order

**Signature**

```ts
export declare const Order: order.Order<BigDecimal>
```

Added in v2.0.0

# math

## abs

Determines the absolute value of a given `BigDecimal`.

**Signature**

```ts
export declare const abs: (n: BigDecimal) => BigDecimal
```

**Example**

```ts
import { abs, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(abs(unsafeFromString("-5")), unsafeFromString("5"))
assert.deepStrictEqual(abs(unsafeFromString("0")), unsafeFromString("0"))
assert.deepStrictEqual(abs(unsafeFromString("5")), unsafeFromString("5"))
```

Added in v2.0.0

## clamp

Restricts the given `BigDecimal` to be within the range specified by the `minimum` and `maximum` values.

- If the `BigDecimal` is less than the `minimum` value, the function returns the `minimum` value.
- If the `BigDecimal` is greater than the `maximum` value, the function returns the `maximum` value.
- Otherwise, it returns the original `BigDecimal`.

**Signature**

```ts
export declare const clamp: {
  (options: { minimum: BigDecimal; maximum: BigDecimal }): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, options: { minimum: BigDecimal; maximum: BigDecimal }): BigDecimal
}
```

**Example**

```ts
import * as BigDecimal from "effect/BigDecimal"

const clamp = BigDecimal.clamp({
  minimum: BigDecimal.unsafeFromString("1"),
  maximum: BigDecimal.unsafeFromString("5")
})

assert.deepStrictEqual(clamp(BigDecimal.unsafeFromString("3")), BigDecimal.unsafeFromString("3"))
assert.deepStrictEqual(clamp(BigDecimal.unsafeFromString("0")), BigDecimal.unsafeFromString("1"))
assert.deepStrictEqual(clamp(BigDecimal.unsafeFromString("6")), BigDecimal.unsafeFromString("5"))
```

Added in v2.0.0

## divide

Provides a division operation on `BigDecimal`s.

If the dividend is not a multiple of the divisor the result will be a `BigDecimal` value
which represents the integer division rounded down to the nearest integer.

If the divisor is `0`, the result will be `None`.

**Signature**

```ts
export declare const divide: {
  (that: BigDecimal): (self: BigDecimal) => Option.Option<BigDecimal>
  (self: BigDecimal, that: BigDecimal): Option.Option<BigDecimal>
}
```

**Example**

```ts
import { divide, unsafeFromString } from "effect/BigDecimal"
import { some, none } from "effect/Option"

assert.deepStrictEqual(divide(unsafeFromString("6"), unsafeFromString("3")), some(unsafeFromString("2")))
assert.deepStrictEqual(divide(unsafeFromString("6"), unsafeFromString("4")), some(unsafeFromString("1.5")))
assert.deepStrictEqual(divide(unsafeFromString("6"), unsafeFromString("0")), none())
```

Added in v2.0.0

## max

Returns the maximum between two `BigDecimal`s.

**Signature**

```ts
export declare const max: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

**Example**

```ts
import { max, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(max(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("3"))
```

Added in v2.0.0

## min

Returns the minimum between two `BigDecimal`s.

**Signature**

```ts
export declare const min: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

**Example**

```ts
import { min, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(min(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("2"))
```

Added in v2.0.0

## multiply

Provides a multiplication operation on `BigDecimal`s.

**Signature**

```ts
export declare const multiply: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

**Example**

```ts
import { multiply, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(multiply(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("6"))
```

Added in v2.0.0

## negate

Provides a negate operation on `BigDecimal`s.

**Signature**

```ts
export declare const negate: (n: BigDecimal) => BigDecimal
```

**Example**

```ts
import { negate, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(negate(unsafeFromString("3")), unsafeFromString("-3"))
assert.deepStrictEqual(negate(unsafeFromString("-6")), unsafeFromString("6"))
```

Added in v2.0.0

## remainder

Returns the remainder left over when one operand is divided by a second operand.

If the divisor is `0`, the result will be `None`.

**Signature**

```ts
export declare const remainder: {
  (divisor: BigDecimal): (self: BigDecimal) => Option.Option<BigDecimal>
  (self: BigDecimal, divisor: BigDecimal): Option.Option<BigDecimal>
}
```

**Example**

```ts
import { remainder, unsafeFromString } from "effect/BigDecimal"
import { some } from "effect/Option"

assert.deepStrictEqual(remainder(unsafeFromString("2"), unsafeFromString("2")), some(unsafeFromString("0")))
assert.deepStrictEqual(remainder(unsafeFromString("3"), unsafeFromString("2")), some(unsafeFromString("1")))
assert.deepStrictEqual(remainder(unsafeFromString("-4"), unsafeFromString("2")), some(unsafeFromString("0")))
```

Added in v2.0.0

## sign

Determines the sign of a given `BigDecimal`.

**Signature**

```ts
export declare const sign: (n: BigDecimal) => Ordering
```

**Example**

```ts
import { sign, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(sign(unsafeFromString("-5")), -1)
assert.deepStrictEqual(sign(unsafeFromString("0")), 0)
assert.deepStrictEqual(sign(unsafeFromString("5")), 1)
```

Added in v2.0.0

## subtract

Provides a subtraction operation on `BigDecimal`s.

**Signature**

```ts
export declare const subtract: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

**Example**

```ts
import { subtract, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(subtract(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("-1"))
```

Added in v2.0.0

## sum

Provides an addition operation on `BigDecimal`s.

**Signature**

```ts
export declare const sum: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

**Example**

```ts
import { sum, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(sum(unsafeFromString("2"), unsafeFromString("3")), unsafeFromString("5"))
```

Added in v2.0.0

## unsafeDivide

Provides an unsafe division operation on `BigDecimal`s.

If the dividend is not a multiple of the divisor the result will be a `BigDecimal` value
which represents the integer division rounded down to the nearest integer.

Throws a `RangeError` if the divisor is `0`.

**Signature**

```ts
export declare const unsafeDivide: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

**Example**

```ts
import { unsafeDivide, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(unsafeDivide(unsafeFromString("6"), unsafeFromString("3")), unsafeFromString("2"))
assert.deepStrictEqual(unsafeDivide(unsafeFromString("6"), unsafeFromString("4")), unsafeFromString("1.5"))
```

Added in v2.0.0

## unsafeRemainder

Returns the remainder left over when one operand is divided by a second operand.

Throws a `RangeError` if the divisor is `0`.

**Signature**

```ts
export declare const unsafeRemainder: {
  (divisor: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, divisor: BigDecimal): BigDecimal
}
```

**Example**

```ts
import { unsafeRemainder, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(unsafeRemainder(unsafeFromString("2"), unsafeFromString("2")), unsafeFromString("0"))
assert.deepStrictEqual(unsafeRemainder(unsafeFromString("3"), unsafeFromString("2")), unsafeFromString("1"))
assert.deepStrictEqual(unsafeRemainder(unsafeFromString("-4"), unsafeFromString("2")), unsafeFromString("0"))
```

Added in v2.0.0

# models

## BigDecimal (interface)

**Signature**

```ts
export interface BigDecimal extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly value: bigint
  readonly scale: number
  /** @internal */
  normalized?: BigDecimal
}
```

Added in v2.0.0

# predicates

## between

Checks if a `BigDecimal` is between a `minimum` and `maximum` value (inclusive).

**Signature**

```ts
export declare const between: {
  (options: { minimum: BigDecimal; maximum: BigDecimal }): (self: BigDecimal) => boolean
  (self: BigDecimal, options: { minimum: BigDecimal; maximum: BigDecimal }): boolean
}
```

**Example**

```ts
import * as BigDecimal from "effect/BigDecimal"

const between = BigDecimal.between({
  minimum: BigDecimal.unsafeFromString("1"),
  maximum: BigDecimal.unsafeFromString("5")
})

assert.deepStrictEqual(between(BigDecimal.unsafeFromString("3")), true)
assert.deepStrictEqual(between(BigDecimal.unsafeFromString("0")), false)
assert.deepStrictEqual(between(BigDecimal.unsafeFromString("6")), false)
```

Added in v2.0.0

## equals

Checks if two `BigDecimal`s are equal.

**Signature**

```ts
export declare const equals: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

Added in v2.0.0

## greaterThan

Returns `true` if the first argument is greater than the second, otherwise `false`.

**Signature**

```ts
export declare const greaterThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

**Example**

```ts
import { greaterThan, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(greaterThan(unsafeFromString("2"), unsafeFromString("3")), false)
assert.deepStrictEqual(greaterThan(unsafeFromString("3"), unsafeFromString("3")), false)
assert.deepStrictEqual(greaterThan(unsafeFromString("4"), unsafeFromString("3")), true)
```

Added in v2.0.0

## greaterThanOrEqualTo

Checks if a given `BigDecimal` is greater than or equal to the provided one.

**Signature**

```ts
export declare const greaterThanOrEqualTo: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

**Example**

```ts
import { greaterThanOrEqualTo, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(greaterThanOrEqualTo(unsafeFromString("2"), unsafeFromString("3")), false)
assert.deepStrictEqual(greaterThanOrEqualTo(unsafeFromString("3"), unsafeFromString("3")), true)
assert.deepStrictEqual(greaterThanOrEqualTo(unsafeFromString("4"), unsafeFromString("3")), true)
```

Added in v2.0.0

## isInteger

Checks if a given `BigDecimal` is an integer.

**Signature**

```ts
export declare const isInteger: (n: BigDecimal) => boolean
```

**Example**

```ts
import { isInteger, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(isInteger(unsafeFromString("0")), true)
assert.deepStrictEqual(isInteger(unsafeFromString("1")), true)
assert.deepStrictEqual(isInteger(unsafeFromString("1.1")), false)
```

Added in v2.0.0

## isNegative

Checks if a given `BigDecimal` is negative.

**Signature**

```ts
export declare const isNegative: (n: BigDecimal) => boolean
```

**Example**

```ts
import { isNegative, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(isNegative(unsafeFromString("-1")), true)
assert.deepStrictEqual(isNegative(unsafeFromString("0")), false)
assert.deepStrictEqual(isNegative(unsafeFromString("1")), false)
```

Added in v2.0.0

## isPositive

Checks if a given `BigDecimal` is positive.

**Signature**

```ts
export declare const isPositive: (n: BigDecimal) => boolean
```

**Example**

```ts
import { isPositive, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(isPositive(unsafeFromString("-1")), false)
assert.deepStrictEqual(isPositive(unsafeFromString("0")), false)
assert.deepStrictEqual(isPositive(unsafeFromString("1")), true)
```

Added in v2.0.0

## isZero

Checks if a given `BigDecimal` is `0`.

**Signature**

```ts
export declare const isZero: (n: BigDecimal) => boolean
```

**Example**

```ts
import { isZero, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(isZero(unsafeFromString("0")), true)
assert.deepStrictEqual(isZero(unsafeFromString("1")), false)
```

Added in v2.0.0

## lessThan

Returns `true` if the first argument is less than the second, otherwise `false`.

**Signature**

```ts
export declare const lessThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

**Example**

```ts
import { lessThan, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(lessThan(unsafeFromString("2"), unsafeFromString("3")), true)
assert.deepStrictEqual(lessThan(unsafeFromString("3"), unsafeFromString("3")), false)
assert.deepStrictEqual(lessThan(unsafeFromString("4"), unsafeFromString("3")), false)
```

Added in v2.0.0

## lessThanOrEqualTo

Checks if a given `BigDecimal` is less than or equal to the provided one.

**Signature**

```ts
export declare const lessThanOrEqualTo: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

**Example**

```ts
import { lessThanOrEqualTo, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(lessThanOrEqualTo(unsafeFromString("2"), unsafeFromString("3")), true)
assert.deepStrictEqual(lessThanOrEqualTo(unsafeFromString("3"), unsafeFromString("3")), true)
assert.deepStrictEqual(lessThanOrEqualTo(unsafeFromString("4"), unsafeFromString("3")), false)
```

Added in v2.0.0

# scaling

## normalize

Normalizes a given `BigDecimal` by removing trailing zeros.

**Signature**

```ts
export declare const normalize: (self: BigDecimal) => BigDecimal
```

**Example**

```ts
import { normalize, make, unsafeFromString } from "effect/BigDecimal"

assert.deepStrictEqual(normalize(unsafeFromString("123.00000")), make(123n, 0))
assert.deepStrictEqual(normalize(unsafeFromString("12300000")), make(123n, -5))
```

Added in v2.0.0

## scale

Scales a given `BigDecimal` to the specified scale.

If the given scale is smaller than the current scale, the value will be rounded down to
the nearest integer.

**Signature**

```ts
export declare const scale: (self: BigDecimal, scale: number) => BigDecimal
```

Added in v2.0.0

# symbol

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v2.0.0

# symbols

## TypeId

**Signature**

```ts
export declare const TypeId: typeof TypeId
```

Added in v2.0.0
