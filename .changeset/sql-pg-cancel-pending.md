---
"@effect/sql-pg": patch
---

Retire a pooled PostgreSQL session before its next checkout when an interrupted query or stream leaves a `CancelRequest` unconfirmed.

A pooler or proxy can delay the cancel until a later statement. A pool now retires the session as soon as the unconfirmed cancel is detected, including an interrupt while idle. A caller that keeps the current checkout remains exposed to its own late cancel, and an unpooled session cannot be replaced. Buffered stream results still get a brief chance to drain without sending a cancel.
