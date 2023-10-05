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
  - [fromNumber](#fromnumber)
  - [fromString](#fromstring)
  - [make](#make)
- [guards](#guards)
  - [isBigDecimal](#isbigdecimal)
- [instances](#instances)
  - [Equivalence](#equivalence)
  - [Order](#order)
- [math](#math)
  - [abs](#abs)
  - [divide](#divide)
  - [multiply](#multiply)
  - [sign](#sign)
  - [subtract](#subtract)
  - [sum](#sum)
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
- [utils](#utils)
  - [clamp](#clamp)
  - [max](#max)
  - [min](#min)

---

# constructors

## fromNumber

**Signature**

```ts
export declare const fromNumber: (n: number) => BigDecimal
```

Added in v2.0.0

## fromString

**Signature**

```ts
export declare const fromString: (s: string) => Either.Either<Cause.IllegalArgumentException, BigDecimal>
```

**Example**

```ts
import { fromString, make } from 'effect/BigDecimal'
import { getOrThrow } from 'effect/Either'

assert.deepStrictEqual(getOrThrow(fromString('123')), make(123n))
assert.deepStrictEqual(getOrThrow(fromString('123.456')), make(123456n, 3))
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: (value: bigint, scale?: number) => BigDecimal
```

Added in v2.0.0

# guards

## isBigDecimal

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

## divide

Provides a division operation on `BigDecimal`s.

If the dividend is not a multiple of the divisor the result will be a `BigDecimal` value
which represents the integer division rounded down to the nearest integer.

**Signature**

```ts
export declare const divide: {
  (that: BigDecimal): (self: BigDecimal) => Either.Either<Cause.IllegalArgumentException, BigDecimal>
  (self: BigDecimal, that: BigDecimal): Either.Either<Cause.IllegalArgumentException, BigDecimal>
}
```

**Example**

```ts
import { divide, make } from 'effect/BigDecimal'
import { getOrThrow } from 'effect/Either'

assert.deepStrictEqual(getOrThrow(divide(make(6n), make(3n))), make(2n))
assert.deepStrictEqual(getOrThrow(divide(make(6n), make(4n))), make(1n))
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
import { multiply, make, equals } from 'effect/BigDecimal'

assert.deepStrictEqual(multiply(make(2n), make(3n)), make(6n))
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
import { sign, make, equals } from 'effect/BigDecimal'

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

# models

## BigDecimal (interface)

**Signature**

```ts
export interface BigDecimal extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  readonly value: bigint
  readonly scale: number
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

Returns a function that checks if a given `BigDecimal` is greater than or equal to the provided one.

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

Returns a function that checks if a given `BigDecimal` is less than or equal to the provided one.

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

# utils

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
import { clamp, make, equals } from 'effect/BigDecimal'

assert.deepStrictEqual(equals(clamp(make(0n), make(5n))(make(3n)), make(3n)), true)
assert.deepStrictEqual(equals(clamp(make(0n), make(5n))(make(-1n)), make(0n)), true)
assert.deepStrictEqual(equals(clamp(make(0n), make(5n))(make(6n)), make(5n)), true)
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
