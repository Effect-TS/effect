import { IndexedDbQueryBuilder, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"

const Table = IndexedDbTable.make(
  "todo",
  Schema.Struct({
    id: Schema.Number,
    title: Schema.String,
    count: Schema.Number,
    completed: Schema.Boolean
  }),
  { keyPath: "id", indexes: { titleIndex: "title", countIndex: "count" } }
)

const Db = IndexedDbVersion.make(Table)

describe("IndexedDbQueryBuilder", () => {
  it("no index", () => {
    const query = IndexedDbQueryBuilder.from(Db, "todo").pipe(
      IndexedDbQueryBuilder.select()
    )

    assert.equal(query.table, "todo")
    assert.equal(query.index, undefined)
    assert.equal(query.only, undefined)
  })

  it("index number equals", () => {
    const query = IndexedDbQueryBuilder.from(Db, "todo").pipe(
      IndexedDbQueryBuilder.select("countIndex"),
      IndexedDbQueryBuilder.equals(10)
    )

    assert.equal(query.table, "todo")
    assert.equal(query.index, "countIndex")
    assert.equal(query.only, 10)
  })

  it("index string equals", () => {
    const query = IndexedDbQueryBuilder.from(Db, "todo").pipe(
      IndexedDbQueryBuilder.select("titleIndex"),
      IndexedDbQueryBuilder.equals("test")
    )

    assert.equal(query.table, "todo")
    assert.equal(query.index, "titleIndex")
    assert.equal(query.only, "test")
  })
})
