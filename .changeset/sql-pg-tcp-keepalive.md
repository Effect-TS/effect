---
"@effect/sql-pg": patch
---

Add an optional `keepAlive` idle duration that enables TCP keepalive, so a connection that silently stops responding errors instead of leaving queries hanging.
