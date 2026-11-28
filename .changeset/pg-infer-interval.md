---
"@effect/sql-pg": patch
---

Fix `PgClient` failing with `CodecError` when a decoded `interval` value is passed back as a query parameter.
