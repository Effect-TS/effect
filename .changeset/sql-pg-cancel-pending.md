---
"@effect/sql-pg": patch
---

Discard a pooled PostgreSQL session before its next checkout when an interrupted query or stream leaves a `CancelRequest` unconfirmed.

A pooler or proxy can acknowledge the side connection before forwarding the cancel, letting it reach a later statement. A pooled session with an unconfirmed cancel is now replaced between checkouts. A caller that keeps the same checkout remains exposed to its own late cancel, and an unpooled session cannot be replaced. The backend's `57014` clears the pending marker, though `statement_timeout` uses the same code. Buffered stream results still get a brief chance to drain without sending a cancel.
