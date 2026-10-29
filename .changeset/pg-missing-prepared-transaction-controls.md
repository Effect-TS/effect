---
"effect": patch
"@effect/sql-pg": patch
---

Stop PgClient transactions from staying open after a transaction pooler loses their prepared statements.

Behind a pooler that does not keep prepared statements between transactions, such as PgBouncer in transaction mode with `max_prepared_statements = 0`, a prepared `ROLLBACK` or `COMMIT` could fail before running. The session then went back into use inside an aborted transaction, so every later `BEGIN` on it failed with `25P02`, and the pooler could hold its servers until the remaining connections hung. Rollbacks and savepoint releases now always run unprepared, and PgClient rolls back after a failed `COMMIT`, so these transactions fail with the original typed `SqlError` and leave the connection usable.
