---
"@effect/sql-pg": patch
---

Add an `onAcquire` option to `PgClient` that runs an effect in the consuming fiber after each connection checkout. Services it requires become requirements of the client constructor or layer.

The hook runs per checkout, not per socket: idle pooled connections stay open until `idleTimeout` retires them.
