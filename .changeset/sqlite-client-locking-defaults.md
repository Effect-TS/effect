---
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-node": patch
---

Use a five-second busy timeout and immediate transactions by default to avoid SQLite lock failures under concurrent access.
