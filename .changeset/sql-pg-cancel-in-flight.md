---
"@effect/sql-pg": patch
---

Retire a PostgreSQL session after an interrupted query or an aborted stream unless the backend reported the statement cancelled.

A `CancelRequest` travels on a side connection and the backend applies it to whatever it runs when it arrives. A connection pooler or hosted proxy may close that side connection before it forwards the request, so a statement that completed on its own after its cancel was sent left the request in flight, and the next statement on the same session failed with `StatementTimeoutError` (SQLSTATE `57014`). The session is now closed instead, with a `ConnectionError`, and a pool replaces it. A session whose interrupted statement did fail with `57014` stays usable as before.
