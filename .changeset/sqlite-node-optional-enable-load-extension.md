---
"@effect/sql-sqlite-node": patch
---

Support `node:sqlite` implementations without `DatabaseSync#enableLoadExtension`, such as Deno's, instead of failing to open every connection.
