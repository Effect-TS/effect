---
"effect": minor
"@effect/sql-pg": minor
"@effect/sql-libsql": minor
---

Add `SqlClient.batch`, which runs statements in order on one connection and returns each statement's rows as a typed tuple. Drivers can implement the optional `Connection.executeBatch` to send a batch in one round trip; others run the statements one at a time.

PostgreSQL sends a batch as one extended-query cycle closed by a single `Sync`, and libSQL as one SDK batch. Outside `withTransaction`, both run it as one transaction, so a failing statement keeps nothing. On PostgreSQL this lets transaction-local context such as `set_config('app.organization_id', $1, true)` and a query share one round trip, including behind PgBouncer in transaction mode. PostgreSQL batch statements are never prepared or retried. `@effect/sql-pg` also adds `PgConnection.batch`.
