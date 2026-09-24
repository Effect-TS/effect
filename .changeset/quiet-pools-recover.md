---
"effect": patch
"@effect/sql-pg": patch
---

Discard unclaimed pool acquisition failures so background PostgreSQL connection errors cannot fail later, unrelated queries. Deliver failures to callers waiting for their own connections.
