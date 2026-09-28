---
"effect": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-wasm": patch
"@effect/sql-sqlite-react-native": patch
---

Roll back SQLite transactions left open by a failed COMMIT, such as a deferred foreign key violation, so the connection can be reused.
