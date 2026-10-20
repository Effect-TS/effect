---
"effect": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-wasm": patch
---

Keep only the original typed `SqlError` when SQLite rolls back a transaction itself, for example after `INSERT OR ROLLBACK` or `RAISE(ROLLBACK, ...)`. Clients that report transaction state now skip ROLLBACK, ROLLBACK TO SAVEPOINT and RELEASE SAVEPOINT once no transaction is open, instead of adding defects from those statements. The OPFS `@effect/sql-sqlite-wasm` client and `@effect/sql-sqlite-react-native` cannot report transaction state and are unchanged.
