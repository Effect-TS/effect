---
"@effect/sql-pg": patch
---

Decode anonymous `record` values (`ROW(...)`, `(a, b)`) and `record[]` as arrays of their field values instead of failing with `Failed to decode row`.
