---
"effect": patch
---

Skip computing uncached structural hashes when comparing plain objects and arrays in `Equal.equals`, while continuing to use custom `Hash` implementations and already-cached structural hashes. Also fixes `Equal.equals` and `Hash.hash` to include inherited properties on objects with custom prototypes whose `constructor` is `Object` (such as `Object.create({ ... })`).
