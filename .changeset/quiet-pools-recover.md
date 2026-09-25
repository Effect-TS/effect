---
"effect": patch
"@effect/sql-pg": patch
---

Retry failed background pool acquisitions when borrowed, rather than passing stale errors to later queries. Callers awaiting their own failed connection still receive its error.
