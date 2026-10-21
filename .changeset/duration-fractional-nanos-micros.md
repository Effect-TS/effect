---
"effect": patch
---

Fix `Duration.decode` and `Duration.times` throwing on fractional values.

`Duration.decode` threw on fractional `nanos` and `micros` inputs such as `"1.5 micros"`, and `Duration.times` threw when a nanosecond-backed `Duration` was multiplied by a non-integer. Both now round to whole nanoseconds, so `Duration.decode("1.5 micros")` is 1500 nanos and `Duration.times(Duration.nanos(2n), 2.5)` is 5 nanos.
