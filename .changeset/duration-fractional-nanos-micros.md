---
"effect": patch
---

Fix `Duration.decode` and `Duration.times` throwing on fractional values.

`Duration.decode` accepts a decimal mantissa (e.g. `"1.5 micros"`), but the `nanos`/`micros` units passed the raw string to `BigInt`, which throws on non-integers. Fractional `nanos`/`micros` are now scaled to whole nanoseconds (rounded), e.g. `Duration.decode("1.5 micros")` is `1500` nanos and `Duration.decode("1.5 nanos")` is `2` nanos.

`Duration.times` accepts any `number` multiplier, but multiplying a nanosecond-backed `Duration` by a non-integer threw because `BigInt` cannot convert a float. Non-integer multipliers are now supported, e.g. `Duration.times(Duration.nanos(2n), 2.5)` is `5` nanos.
