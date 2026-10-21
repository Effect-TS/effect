---
"effect": patch
---

Fence SQL `PersistedQueue` settlements and lock refreshes by acquisition, so a handler whose lock lapsed can no longer complete, fail, retry or release a row after the same store re-claims it.
