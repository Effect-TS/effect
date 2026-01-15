# EFFECT SQL

## OVERVIEW

Type-safe SQL with dialect abstraction. Base package + 13 driver implementations.

## STRUCTURE

```
sql/                  # Base abstractions
sql-pg/               # PostgreSQL (pg)
sql-mysql2/           # MySQL (mysql2)
sql-mssql/            # SQL Server (tedious)
sql-sqlite-node/      # SQLite (better-sqlite3)
sql-sqlite-bun/       # SQLite (Bun native)
sql-sqlite-wasm/      # SQLite (WASM)
sql-libsql/           # LibSQL/Turso
sql-clickhouse/       # ClickHouse
sql-d1/               # Cloudflare D1
sql-drizzle/          # Drizzle ORM adapter
sql-kysely/           # Kysely adapter
```

## WHERE TO LOOK

| Task               | Location                 | Notes                        |
| ------------------ | ------------------------ | ---------------------------- |
| Query building     | `sql/src/Statement.ts`   | Template literal API         |
| Client interface   | `sql/src/SqlClient.ts`   | execute, stream, transaction |
| Migrations         | `sql/src/Migrator.ts`    | Forward-only migrations      |
| Batching           | `sql/src/SqlResolver.ts` | Request/resolver pattern     |
| Schema integration | `sql/src/SqlSchema.ts`   | Type-safe queries            |

## CONVENTIONS

### Template Literal API

```typescript
import { sql } from "@effect/sql"

// Safe interpolation (parameterized)
const query = sql`SELECT * FROM users WHERE id = ${userId}`

// Identifier (table/column names)
const table = sql.identifier("users")

// Unsafe (raw SQL - use sparingly)
const raw = sql.unsafe("DROP TABLE users")
```

### Helpers

```typescript
sql.in([1, 2, 3]) // IN (?, ?, ?)
sql.insert({ name, age }) // INSERT helper
sql.update({ name }) // UPDATE helper
sql.and([cond1, cond2]) // AND conditions
sql.or([cond1, cond2]) // OR conditions
```

### Transaction Pattern

```typescript
yield *
  SqlClient.withTransaction(
    Effect.gen(function* () {
      yield* sql`INSERT INTO ...`
      yield* sql`UPDATE ...`
      // Auto-commit on success, rollback on error
    })
  )
```

### Dialect-Specific

```typescript
sql.onDialect({
  pg: () => sql`... RETURNING *`,
  mysql: () => sql`...`,
  _: () => sql`...` // fallback
})
```

## ANTI-PATTERNS

- **Never string concat SQL** - Use template literals
- **Never skip transactions** - Use `withTransaction`
- **No raw driver access** - Use SqlClient abstraction

## NOTES

- Nested transactions use savepoints
- `SqlResolver` solves N+1 queries via batching
- Row transforms: camelCase ↔ snake_case at boundary
- Streaming only on PG (cursor) and MySQL (stream)
- SQLite uses semaphore for connection serialization
