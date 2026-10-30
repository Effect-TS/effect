---
"effect": minor
"@effect/sql-pg": minor
---

Add `PgClient.batch` and `PgConnection.batch`, which send statements in one PostgreSQL extended-query cycle closed by a single `Sync` and return each statement's rows. Outside an explicit transaction PostgreSQL runs the batch as one implicit transaction, so transaction-local context such as `set_config('app.organization_id', $1, true)` applies to the later statements and ends with the batch. Setting row-level security context and querying then takes one round trip instead of four `BEGIN` / context / query / `COMMIT` cycles, and works through PgBouncer in transaction mode. A failing statement fails the batch and nothing from it is kept. `PgClient.batch` compiles and transforms each statement with the client that built it, applies the current `Statement.CurrentTransformer`, traces the batch as one client span and runs on the enclosing transaction's connection. Batch statements are always unnamed, so they skip the prepared statement cache and are never retried. On a multiplexed connection a batch is pipelined without pinning the session.

In `effect`, add `SqlClient.clientBatch` and the optional `Connection.executeBatch` hook, which let SQL drivers expose a batch API that runs with the client's statement transforms, tracing and transaction routing. `PgClient.batch` is built on them.
