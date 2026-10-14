---
"effect": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-wasm": patch
"@effect/sql-sqlite-react-native": patch
---

Reduce SQLite statement overhead by borrowing the shared connection while preserving semaphore exclusion and failed-COMMIT recovery.
