---
"effect": patch
---

Add `Migrator.fromSql`, a loader for numbered SQL scripts. Each script is split on top-level semicolons and its statements run verbatim with `SqlClient.unsafe`.
