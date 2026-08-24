import { PgClient } from "@effect/sql-pg"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { Effect, Redacted } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { execFileSync } from "node:child_process"
import { Bench } from "tinybench"

const externalUrl = process.env.PGCLIENT_BENCHMARK_URL
const container = externalUrl === undefined
  ? await new PostgreSqlContainer("postgres:alpine").start()
  : undefined
const url = externalUrl ?? container.getConnectionUri()

let sink = 0

const run = Effect.gen(function*() {
  const sql = yield* PgClient.make({
    url: Redacted.make(url),
    applicationName: "pgclient-benchmark",
    maxConnections: 10
  })

  const workloads = [
    {
      name: "parameterized SELECT (1 row)",
      unitsPerOperation: 1,
      unit: "queries/s",
      effect: sql.unsafe("SELECT $1::int4 AS value, $2::text AS label", [42, "effect"])
    },
    {
      name: "generate_series (100 rows x 3 columns)",
      unitsPerOperation: 100,
      unit: "rows/s",
      effect: sql.unsafe(
        "SELECT value, value * 2 AS doubled, value::text AS label FROM generate_series(1, 100) AS value"
      )
    },
    {
      name: "20 concurrent parameterized SELECTs",
      unitsPerOperation: 20,
      unit: "queries/s",
      effect: Effect.all(
        Array.from(
          { length: 20 },
          (_, index) => sql.unsafe("SELECT $1::int4 AS value", [index])
        ),
        { concurrency: "unbounded" }
      ).pipe(Effect.map((results) => results.flat().length))
    }
  ]

  // Open the pool and prepare the statements before Tinybench starts timing.
  for (const workload of workloads) {
    yield* workload.effect
  }

  for (const workload of workloads) {
    const bench = new Bench({
      iterations: 16,
      time: 2_000,
      warmupIterations: 8,
      warmupTime: 500,
      timestampProvider: "hrtimeNow"
    })

    bench.add(workload.name, async () => {
      const result = await Effect.runPromise(workload.effect)
      sink += Array.isArray(result) ? result.length : result
    })

    yield* Effect.promise(() => bench.run())
    console.table(bench.table((task) => {
      const result = task.result
      if (result?.state !== "completed") {
        return { Workload: task.name, State: result?.state ?? "missing result" }
      }
      return {
        Workload: task.name,
        "operations/s": Math.round(result.throughput.mean),
        [workload.unit]: Math.round(result.throughput.mean * workload.unitsPerOperation),
        "latency (ms)": result.latency.mean.toFixed(3),
        RME: `${result.latency.rme.toFixed(2)}%`,
        Samples: result.latency.samplesCount
      }
    }))
  }
}).pipe(
  Effect.scoped,
  Effect.provide(Reactivity.layer)
)

try {
  const revision = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim()
  console.log(
    `PgClient benchmark at ${revision} (${externalUrl === undefined ? "Testcontainers" : "external PostgreSQL"})`
  )
  await Effect.runPromise(run)
  if (sink === 0) throw new Error("Benchmark did not run")
} finally {
  await container?.stop()
}
