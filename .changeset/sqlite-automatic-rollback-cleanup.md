---
"effect": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-wasm": patch
"@effect/sql-sqlite-react-native": patch
---

Keep only the original typed `SqlError` when SQLite rolls back a transaction itself, for example after `INSERT OR ROLLBACK` or `RAISE(ROLLBACK, ...)`, instead of adding defects from the redundant ROLLBACK, ROLLBACK TO SAVEPOINT or RELEASE SAVEPOINT.
