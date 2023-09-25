---
title: Number.ts
nav_order: 64
parent: Modules
---

## Number overview

This module provides utility functions and type class instances for working with the `number` type in TypeScript.
It includes functions for basic arithmetic operations, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [guards](#guards)
  - [isNumber](#isnumber)
- [instances](#instances)
  - [Equivalence](#equivalence)
  - [Order](#order)
- [math](#math)
  - [decrement](#decrement)
  - [divide](#divide)
  - [increment](#increment)
  - [multiply](#multiply)
  - [multiplyAll](#multiplyall)
  - [remainder](#remainder)
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

## isNumber

Tests if a value is a `number`.

**Signature**

```ts
export declare const isNumber: (input: unknown) => input is number
```

**Example**

```ts
import { isNumber } from 'effect/Number'

assert.deepStrictEqual(isNumber(2), true)
assert.deepStrictEqual(isNumber('2'), false)
```

Added in v1.0.0

# instances

## Equivalence

**Signature**

```ts
export declare const Equivalence: equivalence.Equivalence<number>
```

Added in v1.0.0

## Order

**Signature**

```ts
export declare const Order: order.Order<number>
```

Added in v1.0.0

# math

## decrement

Decrements a number by `1`.

**Signature**

```ts
export declare const decrement: (n: number) => number
```

**Example**

```ts
import { decrement } from 'effect/Number'

assert.deepStrictEqual(decrement(3), 2)
```

Added in v1.0.0

## divide

Provides a division operation on `number`s.

**Signature**

```ts
export declare const divide: { (that: number): (self: number) => number; (self: number, that: number): number }
```

**Example**

```ts
import { divide } from 'effect/Number'

assert.deepStrictEqual(divide(6, 3), 2)
```

Added in v1.0.0

## increment

Returns the result of adding `1` to a given number.

**Signature**

```ts
export declare const increment: (n: number) => number
```

**Example**

```ts
import { increment } from 'effect/Number'

assert.deepStrictEqual(increment(2), 3)
```

Added in v1.0.0

## multiply

Provides a multiplication operation on `number`s.

**Signature**

```ts
export declare const multiply: { (that: number): (self: number) => number; (self: number, that: number): number }
```

**Example**

```ts
import { multiply } from 'effect/Number'

assert.deepStrictEqual(multiply(2, 3), 6)
```

Added in v1.0.0

## multiplyAll

Takes an `Iterable` of `number`s and returns their multiplication as a single `number`.

**Signature**

```ts
export declare const multiplyAll: (collection: Iterable<number>) => number
```

**Example**

```ts
import { multiplyAll } from 'effect/Number'

assert.deepStrictEqual(multiplyAll([2, 3, 4]), 24)
```

Added in v1.0.0

## remainder

Returns the remainder left over when one operand is divided by a second operand.

It always takes the sign of the dividend.

**Signature**

```ts
export declare const remainder: { (divisor: number): (self: number) => number; (self: number, divisor: number): number }
```

**Example**

```ts
import { remainder } from 'effect/Number'

assert.deepStrictEqual(remainder(2, 2), 0)
assert.deepStrictEqual(remainder(3, 2), 1)
assert.deepStrictEqual(remainder(-4, 2), -0)
```

Added in v1.0.0

## sign

Determines the sign of a given `number`.

**Signature**

```ts
export declare const sign: (n: number) => Ordering
```

**Example**

```ts
import { sign } from 'effect/Number'

assert.deepStrictEqual(sign(-5), -1)
assert.deepStrictEqual(sign(0), 0)
assert.deepStrictEqual(sign(5), 1)
```

Added in v1.0.0

## subtract

Provides a subtraction operation on `number`s.

**Signature**

```ts
export declare const subtract: { (that: number): (self: number) => number; (self: number, that: number): number }
```

**Example**

```ts
import { subtract } from 'effect/Number'

assert.deepStrictEqual(subtract(2, 3), -1)
```

Added in v1.0.0

## sum

Provides an addition operation on `number`s.

**Signature**

```ts
export declare const sum: { (that: number): (self: number) => number; (self: number, that: number): number }
```

**Example**

```ts
import { sum } from 'effect/Number'

assert.deepStrictEqual(sum(2, 3), 5)
```

Added in v1.0.0

## sumAll

Takes an `Iterable` of `number`s and returns their sum as a single `number`.

**Signature**

```ts
export declare const sumAll: (collection: Iterable<number>) => number
```

**Example**

```ts
import { sumAll } from 'effect/Number'

assert.deepStrictEqual(sumAll([2, 3, 4]), 9)
```

Added in v1.0.0

# predicates

## between

Checks if a `number` is between a `minimum` and `maximum` value (inclusive).

**Signature**

```ts
export declare const between: {
  (minimum: number, maximum: number): (self: number) => boolean
  (self: number, minimum: number, maximum: number): boolean
}
```

**Example**

```ts
import { between } from 'effect/Number'

assert.deepStrictEqual(between(0, 5)(3), true)
assert.deepStrictEqual(between(0, 5)(-1), false)
assert.deepStrictEqual(between(0, 5)(6), false)
```

Added in v1.0.0

## greaterThan

Returns `true` if the first argument is greater than the second, otherwise `false`.

**Signature**

```ts
export declare const greaterThan: { (that: number): (self: number) => boolean; (self: number, that: number): boolean }
```

**Example**

```ts
import { greaterThan } from 'effect/Number'

assert.deepStrictEqual(greaterThan(2, 3), false)
assert.deepStrictEqual(greaterThan(3, 3), false)
assert.deepStrictEqual(greaterThan(4, 3), true)
```

Added in v1.0.0

## greaterThanOrEqualTo

Returns a function that checks if a given `number` is greater than or equal to the provided one.

**Signature**

```ts
export declare const greaterThanOrEqualTo: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
}
```

**Example**

```ts
import { greaterThanOrEqualTo } from 'effect/Number'

assert.deepStrictEqual(greaterThanOrEqualTo(2, 3), false)
assert.deepStrictEqual(greaterThanOrEqualTo(3, 3), true)
assert.deepStrictEqual(greaterThanOrEqualTo(4, 3), true)
```

Added in v1.0.0

## lessThan

Returns `true` if the first argument is less than the second, otherwise `false`.

**Signature**

```ts
export declare const lessThan: { (that: number): (self: number) => boolean; (self: number, that: number): boolean }
```

**Example**

```ts
import { lessThan } from 'effect/Number'

assert.deepStrictEqual(lessThan(2, 3), true)
assert.deepStrictEqual(lessThan(3, 3), false)
assert.deepStrictEqual(lessThan(4, 3), false)
```

Added in v1.0.0

## lessThanOrEqualTo

Returns a function that checks if a given `number` is less than or equal to the provided one.

**Signature**

```ts
export declare const lessThanOrEqualTo: {
  (that: number): (self: number) => boolean
  (self: number, that: number): boolean
}
```

**Example**

```ts
import { lessThanOrEqualTo } from 'effect/Number'

assert.deepStrictEqual(lessThanOrEqualTo(2, 3), true)
assert.deepStrictEqual(lessThanOrEqualTo(3, 3), true)
assert.deepStrictEqual(lessThanOrEqualTo(4, 3), false)
```

Added in v1.0.0

# utils

## clamp

Restricts the given `number` to be within the range specified by the `minimum` and `maximum` values.

- If the `number` is less than the `minimum` value, the function returns the `minimum` value.
- If the `number` is greater than the `maximum` value, the function returns the `maximum` value.
- Otherwise, it returns the original `number`.

**Signature**

```ts
export declare const clamp: {
  (minimum: number, maximum: number): (self: number) => number
  (self: number, minimum: number, maximum: number): number
}
```

**Example**

```ts
import { clamp } from 'effect/Number'

assert.deepStrictEqual(clamp(0, 5)(3), 3)
assert.deepStrictEqual(clamp(0, 5)(-1), 0)
assert.deepStrictEqual(clamp(0, 5)(6), 5)
```

Added in v1.0.0

## max

Returns the maximum between two `number`s.

**Signature**

```ts
export declare const max: { (that: number): (self: number) => number; (self: number, that: number): number }
```

**Example**

```ts
import { max } from 'effect/Number'

assert.deepStrictEqual(max(2, 3), 3)
```

Added in v1.0.0

## min

Returns the minimum between two `number`s.

**Signature**

```ts
export declare const min: { (that: number): (self: number) => number; (self: number, that: number): number }
```

**Example**

```ts
import { min } from 'effect/Number'

assert.deepStrictEqual(min(2, 3), 2)
```

Added in v1.0.0
