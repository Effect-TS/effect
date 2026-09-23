---
"@effect/sql-clickhouse": patch
---

Add `ClickhouseClient.queryStream` for format-aware streaming of query results.

The format can be any streamable `@clickhouse/client` format and determines the
element type of the stream:

- Streamable JSON formats such as `JSONEachRow` (the default) emit decoded rows.
- `JSONEachRowWithProgress` emits rows interleaved with progress events, so
  progress reports from the server are preserved instead of discarded.
  `{exception: ...}` events are never emitted as data; they fail the stream
  with a classified `SqlError`.
- Raw formats such as `CSV`, `TabSeparated` (ClickHouse's `TSV` alias), and
  `Parquet` emit raw `Uint8Array` chunks; the query is executed with an
  explicit `FORMAT` clause and the response body is streamed as-is.

Streams fail with the same classified `SqlError` values as regular queries.
Interrupting a stream — while the request is in flight or mid-stream — aborts
the HTTP request and issues `KILL QUERY` for the statement.
