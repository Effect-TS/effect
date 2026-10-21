---
"@effect/sql-clickhouse": patch
---

Add `ClickhouseClient.queryStream` for streaming a statement's results in any
streamable [ClickHouse format](https://clickhouse.com/docs/reference/formats/).
JSON formats emit decoded rows, with progress events for
`JSONEachRowWithProgress`, and raw formats such as CSV or Parquet emit
`Uint8Array` chunks. Failures, including those reported after streaming has
started, fail the stream with a classified `SqlError`, and the query is killed
when the stream is interrupted, fails, or is not read to the end.
