---
"@effect/sql-clickhouse": patch
---

Use ClickHouse's `ping()` endpoint for connection validation and map failed health checks to `SqlError` values.
