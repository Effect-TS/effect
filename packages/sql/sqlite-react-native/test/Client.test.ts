import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Reactivity } from "effect/unstable/reactivity"
import { vi } from "vitest"

const state = vi.hoisted(() => {
  const blob = new Uint8Array([1, 2, 3]).buffer
  const value = (query: string) => query.includes("blob_value") ? blob : 1
  const row = (query: string): Record<string, unknown> => ({ value: value(query) })
  return {
    database: {
      close() {},
      execute: async (query: string) => ({ rowsAffected: 0, rows: [row(query)] }),
      executeRaw: async (query: string) => ({ rowsAffected: 0, rawRows: [[value(query)]], columnNames: ["value"] }),
      executeRawSync: (query: string) => ({ rowsAffected: 0, rawRows: [[value(query)]], columnNames: ["value"] }),
      executeSync: (query: string) => ({ rowsAffected: 0, rows: [row(query)] })
    }
  }
})

vi.mock("@op-engineering/op-sqlite", () => ({
  open: () => state.database
}))

import { SqliteClient } from "@effect/sql-sqlite-react-native"

describe("Client", () => {
  it.effect("should work", () => Effect.void)

  it.effect("returns array rows from synchronous values queries", () =>
    Effect.gen(function*() {
      const sql = yield* SqliteClient.make({ filename: "test.db" })
      const rows = yield* sql`SELECT 1 AS value`.values
      const unpreparedRows = yield* sql`SELECT 1 AS value`.valuesUnprepared
      assert.deepStrictEqual(rows, [[1]])
      assert.deepStrictEqual(unpreparedRows, [[1]])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("returns array rows from asynchronous values queries", () =>
    Effect.gen(function*() {
      const sql = yield* SqliteClient.make({ filename: "test.db" })
      const rows = yield* SqliteClient.withAsyncQuery(sql`SELECT 1 AS value`.values)
      const unpreparedRows = yield* SqliteClient.withAsyncQuery(sql`SELECT 1 AS value`.valuesUnprepared)
      assert.deepStrictEqual(rows, [[1]])
      assert.deepStrictEqual(unpreparedRows, [[1]])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("normalizes BLOB columns for Schema.Uint8Array", () =>
    Effect.gen(function*() {
      const sql = yield* SqliteClient.make({ filename: "test.db" })
      const syncRows = yield* sql`SELECT blob_value AS value`
      const asyncRows = yield* SqliteClient.withAsyncQuery(sql`SELECT blob_value AS value`)
      const decodeRows = Schema.decodeUnknownEffect(
        Schema.Array(Schema.Struct({ value: Schema.Uint8Array }))
      )
      const expectedRows = [{ value: new Uint8Array([1, 2, 3]) }]
      assert.deepStrictEqual(yield* decodeRows(syncRows), expectedRows)
      assert.deepStrictEqual(yield* decodeRows(asyncRows), expectedRows)

      const syncValues = yield* sql`SELECT blob_value AS value`.values
      const asyncValues = yield* SqliteClient.withAsyncQuery(sql`SELECT blob_value AS value`.values)
      const expectedValues = [[new Uint8Array([1, 2, 3])]]
      assert.deepStrictEqual(syncValues, expectedValues)
      assert.deepStrictEqual(asyncValues, expectedValues)
    }).pipe(Effect.provide(Reactivity.layer)))
})
