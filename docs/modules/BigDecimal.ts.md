---
title: BigDecimal.ts
nav_order: 1
parent: Modules
---

## BigDecimal overview

This module provides utility functions and type class instances for working with the `BigDecimal` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for `Equivalence` and `Order`.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
  - [normalize](#normalize)
  - [scale](#scale)
  - [scaled](#scaled)
- [conversions](#conversions)
  - [fromString](#fromstring)
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
  - [lessThan](#lessthan)
  - [lessThanOrEqualTo](#lessthanorequalto)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)
- [symbols](#symbols)
  - [TypeId](#typeid)

---

# constructors

## make

Creates a `BigDecimal` from a `bigint` or `number` value.

**Signature**

```ts
export declare const make: (value: bigint | number) => BigDecimal
```

Added in v2.0.0

## normalize

Normalizes a given `BigDecimal` by removing trailing zeros.

**Signature**

```ts
export declare const normalize: (self: BigDecimal) => BigDecimal
```

**Example**

```ts
import { normalize, make, scaled } from 'effect/BigDecimal'

assert.deepStrictEqual(normalize(scaled(12300000n, 5)), scaled(123n, 0))
assert.deepStrictEqual(normalize(make(12300000)), scaled(123n, -5))
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

## scaled

Creates a `BigDecimal` from a `bigint` value and a scale.

**Signature**

```ts
export declare const scaled: (value: bigint, scale: number) => BigDecimal
```

Added in v2.0.0

# conversions

## fromString

Parses a numerical `string` into a `BigDecimal`.

**Signature**

```ts
export declare const fromString: (s: string) => Option.Option<BigDecimal>
```

**Example**

```ts
import { fromString, make } from 'effect/BigDecimal'
import { some, none } from 'effect/Option'

assert.deepStrictEqual(fromString('123'), some(make(123n)))
assert.deepStrictEqual(fromString('123.456'), some(make(123.456)))
assert.deepStrictEqual(fromString('123.abc'), none())
```

Added in v2.0.0

## toString

Formats a given `BigDecimal` as a `string`.

**Signature**

```ts
export declare const toString: (n: BigDecimal) => string
```

**Example**

```ts
import { toString, make } from 'effect/BigDecimal'

assert.deepStrictEqual(toString(make(-5n)), '-5')
assert.deepStrictEqual(toString(make(123.456)), '123.456')
assert.deepStrictEqual(toString(make(-0.00000123)), '-0.00000123')
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
import { unsafeToNumber, make } from 'effect/BigDecimal'

assert.deepStrictEqual(unsafeToNumber(make(123.456)), 123.456)
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
import { abs, make } from 'effect/BigDecimal'

assert.deepStrictEqual(abs(make(-5n)), make(5n))
assert.deepStrictEqual(abs(make(0n)), make(0n))
assert.deepStrictEqual(abs(make(5n)), make(5n))
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
  (minimum: BigDecimal, maximum: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, minimum: BigDecimal, maximum: BigDecimal): BigDecimal
}
```

**Example**

```ts
import { clamp, make } from 'effect/BigDecimal'

assert.deepStrictEqual(clamp(make(0n), make(5n))(make(3n)), make(3n))
assert.deepStrictEqual(clamp(make(0n), make(5n))(make(-1n)), make(0n))
assert.deepStrictEqual(clamp(make(0n), make(5n))(make(6n)), make(5n))
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
import { divide, make } from 'effect/BigDecimal'
import { some, none } from 'effect/Option'

assert.deepStrictEqual(divide(make(6n), make(3n)), some(make(2n)))
assert.deepStrictEqual(divide(make(6n), make(4n)), some(make(1n)))
assert.deepStrictEqual(divide(make(6n), make(0n)), none())
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
import { max, make } from 'effect/BigDecimal'

assert.deepStrictEqual(max(make(2n), make(3n)), make(3n))
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
import { min, make } from 'effect/BigDecimal'

assert.deepStrictEqual(min(make(2n), make(3n)), make(2n))
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
import { multiply, make } from 'effect/BigDecimal'

assert.deepStrictEqual(multiply(make(2n), make(3n)), make(6n))
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
import { negate, make } from 'effect/BigDecimal'

assert.deepStrictEqual(negate(make(3n)), make(-3n))
assert.deepStrictEqual(negate(make(-6n)), make(6n))
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
import { remainder, make } from 'effect/BigDecimal'
import { some, none } from 'effect/Option'

assert.deepStrictEqual(remainder(make(2), make(2)), some(make(0)))
assert.deepStrictEqual(remainder(make(3), make(2)), some(make(1)))
assert.deepStrictEqual(remainder(make(-4), make(2)), some(make(0)))
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
import { sign, make } from 'effect/BigDecimal'

assert.deepStrictEqual(sign(make(-5n)), -1)
assert.deepStrictEqual(sign(make(0n)), 0)
assert.deepStrictEqual(sign(make(5n)), 1)
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
import { subtract, make } from 'effect/BigDecimal'

assert.deepStrictEqual(subtract(make(2n), make(3n)), make(-1n))
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
import { sum, make } from 'effect/BigDecimal'

assert.deepStrictEqual(sum(make(2n), make(3n)), make(5n))
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
import { unsafeDivide, make } from 'effect/BigDecimal'

assert.deepStrictEqual(unsafeDivide(make(6n), make(3n)), make(2n))
assert.deepStrictEqual(unsafeDivide(make(6n), make(4n)), make(1n))
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
import { unsafeRemainder, make } from 'effect/BigDecimal'

assert.deepStrictEqual(unsafeRemainder(make(2), make(2)), make(0))
assert.deepStrictEqual(unsafeRemainder(make(3), make(2)), make(1))
assert.deepStrictEqual(unsafeRemainder(make(-4), make(2)), make(0))
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
  normalized?: BigDecimal | undefined
}
```

Added in v2.0.0

# predicates

## between

Checks if a `BigDecimal` is between a `minimum` and `maximum` value (inclusive).

**Signature**

```ts
export declare const between: {
  (minimum: BigDecimal, maximum: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, minimum: BigDecimal, maximum: BigDecimal): boolean
}
```

**Example**

```ts
import { between, make } from 'effect/BigDecimal'

assert.deepStrictEqual(between(make(0n), make(5n))(make(3n)), true)
assert.deepStrictEqual(between(make(0n), make(5n))(make(-1n)), false)
assert.deepStrictEqual(between(make(0n), make(5n))(make(6n)), false)
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
import { greaterThan, make } from 'effect/BigDecimal'

assert.deepStrictEqual(greaterThan(make(2n), make(3n)), false)
assert.deepStrictEqual(greaterThan(make(3n), make(3n)), false)
assert.deepStrictEqual(greaterThan(make(4n), make(3n)), true)
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
import { greaterThanOrEqualTo, make } from 'effect/BigDecimal'

assert.deepStrictEqual(greaterThanOrEqualTo(make(2n), make(3n)), false)
assert.deepStrictEqual(greaterThanOrEqualTo(make(3n), make(3n)), true)
assert.deepStrictEqual(greaterThanOrEqualTo(make(4n), make(3n)), true)
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
import { lessThan, make } from 'effect/BigDecimal'

assert.deepStrictEqual(lessThan(make(2n), make(3n)), true)
assert.deepStrictEqual(lessThan(make(3n), make(3n)), false)
assert.deepStrictEqual(lessThan(make(4n), make(3n)), false)
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
import { lessThanOrEqualTo, make } from 'effect/BigDecimal'

assert.deepStrictEqual(lessThanOrEqualTo(make(2n), make(3n)), true)
assert.deepStrictEqual(lessThanOrEqualTo(make(3n), make(3n)), true)
assert.deepStrictEqual(lessThanOrEqualTo(make(4n), make(3n)), false)
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
