---
"effect": patch
---

Fix `Effect.txRetry` blocking forever when a `TxRef` the transaction read was changed by another commit while the transaction was suspended. The transaction now reruns immediately instead of waiting for a later change.
