import { IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"

describe("IndexedDbVersion", () => {
  it("make", () => {
    class Table extends IndexedDbTable.make({
      name: "todo",
      schema: Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      keyPath: "id"
    }) {}

    class Db extends IndexedDbVersion.make(Table) {}

    assert.equal(Db.tables.size, 1)
    assert.equal(Db.tables.get("todo"), Table)
  })
})
