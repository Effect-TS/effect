---
"@effect/sql-pg": patch
---

Retire a PostgreSQL session after an interrupted query or aborted stream unless the backend reported the statement cancelled.

A `CancelRequest` travels on a side connection with no delivery confirmation, and a pooler or proxy may forward it late enough to cancel the next statement on the same session. The session is now closed instead: anyone still holding it gets a `ConnectionError`, and a pool replaces it. The backend's `57014` is taken as confirmation even though `statement_timeout` raises the same code. Aborting a stream whose result is already on the wire no longer sends a cancel at all, as the connection drains for a moment first.
