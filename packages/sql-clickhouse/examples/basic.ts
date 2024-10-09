import { NodeRuntime } from "@effect/platform-node"
import { ClickhouseClient } from "@effect/sql-clickhouse"
import { Config, Effect } from "effect"

const ClickhouseLive = ClickhouseClient.layer({
  url: Config.succeed("https://r8raccaqh3.ap-southeast-2.aws.clickhouse.cloud:8443"),
  username: Config.succeed("default"),
  password: Config.string("CLICKHOUSE_PASSWORD")
})

Effect.gen(function*() {
  const sql = yield* ClickhouseClient.ClickhouseClient
  console.log(yield* sql`SELECT ${sql.param("Bool", true)}`)
  console.log(
    yield* sql`CREATE TABLE IF NOT EXISTS clickhouse_js_example_cloud_table
      (id UInt64, name String)
      ORDER BY (id)`
  )
}).pipe(
  Effect.provide(ClickhouseLive),
  NodeRuntime.runMain
)
