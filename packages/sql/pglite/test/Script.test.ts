import { PgliteClient } from "@effect/sql-pglite"
import { assert, describe, layer } from "@effect/vitest"
import { Effect, Stream } from "effect"

describe("PgliteClient SQL scripts", { concurrent: false }, () => {
  layer(PgliteClient.layer(), { timeout: "30 seconds" })((it) => {
    it.effect("executes multiple DDL statements", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        const rows = yield* sql`
          CREATE TABLE script_indexes (id INTEGER, value TEXT);
          CREATE INDEX script_indexes_id ON script_indexes (id);
          CREATE INDEX script_indexes_value ON script_indexes (value);
        `
        assert.deepStrictEqual(rows, [])
        const indexes = yield* sql<{ indexname: string }>`
          SELECT indexname FROM pg_indexes
          WHERE tablename = ${"script_indexes"} ORDER BY indexname
        `
        assert.deepStrictEqual(indexes, [
          { indexname: "script_indexes_id" },
          { indexname: "script_indexes_value" }
        ])
      }))

    it.effect("returns the last statement's rows through each row execution mode", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        const statement = sql<{ value: number }>`SELECT 1 AS discarded; SELECT 2 AS value;`
        assert.deepStrictEqual(yield* statement, [{ value: 2 }])
        assert.deepStrictEqual(yield* statement.unprepared, [{ value: 2 }])
        assert.deepStrictEqual(yield* Stream.runCollect(statement.stream), [{ value: 2 }])
      }))

    it.effect("returns no rows for an empty script or a final DDL statement", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        assert.deepStrictEqual(yield* sql.unsafe(""), [])
        assert.deepStrictEqual(yield* sql.unsafe("-- no statements\n"), [])
        assert.deepStrictEqual(yield* sql`SELECT 1; CREATE TABLE script_final_ddl (id INTEGER);`, [])
      }))

    it.effect("preserves semicolons in literals, comments and dollar-quoted blocks", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        const rows = yield* sql<{ value: string }>`
          CREATE TABLE script_literals (value TEXT);
          -- A semicolon here must not split the script: ;
          DO $$ BEGIN
            INSERT INTO script_literals VALUES ('hello; world');
          END $$;
          SELECT value FROM script_literals;
        `
        assert.deepStrictEqual(rows, [{ value: "hello; world" }])
      }))

    it.effect("keeps bound values on the parameterized execution path", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        yield* sql`CREATE TABLE script_parameters (value TEXT)`
        const value = "'); DROP TABLE script_parameters; --"
        yield* sql`INSERT INTO script_parameters VALUES (${value})`
        const statement = sql<{ value: string }>`SELECT value FROM script_parameters WHERE value = ${value}`
        assert.deepStrictEqual(yield* statement, [{ value }])
        assert.deepStrictEqual(yield* statement.unprepared, [{ value }])
        assert.deepStrictEqual(yield* Stream.runCollect(statement.stream), [{ value }])
      }))

    it.effect("classifies script failures and rolls back preceding statements", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        yield* sql`CREATE TABLE script_failure (id INTEGER PRIMARY KEY)`
        const error = yield* Effect.flip(sql`
          INSERT INTO script_failure VALUES (1);
          INSERT INTO script_failure VALUES (1);
        `)
        assert.strictEqual(error.reason._tag, "UniqueViolation")
        assert.deepStrictEqual(yield* sql`SELECT * FROM script_failure`, [])
      }))

    it.effect("rolls back scripts and bound statements with the enclosing transaction", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        yield* sql`CREATE TABLE script_transaction (value TEXT)`
        const error = yield* Effect.flip(sql.withTransaction(Effect.gen(function*() {
          yield* sql`INSERT INTO script_transaction VALUES ('first'); INSERT INTO script_transaction VALUES ('second');`
          yield* sql`INSERT INTO script_transaction VALUES (${"third"})`
          return yield* Effect.fail("rollback")
        })))
        assert.strictEqual(error, "rollback")
        assert.deepStrictEqual(yield* sql`SELECT * FROM script_transaction`, [])
      }))
  })

  layer(PgliteClient.layer({ transformResultNames: (name) => name.toUpperCase() }), {
    timeout: "30 seconds"
  })((it) => {
    it.effect("applies result transformations to the final statement", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        const statement = sql<{ VALUE: number }>`SELECT 1 AS discarded; SELECT 2 AS value;`
        assert.deepStrictEqual(yield* statement, [{ VALUE: 2 }])
        assert.deepStrictEqual(yield* statement.unprepared, [{ VALUE: 2 }])
        assert.deepStrictEqual(yield* Stream.runCollect(statement.stream), [{ VALUE: 2 }])
      }))
  })
})
