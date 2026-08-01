import { IndexedDb, IndexedDbDatabase, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { assert, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

it.effect("aborts the versionchange transaction when a migration fails", () => {
  const Table = IndexedDbTable.make({
    name: "entries",
    schema: Schema.Struct({ id: Schema.Number }),
    keyPath: "id"
  })
  const Version = IndexedDbVersion.make(Table)
  class Database extends IndexedDbDatabase.make(Version, (transaction) =>
    Effect.andThen(
      transaction.createObjectStore("entries"),
      Effect.fail("migration failed")
    ))
  {}
  const layer = Database.layer("migration_failure_repro").pipe(
    Layer.provide(Layer.succeed(IndexedDb.IndexedDb, IndexedDb.make({ indexedDB, IDBKeyRange })))
  )
  const open = Effect.callback<IDBDatabase>((resume) => {
    const request = indexedDB.open("migration_failure_repro")
    request.onsuccess = () => resume(Effect.succeed(request.result))
  })

  return Effect.gen(function*() {
    const migration = yield* Effect.result(Effect.service(IndexedDbDatabase.IndexedDbDatabase).pipe(Effect.provide(layer)))
    assert.isTrue(Result.isFailure(migration))

    const database = yield* open
    assert.deepStrictEqual(Array.from(database.objectStoreNames), [])
    database.close()
  })
})
