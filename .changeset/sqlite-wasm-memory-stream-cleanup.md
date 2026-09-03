---
"@effect/sql-sqlite-wasm": patch
---

Release in-memory query cursors when a stream stops early, fails downstream, or is interrupted, so subsequent SQL statements and database close are not blocked by unfinished statements.
