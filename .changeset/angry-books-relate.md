---
"@effect/sql-sqlite-react-native": minor
"@effect/sql-sqlite-node": minor
"@effect/sql-sqlite-wasm": minor
"@effect/sql-clickhouse": minor
"@effect/sql-sqlite-bun": minor
"@effect/sql-drizzle": minor
"@effect/sql-kysely": minor
"@effect/sql-libsql": minor
"@effect/sql-mysql2": minor
"@effect/sql-mssql": minor
"@effect/sql-d1": minor
"@effect/sql-pg": minor
---

Use `layer` / `layerConfig` naming convention for the /sql-\* packages. Make `layer` constructors accept a raw config object. Add `layerConfig` constructors that accept `Config.Config<...>`.
