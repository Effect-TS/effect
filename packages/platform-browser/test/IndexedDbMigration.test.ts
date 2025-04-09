import { IndexedDbMigration, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

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

describe("IndexedDbMigration", () => {
  it("make", () => {
    const Migration = IndexedDbMigration.make({
      fromVersion: IndexedDbVersion.makeEmpty,
      toVersion: Db,
      execute: () => Effect.gen(function*() {})
    })

    assert.equal(Migration.fromVersion, IndexedDbVersion.makeEmpty)
    assert.equal(Migration.toVersion, Db)
    assert.exists(Migration.execute)
  })
})
