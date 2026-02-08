---
"@effect/sql-sqlite-bun": patch
---

Wrap `db.query()` (prepare) errors in `SqlError` so they surface as catchable failures instead of defects.
