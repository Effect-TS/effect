import { IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { HashMap, Schema } from "effect"

describe("IndexedDbVersion", () => {
  it("make", () => {
    const Table = IndexedDbTable.make(
      "todo",
      Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      { keyPath: "id" }
    )

    const Db = IndexedDbVersion.make(Table)

    assert.equal(HashMap.size(Db.tables), 1)
    assert.equal(HashMap.unsafeGet(Db.tables, "todo"), Table)
  })

  it("makeEmpty", () => {
    const Db = IndexedDbVersion.makeEmpty
    assert.equal(HashMap.size(Db.tables), 0)
  })
})
