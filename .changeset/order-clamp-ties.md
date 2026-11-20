---
"effect": patch
---

Fix `Order.clamp` returning the bound instead of the value when the value is equal to a bound, so `DateTime.clamp`, `BigDecimal.clamp` and `SemVer.clamp` keep the time zone, scale and build metadata of a value at the edge of the range.
