---
"@effect/sql-pg": patch
---

Add an `onAcquire` option to `PgClient` that runs an effect after each connection checkout, in the fiber that uses the connection. It runs once per statement or stream outside a transaction, and once per `withTransaction`, `reserve`, `listen`, and `notify`.

The hook tracks acquisitions, not open sockets, and does not close idle connections: they stay open until `idleTimeout` retires them, and the `minConnections` floor stays open for the pool's lifetime.
