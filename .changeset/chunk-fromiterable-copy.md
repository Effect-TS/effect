---
"effect": patch
---

Fix `Chunk.fromIterable` and `TxChunk.fromIterable` sharing the caller's array, so later changes to the array no longer change the chunk.
