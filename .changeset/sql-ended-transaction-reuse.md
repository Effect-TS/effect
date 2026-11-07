---
"effect": patch
"@effect/sql-mssql": patch
"@effect/sql-sqlite-bun": patch
---

Fix fibers that outlive `withTransaction` running statements on its connection; they now fail with a `ConnectionError` instead, and `SqlClient.currentTransaction` exposes the same check to drivers.
