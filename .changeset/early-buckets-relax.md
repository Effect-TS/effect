---
"@effect/sql-sqlite-node": patch
---

Return raw SQL query results in sql-sqlite-node

```ts
response = yield* sql`INSERT INTO test (name) VALUES ('hello')`.raw
assert.deepStrictEqual(response, { changes: 1, lastInsertRowid: 1 })
```
