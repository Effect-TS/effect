---
"effect": patch
---

Speed up `DateTime` construction by creating the `partsUtc`, `adjustedEpochMilliseconds` and `partsAdjusted` cache properties on first use. Reading and writing these fields is unchanged, but `Object.hasOwn`, `Object.getOwnPropertyNames` and `Object.getOwnPropertyDescriptor` no longer report them before the caches are populated, or at all on instances sealed or frozen before first use. Reading the parts of, or writing these fields on, an instance frozen before first use no longer throws.
