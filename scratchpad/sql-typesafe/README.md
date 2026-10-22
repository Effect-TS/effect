# Inline Effect SQL literal types

This scratchpad exercises the experimental **core Effect APIs**
`SqlClient.Service` and `Migrator.runWithSnapshot`, with **TypeScript 7.1.0-beta**.
Open [`main.ts`](./main.ts) for the runnable example. The database service is
defined once in [`database.ts`](./database.ts):

```ts
import * as SqlClient from "effect/sql/SqlClient"
import schema from "./_schema.json" with { type: "json" }

export class Database extends SqlClient.Service<Database>()("scratchpad/Database", { schema }) {}
```

Query code gets the typed query constructor directly from its service scope:

```ts
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import * as Effect from "effect/Effect"
import { Database } from "./database.ts"

const findUsers = Effect.fnUntraced(function*(minimumAge: number) {
  const sql = yield* Database
  return yield* sql(
    `SELECT id, name, email FROM users WHERE age >= :minimumAge ORDER BY name`,
    { minimumAge }
  )
  // ReadonlyArray<{ readonly id: number; readonly name: string;
  //                 readonly email: string | null }>
})

const program = findUsers(18).pipe(
  Effect.provide(Database.layer),
  Effect.provide(SqliteClient.layer({ filename: ":memory:" }))
)
```

`findUsers` requires only `Database`. Its layer binds the schema to the provided
SQL client, whose layer manages the connection lifetime. There is no separate
schema service or query factory at call sites. The service declaration retains
the imported schema's type for inference. The runnable example applies the
migrations before querying its database.

The imported JSON and SQL literal determine the result fields and required
parameter object. Unknown tables or columns, missing or mistyped parameters,
and unsupported query patterns produce TypeScript errors. Uncomment the marked lines in
`main.ts` to try the diagnostics.

## Run

From the repository root, with Node 24 or later:

```sh
pnpm install
pnpm --filter scratchpad sql:snapshot
pnpm --filter scratchpad sql:check
pnpm --filter scratchpad sql:demo
pnpm --filter scratchpad sql:verify
```

The demo also runs directly with `node scratchpad/sql-typesafe/main.ts`.
It migrates an in-memory SQLite database, selects Ada and Grace, handles a
nullable email, and shows the bound SQL and parameters. An SQL-like input
string remains a bound value and matches no users.

`sql:snapshot` runs the migrations and regenerates `_schema.json` through
`Migrator.runWithSnapshot`. Change `migrations.ts`, regenerate the snapshot,
and rerun `sql:check` to see the inferred types follow the schema.

The beta compiler is local to the private scratchpad package. `sql:check`
first builds the referenced workspace packages with the repository's normal
compiler, then checks this consumer against their declarations. `sql:verify`
also checks valid and invalid calls, required services, schema-only changes
across incremental builds, snapshot refresh after a no-op migration, and actual
SQLite execution.

## Snapshot format

Native JSON imports widen string and boolean values but preserve object keys.
The version 2 snapshot stores names, SQL type tags, and nullability in keys:

```json
{
  "version": 2,
  "dialect": "sqlite",
  "tables": {
    "users": {
      "id": { "INTEGER": null },
      "name": { "TEXT": null },
      "email": { "TEXT": null, "NULL": null }
    }
  }
}
```

Each column has one SQL type tag and an optional `NULL` tag. The `null` values
are placeholders, not row data or defaults. `{ "TEXT": null, "NULL": null }`
describes `string | null`.

The core implementation lives in `packages/effect/src/sql/SqlClient.ts` and
`packages/effect/src/sql/Migrator.ts`, with the parser and schema helpers under
`packages/effect/src/internal/`. The scratchpad only consumes public imports.

Ordinary `.ts` files and JSON imports work through TypeScript's normal
dependency graph. No content mapper, marker file, generated declaration,
custom loader, or compiler execution flag is needed. Parentheses preserve
the SQL literal type; tagged-template text becomes `TemplateStringsArray`.

## Current limits

- SQLite `STRICT` tables with ordinary `INT`, `INTEGER`, `REAL`, and `TEXT`
  columns. Generated columns and `BLOB` values are excluded because their
  runtime types vary across SQLite versions and drivers. Unsupported schemas
  fail snapshot generation.
- Single-table `SELECT`, `DISTINCT`, columns, `*`, qualified columns, explicit
  `AS` aliases, comparisons joined by `AND`, `IS [NOT] NULL`, `ORDER BY`, and
  bound `LIMIT`/`OFFSET`.
- Keywords are case-insensitive; identifiers must match the snapshot spelling.
  Column references named like SQL literals (`null`, `current_date`, etc.)
  require quoted identifiers and are rejected by this grammar.
  Joins, table aliases, expressions, aggregates, DML, quoted identifiers,
  comments, and inline literal values are outside the grammar.
- Null checks do not narrow results. Row-name transforms are disabled; numeric
  decoding must use the driver's defaults.
- The database service yields the typed query constructor. Existing tagged
  templates and SQL client helpers use the separate `SqlClient.SqlClient` service.
- SQLite performs final syntax validation. The type parser accepts unquoted
  keyword aliases such as `AS WHERE`, which SQLite rejects with `SqlError`.
- The snapshot must match the runtime database. Schema inspection and writing
  happen after migrations commit; rerun snapshot generation if either fails.
- CLI inference and diagnostics are verified. Editor behavior is not verified,
  and SQL-string completions are not implemented.
