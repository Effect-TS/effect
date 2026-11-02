---
"@effect/sql-pg": patch
---

Preserve typed SQL errors without cleanup defects when the server ends a PgClient session inside a transaction, and add `PgConnection.inTransaction`.
