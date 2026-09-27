---
"effect": patch
"@effect/sql-pg": patch
---

`PgClient` transactions no longer report success when PostgreSQL rolls them back at `COMMIT`. After an earlier statement aborts a transaction and its error is caught, PostgreSQL answers `COMMIT` with a `ROLLBACK` command tag instead of an error. `withTransaction` now dies with a `SqlError` in that case. `SqlClient.make` accepts an effect for `commit`, so a driver can inspect the COMMIT result.
