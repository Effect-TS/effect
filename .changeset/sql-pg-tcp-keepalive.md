---
"@effect/sql-pg": patch
---

Add an optional `keepAlive` setting for TCP connections, so queries on a connection that silently stops responding fail with a socket error instead of hanging.
