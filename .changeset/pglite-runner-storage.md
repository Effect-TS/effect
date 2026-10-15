---
"effect": patch
"@effect/sql-clickhouse": patch
"@effect/sql-d1": patch
"@effect/sql-libsql": patch
"@effect/sql-mssql": patch
"@effect/sql-mysql2": patch
"@effect/sql-pg": patch
"@effect/sql-pglite": patch
"@effect/sql-sqlite-bun": patch
"@effect/sql-sqlite-do": patch
"@effect/sql-sqlite-node": patch
"@effect/sql-sqlite-react-native": patch
"@effect/sql-sqlite-wasm": patch
---

Fix `SqlRunnerStorage` hanging on PGlite.

`SqlClient` now has a `driver` field identifying the driver that created it, such as `"pg"`, `"pglite"` or `"sqlite-node"`. Every Effect SQL driver sets it. On PGlite, runner storage no longer reserves the only connection and uses lock table rows instead of advisory locks, so runner and application queries are no longer blocked.

Third-party drivers must pass a `driver` name to `SqlClient.make`, and hand-written `SqlClient` implementations must provide a `driver` field:

```ts
const make = Effect.gen(function*() {
  return yield* SqlClient.make({
    driver: "my-driver",
    acquirer,
    compiler,
    spanAttributes: []
  })
})
```
