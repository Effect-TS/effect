---
"@effect/sql-pg": patch
---

Retire a PostgreSQL session when the backend does not confirm cancellation of an interrupted query or stream. This prevents a delayed `CancelRequest` from canceling the next statement on the session.
