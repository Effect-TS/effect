import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, PrimaryKey, Schema } from "effect"
import { ClusterSchema, Entity } from "effect/cluster"
import { Rpc } from "effect/rpc"
import { type Backend, make } from "./harness.ts"

class Ping extends Schema.Class<Ping>("Ping")({
  id: Schema.String
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

const TestEntity = Entity.make("ClusterIntegrationSmoke", [
  Rpc.make("Ping", {
    payload: Ping,
    success: Schema.String
  })
]).annotateRpcs(ClusterSchema.Persisted, true)

const TestEntityLayer = TestEntity.toLayer({
  Ping: ({ payload }) => Effect.succeed(`pong:${payload.id}`)
})

const diskSyncOff: Record<Backend, Record<string, string>> = {
  mysql: { innodb_flush_log_at_trx_commit: "0", sync_binlog: "0" },
  pg: { fsync: "off" }
}

describe("cluster integration smoke", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    // A slow disk flush on a commit can hold a lock refresh past the 500 ms
    // `shardLockRefreshInterval`. The reply is then fenced and its request
    // replays, which breaks every exactly-once handler count in this suite.
    it.live(`${backend}: commits do not wait for the disk`, () =>
      Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: Layer.empty })
        assert.deepStrictEqual(yield* cluster.diskSyncSettings(), diskSyncOff[backend])
      }))

    it.live(`${backend}: persists messages and rebalances after an abrupt runner death`, () =>
      Effect.gen(function*() {
        const cluster = yield* make({ backend, entities: TestEntityLayer })
        yield* cluster.start(3)
        yield* cluster.waitForStableAssignments()

        const client = yield* cluster.getClient(TestEntity)
        assert.strictEqual(
          yield* client("entity-1").Ping(new Ping({ id: "request-1" })),
          "pong:request-1"
        )

        yield* cluster.waitUntil(
          "The smoke entity had no active owner",
          Effect.map(cluster.ownerOfEntity(TestEntity, "entity-1"), (owner) => owner !== undefined)
        )
        const owner = yield* cluster.ownerOfEntity(TestEntity, "entity-1")
        yield* cluster.kill(owner!)
        yield* cluster.waitForStableAssignments()

        assert.strictEqual(
          yield* client("entity-1").Ping(new Ping({ id: "request-2" })),
          "pong:request-2"
        )
        assert.strictEqual(yield* cluster.repliedMessageCount, 2)
      }))
  }
})
