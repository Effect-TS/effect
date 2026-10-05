import { NodeSocketConnector } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Stream } from "effect"
import { MssqlClient, MssqlConnection, MssqlTypes, Procedure } from "effect/mssql"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Socket from "effect/socket/Socket"

// Run against a disposable SQL Server database:
// EFFECT_INTEGRATION_TESTS=1 MSSQL_TEST_HOST=localhost MSSQL_TEST_USERNAME=sa
// MSSQL_TEST_PASSWORD=... pnpm test --run packages/effect/test/mssql/MssqlClient.integration.test.ts
// Strict TLS (SQL Server 2022 / TDS 8.0) is the default. MSSQL_TEST_CA supplies
// a PEM certificate authority; MSSQL_TEST_SERVERNAME overrides its hostname.
// MSSQL_TEST_ENCRYPTION=mandatory exercises encrypted TDS 7.4 instead.
// MSSQL_TEST_PLAINTEXT=1 explicitly permits unencrypted TDS 7.4.
// MSSQL_TEST_PROCEDURES=1 additionally exercises temporary stored procedures.
const host = process.env.MSSQL_TEST_HOST
const transport = Layer.mergeAll(NodeSocketConnector.layer, Reactivity.layer)
const plaintext = process.env.MSSQL_TEST_PLAINTEXT === "1"
const options: MssqlClient.MssqlClientConfig = {
  host: host ?? "localhost",
  port: Number(process.env.MSSQL_TEST_PORT ?? 1433),
  username: process.env.MSSQL_TEST_USERNAME ?? "sa",
  password: Redacted.make(process.env.MSSQL_TEST_PASSWORD ?? ""),
  database: process.env.MSSQL_TEST_DATABASE ?? "tempdb",
  encryption: plaintext ? "disable" : process.env.MSSQL_TEST_ENCRYPTION === "mandatory" ? "mandatory" : "strict",
  allowPlaintext: plaintext,
  tls: {
    ca: process.env.MSSQL_TEST_CA,
    servername: process.env.MSSQL_TEST_SERVERNAME
  },
  connectTimeout: "10 seconds",
  maxConnections: 1
}

describe.skipIf(host === undefined)("native SQL Server integration", () => {
  describe.skipIf(plaintext)("TLS certificate verification", () => {
    it.effect("rejects a hostname mismatch before evaluating credentials", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(MssqlConnection.make({
          ...options,
          tls: { ...options.tls, servername: "native-sql-certificate-mismatch.invalid" },
          password: Effect.die("Credentials must not be evaluated before certificate verification")
        }))
        assert.strictEqual(error.reason._tag, "ConnectionError")
        if (!Socket.isSocketError(error.reason.cause)) assert.fail("Expected a TLS socket error")
        assert.propertyVal(error.reason.cause.reason.cause, "code", "ERR_TLS_CERT_ALTNAME_INVALID")
      }).pipe(Effect.provide(transport)), { timeout: 30000 })
  })

  it.effect("round trips native bound values through independent server decoding", () =>
    Effect.gen(function*() {
      const sql = yield* MssqlClient.makeClient(options)
      const text = "雪💚'; DROP TABLE ignored;--\0"
      const bytes = Uint8Array.of(99, 0, 1, 255, 99).subarray(1, 4)
      const instant = new Date("2025-04-02T09:08:07.123Z")
      const big = BigInt("9223372036854775807")
      const guid = "01234567-89ab-cdef-0123-456789abcdef"
      const result = yield* sql`
        SELECT ${text} AS [text], ${bytes} AS bytes, ${1.5} AS float_value,
          ${sql.param(MssqlTypes.TYPES.Int, 42)} AS integer_value,
          ${big} AS big_value, ${true} AS bit_value, ${instant} AS instant,
          ${sql.param(MssqlTypes.TYPES.UniqueIdentifier, guid)} AS guid,
          ${null} AS nil, CAST(123456789.12 AS decimal(18, 2)) AS decimal_value
      `
      assert.deepStrictEqual(result, [{
        text,
        bytes,
        float_value: 1.5,
        integer_value: 42,
        big_value: big,
        bit_value: true,
        instant,
        guid,
        nil: null,
        decimal_value: "123456789.12"
      }])
      const large = "雪💚".repeat(6000)
      assert.deepStrictEqual(yield* sql`SELECT ${large} AS [text]`, [{ text: large }])
      assert.deepStrictEqual(yield* sql`SELECT ${sql.param("Int", null)} AS nil`.values, [[null]])
    }).pipe(Effect.provide(transport)), { timeout: 30000 })

  it.effect("rolls back nested savepoints and the outer transaction on the same session", () =>
    Effect.gen(function*() {
      const sql = yield* MssqlClient.makeClient(options)
      yield* sql`CREATE TABLE #native_mssql_transactions (id int PRIMARY KEY)`
      const result = yield* Effect.flip(sql.withTransaction(Effect.gen(function*() {
        yield* sql`INSERT INTO #native_mssql_transactions VALUES (${sql.param("Int", 1)})`
        const nested = yield* Effect.flip(sql.withTransaction(Effect.gen(function*() {
          yield* sql`INSERT INTO #native_mssql_transactions VALUES (${sql.param("Int", 2)})`
          return yield* Effect.fail("nested rollback")
        })))
        assert.strictEqual(nested, "nested rollback")
        assert.deepStrictEqual(yield* sql`SELECT id FROM #native_mssql_transactions ORDER BY id`, [{ id: 1 }])
        return yield* Effect.fail("outer rollback")
      })))
      assert.strictEqual(result, "outer rollback")
      assert.deepStrictEqual(yield* sql`SELECT id FROM #native_mssql_transactions`, [])
      yield* sql.withTransaction(sql`INSERT INTO #native_mssql_transactions VALUES (${sql.param("Int", 3)})`)
      assert.deepStrictEqual(yield* sql`SELECT id FROM #native_mssql_transactions`, [{ id: 3 }])
      yield* sql`DROP TABLE #native_mssql_transactions`
    }).pipe(Effect.provide(transport)), { timeout: 30000 })

  it.effect("streams live rows and replaces a partially consumed pooled session", () =>
    Effect.gen(function*() {
      const sql = yield* MssqlClient.make(options)
      const rows = yield* Stream.runCollect(
        sql`
        SELECT TOP (1000) CAST(ROW_NUMBER() OVER (ORDER BY a.object_id, b.object_id) AS int) AS n
        FROM sys.all_objects a CROSS JOIN sys.all_objects b
      `.stream
      )
      assert.strictEqual(rows.length, 1000)
      assert.deepStrictEqual(rows.map((row) => row.n), Array.from({ length: 1000 }, (_, i) => i + 1))
      const first = yield* Stream.runCollect(sql`
        SELECT TOP (10000) CAST(ROW_NUMBER() OVER (ORDER BY a.object_id, b.object_id) AS int) AS n
        FROM sys.all_objects a CROSS JOIN sys.all_objects b
      `.stream.pipe(Stream.take(1)))
      assert.deepStrictEqual(first, [{ n: 1 }])
      assert.deepStrictEqual(yield* sql`SELECT 42 AS answer`, [{ answer: 42 }])
    }).pipe(Effect.provide(transport)), { timeout: 30000 })

  it.effect("decodes server datetimeoffset values as UTC instants", () =>
    Effect.gen(function*() {
      const connection = yield* MssqlConnection.make(options)
      const result = yield* connection.query(
        "SELECT CAST('2025-04-02T11:08:07.123+02:00' AS datetimeoffset(7)) AS instant"
      )
      assert.strictEqual((result.rows[0].instant as Date).toISOString(), "2025-04-02T09:08:07.123Z")
    }).pipe(Effect.provide(transport)), { timeout: 30000 })

  describe.skipIf(process.env.MSSQL_TEST_PROCEDURES !== "1")("temporary stored procedures", () => {
    it.effect("returns bound input, output parameters, and rows inside a transaction", () =>
      Effect.gen(function*() {
        const sql = yield* MssqlClient.makeClient(options)
        yield* sql.unsafe(`CREATE PROCEDURE #native_mssql_output @input int, @answer int OUTPUT AS
          BEGIN
            SET NOCOUNT ON;
            SET @answer = @input + 1;
            SELECT @input AS input_value;
            RETURN 7;
          END`)
        const procedure = Procedure.make("#native_mssql_output").pipe(
          Procedure.param<number>()("input", MssqlTypes.TYPES.Int),
          Procedure.outputParam<number>()("answer", MssqlTypes.TYPES.Int),
          Procedure.withRows<{ input_value: number }>(),
          Procedure.compile
        )({ input: 41 })
        const result = yield* sql.withTransaction(sql.call(procedure))
        assert.deepStrictEqual(result, { output: { answer: 42 }, rows: [{ input_value: 41 }] })
        yield* sql`DROP PROCEDURE #native_mssql_output`
      }).pipe(Effect.provide(transport)), { timeout: 30000 })
  })
})
