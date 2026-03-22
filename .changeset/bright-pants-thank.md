---
"@effect/sql-pg": patch
---

Use a dedicated PostgreSQL connection for LISTEN / UNLISTEN so active listeners do not consume a pooled query connection.
