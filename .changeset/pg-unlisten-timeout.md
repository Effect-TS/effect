---
"@effect/sql-pg": patch
---

Fix closing a `listen` scope hanging when the connection has silently stopped responding. A session that does not confirm `UNLISTEN` within 5 seconds is now closed.
