import { IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { HashMap, Schema } from "effect"

describe("IndexedDbVersion", () => {
  it("make", () => {
    class Table extends IndexedDbTable.make(
      "todo",
      Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      { keyPath: "id" }
    ) {}

    class Db extends IndexedDbVersion.make(Table) {}

    assert.equal(HashMap.size(Db.tables), 1)
    assert.equal(HashMap.unsafeGet(Db.tables, "todo"), Table)
  })
})
