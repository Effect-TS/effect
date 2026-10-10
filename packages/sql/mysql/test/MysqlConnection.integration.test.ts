import { MysqlConnection } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import { MysqlContainer, okResult, resultSet, rowsOf } from "./utils.ts"

const connect = (overrides: Partial<MysqlConnection.Config> = {}) =>
  Effect.flatMap(MysqlContainer, (container) =>
    MysqlConnection.make({
      url: Redacted.make(container.getConnectionUri()),
      ...overrides
    }))

describe("MysqlConnection", () => {
  it.layer(MysqlContainer.layer, { timeout: "120 seconds" })("against a real server", (it) => {
    it.effect("completes the handshake", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        assert.isAbove(conn.connectionId, 0)
        assert.match(conn.serverVersion, /^\d+\.\d+/)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("selects scalars and NULLs", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        const results = yield* conn.query("SELECT 1 AS n, 'hello' AS greeting, NULL AS nothing")
        assert.strictEqual(results.length, 1)
        assert.deepStrictEqual(resultSet(results[0]).rows, [{ n: 1n, greeting: "hello", nothing: null }])
        assert.deepStrictEqual(resultSet(results[0]).columns.map((column) => column.name), ["n", "greeting", "nothing"])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("reports affected rows and the last insert id", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE inserts (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(64))")
        const inserted = yield* conn.query("INSERT INTO inserts (name) VALUES ('alice'), ('bob')")
        // That an insert returns no rows is the tag's business now, so this
        // asserts the tag rather than an empty array.
        assert.strictEqual(inserted[0]._tag, "Ok")
        assert.strictEqual(okResult(inserted[0]).affectedRows, 2)
        assert.strictEqual(okResult(inserted[0]).lastInsertId, 1)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("returns one result per statement, which SqlModel depends on", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE multi (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(64))")
        const results = yield* conn.query(
          "INSERT INTO multi (name) VALUES ('carol'); SELECT * FROM multi WHERE id = LAST_INSERT_ID();"
        )
        assert.strictEqual(results.length, 2)
        assert.strictEqual(okResult(results[0]).affectedRows, 1)
        assert.deepStrictEqual(resultSet(results[1]).rows, [{ id: 1, name: "carol" }])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("returns rows as arrays", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        const values = yield* conn.queryValues("SELECT 1, 'two'")
        assert.deepStrictEqual(values, [[1n, "two"]])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("pings", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.ping
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("connects over TLS", () =>
      Effect.gen(function*() {
        // The container serves a self-signed certificate.
        const conn = yield* connect({ ssl: { rejectUnauthorized: false } })
        const results = yield* conn.query("SELECT 1 AS n")
        assert.deepStrictEqual(resultSet(results[0]).rows, [{ n: 1n }])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("classifies a duplicate key as a unique violation", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* conn.query("CREATE TABLE unique_names (name VARCHAR(64) UNIQUE)")
        yield* conn.query("INSERT INTO unique_names (name) VALUES ('dave')")
        const error = yield* Effect.flip(conn.query("INSERT INTO unique_names (name) VALUES ('dave')"))
        assert.strictEqual(error.reason._tag, "UniqueViolation")
        assert.strictEqual((error.reason as { readonly constraint: string }).constraint, "unique_names.name")
        assert.isFalse(error.isRetryable)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("classifies an unknown table as a syntax error", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        const error = yield* Effect.flip(conn.query("SELECT * FROM does_not_exist"))
        assert.strictEqual(error.reason._tag, "SqlSyntaxError")
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("authenticates a sha256_password account over a plaintext socket", () =>
      Effect.gen(function*() {
        const container = yield* MysqlContainer
        const root = yield* MysqlConnection.make({
          host: container.getHost(),
          port: container.getPort(),
          username: "root",
          password: Redacted.make(container.getRootPassword()),
          database: container.getDatabase()
        })
        yield* root.query("CREATE USER 'sha_plain'@'%' IDENTIFIED WITH sha256_password BY 'sha-secret'")
        yield* root.query("GRANT ALL ON *.* TO 'sha_plain'@'%'")

        // sha256_password has no cached verdict, so on a plaintext socket the
        // client has to fetch the server's key and encrypt the password.
        const conn = yield* MysqlConnection.make({
          host: container.getHost(),
          port: container.getPort(),
          username: "sha_plain",
          password: Redacted.make("sha-secret"),
          database: container.getDatabase()
        })
        assert.deepStrictEqual(rowsOf(yield* conn.query("SELECT 1 AS n")), [{ n: 1n }])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("authenticates a sha256_password account over TLS", () =>
      Effect.gen(function*() {
        const container = yield* MysqlContainer
        const root = yield* MysqlConnection.make({
          host: container.getHost(),
          port: container.getPort(),
          username: "root",
          password: Redacted.make(container.getRootPassword()),
          database: container.getDatabase()
        })
        yield* root.query("CREATE USER 'sha_tls'@'%' IDENTIFIED WITH sha256_password BY 'sha-secret'")
        yield* root.query("GRANT ALL ON *.* TO 'sha_tls'@'%'")

        // Over TLS the password goes as it is, with no key exchange.
        const conn = yield* MysqlConnection.make({
          host: container.getHost(),
          port: container.getPort(),
          username: "sha_tls",
          password: Redacted.make("sha-secret"),
          database: container.getDatabase(),
          ssl: { rejectUnauthorized: false }
        })
        assert.deepStrictEqual(rowsOf(yield* conn.query("SELECT 1 AS n")), [{ n: 1n }])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("rejects a wrong password", () =>
      Effect.gen(function*() {
        const container = yield* MysqlContainer
        const error = yield* Effect.flip(MysqlConnection.make({
          host: container.getHost(),
          port: container.getPort(),
          username: container.getUsername(),
          password: Redacted.make("definitely-not-the-password"),
          database: container.getDatabase()
        }))
        assert.strictEqual(error.reason._tag, "AuthenticationError")
      }).pipe(Effect.scoped), { timeout: 60_000 })
  })
})
