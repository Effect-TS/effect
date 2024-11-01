import { NodeRuntime } from "@effect/platform-node"
import { ClickhouseClient } from "@effect/sql-clickhouse"
import { Config, Effect, Stream } from "effect"

const ClickhouseLive = ClickhouseClient.layerConfig({
  url: Config.succeed("https://r8raccaqh3.ap-southeast-2.aws.clickhouse.cloud:8443"),
  username: Config.succeed("default"),
  password: Config.string("CLICKHOUSE_PASSWORD")
})

Effect.gen(function*() {
  const sql = yield* ClickhouseClient.ClickhouseClient
  yield* sql`CREATE TABLE IF NOT EXISTS clickhouse_js_example_cloud_table
    (id UInt64, name String)
    ORDER BY (id)`
  yield* sql`TRUNCATE TABLE clickhouse_js_example_cloud_table`

  yield* sql.insertQuery({
    table: "clickhouse_js_example_cloud_table",
    values: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" }
    ]
  })
  yield* sql.asCommand(
    sql`INSERT INTO clickhouse_js_example_cloud_table ${
      sql.insert({
        id: 3,
        name: "Charlie"
      })
    }`
  )

  yield* sql`SELECT * FROM clickhouse_js_example_cloud_table ORDER BY id`.stream.pipe(
    Stream.runForEach(Effect.log),
    sql.withQueryId("select"),
    sql.withClickhouseSettings({
      log_comment: "Some comment to be stored in the query log"
    })
  )
}).pipe(
  Effect.provide(ClickhouseLive),
  NodeRuntime.runMain
)
