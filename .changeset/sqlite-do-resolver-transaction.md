---
"@effect/sql-sqlite-do": patch
---

Run storage-backed transactions through `SqlClient.makeWithTransaction`.

- `SqlResolver` keeps requests inside a transaction out of other batches, even without `SqlClient` in context.
- `Reactivity` invalidations inside a transaction run after the outermost commit.
- `afterCommit` callbacks run after the outermost commit.
- Concurrent nested sibling transactions are serialized.
- Transactions get a `sql.transaction` span.
- Storage rejections during rollback or nested completion are defects, not `SqlError`s.
