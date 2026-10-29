---
"effect": patch
"@effect/sql-pg": patch
---

Stop PgClient transactions from staying open after a pooler drops their prepared statements.

Behind a pooler that drops prepared statements between transactions, such as PgBouncer in transaction mode with `max_prepared_statements = 0`, a prepared `ROLLBACK` or `COMMIT` failed before running and left the session in an aborted transaction. Every later `BEGIN` on it failed with `25P02`, and the pooler held its servers until the remaining connections hung. Rollbacks and savepoint releases now always run unprepared, PgClient rolls back after a failed `COMMIT`, and a connection released with the transaction it began still aborted is closed instead of reused.
