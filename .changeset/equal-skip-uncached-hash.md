---
"effect": patch
---

Skip computing uncached structural hashes and `Set` key allocations when comparing plain objects and arrays in `Equal.equals`, while continuing to use custom `Hash` implementations and already-cached structural hashes. As a result, differently unrolled bisimilar cycles of plain objects or arrays now compare equal as documented.
