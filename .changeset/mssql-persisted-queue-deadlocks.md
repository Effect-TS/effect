---
"effect": patch
---

Fix SQL Server deadlocks in the SQL `PersistedQueue` store. Concurrent offers no longer fail with a deadlock from a serializable `MERGE`, and claims no longer deadlock with settlements or with claims from other stores.
