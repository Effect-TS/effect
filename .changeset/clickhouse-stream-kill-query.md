---
"@effect/sql-clickhouse": patch
---

Kill the ClickHouse query when a `.stream` result is not read to the end, for example after `Stream.take` or interruption.
