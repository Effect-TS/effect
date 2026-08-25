# @effect/sql-pg

An Effect SQL client for PostgreSQL, built on the [`pg`](https://node-postgres.com) library.

## Installation

```sh
npm install effect@rc @effect/sql-pg@rc
```

## LISTEN / NOTIFY

`listen` is a scoped subscription that returns after PostgreSQL has acknowledged
the `LISTEN` command. The returned queue starts buffering notifications
immediately, so it is safe to establish the subscription before reading initial
state:

```ts
import { PgClient } from "@effect/sql-pg"
import { Effect, Queue } from "effect"

const program = Effect.gen(function*() {
  const sql = yield* PgClient.PgClient
  const notifications = yield* sql.listen("events")

  // LISTEN is active here. Notifications received during this query are queued.
  const initialRows = yield* sql<{ id: number }>`SELECT id FROM events ORDER BY id`
  const nextPayload = yield* Queue.take(notifications)

  return { initialRows, nextPayload }
})
```

The subscription stays active for the surrounding scope. Subscriptions share a
listener connection, and multiple subscribers to the same channel remain active
until their individual scopes close. Empty notification payloads are delivered
as empty strings, and connection failures fail the queue.

To consume notifications as a stream:

```ts
import { PgClient } from "@effect/sql-pg"
import { Effect, Stream } from "effect"

const notifications = Stream.unwrap(
  Effect.gen(function*() {
    const sql = yield* PgClient.PgClient
    return Stream.fromQueue(yield* sql.listen("events"))
  })
)
```

## Documentation

- [Effect website](https://effect.website)
- [API reference](https://effect.website/docs/v4/api/sql-pg)
