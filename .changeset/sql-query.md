---
"@effect/sql": minor
---

Add `SqlQuery` module with `findAll`, `void`, `findOne`, and `single` APIs for running SQL queries with schema validation.

### SqlQuery.findAll

Runs an SQL query and validates the results against a provided schema, returning all results as an array.

```ts
import { Schema } from "@effect/schema"
import { SqlClient, SqlQuery } from "@effect/sql"
import { Effect } from "effect"

const userSchema = Schema.struct({
  id: Schema.number,
  name: Schema.string,
})

const findAllUsers = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  return yield* SqlQuery.findAll(userSchema)(
    sql`SELECT id, name FROM users`
  )
})
```

### SqlQuery.void

Runs an SQL query and discards the result.

```ts
import { SqlClient, SqlQuery } from "@effect/sql"
import { Effect } from "effect"

const updateUser = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  return yield* SqlQuery.void(
    sql`UPDATE users SET name = 'Alice' WHERE id = 1`
  )
})

```

### SqlQuery.findOne

Runs an SQL query and validates the results against a provided schema, returning the first result as an `Option`.

```ts
import { Schema } from "@effect/schema"
import { SqlClient, SqlQuery } from "@effect/sql"
import { Effect, Option } from "effect"

const userSchema = Schema.struct({
  id: Schema.number,
  name: Schema.string,
})

const findUser = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  const result = yield* SqlQuery.findOne(userSchema)(
    sql`SELECT id, name FROM users WHERE id = 1`
  )
  if(Option.isSome(result)) {
    console.log(result.value)
  } else {
    console.log('User not found')
  }
})
```

### SqlQuery.single

Runs an SQL query and validates the results against a provided schema, returning the first result. 
If no result is found, it throws a `NoSuchElementException`.

```ts
import { Schema } from "@effect/schema"
import { SqlClient, SqlQuery } from "@effect/sql"
import { Effect, Console } from "effect"
import * as Cause from "effect/Cause"

const userSchema = Schema.struct({
  id: Schema.number,
  name: Schema.string,
})

const findSingleUser = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  return yield* SqlQuery.single(userSchema)(
    sql`SELECT id, name FROM users WHERE id = 1`
  ).pipe(
    Effect.catchTag('NoSuchElementException', () => Console.log('User not found'))
  )
})
```