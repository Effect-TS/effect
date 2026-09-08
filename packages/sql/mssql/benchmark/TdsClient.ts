import * as Native from "#tds/tdsConnection"
import { TYPES } from "#tds/tdsRequest"
import { Effect } from "effect"
import { strict as assert } from "node:assert"
import { performance } from "node:perf_hooks"
import * as Tedious from "tedious"

const config = {
  server: process.env.MSSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MSSQL_PORT ?? 14339),
  username: "sa",
  password: process.env.MSSQL_PASSWORD ?? "Effect_Tds_Test_7426!",
  encrypt: true,
  trustServer: true
}
const rounds = Number(process.env.BENCH_ROUNDS ?? 5)
const duration = Number(process.env.BENCH_DURATION_MS ?? 750)
if (!Number.isSafeInteger(rounds) || rounds < 1 || !Number.isFinite(duration) || duration <= 0) {
  throw new Error("BENCH_ROUNDS must be a positive integer and BENCH_DURATION_MS must be positive")
}

const baseline = Effect.acquireRelease(
  Effect.callback<Tedious.Connection, Error>((resume) => {
    const conn = new Tedious.Connection({
      server: config.server,
      authentication: { type: "default", options: { userName: config.username, password: config.password } },
      options: {
        port: config.port,
        encrypt: true,
        trustServerCertificate: true,
        rowCollectionOnRequestCompletion: true
      }
    })
    conn.on("error", () => {})
    conn.connect((error) => resume(error ? Effect.fail(error) : Effect.succeed(conn)))
    return Effect.sync(() => conn.close())
  }),
  (conn) => Effect.sync(() => conn.close())
)

const tediousQuery = (conn: Tedious.Connection, query: string, parameter: boolean) =>
  Effect.callback<ReadonlyArray<any>, Error>((resume) => {
    const request = new Tedious.Request(query, (error, _count, rows) => {
      if (error) {
        resume(Effect.fail(error))
        return
      }
      resume(Effect.succeed(rows.map((columns: Array<any>) => {
        const row: Record<string, unknown> = {}
        for (const column of columns) {
          if (column.metadata.colName === "__proto__") {
            Object.defineProperty(row, column.metadata.colName, {
              value: column.value,
              enumerable: true,
              configurable: true,
              writable: true
            })
          } else {
            row[column.metadata.colName] = column.value
          }
        }
        return row
      })))
    })
    if (parameter) request.addParameter("value", Tedious.TYPES.Float, 42)
    conn.execSql(request)
    return Effect.sync(() => {
      conn.cancel()
    })
  })

const tediousControl = (conn: Tedious.Connection, method: "beginTransaction" | "rollbackTransaction") =>
  Effect.callback<void, Error>((resume) => {
    conn[method]((error) => resume(error ? Effect.fail(error) : Effect.void))
  })

const measure = (query: Effect.Effect<unknown, unknown>, milliseconds: number) =>
  Effect.gen(function*() {
    const start = performance.now()
    let count = 0
    while (performance.now() - start < milliseconds) {
      yield* query
      count++
    }
    return count * 1000 / (performance.now() - start)
  })

const median = (values: ReadonlyArray<number>) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const program = Effect.scoped(Effect.gen(function*() {
  const native = yield* Native.make(config)
  const tedious = yield* baseline
  const sessionSettings = "SELECT @@OPTIONS AS flags, @@DATEFIRST AS firstDay, @@TEXTSIZE AS [textSize]"
  assert.deepEqual(
    (yield* native.query(sessionSettings)).rows,
    yield* tediousQuery(tedious, sessionSettings, false),
    "session defaults differ"
  )
  const version = yield* native.query("SELECT @@VERSION AS version")
  console.log(JSON.stringify({ node: process.version, server: version.rows[0].version, rounds, duration, tls: true }))
  const workloads = [
    { name: "parameterized-select", sql: "SELECT @value AS value", parameter: true },
    {
      name: "100-rows-3-columns",
      sql:
        "SELECT TOP (100) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n, N'λ hello' AS text, CAST(1.5 AS float) AS value FROM sys.all_objects",
      parameter: false
    },
    {
      name: "100-rows-20-columns",
      sql: `SELECT TOP (100) ${Array.from({ length: 20 }, (_, i) => `${i} AS c${i}`).join(",")} FROM sys.all_objects`,
      parameter: false
    },
    { name: "large-unicode", sql: "SELECT REPLICATE(CAST(N'λ' AS nvarchar(max)), 10000) AS text", parameter: false },
    {
      name: "transaction-insert-rollback",
      sql: "DECLARE @t TABLE(value float); INSERT INTO @t VALUES(@value)",
      parameter: true
    }
  ]
  for (const workload of workloads) {
    const nativeQuery = native.query(
      workload.sql,
      workload.parameter ? [{ name: "value", type: TYPES.Float, value: 42 }] : []
    )
      .pipe(Effect.map((result) => result.rows))
    const baselineQuery = tediousQuery(tedious, workload.sql, workload.parameter)
    const a = workload.name === "transaction-insert-rollback"
      ? native.batch("BEGIN TRAN").pipe(Effect.andThen(nativeQuery), Effect.tap(() => native.batch("ROLLBACK TRAN")))
      : nativeQuery
    const b = workload.name === "transaction-insert-rollback"
      ? tediousControl(tedious, "beginTransaction").pipe(
        Effect.andThen(baselineQuery),
        Effect.tap(() => tediousControl(tedious, "rollbackTransaction"))
      )
      : baselineQuery
    assert.deepEqual(yield* a, yield* b, `${workload.name}: native and tedious results differ`)
    yield* measure(a, 300)
    yield* measure(b, 300)
    const nativeRates: Array<number> = []
    const tediousRates: Array<number> = []
    const deltas: Array<number> = []
    for (let i = 0; i < rounds; i++) {
      let n: number
      let t: number
      if (i % 2 === 0) {
        n = yield* measure(a, duration)
        t = yield* measure(b, duration)
      } else {
        t = yield* measure(b, duration)
        n = yield* measure(a, duration)
      }
      nativeRates.push(n)
      tediousRates.push(t)
      deltas.push((n / t - 1) * 100)
    }
    console.log(
      JSON.stringify({
        workload: workload.name,
        nativeQueriesPerSecond: median(nativeRates),
        tediousQueriesPerSecond: median(tediousRates),
        medianPairedDeltaPercent: median(deltas),
        nativeRates,
        tediousRates
      })
    )
  }
}))

Effect.runPromise(program).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
