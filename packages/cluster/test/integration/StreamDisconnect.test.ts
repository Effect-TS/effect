import { ClusterSchema, Entity, EntityAddress, EntityId, type Envelope, Runners, Snowflake } from "@effect/cluster"
import { NodeSocket } from "@effect/platform-node"
import * as Headers from "@effect/platform/Headers"
import { Socket } from "@effect/platform/Socket"
import { Rpc, RpcClient, RpcSchema, RpcSerialization } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Schema, Scope, Stream } from "effect"
import { make } from "./harness.js"

const WatchRpc = Rpc.make("Watch", {
  payload: { id: Schema.String },
  success: RpcSchema.Stream({ success: Schema.Int, failure: Schema.Never })
})
const WatchEntity = Entity.make("ClusterIntegrationStreamDisconnect", [WatchRpc]).annotateRpcs(
  ClusterSchema.Persisted,
  false
)

describe("cross-runner disconnect cleanup", () => {
  it.scopedLive("dead caller: socket closed with no further messages", () =>
    Effect.gen(function*() {
      const counts = { starts: 0, stops: 0 }
      const entities = WatchEntity.toLayer({
        Watch: () => {
          counts.starts++
          return Rpc.fork(Stream.never.pipe(Stream.ensuring(Effect.sync(() => {
            counts.stops++
          }))))
        }
      })
      const cluster = yield* make({ backend: "pg", entities })
      const [owner] = yield* cluster.start(1)
      yield* cluster.waitForStableAssignments()
      const transport = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))
      const socket = yield* NodeSocket.makeNet({ host: owner.address.host, port: owner.address.port })
      const protocol = yield* RpcClient.makeProtocolSocket().pipe(
        Effect.provideService(Socket, socket),
        Effect.provide(RpcSerialization.layerNdjson),
        Scope.extend(transport)
      )
      const client = yield* RpcClient.make(Runners.Rpcs).pipe(
        Effect.provideService(RpcClient.Protocol, protocol),
        Scope.extend(transport)
      )
      const id = EntityId.make("watch-1"),
        snowflake = yield* Snowflake.Generator.pipe(Effect.provide(Snowflake.layerGenerator))
      const request: Envelope.Request.PartialEncoded = {
        _tag: "Request",
        requestId: snowflake.unsafeNext(),
        address: EntityAddress.make({
          shardId: owner.sharding.getShardId(id, WatchEntity.getShardGroup(id)),
          entityType: WatchEntity.type,
          entityId: id
        }),
        tag: "Watch",
        payload: yield* Schema.encode(WatchRpc.payloadSchema)({ id: "x" }),
        headers: Headers.empty
      }
      const caller = yield* client.Stream({ request, persisted: false }, { asMailbox: true }).pipe(
        Effect.flatMap((mailbox) => Effect.forever(mailbox.take)),
        Effect.scoped,
        Effect.forkScoped
      )
      yield* cluster.waitUntil("host handler did not start", Effect.sync(() => counts.starts === 1))
      assert.deepStrictEqual(counts, { starts: 1, stops: 0 })
      yield* Scope.close(transport, Exit.void)
      yield* cluster.waitUntil("host handler did not stop after the caller died", Effect.sync(() => counts.stops === 1))
      assert.deepStrictEqual(counts, { starts: 1, stops: 1 })
      yield* Fiber.interrupt(caller)
    }))
})
