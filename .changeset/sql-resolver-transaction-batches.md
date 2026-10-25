---
"effect": patch
---

Fix `SqlResolver` batching requests made outside a transaction into a concurrent transaction's batch, which could roll back their writes.
