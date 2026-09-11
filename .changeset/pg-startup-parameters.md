---
"@effect/sql-pg": patch
---

Add `startupParameters` to native PostgreSQL connection and client configuration. Parameters are sent in the startup packet on each physical connection, establishing session defaults without additional SQL queries.
