---
"effect": patch
---

Fix `Chunk.get` and `Chunk.getUnsafe` throwing on in-range fractional indexes of one-element chunks, and treat `NaN` and infinite indexes as out of bounds.
