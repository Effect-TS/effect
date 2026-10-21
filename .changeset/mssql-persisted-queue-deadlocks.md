---
"effect": patch
---

Fix SQL Server deadlocks in the SQL `PersistedQueue` store. Offers no longer use a serializable `MERGE`, and claims skip rows locked by other claims or settlements.
