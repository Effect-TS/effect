---
"@effect/sql-pg": patch
---

Release connection listeners and pool retirement hooks when a PostgreSQL connection scope closes, so a transport that outlives the scope does not retain the connection and its pool.
