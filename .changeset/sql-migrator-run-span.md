---
"effect": patch
---

Wrap each SQL Migrator run in a `Migrator.run` tracing span with an `effect.sql.migrator.table` attribute, including runs with no pending migrations.
