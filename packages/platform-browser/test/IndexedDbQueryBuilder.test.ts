import { IndexedDb, IndexedDbDatabase, IndexedDbTable, IndexedDbVersion } from "@effect/platform-browser"
import { afterEach, assert, describe, it } from "@effect/vitest"
import { Context, DateTime, Effect, Layer, ParseResult, Schema } from "effect"
import { IDBKeyRange, indexedDB } from "fake-indexeddb"

const databaseName = "db"

const layerFakeIndexedDb = Layer.succeed(IndexedDb.IndexedDb, IndexedDb.make({ indexedDB, IDBKeyRange }))

const provideDb = (database: IndexedDbDatabase.Any) =>
  Effect.provide(
    database.layer(databaseName).pipe(Layer.provide(layerFakeIndexedDb))
  )

afterEach(() => {
  indexedDB.deleteDatabase(databaseName)
})

class Table1 extends IndexedDbTable.make({
  name: "todo",
  schema: Schema.Struct({
    id: Schema.Number,
    title: Schema.String,
    count: Schema.Number,
    completed: Schema.Boolean
  }),
  keyPath: "id",
  indexes: { titleIndex: "title", countIndex: "count" }
}) {}

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
  createdAt: Schema.DateTimeUtcFromNumber
}) {}

class ProductSchema extends Schema.Class<ProductSchema>("ProductSchema")({
  key: Schema.optional(Schema.Number),
  name: Schema.String,
  price: Schema.Number
}) {}

class VerifyContext extends Context.Tag("VerifyContext")<VerifyContext, { readonly maxLength: number }>() {}

const VerifyId = Schema.transformOrFail(Schema.String, Schema.String, {
  strict: true,
  encode: (to, _, ast) =>
    Effect.gen(function*() {
      const { maxLength } = yield* VerifyContext
      if (to.length > maxLength) {
        return yield* Effect.fail("Max length exceeded")
      }
      return to
    }).pipe(
      Effect.mapError(() => new ParseResult.Type(ast, to))
    ),
  decode: ParseResult.succeed
})

const Table2 = IndexedDbTable.make({ name: "user", schema: User, keyPath: "id" })

const Table3 = IndexedDbTable.make({
  name: "product",
  schema: ProductSchema,
  // TODO: should only be "key" here, as the auto-increment field should be
  // optional
  keyPath: "price",
  autoIncrement: true
})

const Table4 = IndexedDbTable.make({
  name: "price",
  schema: Schema.Struct({
    id: Schema.optional(Schema.Number),
    amount: Schema.Number
  }),
  keyPath: "id",
  autoIncrement: true
})

const Table5 = IndexedDbTable.make({
  name: "person",
  schema: Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
    age: Schema.Number
  }),
  keyPath: ["firstName", "lastName"]
})

const Table6 = IndexedDbTable.make({ name: "user-verify", schema: Schema.Struct({ id: VerifyId }), keyPath: "id" })

class V1 extends IndexedDbVersion.make(Table1, Table2, Table3, Table4, Table5, Table6) {}

describe("IndexedDbQueryBuilder", () => {
  describe("select", () => {
    it.effect("select", () => {
      class Db extends IndexedDbDatabase.make(
        V1,
        Effect.fnUntraced(function*(api) {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insert({ id: 1, title: "test", count: 1, completed: false })
        })
      ) {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const from = api.from("todo")
        const select = from.select()
        const data = yield* select

        assert.equal(from.table.tableName, "todo")
        assert.equal(select.index, undefined)
        assert.deepStrictEqual(select.from, from)
        assert.deepStrictEqual(select.from.IDBKeyRange, IDBKeyRange)
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 1, title: "test", count: 1, completed: false }])
      }).pipe(provideDb(Db))
    })

    it.effect("select with index", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insert({ id: 2, title: "test2", count: 2, completed: false })
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db
        const from = api.from("todo")
        const select = from.select("titleIndex")
        const data = yield* select

        assert.equal(from.table.tableName, "todo")
        assert.equal(select.index, "titleIndex")
        assert.deepStrictEqual(select.from, from)
        assert.deepStrictEqual(select.from.IDBKeyRange, IDBKeyRange)
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 2, title: "test2", count: 2, completed: false }])
      }).pipe(provideDb(Db))
    })

    it.effect("select equals", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        {
          const api = yield* Db
          const from = api.from("todo")
          const select = from.select()
          const equals = select.equals(2)
          const data = yield* equals

          assert.equal(from.table.tableName, "todo")
          assert.equal(equals.index, undefined)
          assert.deepStrictEqual(equals.from, from)
          assert.deepStrictEqual(equals.from.IDBKeyRange, IDBKeyRange)
          assert.equal(equals.only, 2)
          assert.equal(data.length, 1)
          assert.deepStrictEqual(data, [{ id: 2, title: "test2", count: 2, completed: false }])
        }
      }).pipe(provideDb(Db))
    })

    it.effect("select equals with index", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        {
          const api = yield* Db
          const from = api.from("todo")
          const select = from.select("titleIndex")
          const equals = select.equals("test3")
          const data = yield* equals

          assert.equal(from.table.tableName, "todo")
          assert.equal(equals.index, "titleIndex")
          assert.deepStrictEqual(equals.from, from)
          assert.deepStrictEqual(equals.from.IDBKeyRange, IDBKeyRange)
          assert.equal(equals.only, "test3")
          assert.equal(data.length, 1)
          assert.deepStrictEqual(data, [{ id: 3, title: "test3", count: 3, completed: false }])
        }
      }).pipe(provideDb(Db))
    })

    it.effect("select gte", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select().gte(2)

        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 2, title: "test2", count: 2, completed: false },
          { id: 3, title: "test3", count: 3, completed: false }
        ])
      }).pipe(provideDb(Db))
    })

    it.effect("select gte with index", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select("countIndex").gte(3)

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [
          { id: 3, title: "test3", count: 3, completed: false }
        ])
      }).pipe(provideDb(Db))
    })

    it.effect("select lte", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        {
          const api = yield* Db.getQueryBuilder
          const data = yield* api.from("todo").select().lte(2)

          assert.equal(data.length, 2)
          assert.deepStrictEqual(data, [
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false }
          ])
        }
      }).pipe(provideDb(Db))
    })

    it.effect("select gt", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select().gt(2)

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 3, title: "test3", count: 3, completed: false }])
      }).pipe(provideDb(Db))
    })

    it.effect("select lt", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select().lt(2)

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 1, title: "test1", count: 1, completed: false }])
      }).pipe(provideDb(Db))
    })

    it.effect("select between", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false },
            { id: 4, title: "test4", count: 4, completed: false },
            { id: 5, title: "test5", count: 5, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select().between(2, 3)

        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 2, title: "test2", count: 2, completed: false },
          { id: 3, title: "test3", count: 3, completed: false }
        ])
      }).pipe(provideDb(Db))
    })

    it.effect("select between with exclude", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false },
            { id: 4, title: "test4", count: 4, completed: false },
            { id: 5, title: "test5", count: 5, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select().between(2, 4, {
          excludeLowerBound: true,
          excludeUpperBound: true
        })

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 3, title: "test3", count: 3, completed: false }])
      }).pipe(provideDb(Db))
    })

    it.effect("select limit", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false },
            { id: 4, title: "test4", count: 4, completed: false },
            { id: 5, title: "test5", count: 5, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select().limit(2)

        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 1, title: "test1", count: 1, completed: false },
          { id: 2, title: "test2", count: 2, completed: false }
        ])
      }).pipe(provideDb(Db))
    })

    it.effect("select limit with filters", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false },
            { id: 4, title: "test4", count: 4, completed: false },
            { id: 5, title: "test5", count: 5, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select("countIndex").gte(2).limit(2)

        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 2, title: "test2", count: 2, completed: false },
          { id: 3, title: "test3", count: 3, completed: false }
        ])
      }).pipe(provideDb(Db))
    })

    it.effect("select first", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select().first()

        assert.deepStrictEqual(data, { id: 1, title: "test1", count: 1, completed: false })
      }).pipe(provideDb(Db))
    })

    it.effect("select first with filters", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 1, title: "test1", count: 1, completed: false },
            { id: 2, title: "test2", count: 2, completed: false },
            { id: 3, title: "test3", count: 3, completed: false }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const data = yield* api.from("todo").select("titleIndex").equals("test2").first()

        assert.deepStrictEqual(data, { id: 2, title: "test2", count: 2, completed: false })
      }).pipe(provideDb(Db))
    })
  })

  describe("modify", () => {
    it.effect("insert", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKey = yield* api.from("todo").insert({ id: 10, title: "insert1", count: 10, completed: true })
        const data = yield* api.from("todo").select()

        assert.equal(addedKey, 10)
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 10, title: "insert1", count: 10, completed: true }])
      }).pipe(provideDb(Db))
    })

    it.effect("insert schema with context", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("user-verify")
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKey = yield* api.from("user-verify").insert({ id: "abc" })
        const data = yield* api.from("user-verify").select()

        assert.equal(addedKey, "abc")
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: "abc" }])
      }).pipe(provideDb(Db), Effect.provideService(VerifyContext, VerifyContext.of({ maxLength: 4 })))
    })

    it.effect("insert with manual key required", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createObjectStore("user")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const createdAt = DateTime.unsafeNow()
        const addedKey = yield* api.from("user").insert(
          new User({
            id: 10,
            name: "insert1",
            email: "insert1@example.com",
            createdAt
          })
        )
        const data = yield* api.from("user").select()

        assert.equal(addedKey, 10)
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [new User({ id: 10, name: "insert1", email: "insert1@example.com", createdAt })])
      }).pipe(provideDb(Db))
    })

    it.effect("insert with manual multiple keys required", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createObjectStore("user")
          yield* api.createObjectStore("person")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKey = yield* api.from("person").insert({
          firstName: "John",
          lastName: "Doe",
          age: 30
        })
        const data = yield* api.from("person").select()

        assert.deepStrictEqual(addedKey, ["John", "Doe"])
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ firstName: "John", lastName: "Doe", age: 30 }])
      }).pipe(provideDb(Db))
    })

    it.effect("insert with manual key optional", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createObjectStore("user")
          yield* api.createObjectStore("product")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKey = yield* api.from("product").insert({
          key: 10,
          name: "insert1",
          price: 10
        })
        const data = yield* api.from("product").select()

        assert.equal(addedKey, 10)
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ key: 10, name: "insert1", price: 10 }])
      }).pipe(provideDb(Db))
    })

    it.effect("insert with auto-increment", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createObjectStore("user")
          yield* api.createObjectStore("product")
          yield* api.createObjectStore("price")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKey = yield* api.from("price").insertAll([
          { amount: 10 },
          { amount: 20, id: 10 },
          { amount: 30 }
        ])
        const data = yield* api.from("price").select()

        assert.deepStrictEqual(addedKey, [1, 10, 11])
        assert.equal(data.length, 3)
        assert.deepStrictEqual(data, [
          { id: 1, amount: 10 },
          { id: 10, amount: 20 },
          { id: 11, amount: 30 }
        ])
      }).pipe(provideDb(Db))
    })

    it.effect("insert with auto-increment and get first", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createObjectStore("user")
          yield* api.createObjectStore("product")
          yield* api.createObjectStore("price")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKey = yield* api.from("price").insert(
          { amount: 10 }
        )
        const data = yield* api.from("price").select().first()

        assert.equal(addedKey, 1)
        assert.deepStrictEqual(data, { id: 1, amount: 10 })
      }).pipe(provideDb(Db))
    })

    it.effect("upsert", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insert({ id: 10, title: "insert1", count: 10, completed: true })
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKey = yield* api.from("todo").upsert({ id: 10, title: "update1", count: -10, completed: false })
        const data = yield* api.from("todo").select()

        assert.equal(addedKey, 10)
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 10, title: "update1", count: -10, completed: false }])
      }).pipe(provideDb(Db))
    })

    it.effect("delete", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 10, title: "insert1", count: 10, completed: true },
            { id: 11, title: "insert2", count: 11, completed: true }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        yield* api.from("todo").delete().equals(10)
        const data = yield* api.from("todo").select()

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 11, title: "insert2", count: 11, completed: true }])
      }).pipe(provideDb(Db))
    })

    it.effect("delete with limit", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 10, title: "insert1", count: 10, completed: true },
            { id: 11, title: "insert2", count: 11, completed: true }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        yield* api.from("todo").delete().limit(1)
        const data = yield* api.from("todo").select()

        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [{ id: 11, title: "insert2", count: 11, completed: true }])
      }).pipe(provideDb(Db))
    })

    it.effect("clear", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 10, title: "insert1", count: 10, completed: true },
            { id: 11, title: "insert2", count: 11, completed: true }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        yield* api.from("todo").clear
        const data = yield* api.from("todo").select()

        assert.equal(data.length, 0)
      }).pipe(provideDb(Db))
    })
  })

  describe("modify all", () => {
    it.effect("insertAll", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKeys = yield* api.from("todo").insertAll([
          { id: 10, title: "insert1", count: 10, completed: true },
          { id: 11, title: "insert2", count: 11, completed: true }
        ])
        const data = yield* api.from("todo").select()

        assert.deepStrictEqual(addedKeys, [10, 11])
        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 10, title: "insert1", count: 10, completed: true },
          { id: 11, title: "insert2", count: 11, completed: true }
        ])
      }).pipe(provideDb(Db))
    })

    it.effect("upsertAll", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insertAll([
            { id: 10, title: "insert1", count: 10, completed: true },
            { id: 11, title: "insert2", count: 11, completed: true }
          ])
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKeys = yield* api.from("todo").upsertAll([
          { id: 10, title: "update1", count: -10, completed: false },
          { id: 11, title: "update2", count: -11, completed: false }
        ])
        const data = yield* api.from("todo").select()

        assert.deepStrictEqual(addedKeys, [10, 11])
        assert.equal(data.length, 2)
        assert.deepStrictEqual(data, [
          { id: 10, title: "update1", count: -10, completed: false },
          { id: 11, title: "update2", count: -11, completed: false }
        ])
      }).pipe(provideDb(Db))
    })

    it.effect("upsertAll same key", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insert({ id: 10, title: "insert1", count: 10, completed: true })
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        const addedKeys = yield* api.from("todo").upsertAll([
          { id: 10, title: "update1", count: -10, completed: false },
          { id: 10, title: "update2", count: -11, completed: false }
        ])
        const data = yield* api.from("todo").select()

        assert.deepStrictEqual(addedKeys, [10, 10])
        assert.equal(data.length, 1)
        assert.deepStrictEqual(data, [
          { id: 10, title: "update2", count: -11, completed: false }
        ])
      }).pipe(provideDb(Db))
    })

    it.effect("clearAll", () => {
      class Db extends IndexedDbDatabase.make(V1, (api) =>
        Effect.gen(function*() {
          yield* api.createObjectStore("todo")
          yield* api.createIndex("todo", "titleIndex")
          yield* api.createIndex("todo", "countIndex")
          yield* api.from("todo").insert({ id: 10, title: "insert1", count: 10, completed: true })
        }))
      {}

      return Effect.gen(function*() {
        const api = yield* Db.getQueryBuilder
        yield* api.clearAll
        const data = yield* api.from("todo").select()

        assert.equal(data.length, 0)
      }).pipe(provideDb(Db))
    })
  })

  it.effect("count", () => {
    class Db extends IndexedDbDatabase.make(V1, (api) =>
      Effect.gen(function*() {
        yield* api.createObjectStore("todo")
        yield* api.createIndex("todo", "titleIndex")
        yield* api.createIndex("todo", "countIndex")
        yield* api.from("todo").insertAll([
          { id: 1, title: "test1", count: 1, completed: false },
          { id: 2, title: "test2", count: 2, completed: false },
          { id: 3, title: "test3", count: 3, completed: false }
        ])
      }))
    {}

    return Effect.gen(function*() {
      const api = yield* Db.getQueryBuilder
      const data = yield* api.from("todo").count()

      assert.equal(data, 3)
    }).pipe(provideDb(Db))
  })

  it.effect("count with filters", () => {
    class Db extends IndexedDbDatabase.make(V1, (api) =>
      Effect.gen(function*() {
        yield* api.createObjectStore("todo")
        yield* api.createIndex("todo", "titleIndex")
        yield* api.createIndex("todo", "countIndex")
        yield* api.from("todo").insertAll([
          { id: 1, title: "test1", count: 1, completed: false },
          { id: 2, title: "test2", count: 2, completed: false },
          { id: 3, title: "test3", count: 3, completed: false }
        ])
      }))
    {}

    return Effect.gen(function*() {
      const api = yield* Db
      const data = yield* api.from("todo").count("titleIndex").equals("test2")

      assert.equal(data, 1)
    }).pipe(provideDb(Db))
  })
})
