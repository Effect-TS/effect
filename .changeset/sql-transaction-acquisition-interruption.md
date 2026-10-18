---
"effect": patch
"@effect/sql-libsql": patch
"@effect/sql-mssql": patch
---

Allow queued SQL transactions to be interrupted while waiting for a connection, respecting the caller's interruptibility. Interrupted or failed acquisition releases the connection scope and its permits, and a libSQL transaction interrupted during `BEGIN` is rolled back.

`SqlClient.makeWithTransaction` (unstable) now owns the connection scope: `acquireConnection` receives the mask's `restore` function and returns a scoped connection effect instead of a `[scope, connection]` tuple.
