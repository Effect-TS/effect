import {
  IndexedDb,
  IndexedDbDatabase,
  IndexedDbMigration,
  IndexedDbQuery,
  IndexedDbTable,
  IndexedDbVersion
} from "@effect/platform-browser"
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

const CurrentDatabaseVersion = DatabaseVersion2

class Migration extends IndexedDbMigration.make(DatabaseVersion1, (api) =>
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

const DatabaseLayer = IndexedDbDatabase.layer("database", Migration).pipe(
  Layer.provide(IndexedDb.layerWindow)
)
const MainLayer = IndexedDbQuery.layer.pipe(Layer.provide(DatabaseLayer))

export class IndexedDbService extends Effect.Service<IndexedDbService>()("IndexedDbService", {
  dependencies: [MainLayer],
  effect: Effect.gen(function*() {
    const { makeApi } = yield* IndexedDbQuery.IndexedDbApi
    return makeApi(CurrentDatabaseVersion)
  })
}) {}
