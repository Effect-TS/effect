import * as CloudflareCluster from "@effect/platform-cloudflare/CloudflareCluster"
import { Entity } from "effect/cluster"
import type { Sharding } from "effect/cluster/Sharding"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Rpc } from "effect/rpc"
import * as Schema from "effect/Schema"
import { SqlClient } from "effect/sql"
import { describe, expect, test } from "tstyche"

const Journal = Entity.make("Journal", [
  Rpc.make("Count", { success: Schema.Number })
])

class UserService extends Context.Service<UserService, "user">()("UserService") {}

const count = (sql: SqlClient.SqlClient) =>
  sql<{ readonly count: number }>`SELECT COUNT(*) AS count FROM journal`.pipe(
    Effect.map((rows) => rows[0]?.count ?? 0),
    Effect.orDie
  )

// Reads the entity client while building the handlers.
const build = Effect.gen(function*() {
  const sql = yield* CloudflareCluster.DurableObjectSqlClient
  yield* UserService
  return Journal.of({ Count: () => count(sql) })
})

// Reads the entity client, and the Worker layer's `SqlClient`, while handling.
const handlers = Journal.of({
  Count: () =>
    Effect.gen(function*() {
      const sql = yield* CloudflareCluster.DurableObjectSqlClient
      yield* SqlClient.SqlClient
      return yield* count(sql)
    })
})

declare const sqlLayer: Layer.Layer<SqlClient.SqlClient>
declare const shardingLayer: Layer.Layer<Sharding>

describe("toLayer", () => {
  test("removes DurableObjectSqlClient from the build requirements", () => {
    expect(CloudflareCluster.toLayer(Journal, build)).type.toBe<
      Layer.Layer<never, never, UserService | CloudflareCluster.CloudflareSharding>
    >()
  })

  test("removes DurableObjectSqlClient from the handler requirements and keeps SqlClient", () => {
    expect(CloudflareCluster.toLayer(Journal, handlers)).type.toBe<
      Layer.Layer<never, never, SqlClient.SqlClient | CloudflareCluster.CloudflareSharding>
    >()
  })

  test("is satisfied by the Cloudflare cluster layer", () => {
    const options = {} as CloudflareCluster.LayerOptions
    expect(
      CloudflareCluster.toLayer(Journal, Effect.provideService(build, UserService, "user")).pipe(
        Layer.provide(CloudflareCluster.layer(options))
      )
    ).type.toBe<Layer.Layer<never>>()
  })

  test("still requires CloudflareSharding when given a plain Sharding", () => {
    expect(
      CloudflareCluster.toLayer(Journal, handlers).pipe(Layer.provide(Layer.merge(sqlLayer, shardingLayer)))
    ).type.toBe<Layer.Layer<never, never, CloudflareCluster.CloudflareSharding>>()
  })
})

describe("Entity.toLayer", () => {
  test("keeps DurableObjectSqlClient as a requirement for tests to provide", () => {
    expect(Journal.toLayer(build)).type.toBe<
      Layer.Layer<never, never, CloudflareCluster.DurableObjectSqlClient | UserService | Sharding>
    >()
  })
})
