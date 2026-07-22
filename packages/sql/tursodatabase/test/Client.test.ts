import { TursoClient } from "@effect/sql-tursodatabase"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { Reactivity } from "effect/unstable/reactivity"

const makeClient = TursoClient.make({
  url: ":memory:"
}).pipe(Effect.provide(Reactivity.layer))

describe("Client", () => {
  it.effect("should work", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      let response
      response = yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      assert.deepStrictEqual(response, [])
      response = yield* sql`INSERT INTO test (name) VALUES ('hello')`
      assert.deepStrictEqual(response, [])
      response = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(response, [{ id: 1, name: "hello" }])
      response = yield* sql`SELECT * FROM test`.values
      assert.deepStrictEqual(response, [[1, "hello"]])
      response = yield* sql`INSERT INTO test (name) VALUES ('world')`.pipe(sql.withTransaction)
      assert.deepStrictEqual(response, [])
      response = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(response, [
        { id: 1, name: "hello" },
        { id: 2, name: "world" }
      ])
    }))

  it.effect("should work with raw", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      let response
      response = yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`.raw
      assert.deepStrictEqual(response, { changes: 0, lastInsertRowid: 0 })
      response = yield* sql`INSERT INTO test (name) VALUES ('hello')`.raw
      assert.deepStrictEqual(response, { changes: 1, lastInsertRowid: 1 })
      response = yield* sql`SELECT * FROM test`.raw
      assert.deepStrictEqual(response, [{ id: 1, name: "hello" }])
      response = yield* sql`INSERT INTO test (name) VALUES ('world')`.raw.pipe(sql.withTransaction)
      assert.deepStrictEqual(response, { changes: 1, lastInsertRowid: 2 })
      response = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(response, [
        { id: 1, name: "hello" },
        { id: 2, name: "world" }
      ])
    }))

  it.effect("withTransaction", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql.withTransaction(sql`INSERT INTO test (name) VALUES ('hello')`)
      const rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [{ id: 1, name: "hello" }])
    }))

  it.effect("withTransaction rollback", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql`INSERT INTO test (name) VALUES ('hello')`.pipe(
        Effect.andThen(Effect.fail("boom")),
        sql.withTransaction,
        Effect.ignore
      )
      const rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [])
    }))

  it.effect("withTransaction nested", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      const stmt = sql`INSERT INTO test (name) VALUES ('hello')`
      yield* stmt.pipe(Effect.andThen(() => stmt.pipe(sql.withTransaction)), sql.withTransaction)
      const rows = yield* sql<{ total_rows: number }>`select count(*) as total_rows FROM test`
      assert.deepStrictEqual(rows.at(0)?.total_rows, 2)
    }))

  it.effect("withTransaction nested rollback", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      const stmt = sql`INSERT INTO test (name) VALUES ('hello')`
      yield* stmt.pipe(
        Effect.andThen(() => stmt.pipe(Effect.andThen(Effect.fail("boom")), sql.withTransaction, Effect.ignore)),
        sql.withTransaction
      )
      const rows = yield* sql<{ total_rows: number }>`select count(*) as total_rows FROM test`
      assert.deepStrictEqual(rows.at(0)?.total_rows, 1)
    }))
})
