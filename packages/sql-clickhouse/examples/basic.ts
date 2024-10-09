import { NodeRuntime } from "@effect/platform-node"
import { ClickhouseClient } from "@effect/sql-clickhouse"
import { Config, Effect, Stream } from "effect"

const ClickhouseLive = ClickhouseClient.layer({
  url: Config.succeed("https://r8raccaqh3.ap-southeast-2.aws.clickhouse.cloud:8443"),
  username: Config.succeed("default"),
  password: Config.string("CLICKHOUSE_PASSWORD")
})

Effect.gen(function*() {
  const sql = yield* ClickhouseClient.ClickhouseClient
  yield* sql`CREATE TABLE IF NOT EXISTS clickhouse_js_example_cloud_table
    (id UInt64, name String)
    ORDER BY (id)`

  yield* sql.asCommand(
    sql`INSERT INTO clickhouse_js_example_cloud_table ${
      sql.insert({
        id: sql.param("UInt64", 1),
        name: "Alice"
      })
    }`.raw
  )
  yield* sql.asCommand(
    sql`INSERT INTO clickhouse_js_example_cloud_table ${
      sql.insert({
        id: 2,
        name: "Bob"
      })
    }`.raw
  )
  yield* sql.asCommand(
    sql`INSERT INTO clickhouse_js_example_cloud_table ${
      sql.insert({
        id: 3,
        name: "Charlie"
      })
    }`.raw
  )

  yield* sql`SELECT * FROM clickhouse_js_example_cloud_table ORDER BY id`.stream.pipe(
    Stream.runForEach(Effect.log)
  )
}).pipe(
  Effect.provide(ClickhouseLive),
  NodeRuntime.runMain
)
