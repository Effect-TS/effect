---
"@effect/openapi-generator": patch
---

Add `openapigen --string-formats decoded` (`stringFormats: "decoded"`) to decode `date-time`, `int64` and `uint64` strings to `DateTime.Utc` and range-checked `bigint` in schema-backed output, after their OpenAPI string checks.
