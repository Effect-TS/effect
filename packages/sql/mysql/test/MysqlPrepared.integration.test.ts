import { MysqlConnection } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import { MysqlContainer, resultSet, rowsOf } from "./utils.ts"

const connect = (overrides: Partial<MysqlConnection.Config> = {}) =>
  Effect.flatMap(MysqlContainer, (container) =>
    MysqlConnection.make({
      url: Redacted.make(container.getConnectionUri()),
      ...overrides
    }))

/** performance_schema is readable by root but not by the container's test user. */
const connectAsRoot = (overrides: Partial<MysqlConnection.Config> = {}) =>
  Effect.flatMap(MysqlContainer, (container) =>
    MysqlConnection.make({
      host: container.getHost(),
      port: container.getPort(),
      username: "root",
      password: Redacted.make(container.getRootPassword()),
      database: container.getDatabase(),
      ...overrides
    }))

/**
 * How many statements this connection holds prepared. Prepared_stmt_count is
 * global, so it moves as other connections close; performance_schema can be
 * narrowed to the current session. The query runs on the text protocol, so
 * asking does not itself prepare anything.
 */
const preparedCount = (conn: MysqlConnection.MysqlConnection) =>
  Effect.map(
    conn.query(
      `SELECT COUNT(*) AS n FROM performance_schema.prepared_statements_instances
       WHERE OWNER_THREAD_ID = (
         SELECT THREAD_ID FROM performance_schema.threads WHERE PROCESSLIST_ID = CONNECTION_ID()
       )`
    ),
    (results) => Number(resultSet(results[0]).rows[0].n)
  )

describe("prepared statements", () => {
  it.layer(MysqlContainer.layer, { timeout: "120 seconds" })("binary protocol", (it) => {
    it.effect("binds parameters and decodes binary rows", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        const rows = rowsOf(yield* conn.execute("SELECT ? AS a, ? AS b, ? AS c", ["text", 42, null]))
        assert.deepStrictEqual(rows, [{ a: "text", b: 42n, c: null }])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("round-trips every parameter kind", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query(`CREATE TABLE bound (
          s VARCHAR(64), i INT, b BIGINT, f DOUBLE, t TINYINT, d DATETIME(3), v VARBINARY(8), n INT
        )`)
        const when = new Date(Date.UTC(2026, 8, 10, 14, 30, 5, 123))
        yield* conn.execute("INSERT INTO bound VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
          "hello",
          -7,
          9007199254740993n,
          1.5,
          true,
          when,
          new Uint8Array([1, 2, 3]),
          null
        ])
        const rows = rowsOf(yield* conn.execute("SELECT * FROM bound", []))
        assert.strictEqual(rows[0].s, "hello")
        assert.strictEqual(rows[0].i, -7)
        assert.strictEqual(rows[0].b, 9007199254740993n)
        assert.strictEqual(rows[0].f, 1.5)
        assert.strictEqual(rows[0].t, 1)
        assert.strictEqual(rows[0].d, when.getTime())
        assert.deepStrictEqual(Array.from(rows[0].v as Uint8Array), [1, 2, 3])
        assert.strictEqual(rows[0].n, null)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("decodes the same values as the text protocol", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query(`CREATE TABLE parity (
          i INT, b BIGINT, d DECIMAL(12,4), dt DATETIME, dd DATE, tm TIME, j JSON, t TEXT, bl BLOB
        )`)
        yield* conn.query(
          `INSERT INTO parity VALUES (1, 2, '3.5000', '2026-09-10 14:30:05', '2026-09-10', '-01:00:30',
           '{"a":1}', 'text', x'DEADBEEF')`
        )
        const [text] = yield* conn.query("SELECT * FROM parity")
        const [binary] = yield* conn.execute("SELECT * FROM parity", [])
        assert.deepStrictEqual(resultSet(binary).rows, resultSet(text).rows)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("reuses a cached statement instead of preparing it again", () =>
      Effect.gen(function*() {
        const conn = yield* connectAsRoot()
        assert.strictEqual(yield* preparedCount(conn), 0)
        yield* conn.execute("SELECT 1 AS n", [])
        assert.strictEqual(yield* preparedCount(conn), 1)
        yield* conn.execute("SELECT 1 AS n", [])
        yield* conn.execute("SELECT 1 AS n", [])
        assert.strictEqual(yield* preparedCount(conn), 1)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("closes an evicted statement rather than leaking it", () =>
      Effect.gen(function*() {
        const conn = yield* connectAsRoot({ preparedStatementCacheSize: 2 })
        yield* conn.execute("SELECT 1 AS a", [])
        yield* conn.execute("SELECT 2 AS b", [])
        assert.strictEqual(yield* preparedCount(conn), 2)
        // The third prepare evicts the first, whose COM_STMT_CLOSE rides along
        // with the next request rather than costing its own round trip.
        yield* conn.execute("SELECT 3 AS c", [])
        yield* conn.execute("SELECT 3 AS c", [])
        assert.strictEqual(yield* preparedCount(conn), 2)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("re-prepares a statement that was evicted", () =>
      Effect.gen(function*() {
        const conn = yield* connect({ preparedStatementCacheSize: 1 })
        assert.deepStrictEqual(rowsOf(yield* conn.execute("SELECT 1 AS n", [])), [{ n: 1n }])
        assert.deepStrictEqual(rowsOf(yield* conn.execute("SELECT 2 AS n", [])), [{ n: 2n }])
        assert.deepStrictEqual(rowsOf(yield* conn.execute("SELECT 1 AS n", [])), [{ n: 1n }])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("prepares nothing when preparation is disabled", () =>
      Effect.gen(function*() {
        const conn = yield* connectAsRoot({ prepare: false })
        const rows = rowsOf(yield* conn.query("SELECT 1 AS n"))
        assert.deepStrictEqual(rows, [{ n: 1n }])
        assert.strictEqual(yield* preparedCount(conn), 0)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("reports a parameter count mismatch", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        const error = yield* Effect.flip(conn.execute("SELECT ?, ?", [1]))
        assert.match(error.message, /parameter/i)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("classifies an error from a prepared statement", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE prepared_unique (name VARCHAR(64) UNIQUE)")
        yield* conn.execute("INSERT INTO prepared_unique (name) VALUES (?)", ["x"])
        const error = yield* Effect.flip(conn.execute("INSERT INTO prepared_unique (name) VALUES (?)", ["x"]))
        assert.strictEqual(error.reason._tag, "UniqueViolation")
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("reports a syntax error at prepare time", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        const error = yield* Effect.flip(conn.execute("SELECT * FROM no_such_table_here", []))
        assert.strictEqual(error.reason._tag, "SqlSyntaxError")
      }).pipe(Effect.scoped), { timeout: 60_000 })
  })
})
