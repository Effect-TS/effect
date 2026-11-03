---
"effect": patch
---

Add `Rational`, an exact fraction type alongside `BigDecimal`, with `Schema.Rational` and `Schema.RationalFromString`.

```ts
import { BigDecimal, Rational } from "effect"

const third = Rational.makeUnsafe(1n, 3n)

Rational.equals(Rational.multiply(third, Rational.fromBigInt(3n)), Rational.fromBigInt(1n)) // true
Rational.toBigDecimal(third, { scale: 3 }) // BigDecimal 0.333
```
