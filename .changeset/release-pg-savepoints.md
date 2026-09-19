---
"effect": patch
"@effect/sql-pg": patch
"@effect/sql-pglite": patch
"@effect/sql-mysql2": patch
"@effect/sql-libsql": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-react-native": patch
"@effect/sql-sqlite-wasm": patch
---

Release savepoints after nested transactions succeed or successfully roll back in PostgreSQL, PGlite, MySQL, libSQL, and the Node, Bun, React Native, and WASM SQLite clients. This frees PostgreSQL transaction locks before the outer transaction completes.

Custom SQL clients can opt in through the new `releaseSavepoint` option. Clients that omit it are unchanged.
