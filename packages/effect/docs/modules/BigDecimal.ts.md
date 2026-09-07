---
title: BigDecimal.ts
nav_order: 2
parent: Modules
---

## BigDecimal.ts overview

Decimal numbers and arithmetic for cases where JavaScript `number` rounding
is not precise enough. A `BigDecimal` stores digits as a `bigint` plus a
decimal scale, which lets the module parse, compare, add, subtract, multiply,
divide, round, and format decimal values such as money, quantities, and
measurements.

Since v2.0.0

---

## Exports Grouped by Category

- [constructors](#constructors)
  - [fromBigInt](#frombigint)
  - [fromNumber](#fromnumber)
  - [fromNumberUnsafe](#fromnumberunsafe)
  - [fromString](#fromstring)
  - [fromStringUnsafe](#fromstringunsafe)
  - [make](#make)
- [converting](#converting)
  - [format](#format)
  - [toExponential](#toexponential)
  - [toNumberUnsafe](#tonumberunsafe)
- [guards](#guards)
  - [isBigDecimal](#isbigdecimal)
- [instances](#instances)
  - [Equivalence](#equivalence)
  - [Order](#order)
- [math](#math)
  - [RoundingMode (type alias)](#roundingmode-type-alias)
  - [abs](#abs)
  - [ceil](#ceil)
  - [clamp](#clamp)
  - [divide](#divide)
  - [divideUnsafe](#divideunsafe)
  - [floor](#floor)
  - [max](#max)
  - [min](#min)
  - [multiply](#multiply)
  - [multiplyAll](#multiplyall)
  - [negate](#negate)
  - [remainder](#remainder)
  - [remainderUnsafe](#remainderunsafe)
  - [round](#round)
  - [sign](#sign)
  - [subtract](#subtract)
  - [sum](#sum)
  - [sumAll](#sumall)
  - [truncate](#truncate)
- [models](#models)
  - [BigDecimal (interface)](#bigdecimal-interface)
- [predicates](#predicates)
  - [between](#between)
  - [equals](#equals)
  - [isGreaterThan](#isgreaterthan)
  - [isGreaterThanOrEqualTo](#isgreaterthanorequalto)
  - [isInteger](#isinteger)
  - [isLessThan](#islessthan)
  - [isLessThanOrEqualTo](#islessthanorequalto)
  - [isNegative](#isnegative)
  - [isPositive](#ispositive)
  - [isZero](#iszero)
- [scaling](#scaling)
  - [normalize](#normalize)
  - [scale](#scale)

---

# constructors

## fromBigInt

Creates a `BigDecimal` from a `bigint` value.

**When to use**

Use to construct an integer `BigDecimal` from a `bigint`.

**Example** (Creating decimals from bigint)

```ts
import { BigDecimal } from "effect"

const decimal = BigDecimal.fromBigInt(123n)
decimal // => BigDecimal.fromStringUnsafe("123")

const largeBigInt = BigDecimal.fromBigInt(9007199254740991n)
largeBigInt // => BigDecimal.fromStringUnsafe("9007199254740991")
```

**See**

- `make` for constructing a decimal with an explicit scale

**Signature**

```ts
declare const fromBigInt: (n: bigint) => BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1191)

Since v2.0.0

## fromNumber

Creates a `BigDecimal` safely from a finite `number`.

**When to use**

Use to convert a finite JavaScript number to a `BigDecimal` without throwing
on invalid input.

**Details**

Returns `Option.none()` for `NaN`, `+Infinity` or `-Infinity`.

**Gotchas**

It is not recommended to convert a floating point number to a decimal
directly, as the floating point representation may be unexpected.

**Example** (Creating decimals from numbers safely)

```ts
import { BigDecimal, Option } from "effect"

BigDecimal.fromNumber(123.456) // => Option.some(BigDecimal.fromStringUnsafe("123.456"))
BigDecimal.fromNumber(Infinity) // => Option.none()
```

**See**

- `fromNumberUnsafe` for throwing when the number is not finite
- `fromString` for parsing decimal strings directly

**Signature**

```ts
declare const fromNumber: (n: number) => Option.Option<BigDecimal>
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1257)

Since v2.0.0

## fromNumberUnsafe

Creates a `BigDecimal` from a finite `number`.

**When to use**

Use when you need to convert a trusted finite JavaScript number to a
`BigDecimal` and want a plain result instead of an `Option`.

**Gotchas**

It is not recommended to convert a floating point number to a decimal
directly, as the floating point representation may be unexpected. Throws a
`RangeError` if the number is not finite (`NaN`, `+Infinity` or `-Infinity`).

**Example** (Creating decimals from finite numbers)

```ts
import { BigDecimal } from "effect"

BigDecimal.fromNumberUnsafe(123) // => BigDecimal.fromBigInt(123n)
BigDecimal.fromNumberUnsafe(123.456) // => BigDecimal.fromStringUnsafe("123.456")
```

**See**

- `fromNumber` for returning `Option.none` when the number is not finite

**Signature**

```ts
declare const fromNumberUnsafe: (n: number) => BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1221)

Since v4.0.0

## fromString

Parses a decimal string into a `BigDecimal` safely.

**When to use**

Use to parse external decimal text without throwing on invalid input.

**Details**

Returns `Option.some` for valid decimal or exponent notation and
`Option.none` when the string cannot be parsed or would produce an unsafe
scale. The empty string parses as zero.

**Example** (Parsing decimal strings safely)

```ts
import { BigDecimal, Option } from "effect"

BigDecimal.fromString("123.456") // => Option.some(BigDecimal.make(123456n, 3))
BigDecimal.fromString("123.abc") // => Option.none()
```

**See**

- `fromStringUnsafe` for parsing that throws on invalid input
- `fromNumber` for converting finite JavaScript numbers

**Signature**

```ts
declare const fromString: (s: string) => Option.Option<BigDecimal>
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1299)

Since v2.0.0

## fromStringUnsafe

Parses a decimal string into a `BigDecimal`, throwing if the string is
invalid.

**When to use**

Use when you expect decimal text to be valid and want parse errors to throw.

**Details**

Accepts the same syntax as `fromString`. Use `fromString` when invalid input
should be represented as `Option.none` instead of throwing.

**Example** (Parsing decimal strings unsafely)

```ts
import { BigDecimal } from "effect"

BigDecimal.fromStringUnsafe("123") // => BigDecimal.fromBigInt(123n)
BigDecimal.fromStringUnsafe("123.456") // => BigDecimal.make(123456n, 3)
```

**See**

- `fromString` for returning `Option.none` on invalid input

**Signature**

```ts
declare const fromStringUnsafe: (s: string) => BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1371)

Since v4.0.0

## make

Creates a `BigDecimal` from a `bigint` value and a safe integer scale.

**When to use**

Use to construct a decimal directly from its unscaled integer value and
decimal scale.

**Gotchas**

Throws a `RangeError` if `scale` is not a safe integer.

**Example** (Creating decimals from bigint and scale)

```ts
import { BigDecimal } from "effect"

// Create 123.45 (12345 with scale 2)
const decimal = BigDecimal.make(12345n, 2)
decimal // => BigDecimal.fromStringUnsafe("123.45")

// Create 42 (42 with scale 0)
const integer = BigDecimal.make(42n, 0)
integer // => BigDecimal.fromBigInt(42n)
```

**See**

- `fromBigInt` for constructing an integer decimal from a `bigint`

**Signature**

```ts
declare const make: (value: bigint, scale: number) => BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L139)

Since v2.0.0

# converting

## format

Formats a `BigDecimal` as a string.

**When to use**

Use to render a `BigDecimal` as plain decimal text when possible.

**Details**

The value is normalized before formatting. Scientific notation is used when
the absolute value of the normalized scale is at least `16`; otherwise plain
decimal notation is used.

**Example** (Formatting decimals)

```ts
import { BigDecimal } from "effect"

BigDecimal.format(BigDecimal.fromStringUnsafe("-5")) // => "-5"
BigDecimal.format(BigDecimal.fromStringUnsafe("123.456")) // => "123.456"
BigDecimal.format(BigDecimal.fromStringUnsafe("-0.00000123")) // => "-0.00000123"
```

**See**

- `toExponential` for always rendering scientific notation

**Signature**

```ts
declare const format: (n: BigDecimal) => string
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1403)

Since v2.0.0

## toExponential

Formats a given `BigDecimal` as a `string` in scientific notation.

**When to use**

Use to render a `BigDecimal` in scientific notation.

**Example** (Formatting decimals exponentially)

```ts
import { BigDecimal } from "effect"

BigDecimal.toExponential(BigDecimal.make(123456n, -5)) // => "1.23456e+10"
```

**See**

- `format` for plain decimal formatting when possible

**Signature**

```ts
declare const toExponential: (n: BigDecimal) => string
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1454)

Since v3.11.0

## toNumberUnsafe

Converts a `BigDecimal` to a JavaScript `number`.

**When to use**

Use when you need a JavaScript number at an interop boundary where precision
loss is acceptable.

**Gotchas**

This conversion is unsafe because the result can lose integer or fractional
precision, round to a nearby representable value, or become `Infinity` when
the decimal cannot be represented as a finite JavaScript `number`.

**Example** (Converting decimals to numbers)

```ts
import { BigDecimal } from "effect"

BigDecimal.toNumberUnsafe(BigDecimal.fromStringUnsafe("123.456")) // => 123.456
```

**See**

- `format` for preserving decimal precision as text

**Signature**

```ts
declare const toNumberUnsafe: (n: BigDecimal) => number
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1500)

Since v4.0.0

# guards

## isBigDecimal

Checks whether a given value is a `BigDecimal`.

**When to use**

Use to validate unknown input and narrow it to `BigDecimal`.

**Example** (Checking BigDecimal values)

```ts
import { BigDecimal } from "effect"

const decimal = BigDecimal.fromNumber(123.45)
BigDecimal.isBigDecimal(decimal) // => false
BigDecimal.isBigDecimal(BigDecimal.fromStringUnsafe("123.45")) // => true
BigDecimal.isBigDecimal(123.45) // => false
BigDecimal.isBigDecimal("123.45") // => false
```

**Signature**

```ts
declare const isBigDecimal: (u: unknown) => u is BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L106)

Since v2.0.0

# instances

## Equivalence

Provides an `Equivalence` instance for `BigDecimal` that determines equality between BigDecimal values.

**When to use**

Use when comparing decimal values through APIs that accept an equivalence
relation.

**Example** (Checking decimal equivalence)

```ts
import { BigDecimal } from "effect"

const a = BigDecimal.fromStringUnsafe("1.50")
const b = BigDecimal.fromStringUnsafe("1.5")
const c = BigDecimal.fromStringUnsafe("2.0")

BigDecimal.Equivalence(a, b) // => true
BigDecimal.Equivalence(a, c) // => false
```

**Signature**

```ts
declare const Equivalence: Equ.Equivalence<BigDecimal>
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1135)

Since v2.0.0

## Order

Provides an `Order` instance for `BigDecimal` that allows comparing and sorting BigDecimal values.

**When to use**

Use when you need to sort or compare decimal values through APIs that accept
an ordering instance.

**Example** (Comparing decimals)

```ts
import { BigDecimal } from "effect"

const a = BigDecimal.fromNumberUnsafe(1.5)
const b = BigDecimal.fromNumberUnsafe(2.3)
const c = BigDecimal.fromNumberUnsafe(1.5)

BigDecimal.Order(a, b) // => -1
BigDecimal.Order(b, a) // => 1
BigDecimal.Order(a, c) // => 0
```

**Signature**

```ts
declare const Order: order.Order<BigDecimal>
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L705)

Since v2.0.0

# math

## RoundingMode (type alias)

Rounding modes for `BigDecimal`.

**When to use**

Use with `round` to choose how discarded digits affect a `BigDecimal`
rounded to a target scale.

**Details**

- `ceil`: round towards positive infinity
- `floor`: round towards negative infinity
- `to-zero`: round towards zero
- `from-zero`: round away from zero
- `half-ceil`: round to the nearest neighbor; if equidistant round towards positive infinity
- `half-floor`: round to the nearest neighbor; if equidistant round towards negative infinity
- `half-to-zero`: round to the nearest neighbor; if equidistant round towards zero
- `half-from-zero`: round to the nearest neighbor; if equidistant round away from zero
- `half-even`: round to the nearest neighbor; if equidistant round to the neighbor with an even digit
- `half-odd`: round to the nearest neighbor; if equidistant round to the neighbor with an odd digit

**See**

- `round` for configurable rounding with a `RoundingMode`
- `ceil` for fixed rounding toward positive infinity
- `floor` for fixed rounding toward negative infinity
- `truncate` for fixed rounding toward zero

**Signature**

```ts
type RoundingMode =
  | "ceil"
  | "floor"
  | "to-zero"
  | "from-zero"
  | "half-ceil"
  | "half-floor"
  | "half-to-zero"
  | "half-from-zero"
  | "half-even"
  | "half-odd"
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1620)

Since v3.16.0

## abs

Determines the absolute value of a given `BigDecimal`.

**When to use**

Use to remove the sign from a `BigDecimal` while preserving its magnitude.

**Example** (Calculating absolute values)

```ts
import { BigDecimal } from "effect"

BigDecimal.abs(BigDecimal.fromStringUnsafe("-5")) // => BigDecimal.fromBigInt(5n)
BigDecimal.abs(BigDecimal.fromStringUnsafe("0")) // => BigDecimal.fromBigInt(0n)
BigDecimal.abs(BigDecimal.fromStringUnsafe("5")) // => BigDecimal.fromBigInt(5n)
```

**Signature**

```ts
declare const abs: (n: BigDecimal) => BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1003)

Since v2.0.0

## ceil

Computes the ceiling of a `BigDecimal` at the given scale.

**When to use**

Use to round a decimal toward positive infinity at a requested scale.

**Details**

The default scale is `0`. Positive scales keep digits to the right of the
decimal point, and negative scales round positions to the left of the decimal
point.

**See**

- `floor` for rounding toward negative infinity
- `truncate` for rounding toward zero
- `round` for configurable rounding modes

**Example** (Rounding decimals up)

```ts import.meta.vitest
import { BigDecimal } from "effect"

BigDecimal.ceil(BigDecimal.fromStringUnsafe("145"), -1) // => BigDecimal.fromBigInt(150n)
BigDecimal.ceil(BigDecimal.fromStringUnsafe("-14.5")) // => BigDecimal.fromBigInt(-14n)
```

**Signature**

```ts
declare const ceil: {
  (scale: number): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, scale?: number): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1774)

Since v3.16.0

## clamp

Restricts the given `BigDecimal` to be within the range specified by the `minimum` and `maximum` values.

**When to use**

Use to force a `BigDecimal` into an inclusive range.

**Details**

If the `BigDecimal` is less than the `minimum` value, the function returns
the `minimum` value. If it is greater than the `maximum` value, the function
returns the `maximum` value. Otherwise, it returns the original `BigDecimal`.

**Example** (Clamping decimals to a range)

```ts
import { BigDecimal } from "effect"

const clamp = BigDecimal.clamp({
  minimum: BigDecimal.fromStringUnsafe("1"),
  maximum: BigDecimal.fromStringUnsafe("5")
})

clamp(BigDecimal.fromStringUnsafe("3")) // => BigDecimal.fromBigInt(3n)
clamp(BigDecimal.fromStringUnsafe("0")) // => BigDecimal.fromBigInt(1n)
clamp(BigDecimal.fromStringUnsafe("6")) // => BigDecimal.fromBigInt(5n)
```

**See**

- `between` for checking whether a `BigDecimal` is already inside a range

**Signature**

```ts
declare const clamp: {
  (options: { minimum: BigDecimal; maximum: BigDecimal }): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, options: { minimum: BigDecimal; maximum: BigDecimal }): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L894)

Since v2.0.0

## divide

Divides `BigDecimal`s safely.

**When to use**

Use to divide `BigDecimal` values while representing division by zero as
`Option.none`.

**Details**

If the dividend is not a multiple of the divisor, the result will be a `BigDecimal` value
with up to the default division precision. If the divisor is `0`, the result
will be `Option.none()`.

**Example** (Dividing decimals safely)

```ts
import { BigDecimal, Option } from "effect"

const six = BigDecimal.fromBigInt(6n)

BigDecimal.divide(six, BigDecimal.fromBigInt(3n)) // => Option.some(BigDecimal.fromBigInt(2n))
BigDecimal.divide(six, BigDecimal.fromBigInt(4n)) // => Option.some(BigDecimal.fromStringUnsafe("1.5"))
BigDecimal.divide(six, BigDecimal.fromBigInt(0n)) // => Option.none()
```

**See**

- `divideUnsafe` for division that throws when the divisor is zero
- `remainder` for the decimal remainder operation

**Signature**

```ts
declare const divide: {
  (that: BigDecimal): (self: BigDecimal) => Option.Option<BigDecimal>
  (self: BigDecimal, that: BigDecimal): Option.Option<BigDecimal>
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L570)

Since v2.0.0

## divideUnsafe

Provides an unsafe division operation on `BigDecimal`s.

**When to use**

Use when you need to divide `BigDecimal` values where the divisor is known
to be non-zero, so division by zero should be a thrown exception.

**Details**

If the dividend is not a multiple of the divisor, the result will be a `BigDecimal` value
with up to the default division precision.

**Gotchas**

Throws a `RangeError` if the divisor is `0`.

**Example** (Dividing decimals unsafely)

```ts
import { BigDecimal } from "effect"

BigDecimal.divideUnsafe(BigDecimal.fromStringUnsafe("6"), BigDecimal.fromStringUnsafe("3")) // => BigDecimal.fromBigInt(2n)
BigDecimal.divideUnsafe(BigDecimal.fromStringUnsafe("6"), BigDecimal.fromStringUnsafe("4")) // => BigDecimal.fromStringUnsafe("1.5")
```

**See**

- `divide` for division that returns `Option.none` when the divisor is zero

**Signature**

```ts
declare const divideUnsafe: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L621)

Since v4.0.0

## floor

Computes the floor of a `BigDecimal` at the given scale.

**When to use**

Use to round a decimal toward negative infinity at a requested scale.

**Example** (Rounding decimals down)

```ts
import { BigDecimal } from "effect"

BigDecimal.floor(BigDecimal.fromStringUnsafe("145"), -1) // => BigDecimal.fromBigInt(140n)
BigDecimal.floor(BigDecimal.fromStringUnsafe("-14.5")) // => BigDecimal.fromBigInt(-15n)
```

**See**

- `ceil` for rounding toward positive infinity
- `truncate` for rounding toward zero
- `round` for configurable rounding modes

**Signature**

```ts
declare const floor: {
  (scale: number): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, scale?: number): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1829)

Since v3.16.0

## max

Returns the maximum between two `BigDecimal`s.

**When to use**

Use to select the larger of two `BigDecimal` values.

**Example** (Selecting the larger decimal)

```ts
import { BigDecimal } from "effect"

const result = BigDecimal.max(BigDecimal.fromStringUnsafe("2"), BigDecimal.fromStringUnsafe("3")) // => BigDecimal.fromBigInt(3n)
```

**See**

- `min` for selecting the smaller value

**Signature**

```ts
declare const max: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L956)

Since v2.0.0

## min

Returns the minimum between two `BigDecimal`s.

**When to use**

Use to select the smaller of two `BigDecimal` values.

**Example** (Selecting the smaller decimal)

```ts
import { BigDecimal } from "effect"

const result = BigDecimal.min(BigDecimal.fromStringUnsafe("2"), BigDecimal.fromStringUnsafe("3")) // => BigDecimal.fromBigInt(2n)
```

**See**

- `max` for selecting the larger value

**Signature**

```ts
declare const min: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L928)

Since v2.0.0

## multiply

Provides a multiplication operation on `BigDecimal`s.

**When to use**

Use to multiply two `BigDecimal` values.

**Example** (Multiplying decimals)

```ts
import { BigDecimal } from "effect"

const result = BigDecimal.multiply(BigDecimal.fromStringUnsafe("2"), BigDecimal.fromStringUnsafe("3")) // => BigDecimal.fromBigInt(6n)
```

**See**

- `multiplyAll` for multiplying an iterable of `BigDecimal` values

**Signature**

```ts
declare const multiply: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L380)

Since v2.0.0

## multiplyAll

Takes an `Iterable` of `BigDecimal`s and returns their multiplication as a single `BigDecimal`.

**When to use**

Use to multiply all `BigDecimal` values in an iterable.

**Example** (Multiplying multiple decimals)

```ts
import { BigDecimal } from "effect"

const result = BigDecimal.multiplyAll([
  BigDecimal.fromStringUnsafe("2"),
  BigDecimal.fromStringUnsafe("3"),
  BigDecimal.fromStringUnsafe("4")
]) // => BigDecimal.fromBigInt(24n)
```

**See**

- `multiply` for multiplying two `BigDecimal` values

**Signature**

```ts
declare const multiplyAll: (collection: Iterable<BigDecimal>) => BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L415)

Since v4.0.0

## negate

Provides a negate operation on `BigDecimal`s.

**When to use**

Use to flip the sign of a `BigDecimal`.

**Example** (Negating decimals)

```ts
import { BigDecimal } from "effect"

BigDecimal.negate(BigDecimal.fromStringUnsafe("3")) // => BigDecimal.fromBigInt(-3n)
BigDecimal.negate(BigDecimal.fromStringUnsafe("-6")) // => BigDecimal.fromBigInt(6n)
```

**Signature**

```ts
declare const negate: (n: BigDecimal) => BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1024)

Since v2.0.0

## remainder

Computes the decimal remainder safely when one operand is divided by a second
operand.

**When to use**

Use to compute a decimal remainder while representing division by zero as
`Option.none`.

**Details**

If the divisor is `0`, the result will be `Option.none()`.

**Example** (Computing remainders safely)

```ts
import { BigDecimal, Option } from "effect"

const two = BigDecimal.fromStringUnsafe("2")
const three = BigDecimal.fromStringUnsafe("3")
const zero = BigDecimal.fromStringUnsafe("0")

BigDecimal.remainder(three, two) // => Option.some(BigDecimal.fromBigInt(1n))
BigDecimal.remainder(two, zero) // => Option.none()
```

**See**

- `remainderUnsafe` for remainder calculation that throws when the divisor is zero
- `divide` for decimal quotient calculation

**Signature**

```ts
declare const remainder: {
  (divisor: BigDecimal): (self: BigDecimal) => Option.Option<BigDecimal>
  (self: BigDecimal, divisor: BigDecimal): Option.Option<BigDecimal>
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1058)

Since v2.0.0

## remainderUnsafe

Returns the decimal remainder left over when one operand is divided by a
non-zero second operand.

**When to use**

Use when you need to compute a `BigDecimal` remainder with a divisor known to
be non-zero and want a plain `BigDecimal` result instead of an `Option`.

**Gotchas**

Throws a `RangeError` if the divisor is `0`.

**Example** (Computing remainders unsafely)

```ts
import { BigDecimal } from "effect"

BigDecimal.remainderUnsafe(BigDecimal.fromStringUnsafe("3"), BigDecimal.fromStringUnsafe("2")) // => BigDecimal.fromBigInt(1n)
```

**See**

- `remainder` for returning `Option.none` when the divisor is zero

**Signature**

```ts
declare const remainderUnsafe: {
  (divisor: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, divisor: BigDecimal): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1099)

Since v4.0.0

## round

Computes a rounded `BigDecimal` at the given scale with the specified rounding mode.

**When to use**

Use to round a decimal at a requested scale with an explicit rounding mode.

**Example** (Rounding decimals)

```ts
import { BigDecimal } from "effect"

const positive = BigDecimal.round(BigDecimal.fromStringUnsafe("145"), { mode: "from-zero", scale: -1 })
positive // => BigDecimal.fromBigInt(150n)

const negative = BigDecimal.round(BigDecimal.fromStringUnsafe("-14.5"))
negative // => BigDecimal.fromBigInt(-15n)
```

**See**

- `ceil` for fixed rounding toward positive infinity
- `floor` for fixed rounding toward negative infinity
- `truncate` for fixed rounding toward zero

**Signature**

```ts
declare const round: {
  (options: { scale?: number; mode?: RoundingMode }): (self: BigDecimal) => BigDecimal
  (n: BigDecimal, options?: { scale?: number; mode?: RoundingMode }): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1658)

Since v3.16.0

## sign

Determines the sign of a given `BigDecimal`.

**When to use**

Use to classify a `BigDecimal` as negative, zero, or positive.

**Example** (Reading decimal signs)

```ts
import { BigDecimal } from "effect"

BigDecimal.sign(BigDecimal.fromStringUnsafe("-5")) // => -1
BigDecimal.sign(BigDecimal.fromStringUnsafe("0")) // => 0
BigDecimal.sign(BigDecimal.fromStringUnsafe("5")) // => 1
```

**Signature**

```ts
declare const sign: (n: BigDecimal) => Ordering
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L981)

Since v2.0.0

## subtract

Provides a subtraction operation on `BigDecimal`s.

**When to use**

Use to subtract one `BigDecimal` value from another.

**Example** (Subtracting decimals)

```ts
import { BigDecimal } from "effect"

const result = BigDecimal.subtract(BigDecimal.fromStringUnsafe("2"), BigDecimal.fromStringUnsafe("3")) // => BigDecimal.fromBigInt(-1n)
```

**Signature**

```ts
declare const subtract: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L447)

Since v2.0.0

## sum

Provides an addition operation on `BigDecimal`s.

**When to use**

Use when you need a decimal addition function for piping or higher-order APIs
while preserving decimal precision.

**Example** (Adding decimals)

```ts
import { BigDecimal } from "effect"

const result = BigDecimal.sum(BigDecimal.fromStringUnsafe("2"), BigDecimal.fromStringUnsafe("3")) // => BigDecimal.fromBigInt(5n)
```

**See**

- `sumAll` for summing an iterable of `BigDecimal` values

**Signature**

```ts
declare const sum: {
  (that: BigDecimal): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, that: BigDecimal): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L301)

Since v2.0.0

## sumAll

Takes an `Iterable` of `BigDecimal`s and returns their sum as a single `BigDecimal`.

**When to use**

Use when you need to aggregate decimal quantities with decimal precision
instead of converting through JavaScript numbers.

**Example** (Adding multiple decimals)

```ts
import { BigDecimal } from "effect"

const result = BigDecimal.sumAll([
  BigDecimal.fromStringUnsafe("2"),
  BigDecimal.fromStringUnsafe("3"),
  BigDecimal.fromStringUnsafe("4")
]) // => BigDecimal.fromBigInt(9n)
```

**See**

- `sum` for adding two `BigDecimal` values

**Signature**

```ts
declare const sumAll: (collection: Iterable<BigDecimal>) => BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L349)

Since v3.16.0

## truncate

Computes a truncated `BigDecimal` at the given scale. This removes fractional digits beyond the scale,
rounding toward zero.

**When to use**

Use when you need to discard fractional digits beyond a scale rather than
round half up, half down, or toward an infinity.

**Example** (Truncating decimals)

```ts
import { BigDecimal } from "effect"

BigDecimal.truncate(BigDecimal.fromStringUnsafe("145"), -1) // => BigDecimal.fromBigInt(140n)
BigDecimal.truncate(BigDecimal.fromStringUnsafe("-14.5")) // => BigDecimal.fromBigInt(-14n)
```

**See**

- `round` for configurable rounding modes
- `ceil` for rounding toward positive infinity
- `floor` for rounding toward negative infinity

**Signature**

```ts
declare const truncate: {
  (scale: number): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, scale?: number): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1733)

Since v3.16.0

# models

## BigDecimal (interface)

Represents an arbitrary precision decimal number.

**When to use**

Use when decimal arithmetic needs to avoid JavaScript floating point
representation errors.

**Example** (Inspecting BigDecimal storage)

```ts
import { BigDecimal } from "effect"

const d = BigDecimal.fromStringUnsafe("123.45")

d.value // => 12345n
d.scale // => 2
```

**Signature**

```ts
export interface BigDecimal extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: typeof TypeId
  readonly value: bigint
  readonly scale: number
  /** @internal */
  normalized?: BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L49)

Since v2.0.0

# predicates

## between

Checks whether a `BigDecimal` is between a `minimum` and `maximum` value (inclusive).

**When to use**

Use to test whether a `BigDecimal` falls inside an inclusive range.

**Example** (Checking decimal ranges)

```ts
import { BigDecimal } from "effect"

const between = BigDecimal.between({
  minimum: BigDecimal.fromStringUnsafe("1"),
  maximum: BigDecimal.fromStringUnsafe("5")
})

between(BigDecimal.fromStringUnsafe("3")) // => true
between(BigDecimal.fromStringUnsafe("0")) // => false
between(BigDecimal.fromStringUnsafe("6")) // => false
```

**See**

- `clamp` for forcing a `BigDecimal` into an inclusive range

**Signature**

```ts
declare const between: {
  (options: { minimum: BigDecimal; maximum: BigDecimal }): (self: BigDecimal) => boolean
  (self: BigDecimal, options: { minimum: BigDecimal; maximum: BigDecimal }): boolean
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L850)

Since v2.0.0

## equals

Checks whether two `BigDecimal`s are equal.

**When to use**

Use to compare two `BigDecimal` values for numeric equality.

**Example** (Checking decimal equality)

```ts
import { BigDecimal } from "effect"

const a = BigDecimal.fromStringUnsafe("1.5")
const b = BigDecimal.fromStringUnsafe("1.50")
const c = BigDecimal.fromStringUnsafe("2.0")

BigDecimal.equals(a, b) // => true
BigDecimal.equals(a, c) // => false
```

**See**

- `Equivalence` for passing decimal equality to APIs that require an `Equivalence`

**Signature**

```ts
declare const equals: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1162)

Since v2.0.0

## isGreaterThan

Returns `true` if the first argument is greater than the second, otherwise `false`.

**When to use**

Use to test whether one `BigDecimal` is strictly greater than another.

**Example** (Checking greater-than comparisons)

```ts
import { BigDecimal } from "effect"

const two = BigDecimal.fromStringUnsafe("2")
const three = BigDecimal.fromStringUnsafe("3")
const four = BigDecimal.fromStringUnsafe("4")

BigDecimal.isGreaterThan(two, three) // => false
BigDecimal.isGreaterThan(three, three) // => false
BigDecimal.isGreaterThan(four, three) // => true
```

**Signature**

```ts
declare const isGreaterThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L789)

Since v4.0.0

## isGreaterThanOrEqualTo

Checks whether a given `BigDecimal` is greater than or equal to the provided one.

**When to use**

Use to test whether one `BigDecimal` is greater than or equal to another.

**Example** (Checking greater-than-or-equal comparisons)

```ts
import { BigDecimal } from "effect"

const two = BigDecimal.fromStringUnsafe("2")
const three = BigDecimal.fromStringUnsafe("3")
const four = BigDecimal.fromStringUnsafe("4")

BigDecimal.isGreaterThanOrEqualTo(two, three) // => false
BigDecimal.isGreaterThanOrEqualTo(three, three) // => true
BigDecimal.isGreaterThanOrEqualTo(four, three) // => true
```

**Signature**

```ts
declare const isGreaterThanOrEqualTo: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L818)

Since v4.0.0

## isInteger

Checks whether a given `BigDecimal` is an integer.

**When to use**

Use to test whether a `BigDecimal` has no fractional decimal part.

**Example** (Checking integer decimals)

```ts
import { BigDecimal } from "effect"

BigDecimal.isInteger(BigDecimal.fromStringUnsafe("0")) // => true
BigDecimal.isInteger(BigDecimal.fromStringUnsafe("1")) // => true
BigDecimal.isInteger(BigDecimal.fromStringUnsafe("1.1")) // => false
```

**Signature**

```ts
declare const isInteger: (n: BigDecimal) => boolean
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1522)

Since v2.0.0

## isLessThan

Returns `true` if the first argument is less than the second, otherwise `false`.

**When to use**

Use to test whether one `BigDecimal` is strictly less than another.

**Example** (Checking less-than comparisons)

```ts
import { BigDecimal } from "effect"

const two = BigDecimal.fromStringUnsafe("2")
const three = BigDecimal.fromStringUnsafe("3")
const four = BigDecimal.fromStringUnsafe("4")

BigDecimal.isLessThan(two, three) // => true
BigDecimal.isLessThan(three, three) // => false
BigDecimal.isLessThan(four, three) // => false
```

**Signature**

```ts
declare const isLessThan: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L731)

Since v4.0.0

## isLessThanOrEqualTo

Checks whether a given `BigDecimal` is less than or equal to the provided one.

**When to use**

Use to test whether one `BigDecimal` is less than or equal to another.

**Example** (Checking less-than-or-equal comparisons)

```ts
import { BigDecimal } from "effect"

const two = BigDecimal.fromStringUnsafe("2")
const three = BigDecimal.fromStringUnsafe("3")
const four = BigDecimal.fromStringUnsafe("4")

BigDecimal.isLessThanOrEqualTo(two, three) // => true
BigDecimal.isLessThanOrEqualTo(three, three) // => true
BigDecimal.isLessThanOrEqualTo(four, three) // => false
```

**Signature**

```ts
declare const isLessThanOrEqualTo: {
  (that: BigDecimal): (self: BigDecimal) => boolean
  (self: BigDecimal, that: BigDecimal): boolean
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L760)

Since v4.0.0

## isNegative

Checks whether a given `BigDecimal` is negative.

**When to use**

Use to test whether a `BigDecimal` is less than zero.

**Example** (Checking negative decimals)

```ts
import { BigDecimal } from "effect"

BigDecimal.isNegative(BigDecimal.fromStringUnsafe("-1")) // => true
BigDecimal.isNegative(BigDecimal.fromStringUnsafe("0")) // => false
BigDecimal.isNegative(BigDecimal.fromStringUnsafe("1")) // => false
```

**Signature**

```ts
declare const isNegative: (n: BigDecimal) => boolean
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1565)

Since v2.0.0

## isPositive

Checks whether a given `BigDecimal` is positive.

**When to use**

Use to test whether a `BigDecimal` is greater than zero.

**Example** (Checking positive decimals)

```ts
import { BigDecimal } from "effect"

BigDecimal.isPositive(BigDecimal.fromStringUnsafe("-1")) // => false
BigDecimal.isPositive(BigDecimal.fromStringUnsafe("0")) // => false
BigDecimal.isPositive(BigDecimal.fromStringUnsafe("1")) // => true
```

**Signature**

```ts
declare const isPositive: (n: BigDecimal) => boolean
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1587)

Since v2.0.0

## isZero

Checks whether a given `BigDecimal` is `0`.

**When to use**

Use to test whether a `BigDecimal` is exactly zero.

**Example** (Checking zero decimals)

```ts
import { BigDecimal } from "effect"

BigDecimal.isZero(BigDecimal.fromStringUnsafe("0")) // => true
BigDecimal.isZero(BigDecimal.fromStringUnsafe("1")) // => false
```

**Signature**

```ts
declare const isZero: (n: BigDecimal) => boolean
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L1543)

Since v2.0.0

# scaling

## normalize

Normalizes a given `BigDecimal` by removing trailing zeros.

**When to use**

Use to canonicalize decimals that have equivalent values but different
internal scales.

**Example** (Normalizing trailing zeros)

```ts
import { BigDecimal } from "effect"

const decimal = BigDecimal.normalize(BigDecimal.fromStringUnsafe("123.00000"))
const decimalStorage = [decimal.value, decimal.scale] // => [123n, 0]

const largeDecimal = BigDecimal.normalize(BigDecimal.fromStringUnsafe("12300000"))
const largeDecimalStorage = [largeDecimal.value, largeDecimal.scale] // => [123n, -5]
```

**See**

- `format` for rendering normalized decimals as strings

**Signature**

```ts
declare const normalize: (self: BigDecimal) => BigDecimal
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L199)

Since v2.0.0

## scale

Changes a `BigDecimal` to the specified scale.

**When to use**

Use to change how many decimal places are represented by a `BigDecimal`.

**Details**

Increasing the scale appends decimal zeros. Decreasing the scale discards
digits beyond the target scale by `bigint` division, which truncates toward
zero.

**Example** (Scaling decimal precision)

```ts
import { BigDecimal } from "effect"

const decimal = BigDecimal.fromNumberUnsafe(123.45)

// Increase scale (add more precision)
const scaled = BigDecimal.scale(decimal, 4)
const scaledStorage = [scaled.value, scaled.scale] // => [1234500n, 4]

// Decrease scale (reduce precision, truncating toward zero)
const reduced = BigDecimal.scale(decimal, 1)
reduced // => BigDecimal.fromStringUnsafe("123.4")
```

**See**

- `round` for changing scale with configurable rounding

**Signature**

```ts
declare const scale: {
  (scale: number): (self: BigDecimal) => BigDecimal
  (self: BigDecimal, scale: number): BigDecimal
}
```

[Source](https://effect.website/blob/main/src/BigDecimal.ts#L262)

Since v2.0.0
