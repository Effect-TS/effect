import { PgConnection, PgTypes } from "@effect/sql-pg"
import { assert, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { PgContainer } from "./utils.ts"

it.layer(PgContainer.layer, { timeout: "30 seconds" })("PgConnection", (it) => {
  it.effect("connects through ReadyForQuery", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const connection = yield* PgConnection.make({
        url: Redacted.make(container.getConnectionUri())
      })
      assert.isAbove(connection.processId, 0)
    }))

  it.effect("runs unnamed extended queries with inferred binary parameters", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const connection = yield* PgConnection.make({
        url: Redacted.make(container.getConnectionUri())
      })
      const instant = new Date("2024-05-06T07:08:09.123Z")
      const result = yield* connection.query(
        "SELECT $1::int4 AS i, $2::float8 AS f, $3::int8 AS b, $4::bool AS flag, " +
          "$5::text AS text, $6::bytea AS bytes, $7::timestamptz AS instant, " +
          "$8::int4[] AS numbers, $9::text AS nil, $10::jsonb AS jsonb",
        [
          1,
          1.5,
          BigInt(2),
          true,
          "hello",
          new Int8Array([1, -1]),
          instant,
          [1, null, 3],
          null,
          PgTypes.jsonb({ nested: true })
        ]
      )
      assert.strictEqual(result.command, "SELECT")
      assert.strictEqual(result.rowCount, 1)
      assert.strictEqual(result.oid, null)
      assert.deepStrictEqual(result.rows, [{
        i: 1,
        f: 1.5,
        b: BigInt(2),
        flag: true,
        text: "hello",
        bytes: new Uint8Array([1, 255]),
        instant: instant.getTime(),
        numbers: [1, null, 3],
        nil: null,
        jsonb: { nested: true }
      }])
      assert.deepStrictEqual(result.fields.map((field) => field.name), [
        "i",
        "f",
        "b",
        "flag",
        "text",
        "bytes",
        "instant",
        "numbers",
        "nil",
        "jsonb"
      ])
    }))

  it.effect("returns queryValues in RowDescription order", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const connection = yield* PgConnection.make({
        url: Redacted.make(container.getConnectionUri())
      })
      const rows = yield* connection.queryValues(
        "SELECT $1::int8 AS second, $2::text AS first",
        [PgTypes.int8(BigInt(7)), "value"]
      )
      assert.deepStrictEqual(rows, [[BigInt(7), "value"]])
    }))

  it.effect("drains query errors and keeps the connection usable", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const connection = yield* PgConnection.make({
        url: Redacted.make(container.getConnectionUri())
      })
      yield* connection.query("CREATE TEMP TABLE pg_connection_unique (value int4 UNIQUE)")
      yield* connection.query("INSERT INTO pg_connection_unique VALUES ($1)", [1])
      const error = yield* Effect.flip(connection.query("INSERT INTO pg_connection_unique VALUES ($1)", [1]))
      assert.strictEqual(error.reason._tag, "UniqueViolation")
      if (error.reason._tag === "UniqueViolation") {
        assert.include(error.reason.constraint, "pg_connection_unique")
      }
      const result = yield* connection.query("SELECT count(*)::int8 AS count FROM pg_connection_unique")
      assert.deepStrictEqual(result.rows, [{ count: BigInt(1) }])
    }))

  it.effect("fails with AuthenticationError on a bad password", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const error = yield* Effect.flip(PgConnection.make({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: container.getUsername(),
        password: Redacted.make("definitely-wrong"),
        database: container.getDatabase()
      }))
      assert.strictEqual(error._tag, "SqlError")
      assert.strictEqual(error.reason._tag, "AuthenticationError")
    }))

  it.effect("fails when the server refuses TLS", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const error = yield* Effect.flip(PgConnection.make({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: container.getUsername(),
        password: Redacted.make(container.getPassword()),
        database: container.getDatabase(),
        ssl: true
      }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.include(error.reason.message, "refused TLS")
    }))
  it.effect("stays usable after a statement the server refuses to parse", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const connection = yield* PgConnection.make({
        url: Redacted.make(container.getConnectionUri())
      })
      const missing = yield* Effect.flip(connection.query("SELECT * FROM does_not_exist"))
      assert.strictEqual(missing.reason._tag, "SqlSyntaxError")
      const syntax = yield* Effect.flip(connection.query("SELECT FROM WHERE ????"))
      assert.strictEqual(syntax.reason._tag, "SqlSyntaxError")
      assert.deepStrictEqual((yield* connection.query("SELECT 42::int4 AS answer")).rows, [{ answer: 42 }])
    }))
})
