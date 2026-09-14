import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Queue, Schema, Stream } from "effect"
import {
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  EntityType,
  type Envelope,
  Sharding,
  Snowflake
} from "effect/unstable/cluster"
import { Headers } from "effect/unstable/http"
import { Rpc } from "effect/unstable/rpc"
import { make, makeRawRunnerClient } from "./harness.ts"

const WatchRpc = Rpc.make("Watch", { payload: { id: Schema.String }, success: Schema.Int, stream: true })
const WatchEntity = Entity.make("ClusterIntegrationStreamDisconnect", [WatchRpc])
  .annotateRpcs(ClusterSchema.Persisted, false)

const setup = Effect.fnUntraced(function*() {
  const counts = { starts: 0, stops: 0 }
  const layer = WatchEntity.toLayer({
    Watch: () => {
      counts.starts++
      return Rpc.fork(Stream.never.pipe(Stream.ensuring(Effect.sync(() => {
        counts.stops++
      }))))
    }
  })
  const cluster = yield* make({ backend: "pg", entities: layer })
  const [a, b] = yield* cluster.start(2)
  yield* cluster.waitForStableAssignments()
  const entityId = "watch-1"
  yield* cluster.waitUntil(
    "entity has no owner",
    Effect.map(cluster.ownerOfEntity(WatchEntity, entityId), (owner) => owner !== undefined)
  )
  const owner = (yield* cluster.ownerOfEntity(WatchEntity, entityId))!
  const other = owner === a ? b : a
  return { cluster, counts, owner, other, entityId }
})

describe("cross-runner disconnect cleanup", () => {
  it.live("live runner caller: inbound socket cut on the host", () =>
    Effect.gen(function*() {
      const { cluster, counts, owner, other, entityId } = yield* setup()
      const client = yield* WatchEntity.client.pipe(Effect.provideService(Sharding.Sharding, other.sharding))
      const caller = yield* client(entityId).Watch({ id: "x" }).pipe(
        Stream.runDrain,
        Effect.forkChild({ startImmediately: true })
      )
      yield* cluster.waitUntil("host handler did not start", Effect.sync(() => counts.starts === 1))
      assert.deepStrictEqual(counts, { starts: 1, stops: 0 })

      yield* cluster.cutSocket(owner, { peer: other, direction: "inbound" })
      yield* cluster.waitUntil("host handler did not stop after the cut", Effect.sync(() => counts.stops === 1))
      // The calling runner sees RunnerUnavailable and retries on a new connection.
      yield* cluster.waitUntil("caller did not retry", Effect.sync(() => counts.starts === 2))
      assert.strictEqual(caller.pollUnsafe(), undefined)
      yield* Fiber.interrupt(caller)
      yield* cluster.waitUntil("host handler did not stop after interrupt", Effect.sync(() => counts.stops === 2))
    }))

  it.live("client-only caller: inbound socket cut on the host", () =>
    Effect.gen(function*() {
      const { cluster, counts, owner, entityId } = yield* setup()
      const client = yield* cluster.getClient(WatchEntity)
      const caller = yield* client(entityId).Watch({ id: "x" }).pipe(
        Stream.runDrain,
        Effect.forkChild({ startImmediately: true })
      )
      yield* cluster.waitUntil("host handler did not start", Effect.sync(() => counts.starts === 1))
      assert.deepStrictEqual(counts, { starts: 1, stops: 0 })

      yield* cluster.cutSocket(owner, { peer: "client", direction: "inbound" })
      yield* cluster.waitUntil("host handler did not stop after the cut", Effect.sync(() => counts.stops === 1))
      yield* cluster.waitUntil("caller did not retry", Effect.sync(() => counts.starts === 2))
      assert.strictEqual(caller.pollUnsafe(), undefined)
      yield* Fiber.interrupt(caller)
      yield* cluster.waitUntil("host handler did not stop after interrupt", Effect.sync(() => counts.stops === 2))
    }))

  it.live("dead caller: socket closed with no further messages", () =>
    Effect.gen(function*() {
      const { cluster, counts, owner, entityId } = yield* setup()
      const raw = yield* makeRawRunnerClient(owner)
      const id = EntityId.make(entityId)
      const snowflake = yield* Snowflake.Generator.pipe(Effect.provide(Snowflake.layerGenerator))
      const request: Envelope.PartialRequest = {
        _tag: "Request",
        requestId: snowflake.nextUnsafe(),
        address: EntityAddress.make({
          shardId: owner.sharding.getShardId(id, WatchEntity.getShardGroup(id)),
          entityType: EntityType.make(WatchEntity.type),
          entityId: id
        }),
        tag: "Watch",
        payload: yield* Schema.encodeEffect(raw.codecFor(WatchRpc.payloadSchema))({ id: "x" }),
        headers: Headers.empty
      }
      const caller = yield* raw.client.Stream({ request, persisted: false }, { asQueue: true }).pipe(
        Effect.flatMap((queue) => Effect.forever(Queue.take(queue))),
        Effect.scoped,
        Effect.forkChild({ startImmediately: true })
      )
      yield* cluster.waitUntil("host handler did not start", Effect.sync(() => counts.starts === 1))
      assert.deepStrictEqual(counts, { starts: 1, stops: 0 })

      // The caller "dies": its socket closes and nothing else is ever sent.
      yield* raw.disconnect
      yield* cluster.waitUntil("host handler did not stop after the caller died", Effect.sync(() => counts.stops === 1))
      assert.deepStrictEqual(counts, { starts: 1, stops: 1 })
      yield* Fiber.interrupt(caller)
    }))
})
