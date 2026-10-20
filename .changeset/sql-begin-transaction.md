---
"effect": patch
---

Add `SqlClient.BeginTransaction`, a reference that replaces the statement starting a top-level transaction, such as `BEGIN ISOLATION LEVEL SERIALIZABLE`, saving the round trip of a separate `SET TRANSACTION`. Nested transactions keep their savepoints. `SqlClient.makeWithTransaction` passes the statement to `begin` as a second argument.
