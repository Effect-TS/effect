---
"@effect/sql-sqlite-node": patch
---

Fix connections failing to open on `node:sqlite` implementations without `DatabaseSync#enableLoadExtension`, such as Deno.
