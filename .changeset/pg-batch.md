---
"effect": minor
"@effect/sql-pg": minor
---

Add `SqlClient.batch`, which runs statements in order on one connection and returns each statement's rows as a typed tuple. Each statement is compiled and its rows transformed by the client that built it, the current `Statement.CurrentTransformer` applies to each one, and the batch runs under one client span on the enclosing transaction's connection when there is one. Drivers can implement the new optional `Connection.executeBatch` to send a batch in one round trip; otherwise the statements run one at a time with `execute`.

`@effect/sql-pg` sends `SqlClient.batch` in one PostgreSQL extended-query cycle closed by a single `Sync`, and adds `PgConnection.batch`. Outside an explicit transaction PostgreSQL runs the batch as one implicit transaction, so transaction-local context such as `set_config('app.organization_id', $1, true)` applies to the later statements and ends with the batch. Setting row-level security context and querying then takes one round trip instead of four `BEGIN` / context / query / `COMMIT` cycles, and works through PgBouncer in transaction mode. A failing statement fails the batch and nothing from it is kept. Batch statements are always unnamed, so they skip the prepared statement cache and are never retried. On a multiplexed connection a batch is pipelined without pinning the session.
