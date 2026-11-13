---
"@effect/sql-clickhouse": patch
---

Add `ClickhouseWebClient`, a `fetch`-based ClickHouse client for Cloudflare Workers and other runtimes without Node built-ins; `ClickhouseMigrator` works with it.

Interrupting a `ClickhouseClient` query no longer fails with a defect when `KILL QUERY` fails, and waits at most 5 seconds for it.
