---
"effect": patch
---

Add `Migrator.fromSql`, which loads migrations from numbered SQL scripts and runs each statement with `SqlClient.unsafe`.
