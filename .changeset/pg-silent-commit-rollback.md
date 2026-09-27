---
"effect": patch
"@effect/sql-pg": patch
---

Surface transaction COMMIT failures as typed SqlError failures instead of defects across SQL dialects. Detect PostgreSQL's silent rollback of an aborted transaction on COMMIT and fail the transaction rather than reporting success.
