---
"effect": patch
"@effect/sql-pg": patch
---

Keep failed background pool acquisitions as capacity placeholders until a borrower needs the slot. Retry that slot with a fresh acquisition instead of passing a stale PostgreSQL connection error to an unrelated query; callers waiting on their own failed connection still receive its error.
