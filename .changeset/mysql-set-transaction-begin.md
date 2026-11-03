---
"effect": patch
"@effect/sql-mysql2": patch
---

Start MySQL transactions with a `SET TRANSACTION` `BeginTransaction`.

- `@effect/sql-mysql2` runs a `SqlClient.BeginTransaction` that starts with `SET TRANSACTION`, such as `SET TRANSACTION ISOLATION LEVEL READ COMMITTED`, just before its `BEGIN` on the same connection. Before, it ran the statement in place of `BEGIN`, so no transaction was started.
- `SqlClient.make` accepts a `begin` option for drivers that need more than one statement to start a transaction.
