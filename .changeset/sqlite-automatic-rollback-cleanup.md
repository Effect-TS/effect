---
"effect": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-wasm": patch
---

Preserve typed SQL errors without cleanup defects after SQLite automatically rolls back a transaction in sqlite-node, sqlite-bun and in-memory sqlite-wasm. OPFS and React Native clients are unchanged.
