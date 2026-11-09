---
"@effect/sql-pg": patch
---

Make `PgConnection.make` scope release wait for driver-created sockets to close, destroying any still open after one second.
