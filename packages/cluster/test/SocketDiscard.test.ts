import {
  ClusterSchema,
  Entity,
  EntityId,
  MessageStorage,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake,
  SocketRunner
} from "@effect/cluster"
import { NodeClusterSocket, NodeSocketServer } from "@effect/platform-node"
import { SocketServer } from "@effect/platform/SocketServer"
import { Rpc, RpcSerialization } from "@effect/rpc"
import { RpcClientError } from "@effect/rpc/RpcClientError"
import { assert, it } from "@effect/vitest"
import { Context, Effect, Layer, Option, Schema, TestServices } from "effect"

for (const failFirstSend of [false, true]) {
  it.effect(
    `remote volatile discard completes before handler and retries transport failure=${failFirstSend}`,
    () =>
      Effect.gen(function*() {
        const started = yield* Effect.makeLatch()
        let finished = false
        let sends = 0
        const entity = Entity.make("SocketDiscardFollowup", [
          Rpc.make("Wait", { payload: { id: Schema.Number } }).annotate(ClusterSchema.Persisted, false)
        ])
        const server = yield* NodeSocketServer.make({ host: "127.0.0.1", port: 0 })
        assert(server.address._tag === "TcpAddress")
        const address = RunnerAddress.make("127.0.0.1", server.address.port)
        const protocol = NodeClusterSocket.layerClientProtocol.pipe(Layer.provide(RpcSerialization.layerNdjson))
        const receiver = entity.toLayer({
          Wait: () =>
            started.open.pipe(
              Effect.andThen(Effect.never),
              Effect.ensuring(Effect.sync(() => {
                finished = true
              }))
            )
        }).pipe(
          Layer.provideMerge(SocketRunner.layer),
          Layer.provide(Layer.succeed(SocketServer, server)),
          Layer.provide(protocol),
          Layer.provide(RpcSerialization.layerNdjson),
          Layer.provide(RunnerHealth.layerNoop),
          Layer.provide(
            ShardingConfig.layer({
              runnerAddress: Option.some(address),
              shardsPerGroup: 1,
              entityTerminationTimeout: 0,
              refreshAssignmentsInterval: 20,
              sendRetryInterval: 10
            })
          )
        )
        const receiverContext = yield* Layer.build(receiver)
        const sharding = Context.get(receiverContext, Sharding.Sharding)
        const shard = sharding.getShardId(EntityId.make("one"), "default")
        while (!sharding.hasShardId(shard)) yield* Effect.sleep(5)

        const flaky = Layer.effect(
          Runners.RpcClientProtocol,
          Effect.map(Runners.RpcClientProtocol, (make) => (address) =>
            Effect.map(make(address), (transport) => ({
              ...transport,
              send: (message) => {
                if (message._tag === "Request" && message.tag === "Notify") {
                  sends++
                  if (failFirstSend && sends === 1) {
                    return Effect.fail(
                      new RpcClientError({ reason: "Protocol", message: "injected first delivery failure" })
                    )
                  }
                }
                return transport.send(message)
              }
            })))
        ).pipe(Layer.provide(protocol))
        const sender = SocketRunner.layerClientOnly.pipe(
          Layer.provide(flaky),
          Layer.provide(
            ShardingConfig.layer({
              runnerAddress: Option.none(),
              shardsPerGroup: 1,
              refreshAssignmentsInterval: 20,
              sendRetryInterval: 10
            })
          )
        )
        yield* Effect.gen(function*() {
          const result = yield* (yield* entity.client)("one").Wait({ id: 1 }, { discard: true }).pipe(
            Effect.timeoutOption("2 seconds")
          )
          assert(Option.isSome(result), "remote discard waited for the handler reply")
          yield* started.await.pipe(Effect.timeout("1 second"))
          assert.isFalse(finished)
          assert.strictEqual(sends, failFirstSend ? 2 : 1)
        }).pipe(Effect.provide(sender))
      }).pipe(
        Effect.scoped,
        Effect.provide(
          Layer.mergeAll(MessageStorage.layerMemory, RunnerStorage.layerMemory, Snowflake.layerGenerator).pipe(
            Layer.provide(ShardingConfig.layerDefaults)
          )
        ),
        TestServices.provideLive
      ),
    15_000
  )
}
