---
"effect": patch
---

Add `Rational`, an exact fraction type alongside `BigDecimal`, with `Schema.Rational` and `Schema.RationalFromString`. Arithmetic cancels common factors before multiplying (Knuth, TAOCP vol. 2, §4.5.1), so it stays fast as numerators and denominators grow.

```ts
import { BigDecimal, Rational } from "effect"

const third = Rational.makeUnsafe(1n, 3n)

Rational.equals(Rational.multiply(third, Rational.fromBigInt(3n)), Rational.fromBigInt(1n)) // true
Rational.toBigDecimal(third, { scale: 3 }) // BigDecimal 0.333
```
