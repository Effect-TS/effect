---
"effect": patch
---

Avoid uncached structural hashing in `Equal.equals` for plain objects and arrays, speeding up one-off structural comparisons while preserving custom `Hash` and cached-hash rejections. Also fixes `Equal.equals` and `Hash.hash` to include inherited properties on objects with custom prototypes whose `constructor` is `Object` (such as `Object.create({ ... })`).
