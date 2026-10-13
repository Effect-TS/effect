---
"@effect/sql-sqlite-node": patch
---

Fix WAL startup on Deno failing immediately with `database is locked` instead of retrying until `busyTimeout` elapses.
