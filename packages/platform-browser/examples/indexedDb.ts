import { IndexedDb, IndexedDbDatabase, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { Effect, Layer, Schema } from "effect"

class UserTable1 extends IndexedDbTable.make(
  "user",
  Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    email: Schema.String
  }),
  {
    keyPath: ["id"],
    indexes: { email: "email" }
  }
) {}

class UserTable2 extends IndexedDbTable.make(
  "user",
  Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    email: Schema.String,
    age: Schema.Number
  }),
  {
    keyPath: ["id"],
    indexes: { email: "email", age: "age" }
  }
) {}

class DatabaseVersion1 extends IndexedDbVersion.make(UserTable1) {}
class DatabaseVersion2 extends IndexedDbVersion.make(UserTable2) {}

class Migration extends IndexedDbDatabase.make(DatabaseVersion1, (api) =>
  Effect.gen(function*() {
    yield* api.createObjectStore("user")
    yield* api.createIndex("user", "email")
  })).add(DatabaseVersion2, (prev, curr) =>
    Effect.gen(function*() {
      const data = yield* prev.from("user").select()
      yield* prev.deleteObjectStore("user")
      yield* curr.createObjectStore("user")
      yield* curr.createIndex("user", "email")
      yield* curr.createIndex("user", "age")
      yield* curr.from("user").insertAll(data.map((d) => ({ ...d, age: 0 })))
    }))
{}

const MainLayer = Migration.layer("database").pipe(
  Layer.provide(IndexedDb.layerWindow)
)

export class IndexedDbService extends Effect.Service<IndexedDbService>()("IndexedDbService", {
  dependencies: [MainLayer],
  effect: Effect.gen(function*() {
    const api = yield* Migration.getQueryBuilder
    return api
  })
}) {}
