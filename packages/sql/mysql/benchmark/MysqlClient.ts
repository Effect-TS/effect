import { MysqlClient } from "@effect/sql-mysql"
import { MysqlClient as Mysql2Client } from "@effect/sql-mysql2"
import { MySqlContainer } from "@testcontainers/mysql"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import type { SqlClient } from "effect/unstable/sql/SqlClient"
import { Bench } from "tinybench"

const rowCount = 100

const seed = (sql: SqlClient) =>
  Effect.gen(function*() {
    yield* sql`DROP TABLE IF EXISTS bench`
    yield* sql`CREATE TABLE bench (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(64), n INT, flag TINYINT)`
    yield* sql`SET SESSION cte_max_recursion_depth = ${rowCount + 1}`
    yield* sql`
      INSERT INTO bench (name, n, flag) WITH RECURSIVE seq(x) AS (
        SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < ${rowCount}
      ) SELECT CONCAT('row-', x), x, x % 2 FROM seq
    `.unprepared
  })

/** The workloads each client runs, so both are measured on the same shapes. */
const workloads = (sql: SqlClient): Record<string, () => Promise<unknown>> => ({
  "one row": () => Effect.runPromise(sql`SELECT id, name, n, flag FROM bench WHERE id = ${1}`),
  [`${rowCount} rows`]: () => Effect.runPromise(sql`SELECT id, name, n, flag FROM bench`),
  "transaction": () => Effect.runPromise(sql.withTransaction(sql`SELECT id FROM bench WHERE id = ${1}`)),
  "20 concurrent": () =>
    Effect.runPromise(Effect.all(
      Array.from({ length: 20 }, (_, index) => sql`SELECT id, name FROM bench WHERE id = ${index + 1}`),
      { concurrency: "unbounded" }
    ))
})

const program = (uri: string) =>
  Effect.gen(function*() {
    const url = Redacted.make(uri)
    const clients: ReadonlyArray<readonly [string, SqlClient]> = [
      ["@effect/sql-mysql", yield* MysqlClient.make({ url, maxConnections: 10 })],
      ["@effect/sql-mysql2", yield* Mysql2Client.make({ url, maxConnections: 10 })]
    ]

    yield* seed(clients[0][1])

    const bench = new Bench({ time: 2000 })
    for (const [name, sql] of clients) {
      for (const [workload, task] of Object.entries(workloads(sql))) {
        bench.add(`${workload} — ${name}`, task)
      }
    }

    // Warm the pools and the statement caches so the first sample is not the
    // one that pays for connecting.
    for (const [, sql] of clients) {
      for (const task of Object.values(workloads(sql))) {
        yield* Effect.promise(task)
      }
    }

    yield* Effect.promise(() => bench.run())
    console.table(bench.table())
  }).pipe(Effect.scoped, Effect.provide(Reactivity.layer))

const uri = process.env.MYSQLCLIENT_BENCHMARK_URL
if (uri !== undefined) {
  await Effect.runPromise(program(uri))
} else {
  const container = await new MySqlContainer("mysql:8.4").start()
  try {
    await Effect.runPromise(program(container.getConnectionUri()))
  } finally {
    await container.stop()
  }
}
