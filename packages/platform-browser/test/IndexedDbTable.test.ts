import { IndexedDbTable } from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"

describe("IndexedDbTable", () => {
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

    assert.equal(Table.tableName, "todo")
    assert.deepStrictEqual(Table.tableSchema.fields.id, Schema.Number)
    assert.deepStrictEqual(Table.tableSchema.fields.title, Schema.String)
    assert.deepStrictEqual(Table.tableSchema.fields.completed, Schema.Boolean)
    assert.equal(Table.keyPath, "id")
  })

  it("multiple keyPath", () => {
    const Table = IndexedDbTable.make({
      name: "todo",
      schema: Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        completed: Schema.Boolean
      }),
      keyPath: ["id", "title"]
    })

    assert.equal(Table.tableName, "todo")
    assert.deepStrictEqual(Table.tableSchema.fields.id, Schema.Number)
    assert.deepStrictEqual(Table.tableSchema.fields.title, Schema.String)
    assert.deepStrictEqual(Table.tableSchema.fields.completed, Schema.Boolean)
    assert.deepStrictEqual(Table.keyPath, ["id", "title"])
  })
})
