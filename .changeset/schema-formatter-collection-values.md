---
"effect": patch
---

Fix `Schema.toFormatter` throwing on `ReadonlySet`, `ReadonlyMap`, `HashSet`, `HashMap` and `Chunk` values that contain symbols or null-prototype objects, and keep `Chunk` elements in iteration order.

Map and set entries are now sorted by their formatted output instead of by their raw values, so they can print in a different order than before, including for primitive keys and values.
