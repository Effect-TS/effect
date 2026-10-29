---
"@effect/sql-pg": minor
---

Send `SqlClient.batch` in one PostgreSQL extended-query cycle closed by a single `Sync`, and add `PgConnection.batch`. Outside an explicit transaction PostgreSQL runs the batch as one implicit transaction, so transaction-local context such as `set_config('app.organization_id', $1, true)` applies to the later statements and ends with the batch. Setting row-level security context and querying then takes one round trip instead of four `BEGIN` / context / query / `COMMIT` cycles, and works through PgBouncer in transaction mode. A failing statement fails the batch and nothing from it is kept. Batch statements are always unnamed, so they skip the prepared statement cache and are never retried. On a multiplexed connection a batch is pipelined without pinning the session.
