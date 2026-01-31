import { Reactivity } from "@effect/experimental"
import { BunFileSystem } from "@effect/platform-bun"
import { FileSystem } from "@effect/platform/FileSystem"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import * as SqlClient from "@effect/sql/SqlClient"
import { describe, expect, test } from "bun:test"
import { Effect, pipe } from "effect"

const makeClient = Effect.gen(function*() {
  const fs = yield* FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return yield* SqliteClient.make({
    filename: dir + "/test.db"
  })
}).pipe(Effect.provide([BunFileSystem.layer, Reactivity.layer]))

describe("Client", () => {
  test("works", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
      yield* sql`INSERT INTO test (name) VALUES ('hello')`
      let rows = yield* sql`SELECT * FROM test`
      expect(rows).toEqual([{ id: 1, name: "hello" }])
      yield* pipe(sql`INSERT INTO test (name) VALUES ('world')`, sql.withTransaction)
      rows = yield* sql`SELECT * FROM test`
      expect(rows).toEqual([
        { id: 1, name: "hello" },
        { id: 2, name: "world" }
      ])
    }).pipe(Effect.scoped, Effect.runPromise))

  test("SafeIntegers returns bigint for large integers", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      const big = 9007199254740993n // 2^53 + 1

      yield* sql`CREATE TABLE safe_int_test (id BIGINT)`
      yield* sql`INSERT INTO safe_int_test (id) VALUES (${big})`

      const resultSafe = (yield* sql`SELECT id FROM safe_int_test`.pipe(
        Effect.provideService(SqlClient.SafeIntegers, true)
      ))[0]?.id
      expect(typeof resultSafe).toBe("bigint")
      expect(resultSafe).toBe(big)

      const resultDefault = (yield* sql`SELECT id FROM safe_int_test`)[0]?.id
      expect(typeof resultDefault).not.toBe("bigint")
    }).pipe(Effect.scoped, Effect.runPromise))

  test("SafeIntegers works with values query", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
      const big = 9007199254740993n // 2^53 + 1

      yield* sql`CREATE TABLE safe_int_values_test (id BIGINT)`
      yield* sql`INSERT INTO safe_int_values_test (id) VALUES (${big})`

      const resultSafe = (yield* sql`SELECT id FROM safe_int_values_test`.values.pipe(
        Effect.provideService(SqlClient.SafeIntegers, true)
      ))[0]?.[0]
      expect(typeof resultSafe).toBe("bigint")
      expect(resultSafe).toBe(big)

      const resultDefault = (yield* sql`SELECT id FROM safe_int_values_test`.values)[0]?.[0]
      expect(typeof resultDefault).not.toBe("bigint")
    }).pipe(Effect.scoped, Effect.runPromise))
})
