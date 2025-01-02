# Effect SQL

A SQL toolkit for Effect.

## Basic example

```ts
import { Effect, Struct, pipe } from "effect"
import { PgClient } from "@effect/sql-pg"
import { SqlClient } from "@effect/sql"

const SqlLive = PgClient.layer({
  database: "effect_pg_dev"
})

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  const people = yield* sql<{
    readonly id: number
    readonly name: string
  }>`SELECT id, name FROM people`

  yield* Effect.log(`Got ${people.length} results!`)
})

pipe(program, Effect.provide(SqlLive), Effect.runPromise)
```

Alternatively, you can also create the `SqlLive` layer using the `PgClient.layerConfig` constructor.

```ts
import { Config } from "effect"
import { PgClient } from "@effect/sql-pg"

const SqlLive = PgClient.layerConfig({
  database: Config.string("DATABASE")
})
```

## Migrating from `sqlfx`

If you are coming from the `sqlfx` package, here are some differences that should be noted:

#### All the modules are now re-exported from the top level for easy access

For example, to create the client Layer, instead of:

```ts
import { Config } from "effect"
import { PgClient } from "@sqlfx/pg"

const SqlLive = PgClient.makeLayer({
  database: Config.succeed("effect_pg_dev")
})
```

You now do:

```ts
import { PgClient } from "@effect/sql-pg"

const SqlLive = PgClient.layer({
  database: "effect_pg_dev"
})
```

#### The default table name for migrations has changed

To continue using your `sqlfx` migrations table, you can setup your migrator Layer as below:

```ts
import { PgMigrator } from "@effect/sql-pg"

const MigratorLive = Layer.provide(
  PgMigrator.layer({
    loader: PgMigrator.fromFileSystem(
      fileURLToPath(new URL("migrations", import.meta.url))
    ),
    table: "sqlfx_migrations"
  }),
  SqlLive
)
```

Or you can rename the `sqlfx_migrations` table to `effect_sql_migrations`.

#### The resolver & schema apis have moved

- `sql.resolver` -> `SqlResolver.ordered`
- `sql.resolverVoid` -> `SqlResolver.void`
- `sql.resolverId` -> `SqlResolver.findById`
- `sql.resolverIdMany` -> `SqlResolver.grouped`
- `sql.resolverSingle*` has been removed in favour of using the `effect/Cache` module with the schema apis
- `sql.schema` -> `SqlSchema.findAll`
- `sql.schemaSingle` -> `SqlSchema.single`
- `sql.schemaSingleOption` -> `SqlSchema.findOne`
- `sql.schemaVoid` -> `SqlSchema.void`

#### The array helper has moved

In `sqlfx` you could pass an array to the `sql(array)` function to pass an list of items to a SQL `IN` clause. Now you have to use `sql.in(array)`.

## INSERT resolver

```ts
import { Effect, Schema, pipe } from "effect"
import { SqlResolver, SqlClient } from "@effect/sql"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf
}) {}

const InsertPersonSchema = Schema.Struct(
  Struct.omit(Person.fields, "id", "createdAt", "updatedAt")
)

export const makePersonService = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  const InsertPerson = yield* SqlResolver.ordered("InsertPerson", {
    Request: InsertPersonSchema,
    Result: Person,
    execute: (requests) =>
      sql`
        INSERT INTO people
        ${sql.insert(requests)}
        RETURNING people.*
      `
  })

  const insert = InsertPerson.execute

  return { insert }
})
```

## SELECT resolver

```ts
import { Effect, Schema, pipe } from "effect"
import { SqlResolver, SqlClient } from "@effect/sql"

class Person extends Schema.Class<Person>("Person")({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf
}) {}

export const makePersonService = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  const GetById = yield* SqlResolver.findById("GetPersonById", {
    Id: Schema.Number,
    Result: Person,
    ResultId: (_) => _.id,
    execute: (ids) => sql`SELECT * FROM people WHERE ${sql.in("id", ids)}`
  })

  const getById = (id: number) =>
    Effect.withRequestCaching("on")(GetById.execute(id))

  return { getById }
})
```

## Building queries

### Safe interpolation

```ts
import { Effect } from "effect"
import { SqlClient } from "@effect/sql"

export const make = (limit: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const statement = sql`SELECT * FROM people LIMIT ${limit}`
    // e.g. SELECT * FROM people LIMIT ?
  })
```

### Identifiers

```ts
import { Effect } from "effect"
import { SqlClient } from "@effect/sql"

const table = "people"

export const make = (limit: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const statement = sql`SELECT * FROM ${sql(table)} LIMIT ${limit}`
    // e.g. SELECT * FROM "people" LIMIT ?
  })
```

### Unsafe interpolation

```ts
import { Effect } from "effect"
import { SqlClient } from "@effect/sql"

type OrderBy = "id" | "created_at" | "updated_at"
type SortOrder = "ASC" | "DESC"

export const make = (orderBy: OrderBy, sortOrder: SortOrder) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const statement = sql`SELECT * FROM people ORDER BY ${sql(orderBy)} ${sql.unsafe(sortOrder)}`
    // e.g. SELECT * FROM people ORDER BY `id` ASC
  })
```

### Where clause combinators

#### AND

```ts
import { Effect } from "effect"
import { SqlClient } from "@effect/sql"

export const make = (names: string[], cursor: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const statement = sql`SELECT * FROM people WHERE ${sql.and([
      sql.in("name", names),
      sql`created_at < ${cursor}`
    ])}`
    // SELECT * FROM people WHERE ("name" IN (?,?,?) AND created_at < ?)
  })
```

#### OR

```ts
import { Effect } from "effect"
import { SqlClient } from "@effect/sql"

export const make = (names: string[], cursor: Date) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const statement = sql`SELECT * FROM people WHERE ${sql.or([
      sql.in("name", names),
      sql`created_at < ${cursor}`
    ])}`
    // SELECT * FROM people WHERE ("name" IN (?,?,?) OR created_at < ?)
  })
```

#### Mixed

```ts
import { Effect } from "effect"
import { SqlClient } from "@effect/sql"

export const make = (names: string[], afterCursor: Date, beforeCursor: Date) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const statement = sql`SELECT * FROM people WHERE ${sql.or([
      sql.in("name", names),
      sql.and([`created_at > ${afterCursor}`, `created_at < ${beforeCursor}`])
    ])}`
    // SELECT * FROM people WHERE ("name" IN (?,?,?) OR (created_at > ? AND created_at < ?))
  })
```

## Migrations

A `Migrator` module is provided, for running migrations.

Migrations are forward-only, and are written in Typescript as Effect's.

Here is an example migration:

```ts
// src/migrations/0001_add_users.ts

import { Effect } from "effect"
import { SqlClient } from "@effect/sql"

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) => sql`
    CREATE TABLE users (
      id serial PRIMARY KEY,
      name varchar(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `
)
```

To run your migrations:

```ts
// src/main.ts

import { Effect, Layer, pipe } from "effect"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { PgClient, PgMigrator } from "@effect/sql-pg"
import { fileURLToPath } from "node:url"

const program = Effect.gen(function* () {
  // ...
})

const SqlLive = PgClient.layer({
  database: "example_database"
})

const MigratorLive = PgMigrator.layer({
  loader: PgMigrator.fromFileSystem(
    fileURLToPath(new URL("migrations", import.meta.url))
  ),
  // Where to put the `_schema.sql` file
  schemaDirectory: "src/migrations"
}).pipe(Layer.provide(SqlLive))

const EnvLive = Layer.mergeAll(SqlLive, MigratorLive).pipe(
  Layer.provide(NodeContext.layer)
)

pipe(program, Effect.provide(EnvLive), NodeRuntime.runMain)
```
