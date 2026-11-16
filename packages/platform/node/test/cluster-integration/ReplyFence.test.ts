import { assert, describe, it } from "@effect/vitest"
import { Effect, PrimaryKey, Schema } from "effect"
import { ClusterSchema, Entity } from "effect/cluster"
import { Rpc } from "effect/rpc"
import { type Backend, make } from "./harness.ts"

class FencePayload extends Schema.Class<FencePayload>("ClusterReplyFencePayload")({
  id: Schema.String
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

const FenceEntity = Entity.make("ClusterIntegrationReplyFence", [
  Rpc.make("Run", {
    payload: FencePayload,
    success: Schema.Number
  })
]).annotateRpcs(ClusterSchema.Persisted, true)

describe("cluster reply fencing integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.live(`${backend}: replays a request whose reply was fenced by a slow lock check`, () =>
      Effect.gen(function*() {
        const repliesStoredBeforeRun: Array<number> = []
        let holdLockCheck: Effect.Effect<void> = Effect.void
        let repliedMessageCount: Effect.Effect<number, unknown> = Effect.succeed(0)
        const entities = FenceEntity.toLayer({
          Run: Effect.fnUntraced(function*() {
            repliesStoredBeforeRun.push(yield* Effect.orDie(repliedMessageCount))
            if (repliesStoredBeforeRun.length === 1) yield* holdLockCheck
            return repliesStoredBeforeRun.length
          })
        })

        const cluster = yield* make({ backend, entities })
        holdLockCheck = Effect.flatMap(cluster.shardOfEntity(FenceEntity, "fence"), cluster.holdShardLockCheck)
        repliedMessageCount = cluster.repliedMessageCount
        yield* cluster.start(2)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(FenceEntity)
        const payload = new FencePayload({ id: "fenced" })

        // The lock check before the first run's reply is held past the 500 ms
        // `shardLockRefreshInterval`, so the reply is fenced and the request
        // runs again. No reply was stored before either run.
        assert.strictEqual(yield* client("fence").Run(payload), 2)
        assert.deepStrictEqual(repliesStoredBeforeRun, [0, 0])

        // The second run's reply was stored, and a duplicate is served from
        // storage without running the handler.
        assert.strictEqual(yield* client("fence").Run(payload), 2)
        assert.deepStrictEqual(repliesStoredBeforeRun, [0, 0])
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 0, replied: 1, unprocessed: 0 })
      }))
  }
})
