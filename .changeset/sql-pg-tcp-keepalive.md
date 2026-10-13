---
"@effect/sql-pg": patch
---

Add optional client-side TCP keepalive settings to detect silently broken PostgreSQL connections that receive neither responses nor a close/reset, leaving queries waiting indefinitely.
