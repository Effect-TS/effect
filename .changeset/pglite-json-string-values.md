---
"@effect/sql-pglite": patch
---

Preserve string values passed to `sql.json` when writing JSON or JSONB. Strings such as `"null"`, `"123"`, and `"hello"` now remain JSON strings instead of being interpreted as encoded JSON.
