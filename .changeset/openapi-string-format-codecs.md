---
"@effect/openapi-generator": patch
---

Use `openapigen --string-formats decoded` to decode `date-time`, `int64` and `uint64` strings to `DateTime.Utc` and `bigint` values, after the strings' own OpenAPI checks.
