---
"@effect/sql-pg": patch
---

Decode and encode built-in PostgreSQL range types (`int4range`, `int8range`, `numrange`, `daterange`, `tsrange`, `tstzrange`), their multiranges, and arrays of both as `PgTypes.Range` values instead of failing with `PgTypesCodecError`.
