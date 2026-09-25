---
"effect": patch
---

Fix `Effect.tx` never committing a `TxRef` write of `-0` over `0`, and only wake retry waiters for refs a transaction wrote, not refs it only read.
