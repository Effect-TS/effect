---
"effect": patch
---

Add `Migrator.fromSql` for numbered SQL scripts. Each script is split on semicolons and run with `SqlClient.unsafe`.
