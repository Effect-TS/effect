---
"effect": patch
---

Skip computing uncached structural hashes when comparing plain objects and arrays in `Equal.equals`, while continuing to use custom `Hash` implementations and already-cached structural hashes. Dates now hash by their time value.
