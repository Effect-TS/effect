---
"effect": patch
"@effect/sql-libsql": patch
"@effect/sql-mssql": patch
---

Allow queued SQL transactions to be interrupted while waiting for a connection, respecting the caller's interruptibility. Clean up interrupted acquisition scopes and release connection permits, including rolling back a libSQL transaction interrupted during acquisition.
