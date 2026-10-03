---
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
---

Retry WAL initialization contention within busyTimeout and report database setup failures as typed SqlError values. Skip WAL initialization for read-only Node connections.
