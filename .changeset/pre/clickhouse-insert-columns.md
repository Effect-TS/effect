---
"@effect/sql-clickhouse": patch
---

`ClickhouseClient.insertQuery` now accepts the `columns` option of
`@clickhouse/client`, allowing inserts into a subset of columns
(`columns: ["a", "b"]`) or all columns except the listed ones
(`columns: { except: ["a"] }`).
