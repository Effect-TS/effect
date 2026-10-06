---
"@effect/sql-pg": patch
---

Release socket listeners and pool retirement hooks on PostgreSQL connection scope closure to avoid retaining closed connections and their pools.
