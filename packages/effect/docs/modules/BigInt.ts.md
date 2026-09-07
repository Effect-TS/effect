---
title: BigInt.ts
nav_order: 3
parent: Modules
---

## BigInt.ts overview

Works with JavaScript `bigint` values.

This module exposes the native `BigInt` constructor together with helpers for
checking, arithmetic, comparison, range checks, safe parsing and conversions
that return `Option`, integer square roots, aggregation, ordering,
equivalence, reducers, and combiners.

Since v2.0.0

---

## Exports Grouped by Category

- [constructors](#constructors)
  - [BigInt](#bigint)
- [converting](#converting)
  - [fromNumber](#fromnumber)
  - [fromString](#fromstring)
  - [toNumber](#tonumber)
- [guards](#guards)
  - [isBigInt](#isbigint)
- [instances](#instances)
  - [Equivalence](#equivalence)
  - [Order](#order)
- [math](#math)
  - [CombinerMax](#combinermax)
  - [CombinerMin](#combinermin)
  - [ReducerMultiply](#reducermultiply)
  - [ReducerSum](#reducersum)
  - [abs](#abs)
  - [clamp](#clamp)
  - [decrement](#decrement)
  - [divide](#divide)
  - [divideUnsafe](#divideunsafe)
  - [gcd](#gcd)
  - [increment](#increment)
  - [lcm](#lcm)
  - [max](#max)
  - [min](#min)
  - [multiply](#multiply)
  - [multiplyAll](#multiplyall)
  - [remainder](#remainder)
  - [sign](#sign)
  - [sqrt](#sqrt)
  - [sqrtUnsafe](#sqrtunsafe)
  - [subtract](#subtract)
  - [sum](#sum)
  - [sumAll](#sumall)
- [predicates](#predicates)
  - [between](#between)
  - [isGreaterThan](#isgreaterthan)
  - [isGreaterThanOrEqualTo](#isgreaterthanorequalto)
  - [isLessThan](#islessthan)
  - [isLessThanOrEqualTo](#islessthanorequalto)

---

# constructors

## BigInt

Exposes the global bigint constructor for JavaScript bigint coercion.

**When to use**

Use to access native JavaScript bigint constructor coercion from the Effect
module namespace.

**Gotchas**

This follows native `BigInt` coercion rules. It throws for invalid strings or
non-integral numbers, and whitespace-only strings coerce to `0n`.

**See**

- `fromString` for parsing strings into an `Option`
- `fromNumber` for converting safe integers into an `Option`

**Example** (Constructing bigints)

```ts import.meta.vitest
import { BigInt } from "effect"

BigInt.BigInt(123) // => 123n
BigInt.BigInt("456") // => 456n
```

**Signature**

```ts
declare const BigInt: BigIntConstructor
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L49)

Since v4.0.0

# converting

## fromNumber

Converts a number to a `bigint`.

**When to use**

Use to convert a JavaScript number to `bigint` only when it is a safe integer.

**Details**

If the number is outside the safe integer range for JavaScript
(`Number.MAX_SAFE_INTEGER` and `Number.MIN_SAFE_INTEGER`) or if the number is
not a valid `bigint`, it returns `Option.none()`.

**Example** (Converting numbers to bigints)

```ts
import { BigInt, Option } from "effect"

BigInt.fromNumber(42) // => Option.some(42n)
BigInt.fromNumber(Number.MAX_SAFE_INTEGER + 1) // => Option.none()
BigInt.fromNumber(Number.MIN_SAFE_INTEGER - 1) // => Option.none()
```

**See**

- `toNumber` for converting `bigint` values back to safe integer numbers
- `BigInt` for native constructor coercion

**Signature**

```ts
declare const fromNumber: (n: number) => Option.Option<bigint>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L889)

Since v2.4.12

## fromString

Parses a string into a `bigint` safely.

**When to use**

Use to parse a string as a `bigint` without throwing on invalid input.

**Details**

If the string is empty or contains characters that cannot be converted into a
`bigint`, it returns `Option.none()`.

**Example** (Parsing strings as bigints)

```ts
import { BigInt, Option } from "effect"

BigInt.fromString("42") // => Option.some(42n)
BigInt.fromString(" ") // => Option.none()
BigInt.fromString("a") // => Option.none()
```

**See**

- `BigInt` for native constructor coercion that throws on invalid input

**Signature**

```ts
declare const fromString: (s: string) => Option.Option<bigint>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L850)

Since v2.4.12

## toNumber

Converts a `bigint` to a `number` safely.

**When to use**

Use to convert a `bigint` to a JavaScript number only when it is a safe
integer.

**Details**

If the `bigint` is outside the safe integer range for JavaScript (`Number.MAX_SAFE_INTEGER`
and `Number.MIN_SAFE_INTEGER`), it returns `Option.none()`.

**Example** (Converting bigints to numbers)

```ts
import { BigInt as BI, Option } from "effect"

BI.toNumber(42n) // => Option.some(42)
BI.toNumber(9007199254740992n) // => Option.none()
BI.toNumber(-9007199254740992n) // => Option.none()
```

**See**

- `fromNumber` for converting a safe integer number to `bigint`

**Signature**

```ts
declare const toNumber: (b: bigint) => Option.Option<number>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L816)

Since v2.0.0

# guards

## isBigInt

Checks whether a value is a `bigint`.

**When to use**

Use to validate unknown input and narrow it to `bigint`.

**Example** (Checking for bigints)

```ts
import { BigInt } from "effect"

BigInt.isBigInt(1n) // => true
BigInt.isBigInt(1) // => false
```

**Signature**

```ts
declare const isBigInt: (u: unknown) => u is bigint
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L74)

Since v2.0.0

# instances

## Equivalence

Equivalence instance for bigints using strict equality (`===`).

**When to use**

Use when checking bigint equality through APIs that accept an equivalence
relation.

**Example** (Comparing bigints for equivalence)

```ts
import { BigInt } from "effect"

BigInt.Equivalence(1n, 1n) // => true
BigInt.Equivalence(1n, 2n) // => false
```

**Signature**

```ts
declare const Equivalence: Equ.Equivalence<bigint>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L309)

Since v2.0.0

## Order

Provides an `Order` instance for `bigint` that allows comparing and sorting BigInt values.

**When to use**

Use when you need to sort or compare bigint values through APIs that accept
an ordering instance.

**Example** (Comparing bigints with Order)

```ts
import { BigInt } from "effect"

const a = 123n
const b = 456n
const c = 123n

BigInt.Order(a, b) // => -1
BigInt.Order(b, a) // => 1
BigInt.Order(a, c) // => 0
```

**Signature**

```ts
declare const Order: order.Order<bigint>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L287)

Since v2.0.0

# math

## CombinerMax

Combiner that returns the maximum `bigint`.

**When to use**

Use to keep the largest `bigint` when an API consumes a `Combiner`.

**See**

- `CombinerMin` for keeping the smallest `bigint`
- `max` for comparing two `bigint` values directly

**Signature**

```ts
declare const CombinerMax: Combiner.Combiner<bigint>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L990)

Since v4.0.0

## CombinerMin

Combiner that returns the minimum `bigint`.

**When to use**

Use to keep the smallest `bigint` through APIs that consume a `Combiner`.

**See**

- `CombinerMax` for keeping the largest `bigint`
- `min` for comparing two `bigint` values directly

**Signature**

```ts
declare const CombinerMin: Combiner.Combiner<bigint>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L1005)

Since v4.0.0

## ReducerMultiply

Reducer for combining `bigint`s using multiplication.

**When to use**

Use to multiply many `bigint` values through APIs that consume a `Reducer`.

**Details**

The initial value is `1n`, so `combineAll([])` returns `1n`.

**See**

- `multiplyAll` for multiplying an iterable directly
- `ReducerSum` for summing `bigint` values

**Signature**

```ts
declare const ReducerMultiply: Reducer.Reducer<bigint>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L968)

Since v4.0.0

## ReducerSum

Reducer for combining `bigint`s using addition.

**When to use**

Use to sum many `bigint` values through APIs that consume a `Reducer`.

**Details**

The initial value is `0n`, so `combineAll([])` returns `0n`.

**See**

- `sumAll` for summing an iterable directly
- `ReducerMultiply` for multiplying `bigint` values

**Signature**

```ts
declare const ReducerSum: Reducer.Reducer<bigint>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L949)

Since v4.0.0

## abs

Determines the absolute value of a given `bigint`.

**When to use**

Use to remove the sign from a `bigint` while preserving its magnitude.

**Example** (Calculating absolute values)

```ts
import { BigInt } from "effect"

BigInt.abs(-5n) // => 5n
BigInt.abs(0n) // => 0n
BigInt.abs(5n) // => 5n
```

**Signature**

```ts
declare const abs: (n: bigint) => bigint
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L579)

Since v2.0.0

## clamp

Restricts the given `bigint` to be within the range specified by the `minimum` and `maximum` values.

**When to use**

Use to force a `bigint` into an inclusive range.

**Details**

If the `bigint` is less than the minimum, the function returns the minimum.
If the `bigint` is greater than the maximum, the function returns the
maximum. Otherwise, it returns the original `bigint`.

**Example** (Clamping a bigint to bounds)

```ts
import { BigInt } from "effect"

const clamp = BigInt.clamp({ minimum: 1n, maximum: 5n })

clamp(3n) // => 3n
clamp(0n) // => 1n
clamp(6n) // => 5n
```

**See**

- `between` for checking whether a `bigint` is already inside a range

**Signature**

```ts
declare const clamp: {
  (options: { minimum: bigint; maximum: bigint }): (self: bigint) => bigint
  (self: bigint, options: { minimum: bigint; maximum: bigint }): bigint
}
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L476)

Since v2.0.0

## decrement

Returns the result of subtracting `1n` from a `bigint`.

**When to use**

Use to decrement a `bigint` counter by one.

**Example** (Decrementing a bigint)

```ts
import { BigInt } from "effect"

BigInt.decrement(3n) // => 2n
```

**Signature**

```ts
declare const decrement: (n: bigint) => bigint
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L260)

Since v2.0.0

## divide

Divides one `bigint` by another safely.

**When to use**

Use to divide `bigint` values while representing division by zero as
`Option.none`.

**Details**

Uses JavaScript `bigint` division, so non-exact quotients are truncated
toward zero. Returns `Option.none()` when the divisor is `0n`.

**Example** (Dividing bigints safely)

```ts
import { BigInt, Option } from "effect"

BigInt.divide(6n, 3n) // => Option.some(2n)
BigInt.divide(6n, 0n) // => Option.none()
```

**See**

- `divideUnsafe` for division that throws when the divisor is `0n`
- `remainder` for the JavaScript remainder operation

**Signature**

```ts
declare const divide: {
  (that: bigint): (self: bigint) => Option.Option<bigint>
  (self: bigint, that: bigint): Option.Option<bigint>
}
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L178)

Since v2.0.0

## divideUnsafe

Divides one `bigint` by another, throwing if the divisor is zero.

**When to use**

Use to divide `bigint` values where the divisor is known to be non-zero and
division by zero should be a thrown exception.

**Details**

Uses JavaScript `bigint` division, so non-exact quotients are truncated
toward zero.

**Gotchas**

Throws a `RangeError` when the divisor is `0n`.

**Example** (Dividing bigints unsafely)

```ts
import { BigInt } from "effect"

BigInt.divideUnsafe(6n, 3n) // => 2n
BigInt.divideUnsafe(6n, 4n) // => 1n
```

**See**

- `divide` for division that returns `Option.none` when the divisor is `0n`

**Signature**

```ts
declare const divideUnsafe: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L217)

Since v4.0.0

## gcd

Determines the greatest common divisor of two `bigint`s.

**When to use**

Use to compute the greatest common divisor of two integer values.

**Example** (Calculating greatest common divisors)

```ts
import { BigInt } from "effect"

BigInt.gcd(2n, 3n) // => 1n
BigInt.gcd(2n, 4n) // => 2n
BigInt.gcd(16n, 24n) // => 8n
```

**See**

- `lcm` for computing the least common multiple

**Signature**

```ts
declare const gcd: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L603)

Since v2.0.0

## increment

Returns the result of adding `1n` to a `bigint`.

**When to use**

Use to increment a `bigint` counter by one.

**Example** (Incrementing a bigint)

```ts
import { BigInt } from "effect"

BigInt.increment(2n) // => 3n
```

**Signature**

```ts
declare const increment: (n: bigint) => bigint
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L240)

Since v2.0.0

## lcm

Determines the least common multiple of two `bigint`s.

**When to use**

Use to compute the least common multiple of two integer values.

**Example** (Calculating least common multiples)

```ts
import { BigInt } from "effect"

BigInt.lcm(2n, 3n) // => 6n
BigInt.lcm(2n, 4n) // => 4n
BigInt.lcm(16n, 24n) // => 48n
```

**See**

- `gcd` for computing the greatest common divisor

**Signature**

```ts
declare const lcm: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L637)

Since v2.0.0

## max

Returns the maximum between two `bigint`s.

**When to use**

Use to select the larger of two `bigint` values.

**Example** (Finding the maximum bigint)

```ts
import { BigInt } from "effect"

BigInt.max(2n, 3n) // => 3n
```

**See**

- `min` for selecting the smaller value

**Signature**

```ts
declare const max: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L532)

Since v2.0.0

## min

Returns the minimum between two `bigint`s.

**When to use**

Use to select the smaller of two `bigint` values.

**Example** (Finding the minimum bigint)

```ts
import { BigInt } from "effect"

BigInt.min(2n, 3n) // => 2n
```

**See**

- `max` for selecting the larger value

**Signature**

```ts
declare const min: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L507)

Since v2.0.0

## multiply

Provides a multiplication operation on `bigint`s.

**When to use**

Use to multiply two `bigint` values.

**Example** (Multiplying bigints)

```ts
import { BigInt } from "effect"

BigInt.multiply(2n, 3n) // => 6n
```

**See**

- `multiplyAll` for multiplying an iterable of `bigint` values

**Signature**

```ts
declare const multiply: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L122)

Since v2.0.0

## multiplyAll

Takes an `Iterable` of `bigint`s and returns their product as a single `bigint`. Returns `1n` for an empty iterable.

**When to use**

Use to multiply all `bigint` values in an iterable.

**Example** (Multiplying iterable bigints)

```ts
import { BigInt } from "effect"

BigInt.multiplyAll([2n, 3n, 4n]) // => 24n
```

**See**

- `multiply` for multiplying two `bigint` values
- `ReducerMultiply` for multiplying through APIs that consume a `Reducer`

**Signature**

```ts
declare const multiplyAll: (collection: Iterable<bigint>) => bigint
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L777)

Since v2.0.0

## remainder

Returns the JavaScript remainder of dividing one `bigint` by another.

**When to use**

Use when you want native remainder semantics, including signed remainders and
a thrown division-by-zero error.

**Gotchas**

Throws a `RangeError` when the divisor is `0n`.

**Example** (Calculating remainders)

```ts
import { BigInt } from "effect"

BigInt.remainder(10n, 3n) // => 1n
BigInt.remainder(15n, 4n) // => 3n
```

**See**

- `divide` for quotient calculation with division-by-zero represented as `Option.none`

**Signature**

```ts
declare const remainder: { (divisor: bigint): (self: bigint) => bigint; (self: bigint, divisor: bigint): bigint }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L927)

Since v4.0.0

## sign

Determines the sign of a given `bigint`.

**When to use**

Use to classify a `bigint` as negative, zero, or positive.

**Example** (Determining bigint signs)

```ts
import { BigInt } from "effect"

BigInt.sign(-5n) // => -1
BigInt.sign(0n) // => 0
BigInt.sign(5n) // => 1
```

**Signature**

```ts
declare const sign: (n: bigint) => Ordering
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L557)

Since v2.0.0

## sqrt

Computes the integer square root of a `bigint` safely.

**When to use**

Use to compute an integer square root while representing negative input as
`Option.none`.

**Details**

For non-perfect squares, returns the largest `bigint` whose square is less
than or equal to the input. Returns `Option.none()` when the input is
negative.

**Example** (Calculating square roots safely)

```ts
import { BigInt, Option } from "effect"

BigInt.sqrt(4n) // => Option.some(2n)
BigInt.sqrt(9n) // => Option.some(3n)
BigInt.sqrt(16n) // => Option.some(4n)
BigInt.sqrt(-1n) // => Option.none()
```

**See**

- `sqrtUnsafe` for square root computation that throws on negative input

**Signature**

```ts
declare const sqrt: (n: bigint) => Option.Option<bigint>
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L723)

Since v2.0.0

## sqrtUnsafe

Returns the integer square root of a non-negative `bigint`.

**When to use**

Use when you need to compute an integer square root for a `bigint` that has
already been validated as non-negative, and you want negative input to throw
instead of returning `Option.none`.

**Details**

For non-perfect squares, returns the largest `bigint` whose square is less
than or equal to the input.

**Gotchas**

Throws a `RangeError` if the input is negative.

**Example** (Calculating square roots unsafely)

```ts
import { BigInt } from "effect"

BigInt.sqrtUnsafe(4n) // => 2n
BigInt.sqrtUnsafe(9n) // => 3n
BigInt.sqrtUnsafe(16n) // => 4n
```

**See**

- `sqrt` for returning `Option.none` when the input is negative

**Signature**

```ts
declare const sqrtUnsafe: (n: bigint) => bigint
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L679)

Since v4.0.0

## subtract

Provides a subtraction operation on `bigint`s.

**When to use**

Use to subtract one `bigint` value from another.

**Example** (Subtracting bigints)

```ts
import { BigInt } from "effect"

BigInt.subtract(2n, 3n) // => -1n
```

**Signature**

```ts
declare const subtract: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L145)

Since v2.0.0

## sum

Provides an addition operation on `bigint`s.

**When to use**

Use when you need a binary addition function for piping or higher-order APIs
instead of the infix addition operator.

**Example** (Adding bigints)

```ts
import { BigInt } from "effect"

BigInt.sum(2n, 3n) // => 5n
```

**See**

- `sumAll` for summing an iterable of `bigint` values

**Signature**

```ts
declare const sum: { (that: bigint): (self: bigint) => bigint; (self: bigint, that: bigint): bigint }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L97)

Since v2.0.0

## sumAll

Takes an `Iterable` of `bigint`s and returns their sum as a single `bigint`. Returns `0n` for an empty iterable.

**When to use**

Use when you want an immediate aggregate from an iterable instead of a
folding reducer owned by another API.

**Example** (Summing iterable bigints)

```ts
import { BigInt } from "effect"

BigInt.sumAll([2n, 3n, 4n]) // => 9n
```

**See**

- `sum` for adding two `bigint` values
- `ReducerSum` for summing through APIs that consume a `Reducer`

**Signature**

```ts
declare const sumAll: (collection: Iterable<bigint>) => bigint
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L748)

Since v2.0.0

# predicates

## between

Checks whether a `bigint` is between a `minimum` and `maximum` value (inclusive).

**When to use**

Use to test whether a `bigint` falls inside an inclusive range.

**Example** (Checking whether a bigint is within bounds)

```ts
import { BigInt } from "effect"

const between = BigInt.between({ minimum: 0n, maximum: 5n })

between(3n) // => true
between(-1n) // => false
between(6n) // => false
```

**See**

- `clamp` for forcing a `bigint` into an inclusive range

**Signature**

```ts
declare const between: {
  (options: { minimum: bigint; maximum: bigint }): (self: bigint) => boolean
  (self: bigint, options: { minimum: bigint; maximum: bigint }): boolean
}
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L435)

Since v2.0.0

## isGreaterThan

Returns `true` if the first argument is greater than the second, otherwise `false`.

**When to use**

Use to test whether one `bigint` is strictly greater than another.

**Example** (Checking greater-than comparisons)

```ts
import { BigInt } from "effect"

BigInt.isGreaterThan(2n, 3n) // => false
BigInt.isGreaterThan(3n, 3n) // => false
BigInt.isGreaterThan(4n, 3n) // => true
```

**Signature**

```ts
declare const isGreaterThan: { (that: bigint): (self: bigint) => boolean; (self: bigint, that: bigint): boolean }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L381)

Since v4.0.0

## isGreaterThanOrEqualTo

Returns a function that checks if a given `bigint` is greater than or equal to the provided one.

**When to use**

Use to test whether one `bigint` is greater than or equal to another.

**Example** (Checking greater-than-or-equal comparisons)

```ts
import { BigInt } from "effect"

BigInt.isGreaterThanOrEqualTo(2n, 3n) // => false
BigInt.isGreaterThanOrEqualTo(3n, 3n) // => true
BigInt.isGreaterThanOrEqualTo(4n, 3n) // => true
```

**Signature**

```ts
declare const isGreaterThanOrEqualTo: {
  (that: bigint): (self: bigint) => boolean
  (self: bigint, that: bigint): boolean
}
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L406)

Since v4.0.0

## isLessThan

Returns `true` if the first argument is less than the second, otherwise `false`.

**When to use**

Use to test whether one `bigint` is strictly less than another.

**Example** (Checking less-than comparisons)

```ts
import { BigInt } from "effect"

BigInt.isLessThan(2n, 3n) // => true
BigInt.isLessThan(3n, 3n) // => false
BigInt.isLessThan(4n, 3n) // => false
```

**Signature**

```ts
declare const isLessThan: { (that: bigint): (self: bigint) => boolean; (self: bigint, that: bigint): boolean }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L331)

Since v4.0.0

## isLessThanOrEqualTo

Returns a function that checks if a given `bigint` is less than or equal to the provided one.

**When to use**

Use to test whether one `bigint` is less than or equal to another.

**Example** (Checking less-than-or-equal comparisons)

```ts
import { BigInt } from "effect"

BigInt.isLessThanOrEqualTo(2n, 3n) // => true
BigInt.isLessThanOrEqualTo(3n, 3n) // => true
BigInt.isLessThanOrEqualTo(4n, 3n) // => false
```

**Signature**

```ts
declare const isLessThanOrEqualTo: { (that: bigint): (self: bigint) => boolean; (self: bigint, that: bigint): boolean }
```

[Source](https://effect.website/blob/main/src/BigInt.ts#L356)

Since v4.0.0
