---
"effect": patch
"@effect/sql-sqlite-do": patch
---

Add `SqlClient.afterCommit`, which runs an effect after the outermost transaction of the client commits, or immediately when none is open.

Callbacks registered in a transaction that rolls back, or in a savepoint that rolls back, never run. They run in registration order after the connection is released, before `withTransaction` returns, outside the transaction and uninterruptibly. A callback that dies is logged without affecting the transaction's result.

```ts
const program = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql.withTransaction(Effect.gen(function*() {
    yield* sql`INSERT INTO jobs ${sql.insert(job)}`
    // Wakes workers only once the job is visible to them.
    yield* sql.afterCommit(wakeWorkers)
  }))
})
```

The SQL `PersistedQueue` store now wakes its local takers once an offer commits. An offer made inside a transaction used to wake them before the commit, so they found nothing and waited for the next poll.

Drivers that implement transactions without `makeWithTransaction` can support it with `SqlClient.withAfterCommit`. Hand-written `SqlClient` implementations can use `SqlClient.makeAfterCommit`. The Durable Object SQLite driver supports it.
