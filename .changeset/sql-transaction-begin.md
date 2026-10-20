---
"effect": patch
---

Add a `begin` option to `SqlClient.withTransaction` that replaces the statement starting a top-level transaction for that call, such as `BEGIN ISOLATION LEVEL SERIALIZABLE`, saving the round trip of a separate `SET TRANSACTION`. Nested transactions keep their savepoints. `SqlClient.makeWithTransaction` passes the statement to `begin` as a second argument.

Breaking: `Effect.fn` and `Effect.fnUntraced` pass their function's arguments to each pipeline step, so `sql.withTransaction` given as a step now receives the first argument as its options, which usually fails to compile. Wrap it as `(effect) => sql.withTransaction(effect)`.
