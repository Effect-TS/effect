---
"@effect/sql-sqlite-node": minor
"@effect/sql-sqlite-bun": minor
---

## Raw Database Client Access

Both `@effect/sql-sqlite-node` and `@effect/sql-sqlite-bun` now expose the underlying database client through a new `rawClient` property. This provides direct access to the native database APIs when needed for advanced operations.

**Example**

```ts
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const client = yield* SqliteClient.make({ filename: "test.db" })

  // Access the raw Bun SQLite Database instance
  const rawDb = yield* client.rawClient

  // Use native database methods directly
  const result = yield* Effect.try(() =>
    rawClient.prepare("SELECT * FROM users").all()
  )

  return result
})
```

The `rawClient` property returns:

- `Effect<Database>` for `@effect/sql-sqlite-bun` (Bun's native SQLite Database)
- `Effect<Database>` for `@effect/sql-sqlite-node` (better-sqlite3 Database)

This enables users to access vendor-specific functionality while maintaining the Effect-based workflow.
