---
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
---

Start SQLite transactions with `BEGIN IMMEDIATE` to avoid `database is locked` errors when concurrent connections write to the same database.
