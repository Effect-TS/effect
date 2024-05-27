---
"effect": minor
"@effect/sql-sqlite-react-native": patch
"@effect/platform-node-shared": patch
"@effect/platform-browser": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-wasm": patch
"@effect/sql-sqlite-bun": patch
"@effect/opentelemetry": patch
"@effect/platform-node": patch
"@effect/experimental": patch
"@effect/platform-bun": patch
"@effect/printer-ansi": patch
"@effect/sql-mysql2": patch
"@effect/sql-mssql": patch
"@effect/typeclass": patch
"@effect/platform": patch
"@effect/rpc-http": patch
"@effect/printer": patch
"@effect/schema": patch
"@effect/sql-pg": patch
"@effect/vitest": patch
"@effect/cli": patch
"@effect/rpc": patch
"@effect/sql": patch
---

Introduced `Redacted<T>` module - `Secret` generalization
`Secret extends Redacted<string>`
Added two related schemas `Redacted` and `RedactedFromSelf`
The use of the `Redacted` has been replaced by the use of the `Redacted<string>` in packages with version `0.*.*`
