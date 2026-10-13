---
"@effect/sql-sqlite-bun": patch
---

Queries that contain more than one statement now run every statement, and the rows from the last statement are returned.
