---
"effect": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-wasm": patch
"@effect/sql-sqlite-do": patch
"@effect/sql-pglite": patch
"@effect/sql-libsql": patch
---

Hold the shared connection for the whole statement or stream on single-connection SQL clients, so another fiber's transaction can no longer roll back an acknowledged write or expose uncommitted rows to a plain read.
