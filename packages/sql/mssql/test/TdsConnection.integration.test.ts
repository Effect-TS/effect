import * as Connection from "#tds/tdsConnection"
import { TYPES } from "#tds/tdsRequest"
import { MssqlClient, MssqlTypes, Procedure } from "@effect/sql-mssql"
import { describe, expect, it } from "@effect/vitest"
import { MSSQLServerContainer } from "@testcontainers/mssqlserver"
import { Effect, Fiber, Redacted } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { afterAll, beforeAll } from "vitest"

let config: Connection.Config = {
  server: process.env.MSSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MSSQL_PORT ?? 14339),
  username: "sa",
  password: process.env.MSSQL_PASSWORD ?? "Effect_Tds_Test_7426!",
  encrypt: true,
  trustServer: true
}

let container: { stop: () => Promise<unknown> } | undefined
beforeAll(async () => {
  if (process.env.MSSQL_PORT) return
  const started = await new MSSQLServerContainer("mcr.microsoft.com/mssql/server:2022-latest")
    .acceptLicense().start()
  container = started
  config = {
    ...config,
    server: started.getHost(),
    port: started.getPort(),
    database: started.getDatabase(),
    username: started.getUsername(),
    password: started.getPassword()
  }
}, 120000)
afterAll(async () => {
  await container?.stop()
}, 60000)

describe("native TDS / SQL Server", () => {
  it.effect("preserves 100ns temporal fractions and rounds reduced scales across midnight", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const result = yield* session.query(`SELECT
        CAST('12:34:56.1234567' AS time(7)) AS t,
        CAST('2024-02-29T12:34:56.1234567' AS datetime2(7)) AS dt,
        CAST('2024-02-29T12:34:56.1234567+02:00' AS datetimeoffset(7)) AS dto`)
      const row = result.rows[0] as Record<string, MssqlTypes.DateWithNanosecondsDelta>
      expect(row.t.toISOString()).toBe("1970-01-01T12:34:56.123Z")
      expect(row.dt.toISOString()).toBe("2024-02-29T12:34:56.123Z")
      expect(row.dto.toISOString()).toBe("2024-02-29T10:34:56.123Z")
      for (const [name, type] of [["t", TYPES.Time], ["dt", TYPES.DateTime2], ["dto", TYPES.DateTimeOffset]] as const) {
        expect(row[name].nanosecondsDelta).toBe(0.0004567)
        expect(Object.keys(row[name])).not.toContain("nanosecondsDelta")
        const roundtrip = yield* session.query("SELECT DATEPART(NANOSECOND, @value) AS fraction", [{
          name: "value",
          type,
          value: row[name],
          options: { scale: 7 }
        }])
        expect(roundtrip.rows).toEqual([{ fraction: 123456700 }])
      }
      const rounded = yield* session.query("SELECT @value AS value", [{
        name: "value",
        type: TYPES.DateTime2,
        value: new Date("2024-02-29T23:59:59.999Z"),
        options: { scale: 0 }
      }])
      expect(rounded.rows[0].value.toISOString()).toBe("2024-03-01T00:00:00.000Z")
    })))
  it.effect("roundtrips decimal, money, legacy LOB, XML, and ANSI parameters", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const result = yield* session.query(
        "SELECT @decimal AS d, @money AS m, @text AS t, @ntext AS nt, @image AS i, @xml AS x, @ansi AS a",
        [
          { name: "decimal", type: TYPES.Decimal, value: "-123456789.12345", options: { precision: 20, scale: 5 } },
          { name: "money", type: TYPES.Money, value: "-123.4567" },
          { name: "text", type: TYPES.Text, value: "café €" },
          { name: "ntext", type: TYPES.NText, value: "λ 🎵" },
          { name: "image", type: TYPES.Image, value: new Uint8Array([0, 255]) },
          { name: "xml", type: TYPES.Xml, value: "<root>λ</root>" },
          { name: "ansi", type: TYPES.VarChar, value: "café €" }
        ]
      )
      expect(result.rows).toEqual([{
        d: -123456789.12345,
        m: -123.4567,
        t: "café €",
        nt: "λ 🎵",
        i: Buffer.from([0, 255]),
        x: "<root>λ</root>",
        a: "café €"
      }])
    })))

  it.effect("decodes SQL_VARIANT values and non-default collations", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const result = yield* session.query(`SELECT CAST(42 AS sql_variant) AS i,
      CAST(CAST(-1.25 AS decimal(10,2)) AS sql_variant) AS d,
      CAST(N'λ' AS sql_variant) AS s,
      CAST(N'Привет' COLLATE Cyrillic_General_CI_AS AS varchar(20)) AS ru,
      CAST(N'日本語' COLLATE Japanese_CI_AS AS varchar(20)) AS ja`)
      expect(result.rows).toEqual([{ i: 42, d: -1.25, s: "λ", ru: "Привет", ja: "日本語" }])
    })))

  it.effect("sends table-valued parameters with stable column metadata", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const typeName = `effect_native_table_${process.pid}`
      yield* session.batch(`CREATE TYPE [${typeName}] AS TABLE (n int, s nvarchar(20))`)
      yield* Effect.addFinalizer(() => Effect.orDie(session.batch(`DROP TYPE [${typeName}]`)))
      const result = yield* session.query("SELECT n, s FROM @items ORDER BY n", [{
        name: "items",
        type: TYPES.TVP,
        value: {
          name: typeName,
          columns: [{ name: "n", type: TYPES.Int }, { name: "s", type: TYPES.NVarChar, length: 20 }],
          rows: [[1, "λ"], [2, null], [3, "longer"]]
        }
      }])
      expect(result.rows).toEqual([{ n: 1, s: "λ" }, { n: 2, s: null }, { n: 3, s: "longer" }])
    })))

  it.effect("negotiates TLS and executes parameterized Unicode, numbers, and binary", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const result = yield* session.query("SELECT @text AS text, @number AS number, @bytes AS bytes", [
        { name: "text", type: TYPES.NVarChar, value: "λ 🎵" },
        { name: "number", type: TYPES.Float, value: 1.5 },
        { name: "bytes", type: TYPES.VarBinary, value: new Uint8Array([0, 255, 1]) }
      ])
      expect(result.rows).toEqual([{ text: "λ 🎵", number: 1.5, bytes: Buffer.from([0, 255, 1]) }])
    })))

  it.effect("roundtrips large PLP values and preserves positional column order", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const text = "λ".repeat(10000)
      const result = yield* session.query("SELECT @text AS x, CAST(NULL AS int) AS x, 42 AS [__proto__]", [
        { name: "text", type: TYPES.NVarChar, value: text }
      ], true)
      expect(result.rows).toEqual([[text, null, 42]])
    })))

  it.effect("drains query errors and keeps the connection usable", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const result = yield* Effect.result(session.query("SELECT * FROM effect_native_missing_table"))
      expect(result._tag).toBe("Failure")
      expect((yield* session.query("SELECT 42 AS answer")).rows).toEqual([{ answer: 42 }])
    })))

  it.effect("tracks transaction descriptors and supports savepoint rollback", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      yield* session.batch("CREATE TABLE #native_tds (n int); BEGIN TRANSACTION")
      yield* session.query("INSERT INTO #native_tds VALUES (@n)", [{ name: "n", type: TYPES.Int, value: 1 }])
      yield* session.batch("SAVE TRANSACTION effect_save")
      yield* session.query("INSERT INTO #native_tds VALUES (2)")
      yield* session.batch("ROLLBACK TRANSACTION effect_save")
      yield* session.batch("COMMIT TRANSACTION")
      expect((yield* session.query("SELECT n FROM #native_tds")).rows).toEqual([{ n: 1 }])
    })))

  it.effect("cancels WAITFOR and drains ATTENTION before the next query", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const fiber = yield* Effect.forkChild(session.query("WAITFOR DELAY '00:00:10'; SELECT 1 AS stale"))
      yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))
      yield* Fiber.interrupt(fiber)
      expect((yield* session.query("SELECT 42 AS fresh")).rows).toEqual([{ fresh: 42 }])
    })))

  it.effect("serializes concurrent requests on one physical connection", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const results = yield* Effect.forEach(Array.from({ length: 20 }, (_, i) => i), (i) =>
        session.query("SELECT @n AS n", [{ name: "n", type: TYPES.Int, value: i }]), { concurrency: "unbounded" })
      expect(results.map((r) =>
        r.rows[0].n
      )).toEqual(Array.from({ length: 20 }, (_, i) => i))
    })))

  it.effect("returns RPC output parameters and return status", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      yield* session.batch(
        "CREATE PROCEDURE #native_answer @input int, @answer int OUTPUT AS BEGIN SET @answer = @input + 1; SELECT @answer AS answer; RETURN 7; END"
      )
      const result = yield* session.call("#native_answer", [
        { name: "input", type: TYPES.Int, value: 41 },
        { name: "answer", type: TYPES.Int, value: null, output: true }
      ])
      expect(result.rows).toEqual([{ answer: 42 }])
      expect(result.output).toEqual({ answer: 42 })
      expect(result.returnStatus).toBe(7)
    })))

  it.effect("rejects invalid credentials and untrusted certificates", () =>
    Effect.scoped(Effect.gen(function*() {
      expect((yield* Effect.result(Connection.make({ ...config, password: "invalid" })))._tag).toBe("Failure")
      expect((yield* Effect.result(Connection.make({ ...config, trustServer: false })))._tag).toBe("Failure")
    })))

  it.effect("roundtrips dates, UUIDs, bigint boundaries, nulls, and empty MAX values", () =>
    Effect.scoped(Effect.gen(function*() {
      const session = yield* Connection.make(config)
      const timestamp = new Date("2024-02-29T12:34:56.123Z")
      const result = yield* session.query(
        "SELECT @date AS date, @id AS id, @big AS big, @empty AS empty, @nothing AS nothing",
        [
          { name: "date", type: TYPES.DateTime2, value: timestamp },
          { name: "id", type: TYPES.UniqueIdentifier, value: "12345678-abcd-ef01-2345-6789abcdef01" },
          { name: "big", type: TYPES.BigInt, value: -9223372036854775808n },
          { name: "empty", type: TYPES.NVarChar, value: "", options: { length: Infinity } },
          { name: "nothing", type: TYPES.VarBinary, value: null, options: { length: Infinity } }
        ]
      )
      expect(result.rows).toEqual([{
        date: timestamp,
        id: "12345678-ABCD-EF01-2345-6789ABCDEF01",
        big: "-9223372036854775808",
        empty: "",
        nothing: null
      }])
    })))

  it.effect("runs through the public pooled adapter with nested transactions", () =>
    Effect.scoped(Effect.gen(function*() {
      const sql = yield* MssqlClient.make({
        ...config,
        accessToken: undefined,
        password: Redacted.make(config.password!),
        maxConnections: 1
      })
      const table = `effect_native_public_${process.pid}`
      const procedureName = `effect_native_answer_${process.pid}`
      yield* Effect.addFinalizer(() =>
        Effect.orDie(sql`DROP TABLE IF EXISTS ${sql(table)}; DROP PROCEDURE IF EXISTS ${sql(procedureName)}`)
      )
      expect(yield* sql`SELECT ${new Uint8Array([0, 128, 255])} AS bytes`).toEqual([{
        bytes: Buffer.from([0, 128, 255])
      }])
      yield* sql.withTransaction(Effect.gen(function*() {
        yield* sql`CREATE TABLE ${sql(table)} (n int)`
        yield* sql`INSERT INTO ${sql(table)} VALUES (${1})`
        yield* Effect.result(sql.withTransaction(Effect.gen(function*() {
          yield* sql`INSERT INTO ${sql(table)} VALUES (${2})`
          return yield* Effect.fail("rollback savepoint")
        })))
        expect(yield* sql`SELECT n FROM ${sql(table)}`).toEqual([{ n: 1 }])
      }))
      yield* sql`CREATE PROCEDURE ${sql(procedureName)} @answer int OUTPUT AS SET @answer = 42`
      const procedure = Procedure.make(procedureName).pipe(
        Procedure.outputParam<number>()("answer", MssqlTypes.Int),
        Procedure.compile
      )
      expect(yield* sql.call(procedure({}))).toEqual({ output: { answer: 42 }, rows: [] })
      expect(yield* sql.withTransaction(sql.call(procedure({})))).toEqual({ output: { answer: 42 }, rows: [] })
    })).pipe(Effect.provide(Reactivity.layer)))
})
