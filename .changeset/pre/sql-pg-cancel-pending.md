---
"@effect/sql-pg": patch
---

Retire pooled PostgreSQL sessions with an unconfirmed `CancelRequest`, preventing a delayed cancel from reaching a later checkout. This includes interrupts sent while idle. The current checkout and unpooled sessions remain exposed to their own late cancel.
