---
"@effect/sql-clickhouse": patch
---

Add `ClickhouseWebClient`, a `fetch`-based ClickHouse client for Cloudflare Workers and other runtimes without Node built-ins; `ClickhouseMigrator` works with it.

`ClickhouseClient` now also cancels a query interrupted while its result is being read, no longer fails an interruption with a defect when `KILL QUERY` fails or hangs, and fails a stream with a `SqlError` instead of a defect on a malformed row.
