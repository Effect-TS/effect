---
"@effect/sql-clickhouse": patch
---

Expose the underlying `@clickhouse/client` instance as `ClickhouseClient.client`, to reach driver features the SQL client does not wrap, such as `exec()` with raw output formats.
