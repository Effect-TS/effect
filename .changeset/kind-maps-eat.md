---
"@effect/sql-drizzle": minor
---

add @effect/sql-drizzle integration package

This package allows you to use the drizzle's query builders with
`@effect/sql`.

```ts
import { SqliteDrizzle } from "@effect/sql-drizzle/Sqlite"
import * as D from "drizzle-orm/sqlite-core"
import { Effect } from "effect"

const users = D.sqliteTable("users", {
  id: D.integer("id").primaryKey(),
  name: D.text("name")
})

Effect.gen(function*() {
  const db = yield* SqliteDrizzle
  yield* db.delete(users)
  yield* db.insert(users).values({ id: 1, name: "Alice" })
  const results: Array<{
    id: number
    name: string | null
  }> = yield* db.select().from(users)
  console.log("got results", results)
})
```
