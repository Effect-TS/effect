---
"effect": patch
---

Speed up `DateTime` construction by creating the `partsUtc`, `adjustedEpochMilliseconds` and `partsAdjusted` cache properties on first use. Reading and writing these fields is unchanged, but `Object.hasOwn` and `Object.getOwnPropertyNames` no longer report them on an instance whose caches have not been populated.
