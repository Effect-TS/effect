import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Redacted, Stream } from "effect"
import * as SqlClient from "effect/sql/SqlClient"
import { SqlError } from "effect/sql/SqlError"
import { TestClock } from "effect/testing"
import * as Coordinator from "./TrinoCoordinator.ts"

const { column, nextUri, page } = Coordinator

const nColumn = [column("n", "integer")]
const nameColumn = [column("name", "varchar")]

describe("TrinoClient", () => {
  it.effect("follows nextUri until the query finishes and returns the rows of every page", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      const rows = yield* sql`SELECT name FROM people`

      assert.deepStrictEqual(rows, [{ name: "Ada" }, { name: "Grace" }])
      const [submit] = yield* Coordinator.requests
      assert.strictEqual(submit.body, "SELECT name FROM people")
    }).pipe(Effect.provide(Coordinator.layer([
      page({ next: 1 }),
      page({ next: 2, columns: nameColumn, data: `[["Ada"]]` }),
      page({ columns: nameColumn, data: `[["Grace"]]` })
    ]))))

  it.effect("reports the trino dialect", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      assert.strictEqual(sql.onDialectOrElse({ trino: () => "trino", orElse: () => "other" }), "trino")
    }).pipe(Effect.provide(Coordinator.layer([]))))

  it.effect("authenticates with the configured user and password", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      yield* sql`SELECT 1 AS n`

      const [submit] = yield* Coordinator.requests
      assert.strictEqual(submit.headers["x-trino-user"], "effect")
      assert.strictEqual(submit.headers["authorization"], "Basic ZWZmZWN0OnNlY3JldA==")
    }).pipe(Effect.provide(Coordinator.layer(
      [page({ columns: nColumn, data: "[[1]]" })],
      { password: Redacted.make("secret") }
    ))))

  describe("decoding", () => {
    it.effect("decodes bigint values without losing precision", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const rows = yield* sql`SELECT id, ids, n FROM accounts`

        assert.deepStrictEqual(rows, [{
          id: 9007199254740993n,
          ids: [9007199254740993n, -9223372036854775808n],
          n: 1
        }])
      }).pipe(Effect.provide(Coordinator.layer([
        // Columns and data as returned by Trino 484 for
        // SELECT BIGINT '9007199254740993' AS id,
        //   ARRAY[BIGINT '9007199254740993', BIGINT '-9223372036854775808'] AS ids, 1 AS n
        page({
          columns: [
            column("id", "bigint"),
            column("ids", "array(bigint)", {
              rawType: "array",
              arguments: [{ kind: "TYPE", value: { rawType: "bigint", arguments: [] } }]
            }),
            column("n", "integer")
          ],
          data: "[[9007199254740993,[9007199254740993,-9223372036854775808],1]]"
        })
      ]))))

    it.effect("decodes temporal, decimal, binary, double and json columns", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const rows = yield* sql`SELECT * FROM samples`

        assert.deepStrictEqual(rows, [{
          ts: new Date("2024-01-15T14:30:00.123Z"),
          tstz: new Date("2024-01-15T19:30:00.123Z"),
          d: "2024-01-15",
          amount: "12345678901234567890.123",
          bytes: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
          ratio: NaN,
          doc: { a: [1, 2] },
          missing: null
        }])
      }).pipe(Effect.provide(Coordinator.layer([
        // Columns and data as returned by Trino 484 to a client that does not
        // send X-Trino-Client-Capabilities.
        page({
          columns: [
            column("ts", "timestamp"),
            column("tstz", "timestamp with time zone"),
            column("d", "date"),
            column("amount", "decimal(23, 3)", {
              rawType: "decimal",
              arguments: [{ kind: "LONG", value: 23 }, { kind: "LONG", value: 3 }]
            }),
            column("bytes", "varbinary"),
            column("ratio", "double"),
            column("doc", "json"),
            column("missing", "bigint")
          ],
          data: JSON.stringify([[
            "2024-01-15 14:30:00.123",
            "2024-01-15 14:30:00.123 America/New_York",
            "2024-01-15",
            "12345678901234567890.123",
            "3q2+7w==",
            "NaN",
            "{\"a\":[1,2]}",
            null
          ]])
        })
      ]))))
  })

  describe("parameters", () => {
    it.effect("sends parameters as EXECUTE IMMEDIATE literals", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const at = new Date("2024-01-15T14:30:00.123Z")
        const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef])

        yield* sql`SELECT * FROM t WHERE tag <> 'x' AND a = ${"it's"} AND b = ${9007199254740993n} AND c = ${42} AND d = ${1.5} AND e = ${true} AND f = ${null} AND g = ${at} AND h = ${bytes} AND i = ${[
          "a",
          "b"
        ]}`

        const [submit] = yield* Coordinator.requests
        assert.strictEqual(
          submit.body,
          "EXECUTE IMMEDIATE 'SELECT * FROM t WHERE tag <> ''x'' AND a = ? AND b = ? AND c = ? AND d = ? AND e = ? AND f = ? AND g = ? AND h = ? AND i = ?' " +
            "USING 'it''s', 9007199254740993, 42, DOUBLE '1.5', true, NULL, TIMESTAMP '2024-01-15 14:30:00.123 UTC', X'deadbeef', ARRAY['a', 'b']"
        )
      }).pipe(Effect.provide(Coordinator.layer([page({ columns: nColumn, data: "[]" })]))))

    it.effect("rejects a parameter it cannot render as a literal without sending the query", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const error = yield* Effect.flip(sql`SELECT ${{ a: 1 }} AS a`)

        assert.instanceOf(error, SqlError)
        assert.deepStrictEqual(yield* Coordinator.requests, [])
      }).pipe(Effect.provide(Coordinator.layer([]))))
  })

  it.effect("applies session changes from response headers to later statements", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      yield* sql`USE tpch.tiny`
      yield* sql`SET SESSION query_max_run_time = '1h'`
      yield* sql`SELECT 1 AS n`
      yield* sql`RESET SESSION query_max_run_time`
      yield* sql`SELECT 1 AS n`

      const [use, , afterSet, , afterReset] = yield* Coordinator.requests
      assert.strictEqual(use.headers["x-trino-catalog"], "memory")
      assert.strictEqual(use.headers["x-trino-schema"], "default")
      assert.strictEqual(afterSet.headers["x-trino-catalog"], "tpch")
      assert.strictEqual(afterSet.headers["x-trino-schema"], "tiny")
      assert.strictEqual(afterSet.headers["x-trino-session"], "query_max_run_time=1h")
      assert.strictEqual(afterReset.headers["x-trino-catalog"], "tpch")
      assert.isUndefined(afterReset.headers["x-trino-session"])
    }).pipe(Effect.provide(Coordinator.layer([
      page({ updateType: "USE", headers: { "x-trino-set-catalog": "tpch", "x-trino-set-schema": "tiny" } }),
      page({ updateType: "SET SESSION", headers: { "x-trino-set-session": "query_max_run_time=1h" } }),
      page({ columns: nColumn, data: "[[1]]" }),
      page({ updateType: "RESET SESSION", headers: { "x-trino-clear-session": "query_max_run_time" } }),
      page({ columns: nColumn, data: "[[1]]" })
    ], { catalog: "memory", schema: "default" }))))

  describe("transactions", () => {
    it.effect("runs a transaction on the started transaction id and commits it", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        yield* sql.withTransaction(sql`SELECT 1 AS n`)
        yield* sql`SELECT 1 AS n`

        const requests = yield* Coordinator.requests
        assert.deepStrictEqual(requests.slice(0, 3).map((r) => [r.body, r.headers["x-trino-transaction-id"]]), [
          ["START TRANSACTION", "NONE"],
          ["SELECT 1 AS n", "tx1"],
          ["COMMIT", "tx1"]
        ])
        assert.notStrictEqual(requests[3].headers["x-trino-transaction-id"], "tx1")
      }).pipe(Effect.provide(Coordinator.layer([
        page({ updateType: "START TRANSACTION", headers: { "x-trino-started-transaction-id": "tx1" } }),
        page({ columns: nColumn, data: "[[1]]" }),
        page({ updateType: "COMMIT", headers: { "x-trino-clear-transaction-id": "true" } }),
        page({ columns: nColumn, data: "[[1]]" })
      ]))))

    it.effect("fails a nested transaction and rolls back the outer one", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const error = yield* Effect.flip(sql.withTransaction(sql.withTransaction(sql`SELECT 1 AS n`)))

        assert.instanceOf(error, SqlError)
        assert.deepStrictEqual((yield* Coordinator.requests).map((r) => r.body), ["START TRANSACTION", "ROLLBACK"])
      }).pipe(Effect.provide(Coordinator.layer([
        page({ updateType: "START TRANSACTION", headers: { "x-trino-started-transaction-id": "tx1" } }),
        page({ updateType: "ROLLBACK", headers: { "x-trino-clear-transaction-id": "true" } })
      ]))))
  })

  describe("cancellation", () => {
    it.effect("cancels the query on the server when the statement is interrupted", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const fiber = yield* Effect.forkChild(sql`SELECT * FROM lineitem`)
        yield* Coordinator.awaitRequests(2)
        yield* Fiber.interrupt(fiber)

        const requests = yield* Coordinator.requests
        assert.deepStrictEqual(requests.map((r) => [r.method, r.url]), [
          ["POST", `${Coordinator.baseUrl}/v1/statement`],
          ["GET", nextUri(1)],
          ["DELETE", nextUri(1)]
        ])
      }).pipe(Effect.provide(Coordinator.layer([page({ next: 1 }), Coordinator.pending]))))

    it.effect("fetches pages on demand and cancels the query when a stream stops early", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const rows = yield* sql`SELECT name FROM people`.stream.pipe(Stream.take(1), Stream.runCollect)

        assert.deepStrictEqual(rows, [{ name: "Ada" }])
        const requests = yield* Coordinator.requests
        assert.deepStrictEqual(requests.map((r) => [r.method, r.url]).slice(1), [
          ["GET", nextUri(1)],
          ["DELETE", nextUri(2)]
        ])
      }).pipe(Effect.provide(Coordinator.layer([
        page({ next: 1 }),
        page({ next: 2, columns: nameColumn, data: `[["Ada"]]` })
      ]))))
  })

  describe("retries", () => {
    it.effect("retries the initial request after 429, honouring Retry-After, and after 503", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const fiber = yield* Effect.forkChild(sql`INSERT INTO t VALUES (1)`)
        yield* TestClock.adjust("1999 millis")
        assert.lengthOf(yield* Coordinator.requests, 1)
        yield* TestClock.adjust("1 minute")

        yield* Fiber.join(fiber)
        assert.deepStrictEqual((yield* Coordinator.requests).map((r) => r.method), ["POST", "POST", "POST"])
      }).pipe(Effect.provide(Coordinator.layer([
        Coordinator.status(429, { "retry-after": "2" }),
        Coordinator.status(503),
        page({ updateType: "INSERT", columns: [column("rows", "bigint")], data: "[[1]]" })
      ]))))

    it.effect("does not retry the initial request after an ambiguous failure", () =>
      Effect.gen(function*() {
        for (const failure of [Coordinator.status(502), Coordinator.status(504), Coordinator.transportError]) {
          const [error, requests] = yield* Effect.gen(function*() {
            const sql = yield* SqlClient.SqlClient
            const fiber = yield* Effect.forkChild(Effect.flip(sql`INSERT INTO t VALUES (1)`))
            yield* TestClock.adjust("1 minute")
            return [yield* Fiber.join(fiber), yield* Coordinator.requests] as const
          }).pipe(Effect.provide(Coordinator.layer([failure])))

          assert.strictEqual(error.reason._tag, "ConnectionError")
          assert.lengthOf(requests, 1)
        }
      }))

    it.effect("retries nextUri polling after transient failures", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const fiber = yield* Effect.forkChild(sql`SELECT 1 AS n`)
        yield* TestClock.adjust("1 minute")

        assert.deepStrictEqual(yield* Fiber.join(fiber), [{ n: 1 }])
      }).pipe(Effect.provide(Coordinator.layer([
        page({ next: 1 }),
        Coordinator.status(502),
        Coordinator.status(503),
        Coordinator.status(504),
        Coordinator.status(429, { "retry-after": "1" }),
        Coordinator.transportError,
        page({ columns: nColumn, data: "[[1]]" })
      ]))))
  })
})
