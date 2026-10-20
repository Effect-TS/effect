---
"effect": patch
---

Fix `Chunk.get` throwing on an in-range fractional index of a one-element chunk, and treat non-finite indexes as out of bounds.
