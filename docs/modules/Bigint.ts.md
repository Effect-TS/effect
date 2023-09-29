---
title: Bigint.ts
nav_order: 1
parent: Modules
---

## Bigint overview

This module provides utility functions and type class instances for working with the `bigint` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [guards](#guards)
  - [isBigint](#isbigint)
- [instances](#instances)
  - [Equivalence](#equivalence)
  - [Order](#order)
- [math](#math)
  - [decrement](#decrement)
  - [divide](#divide)
  - [increment](#increment)
  - [multiply](#multiply)
  - [multiplyAll](#multiplyall)
  - [sign](#sign)
  - [subtract](#subtract)
  - [sum](#sum)
  - [sumAll](#sumall)
- [predicates](#predicates)
  - [between](#between)
  - [greaterThan](#greaterthan)
  - [greaterThanOrEqualTo](#greaterthanorequalto)
  - [lessThan](#lessthan)
  - [lessThanOrEqualTo](#lessthanorequalto)
- [utils](#utils)
  - [clamp](#clamp)
  - [max](#max)
  - [min](#min)

---

# guards

## isBigint

Tests if a value is a `bigint`.

**Signature**

```ts
export declare const isBigint: (u: unknown) => u is bigint
```

**Example**

```ts
import { isBigint } from 'effect/Bigint'

assert.deepStrictEqual(isBigint(1n), true)
assert.deepStrictEqual(isBigint(1), false)
```

Added in v2.0.0

# instances

## Equivalence

**Signature**

```ts
export declare const Equivalence: equivalence.Equivalence<bigint>
```

Added in v2.0.0

## Order

**Signature**

```ts
export declare const Order: order.Order<bigint>
```

Added in v2.0.0

# math

## decrement

Decrements a number by `1n`.

**Signature**

```ts
export declare const decrement: (n: bigint) => bigint
```

**Example**

```ts
import { decrement } from 'effect/Bigint'

assert.deepStrictEqual(decrement(3n), 2n)
```

Added in v2.0.0

## divide

Provides a division operation on `bigint`s.

If the dividend is not a multiple of the divisor the result will be a `bigint` value
which represents the integer division rounded down to the nearest integer.

**Signature**

```ts
export declare const divide: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

**Example**

```ts
import { divide } from 'effect/Bigint'

assert.deepStrictEqual(divide(6n, 3n), 2n)
assert.deepStrictEqual(divide(6n, 4n), 1n)
```

Added in v2.0.0

## increment

Returns the result of adding `1n` to a given number.

**Signature**

```ts
export declare const increment: (n: bigint) => bigint
```

**Example**

```ts
import { increment } from 'effect/Bigint'

assert.deepStrictEqual(increment(2n), 3n)
```

Added in v2.0.0

## multiply

Provides a multiplication operation on `bigint`s.

**Signature**

```ts
export declare const multiply: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

**Example**

```ts
import { multiply } from 'effect/Bigint'

assert.deepStrictEqual(multiply(2n, 3n), 6n)
```

Added in v2.0.0

## multiplyAll

Takes an `Iterable` of `bigint`s and returns their multiplication as a single `number`.

**Signature**

```ts
export declare const multiplyAll: (collection: Iterable<bigint>) => bigint
```

**Example**

```ts
import { multiplyAll } from 'effect/Bigint'

assert.deepStrictEqual(multiplyAll([2n, 3n, 4n]), 24n)
```

Added in v2.0.0

## sign

Determines the sign of a given `bigint`.

**Signature**

```ts
export declare const sign: (n: bigint) => Ordering
```

**Example**

```ts
import { sign } from 'effect/Bigint'

assert.deepStrictEqual(sign(-5n), -1)
assert.deepStrictEqual(sign(0n), 0)
assert.deepStrictEqual(sign(5n), 1)
```

Added in v2.0.0

## subtract

Provides a subtraction operation on `bigint`s.

**Signature**

```ts
export declare const subtract: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

**Example**

```ts
import { subtract } from 'effect/Bigint'

assert.deepStrictEqual(subtract(2n, 3n), -1n)
```

Added in v2.0.0

## sum

Provides an addition operation on `bigint`s.

**Signature**

```ts
export declare const sum: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

**Example**

```ts
import { sum } from 'effect/Bigint'

assert.deepStrictEqual(sum(2n, 3n), 5n)
```

Added in v2.0.0

## sumAll

Takes an `Iterable` of `bigint`s and returns their sum as a single `bigint

**Signature**

```ts
export declare const sumAll: (collection: Iterable<bigint>) => bigint
```

**Example**

```ts
import { sumAll } from 'effect/Bigint'

assert.deepStrictEqual(sumAll([2n, 3n, 4n]), 9n)
```

Added in v2.0.0

# predicates

## between

Checks if a `bigint` is between a `minimum` and `maximum` value (inclusive).

**Signature**

```ts
export declare const between: {
  (minimum: bigint, maximum: bigint): (self: bigint) => boolean
  (self: bigint, minimum: bigint, maximum: bigint): boolean
}
```

**Example**

```ts
import { between } from 'effect/Bigint'

assert.deepStrictEqual(between(0n, 5n)(3n), true)
assert.deepStrictEqual(between(0n, 5n)(-1n), false)
assert.deepStrictEqual(between(0n, 5n)(6n), false)
```

Added in v2.0.0

## greaterThan

Returns `true` if the first argument is greater than the second, otherwise `false`.

**Signature**

```ts
export declare const greaterThan: { (that: bigint): (self: bigint) => boolean; (self: bigint, that: bigint): boolean }
```

**Example**

```ts
import { greaterThan } from 'effect/Bigint'

assert.deepStrictEqual(greaterThan(2n, 3n), false)
assert.deepStrictEqual(greaterThan(3n, 3n), false)
assert.deepStrictEqual(greaterThan(4n, 3n), true)
```

Added in v2.0.0

## greaterThanOrEqualTo

Returns a function that checks if a given `bigint` is greater than or equal to the provided one.

**Signature**

```ts
export declare const greaterThanOrEqualTo: {
  (that: bigint): (self: bigint) => boolean
  (self: bigint, that: bigint): boolean
}
```

**Example**

```ts
import { greaterThanOrEqualTo } from 'effect/Bigint'

assert.deepStrictEqual(greaterThanOrEqualTo(2n, 3n), false)
assert.deepStrictEqual(greaterThanOrEqualTo(3n, 3n), true)
assert.deepStrictEqual(greaterThanOrEqualTo(4n, 3n), true)
```

Added in v2.0.0

## lessThan

Returns `true` if the first argument is less than the second, otherwise `false`.

**Signature**

```ts
export declare const lessThan: { (that: bigint): (self: bigint) => boolean; (self: bigint, that: bigint): boolean }
```

**Example**

```ts
import { lessThan } from 'effect/Bigint'

assert.deepStrictEqual(lessThan(2n, 3n), true)
assert.deepStrictEqual(lessThan(3n, 3n), false)
assert.deepStrictEqual(lessThan(4n, 3n), false)
```

Added in v2.0.0

## lessThanOrEqualTo

Returns a function that checks if a given `bigint` is less than or equal to the provided one.

**Signature**

```ts
export declare const lessThanOrEqualTo: {
  (that: bigint): (self: bigint) => boolean
  (self: bigint, that: bigint): boolean
}
```

**Example**

```ts
import { lessThanOrEqualTo } from 'effect/Bigint'

assert.deepStrictEqual(lessThanOrEqualTo(2n, 3n), true)
assert.deepStrictEqual(lessThanOrEqualTo(3n, 3n), true)
assert.deepStrictEqual(lessThanOrEqualTo(4n, 3n), false)
```

Added in v2.0.0

# utils

## clamp

Restricts the given `bigint` to be within the range specified by the `minimum` and `maximum` values.

- If the `bigint` is less than the `minimum` value, the function returns the `minimum` value.
- If the `bigint` is greater than the `maximum` value, the function returns the `maximum` value.
- Otherwise, it returns the original `bigint`.

**Signature**

```ts
export declare const clamp: {
  (minimum: bigint, maximum: bigint): (self: bigint) => bigint
  (self: bigint, minimum: bigint, maximum: bigint): bigint
}
```

**Example**

```ts
import { clamp } from 'effect/Bigint'

assert.deepStrictEqual(clamp(0n, 5n)(3n), 3n)
assert.deepStrictEqual(clamp(0n, 5n)(-1n), 0n)
assert.deepStrictEqual(clamp(0n, 5n)(6n), 5n)
```

Added in v2.0.0

## max

Returns the maximum between two `bigint`s.

**Signature**

```ts
export declare const max: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

**Example**

```ts
import { max } from 'effect/Bigint'

assert.deepStrictEqual(max(2n, 3n), 3n)
```

Added in v2.0.0

## min

Returns the minimum between two `bigint`s.

**Signature**

```ts
export declare const min: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

**Example**

```ts
import { min } from 'effect/Bigint'

assert.deepStrictEqual(min(2n, 3n), 2n)
```

Added in v2.0.0
