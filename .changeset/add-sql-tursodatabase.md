---
"@effect/sql-tursodatabase": minor
---

Add `@effect/sql-tursodatabase`, an `@effect/sql` driver for the in-process Rust Turso engine (`@tursodatabase/database`).

Provides `TursoClient` (a `SqlClient` exposing queries as `Effect`, the connection as a composable `Layer`, and typed `SqlError`s via Effect SQL's SQLite error classification) alongside `TursoMigrator`. Mirrors the existing `@effect/sql-libsql` and `@effect/sql-sqlite-node` drivers, including transaction support with savepoints and `SafeIntegers`. Streaming queries are not implemented.
