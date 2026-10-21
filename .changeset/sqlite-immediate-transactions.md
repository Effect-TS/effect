---
"@effect/sql": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
---

Start SQLite transactions with `BEGIN IMMEDIATE` to avoid `database is locked` errors when concurrent connections write to the same database. The Bun client now waits up to 5 seconds for locks, and transactions that fail to begin now fail with the original `SqlError` instead of dying on rollback.
