import type { D1Result } from "@cloudflare/workers-types"
import { D1Client } from "@effect/sql-d1"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { Statement } from "effect/unstable/sql"
import { isSqlError } from "effect/unstable/sql/SqlError"
import { D1Miniflare } from "./utils.ts"

const assertD1Result = (value: unknown): D1Result => {
  assert.isNotArray(value)
  assert.isObject(value)
  const result = value as D1Result
  assert.strictEqual(result.success, true)
  assert.isObject(result.meta)
  assert.isArray(result.results)
  return result
}

describe("Client", () => {
  it.effect("raw preserves the native SELECT result envelope", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      // Anchor last_row_id after native D1's first-query initialization.
      yield* sql`CREATE TABLE select_control (id INTEGER PRIMARY KEY)`
      yield* sql`INSERT INTO select_control (id) VALUES (${7})`
      const native = assertD1Result(
        yield* Effect.promise(() => sql.config.db.prepare("SELECT ? AS answer").bind(42).all())
      )
      assert.deepStrictEqual(native.results, [{ answer: 42 }])
      assert.strictEqual(native.meta.last_row_id, 7)
      const raw = assertD1Result(yield* sql`SELECT ${42} AS answer`.raw)
      assert.deepStrictEqual(raw.results, native.results)
      assert.strictEqual(raw.meta.changes, native.meta.changes)
      assert.strictEqual(raw.meta.last_row_id, native.meta.last_row_id)
      assert.strictEqual(raw.meta.rows_written, native.meta.rows_written)
      assert.strictEqual(raw.meta.rows_read, native.meta.rows_read)
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("raw preserves native INSERT metadata without RETURNING", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE raw_test (id INTEGER PRIMARY KEY, name TEXT)`
      const native = assertD1Result(
        yield* Effect.promise(() =>
          sql.config.db.prepare("INSERT INTO raw_test (name) VALUES (?)").bind("native").all()
        )
      )
      assert.deepStrictEqual(native.results, [])
      assert.strictEqual(native.meta.changes, 1)
      assert.strictEqual(native.meta.last_row_id, 1)
      const result = yield* sql`INSERT INTO raw_test (name) VALUES (${"effect"})`.raw
      assert.deepStrictEqual(yield* sql`SELECT * FROM raw_test ORDER BY id`, [
        { id: 1, name: "native" },
        { id: 2, name: "effect" }
      ])
      const raw = assertD1Result(result)
      assert.deepStrictEqual(raw.results, [])
      assert.strictEqual(raw.meta.changes, native.meta.changes)
      assert.strictEqual(raw.meta.last_row_id, 2)
      assert.strictEqual(raw.meta.rows_written, native.meta.rows_written)
      assert.strictEqual(raw.meta.rows_read, native.meta.rows_read)
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("raw preserves returned rows and metadata for INSERT RETURNING", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE raw_returning_test (id INTEGER PRIMARY KEY, name TEXT)`
      const raw = assertD1Result(
        yield* sql`INSERT INTO raw_returning_test (name) VALUES (${"effect"}) RETURNING *`.raw
      )
      assert.deepStrictEqual(raw.results, [{ id: 1, name: "effect" }])
      assert.strictEqual(raw.meta.changes, 1)
      assert.strictEqual(raw.meta.last_row_id, 1)
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("keeps prepared and unprepared row and positional results", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      const query = sql`SELECT ${42} AS answer, ${"hello"} AS greeting`
      assert.deepStrictEqual(yield* query, [{ answer: 42, greeting: "hello" }])
      assert.deepStrictEqual(yield* query.unprepared, [{ answer: 42, greeting: "hello" }])
      assert.deepStrictEqual(yield* query.withoutTransform, [{ answer: 42, greeting: "hello" }])
      assert.deepStrictEqual(yield* query.values, [[42, "hello"]])
      assert.deepStrictEqual(yield* query.valuesUnprepared, [[42, "hello"]])
      yield* sql`CREATE TABLE row_test (id INTEGER PRIMARY KEY, name TEXT)`
      assert.deepStrictEqual(yield* sql`INSERT INTO row_test (name) VALUES (${"prepared"})`, [])
      assert.deepStrictEqual(yield* sql`INSERT INTO row_test (name) VALUES (${"unprepared"})`.unprepared, [])
      assert.deepStrictEqual(yield* sql`SELECT * FROM row_test ORDER BY id`, [
        { id: 1, name: "prepared" },
        { id: 2, name: "unprepared" }
      ])
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("keeps query and result transforms on row paths", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE transform_test (first_name TEXT, "firstName" TEXT)`
      yield* sql`INSERT INTO transform_test (first_name, "firstName") VALUES ('John', 'Jane')`
      const transformed = yield* D1Client.make({
        db: sql.config.db,
        transformQueryNames: (name) => name === "firstName" ? "first_name" : name,
        transformResultNames: (name) => name === "first_name" ? "firstName" : name
      }).pipe(Effect.provide(Reactivity.layer))
      const query = transformed`SELECT ${transformed("firstName")} FROM transform_test`
      assert.deepStrictEqual(yield* query, [{ firstName: "John" }])
      assert.deepStrictEqual(yield* query.unprepared, [{ firstName: "John" }])
      assert.deepStrictEqual(yield* query.withoutTransform, [{ firstName: "Jane" }])
      assert.deepStrictEqual(yield* query.values, [["John"]])
      assert.deepStrictEqual(yield* query.valuesUnprepared, [["John"]])
      const withoutTransforms = transformed.withoutTransforms()
      assert.deepStrictEqual(
        yield* withoutTransforms`SELECT ${withoutTransforms("firstName")} FROM transform_test`,
        [{ firstName: "Jane" }]
      )
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("raw bypasses query and result name transforms", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE transform_raw_test (first_name TEXT, "firstName" TEXT)`
      yield* sql`INSERT INTO transform_raw_test (first_name, "firstName") VALUES ('John', 'Jane')`
      const transformed = yield* D1Client.make({
        db: sql.config.db,
        transformQueryNames: (name) => name === "firstName" ? "first_name" : name,
        transformResultNames: (name) => name === "first_name" ? "firstName" : name
      }).pipe(Effect.provide(Reactivity.layer))
      const raw = assertD1Result(
        yield* transformed`SELECT ${transformed("firstName")}, first_name FROM transform_raw_test`.raw
      )
      assert.deepStrictEqual(raw.results, [{ firstName: "Jane", first_name: "John" }])
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("keeps real statement errors in the SqlError channel", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      const query = sql`SELEC 42 AS answer`
      for (const operation of [query, query.raw, query.unprepared, query.values, query.valuesUnprepared]) {
        const error = yield* Effect.flip(operation)
        assert.isTrue(isSqlError(error))
        assert.strictEqual(error.reason._tag, "UnknownError")
        assert.strictEqual(error.reason.operation, "execute")
      }
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("classifies native errors without stable sqlite codes as UnknownError", () =>
    Effect.gen(function*() {
      const failingDb = {
        prepare: () => ({
          bind: () => ({
            all: async () => {
              throw new Error("boom")
            }
          })
        })
      } as any

      const client = yield* D1Client.make({ db: failingDb })
      const error = yield* Effect.flip(client`SELECT 1`)
      assert.strictEqual(error.reason._tag, "UnknownError")
    }).pipe(
      Effect.scoped,
      Effect.provide(Reactivity.layer)
    ))

  it.effect("should handle queries without transactions", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql`INSERT INTO test (name) VALUES ('hello')`
      let rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [{ id: 1, name: "hello" }])
      yield* sql`INSERT INTO test (name) VALUES ('world')`
      rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [
        { id: 1, name: "hello" },
        { id: 2, name: "world" }
      ])
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("should handle queries with params without transactions", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql`INSERT INTO test ${sql.insert({ name: "hello" })}`
      const rows = yield* sql`SELECT * FROM test WHERE name = ${"hello"}`
      assert.deepStrictEqual(rows, [{ id: 1, name: "hello" }])
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("should execute statements in a batch", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`

      const results: readonly [
        ReadonlyArray<{ id: number; name: string }>,
        ReadonlyArray<{ id: number; name: string }>,
        ReadonlyArray<{ count: number }>
      ] = yield* sql.batch(
        [
          sql<{ id: number; name: string }>`INSERT INTO test (name) VALUES (${"hello"}) RETURNING *`,
          sql<{ id: number; name: string }>`INSERT INTO test (name) VALUES (${"world"}) RETURNING *`,
          sql<{ count: number }>`SELECT COUNT(*) AS count FROM test`
        ] as const
      )

      assert.deepStrictEqual(results, [
        [{ id: 1, name: "hello" }],
        [{ id: 2, name: "world" }],
        [{ count: 2 }]
      ])
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("should apply result transforms to batch results", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE test (first_name TEXT, "firstName" TEXT)`
      yield* sql`INSERT INTO test (first_name, "firstName") VALUES ('John', 'Jane')`

      yield* Effect.gen(function*() {
        const transformed = yield* D1Client.make({
          db: sql.config.db,
          transformQueryNames: (name) => name === "firstName" ? "first_name" : name,
          transformResultNames: (name) => name === "first_name" ? "firstName" : name
        })
        const [rows] = yield* transformed.batch([
          transformed<{ firstName: string }>`SELECT ${transformed("firstName")} FROM test`
        ])
        assert.deepStrictEqual(rows, [{ firstName: "John" }])

        const withoutTransforms = transformed.withoutTransforms()
        const [rawRows] = yield* withoutTransforms.batch([
          withoutTransforms<{ firstName: string }>`SELECT ${withoutTransforms("firstName")} FROM test`
        ])
        assert.deepStrictEqual(rawRows, [{ firstName: "Jane" }])

        const [rawRowsFromTransformedBatch] = yield* transformed.batch([
          withoutTransforms<{ first_name: string }>`SELECT ${withoutTransforms("first_name")} FROM test`
        ])
        assert.deepStrictEqual(rawRowsFromTransformedBatch, [{ first_name: "John" }])

        const [transformedRowsFromRawBatch] = yield* withoutTransforms.batch([
          transformed<{ firstName: string }>`SELECT ${transformed("firstName")} FROM test`
        ])
        assert.deepStrictEqual(transformedRowsFromRawBatch, [{ firstName: "John" }])
      }).pipe(
        Effect.scoped,
        Effect.provide(Reactivity.layer)
      )
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("should disable query-only transforms", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE test (first_name TEXT, "firstName" TEXT)`
      yield* sql`INSERT INTO test (first_name, "firstName") VALUES ('John', 'Jane')`

      yield* Effect.gen(function*() {
        const transformed = yield* D1Client.make({
          db: sql.config.db,
          transformQueryNames: (name) => name === "firstName" ? "first_name" : name
        })
        const [transformedRows] = yield* transformed.batch([
          transformed<{ first_name: string }>`SELECT ${transformed("firstName")} FROM test`
        ])
        assert.deepStrictEqual(transformedRows, [{ first_name: "John" }])

        const withoutTransforms = transformed.withoutTransforms()
        const [rawRows] = yield* withoutTransforms.batch([
          withoutTransforms<{ firstName: string }>`SELECT ${withoutTransforms("firstName")} FROM test`
        ])
        assert.deepStrictEqual(rawRows, [{ firstName: "Jane" }])
      }).pipe(
        Effect.scoped,
        Effect.provide(Reactivity.layer)
      )
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("should roll back a failed batch", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT UNIQUE)`

      const error = yield* sql.batch([
        sql`INSERT INTO test (name) VALUES (${"duplicate"})`,
        sql`INSERT INTO test (name) VALUES (${"duplicate"})`
      ]).pipe(Effect.flip)

      assert.strictEqual(error.reason._tag, "UnknownError")
      assert.strictEqual(error.reason.operation, "execute")
      const rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [])
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("should support an empty batch", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      const results: readonly [] = yield* sql.batch([])
      assert.deepStrictEqual(results, [])
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("should apply statement transformers in a batch", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      const queries: Array<string> = []

      const results = yield* sql.batch([
        sql`SELECT ${1} AS value`,
        sql`SELECT ${2} AS value`
      ]).pipe(
        Effect.provideService(Statement.CurrentTransformer, (statement, sql) =>
          Effect.sync(() => {
            queries.push(statement.compile()[0])
          }).pipe(Effect.as(sql`SELECT ${3} AS value`)))
      )

      assert.deepStrictEqual(queries, ["SELECT ? AS value", "SELECT ? AS value"])
      assert.deepStrictEqual(results, [[{ value: 3 }], [{ value: 3 }]])
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("should defect on transactions", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      const res = yield* sql`INSERT INTO test ${sql.insert({ name: "hello" })}`.pipe(
        sql.withTransaction,
        Effect.sandbox,
        Effect.flip
      )
      const rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [])
      assert.equal(Cause.hasDies(res), true)
    }).pipe(Effect.provide(D1Miniflare.layerClient)))

  it.effect("should defect when batching in a transaction", () =>
    Effect.gen(function*() {
      const sql = yield* D1Client.D1Client
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      const res = yield* sql.batch([
        sql`INSERT INTO test ${sql.insert({ name: "hello" })}`
      ]).pipe(
        sql.withTransaction,
        Effect.sandbox,
        Effect.flip
      )
      const rows = yield* sql`SELECT * FROM test`
      assert.deepStrictEqual(rows, [])
      assert.equal(Cause.hasDies(res), true)
    }).pipe(Effect.provide(D1Miniflare.layerClient)))
})
