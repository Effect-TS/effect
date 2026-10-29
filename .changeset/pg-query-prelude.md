---
"@effect/sql-pg": minor
---

Add `PgConnection.queryWithPrelude` and `PgClient.withPrelude`, which send one or more prelude statements and a query in a single extended-query cycle closed by one `Sync`. PostgreSQL runs the cycle in one implicit transaction, so transaction-local context such as `set_config('app.organization_id', $1, true)` applies to the query and ends with the cycle. Setting row-level security context then takes one round trip instead of four `BEGIN` / context / query / `COMMIT` cycles, and works through PgBouncer in transaction mode. Only the query's rows are returned. A failing prelude fails the effect and the query does not run. On a multiplexed connection the cycle is pipelined without pinning the session. Preludes can run twice when a stale prepared statement is retried, so keep them to transaction-local effects.
