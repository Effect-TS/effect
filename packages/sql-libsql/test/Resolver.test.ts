import { SqlError, SqlResolver } from "@effect/sql"
import { LibsqlClient } from "@effect/sql-libsql"
import { assert, layer } from "@effect/vitest"
import { Array, Effect, Layer, Option } from "effect"
import * as Schema from "effect/Schema"
import { LibsqlContainer } from "./util.js"

const seededClient = Effect.gen(function*() {
  const sql = yield* LibsqlClient.LibsqlClient
  yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
  yield* Effect.forEach(Array.range(1, 100), (id) => sql`INSERT INTO test ${sql.insert({ id, name: `name${id}` })}`)
  yield* Effect.addFinalizer(() => sql`DROP TABLE test;`.pipe(Effect.orDie))
  return sql
})

layer(LibsqlContainer.ClientLive, { timeout: "30 seconds" })("Resolver", (it) => {
  it.layer(Layer.empty)("ordered", (it) => {
    it.scoped("insert", () =>
      Effect.gen(function*() {
        const batches: Array<Array<string>> = []
        const sql = yield* seededClient
        const Insert = yield* SqlResolver.ordered("Insert", {
          Request: Schema.String,
          Result: Schema.Struct({ id: Schema.Number, name: Schema.String }),
          execute: (names) => {
            batches.push(names)
            return sql`INSERT INTO test ${sql.insert(names.map((name) => ({ name })))} RETURNING *`
          }
        })
        assert.deepStrictEqual(
          yield* Effect.all({
            one: Insert.execute("one"),
            two: Insert.execute("two")
          }, { batching: true }),
          {
            one: { id: 101, name: "one" },
            two: { id: 102, name: "two" }
          }
        )
        assert.deepStrictEqual(batches, [["one", "two"]])
      }))

    it.scoped("result length mismatch", () =>
      Effect.gen(function*() {
        const batches: Array<Array<number>> = []
        const sql = yield* seededClient
        const Select = yield* SqlResolver.ordered("Select", {
          Request: Schema.Number,
          Result: Schema.Struct({ id: Schema.Number, name: Schema.String }),
          execute: (ids) => {
            batches.push(ids)
            return sql`SELECT * FROM test WHERE id IN ${sql.in(ids)}`
          }
        })
        const error = yield* Effect.all([
          Select.execute(1),
          Select.execute(2),
          Select.execute(3),
          Select.execute(101)
        ], { batching: true }).pipe(
          Effect.flip
        )
        assert(error instanceof SqlError.ResultLengthMismatch)
        assert.strictEqual(error.actual, 3)
        assert.strictEqual(error.expected, 4)
        assert.deepStrictEqual(batches, [[1, 2, 3, 101]])
      }))
  })

  it.layer(Layer.empty)("grouped", (it) => {
    it.scoped("find by name", () =>
      Effect.gen(function*() {
        const sql = yield* seededClient
        const FindByName = yield* SqlResolver.grouped("FindByName", {
          Request: Schema.String,
          RequestGroupKey: (name) => name,
          Result: Schema.Struct({ id: Schema.Number, name: Schema.String }),
          ResultGroupKey: (result) => result.name,
          execute: (names) => sql`SELECT * FROM test WHERE name IN ${sql.in(names)}`
        })
        yield* sql`INSERT INTO test ${sql.insert({ name: "name1" })}`
        assert.deepStrictEqual(
          yield* Effect.all({
            one: FindByName.execute("name1"),
            two: FindByName.execute("name2"),
            three: FindByName.execute("name0")
          }, { batching: true }),
          {
            one: [{ id: 1, name: "name1" }, { id: 101, name: "name1" }],
            two: [{ id: 2, name: "name2" }],
            three: []
          }
        )
      }))

    it.scoped("using raw rows", () =>
      Effect.gen(function*() {
        const sql = yield* seededClient
        const FindByName = yield* SqlResolver.grouped("FindByName", {
          Request: Schema.String,
          RequestGroupKey: (name) => name,
          Result: Schema.Struct({ id: Schema.Number, name: Schema.String }),
          ResultGroupKey: (_, result: any) => result.name,
          execute: (names) => sql`SELECT * FROM test WHERE name IN ${sql.in(names)}`
        })
        yield* sql`INSERT INTO test ${sql.insert({ name: "name1" })}`
        assert.deepStrictEqual(
          yield* Effect.all({
            one: FindByName.execute("name1"),
            two: FindByName.execute("name2"),
            three: FindByName.execute("name0")
          }, { batching: true }),
          {
            one: [{ id: 1, name: "name1" }, { id: 101, name: "name1" }],
            two: [{ id: 2, name: "name2" }],
            three: []
          }
        )
      }))
  })

  it.layer(Layer.empty)("findById", (it) => {
    it.scoped("find by id", () =>
      Effect.gen(function*() {
        const sql = yield* seededClient
        const FindById = yield* SqlResolver.findById("FindById", {
          Id: Schema.Number,
          Result: Schema.Struct({ id: Schema.Number, name: Schema.String }),
          ResultId: (result) => result.id,
          execute: (ids) => sql`SELECT * FROM test WHERE id IN ${sql.in(ids)}`
        })
        assert.deepStrictEqual(
          yield* Effect.all({
            one: FindById.execute(1),
            two: FindById.execute(2),
            three: FindById.execute(101)
          }, { batching: true }),
          {
            one: Option.some({ id: 1, name: "name1" }),
            two: Option.some({ id: 2, name: "name2" }),
            three: Option.none()
          }
        )
      }))

    it.scoped("using raw rows", () =>
      Effect.gen(function*() {
        const sql = yield* seededClient
        const FindById = yield* SqlResolver.findById("FindById", {
          Id: Schema.Number,
          Result: Schema.Struct({ id: Schema.Number, name: Schema.String }),
          ResultId: (_, result: any) => result.id,
          execute: (ids) => sql`SELECT * FROM test WHERE id IN ${sql.in(ids)}`
        })
        assert.deepStrictEqual(
          yield* Effect.all({
            one: FindById.execute(1),
            two: FindById.execute(2),
            three: FindById.execute(101)
          }, { batching: true }),
          {
            one: Option.some({ id: 1, name: "name1" }),
            two: Option.some({ id: 2, name: "name2" }),
            three: Option.none()
          }
        )
      }))
  })
})
