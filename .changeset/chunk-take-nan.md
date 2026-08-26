---
"effect": patch
---

Treat `NaN` as a non-positive count in `Chunk.take` and `Chunk.drop` so they no longer produce slices that throw `RangeError: Invalid array length`.
