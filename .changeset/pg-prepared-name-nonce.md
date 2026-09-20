---
"@effect/sql-pg": patch
---

Namespace prepared-statement names per connection so they no longer collide behind transaction-mode poolers (Hyperdrive, PgBouncer, Supabase pooled).
