---
"@effect/sql-pg": patch
---

Decode and encode built-in PostgreSQL ranges (`int4range`, `int8range`, `numrange`, `daterange`, `tsrange`, `tstzrange`), multiranges, and their arrays as `PgTypes.Range` values.
