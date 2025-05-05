import { IndexedDbMigration, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

class Table1 extends IndexedDbTable.make(
  "todo",
  Schema.Struct({
    id: Schema.Number,
    title: Schema.String,
    completed: Schema.Boolean
  }),
  { keyPath: "id" }
) {}

class Db1 extends IndexedDbVersion.make(Table1) {}

class Table2 extends IndexedDbTable.make(
  "todo",
  Schema.Struct({
    uuid: Schema.String,
    name: Schema.String
  }),
  { keyPath: "uuid" }
) {}

class Db2 extends IndexedDbVersion.make(Table2) {}

describe("IndexedDbMigration", () => {
  it("make", () => {
    class Migration extends IndexedDbMigration.make(Db1, () => Effect.gen(function*() {})).add(
      Db2,
      () => Effect.gen(function*() {})
    ) {}

    assert.equal(Migration.fromVersion, Db1)
    assert.equal(Migration.toVersion, Db2)
    assert.exists(Migration.execute)
  })
})
