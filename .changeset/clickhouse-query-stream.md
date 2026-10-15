---
"@effect/sql-clickhouse": patch
---

Add `ClickhouseClient.queryStream` for streaming a `sql` statement's results in
any supported streamable
[ClickHouse format](https://clickhouse.com/docs/reference/formats/): JSON
formats emit decoded rows, and raw formats such as CSV or Parquet emit
`Uint8Array` chunks. Failures use the same classified `SqlError` values as
regular queries, including failures reported after streaming has started in
`JSONEachRowWithProgress`. The running query is killed when the stream is
interrupted, fails, or is not consumed to the end.
