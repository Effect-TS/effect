---
"effect": patch
---

Fix SQL Server deadlocks in the SQL `PersistedQueue` store. Offers no longer use a serializable `MERGE` that range-locked the whole table and could deadlock concurrent offers, and duplicate offers are still skipped, including from clients whose sessions run with `XACT_ABORT ON`. Claims skip rows that another claim or a settlement has locked, which removes the claim/settlement and claim/claim deadlocks.
