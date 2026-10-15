---
"effect": patch
"@effect/sql-sqlite-do": patch
---

Add `SqlClient.afterCommit`, which runs an effect once the client's outermost transaction commits, or immediately outside a transaction. Callbacks registered in a transaction or savepoint that rolls back are discarded.

```ts
const insertJob = sql.withTransaction(Effect.gen(function*() {
  yield* sql`INSERT INTO jobs ${sql.insert(job)}`
  yield* sql.afterCommit(wakeWorkers)
}))
```

The SQL `PersistedQueue` store now wakes local takers once an offer commits, instead of before the surrounding transaction commits.

Custom drivers and clients can support `afterCommit` with `SqlClient.withAfterCommit` and `SqlClient.makeAfterCommit`. `@effect/sql-sqlite-do` supports it in storage transactions.
