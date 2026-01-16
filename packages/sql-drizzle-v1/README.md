# @effect/sql-drizzle-v1

Drizzle ORM v1.x integration for `@effect/sql`.

## Why This Package?

This package provides support for [Drizzle ORM v1.x](https://orm.drizzle.team/). If you're using Drizzle v0.x, use [`@effect/sql-drizzle`](https://github.com/Effect-TS/effect/tree/main/packages/sql-drizzle) instead.

Drizzle v1.0.0 introduces breaking changes to type signatures and internal class hierarchies that are incompatible with v0.x:

- `DrizzleConfig` now requires a `TRelations` generic parameter
- PostgreSQL query builders no longer extend `QueryPromise` (they use `PgAsync*Base` classes)
- The `db.query` API requires explicit relation definitions via `defineRelations()`

A separate package avoids runtime version detection and keeps both versions stable for their respective users.

## Installation

```bash
pnpm add @effect/sql-drizzle-v1
```

**Peer dependencies:**
- `effect`
- `@effect/sql`
- `drizzle-orm` (>=1.0.0-beta.1)

## Usage

```ts
import { PgDrizzle } from "@effect/sql-drizzle-v1/Pg"
import * as D from "drizzle-orm/pg-core"
import { Effect } from "effect"

const users = D.pgTable("users", {
  id: D.serial("id").primaryKey(),
  name: D.text("name")
})

Effect.gen(function*() {
  const db = yield* PgDrizzle
  yield* db.insert(users).values({ name: "Alice" })
  const results = yield* db.select().from(users)
  console.log(results)
})
```

## Migration from @effect/sql-drizzle

Update your imports:

```diff
- import * as Pg from "@effect/sql-drizzle/Pg"
+ import * as Pg from "@effect/sql-drizzle-v1/Pg"
```

## Documentation

- **API Reference**: https://effect-ts.github.io/effect/docs/sql-drizzle-v1
