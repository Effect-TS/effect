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
import { Context, Effect, ExecutionStrategy, Exit, Layer, Option, Schema, Scope, TestServices } from "effect"

it.effect("an entity finalizer delivers remote volatile discard during runner shutdown", () =>
  Effect.gen(function*() {
    const received: Array<number> = []
    const delivered = yield* Effect.makeLatch()
    let shuttingDown = false
    let finalized = false
    const receiver = Entity.make("ShutdownDiscardReceiver", [
      Rpc.make("Ping", { payload: { id: Schema.Number } }).annotate(ClusterSchema.Persisted, false)
    ]).annotate(ClusterSchema.ShardGroup, () => "receiver")
    const sender = Entity.make("ShutdownDiscardSender", [
      Rpc.make("Arm").annotate(ClusterSchema.Persisted, false)
    ]).annotate(ClusterSchema.ShardGroup, () => "sender")
    const protocol = NodeClusterSocket.layerClientProtocol.pipe(Layer.provide(RpcSerialization.layerNdjson))
    const makeRunner = Effect.fnUntraced(function*(group: string) {
      const server = yield* NodeSocketServer.make({ host: "127.0.0.1", port: 0 })
      assert(server.address._tag === "TcpAddress")
      return SocketRunner.layer.pipe(
        Layer.provide(Layer.succeed(SocketServer, server)),
        Layer.provide(protocol),
        Layer.provide(RpcSerialization.layerNdjson),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provide(ShardingConfig.layer({
          runnerAddress: Option.some(RunnerAddress.make("127.0.0.1", server.address.port)),
          availableShardGroups: ["sender", "receiver"],
          assignedShardGroups: [group],
          shardsPerGroup: 1,
          entityTerminationTimeout: 0,
          refreshAssignmentsInterval: 20,
          sendRetryInterval: 10,
          preemptiveShutdown: true
        }))
      )
    })
    const receiverRunner = yield* makeRunner("receiver")
    const receiverContext = yield* Layer.build(
      receiver.toLayer({
        Ping: ({ payload: { id } }) =>
          Effect.sync(() => received.push(id)).pipe(
            Effect.andThen(id === 1 ? delivered.open : Effect.void)
          )
      }).pipe(Layer.provideMerge(receiverRunner))
    )
    const receiverSharding = Context.get(receiverContext, Sharding.Sharding)
    const receiverShard = receiverSharding.getShardId(EntityId.make("peer"), "receiver")
    yield* Effect.whileLoop({
      while: () => !receiverSharding.hasShardId(receiverShard),
      body: () => Effect.sleep(5),
      step: () => {}
    }).pipe(Effect.timeout("3 seconds"))

    const senderRunner = yield* makeRunner("sender")
    const senderScope = yield* Scope.fork(yield* Effect.scope, ExecutionStrategy.sequential)
    const senderContext = yield* Layer.build(
      sender.toLayer(Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const client = (yield* receiver.client)("peer")
        yield* Effect.addFinalizer(() =>
          Effect.gen(function*() {
            shuttingDown = yield* sharding.isShutdown
            yield* client.Ping({ id: 1 }, { discard: true }).pipe(Effect.orDie)
            finalized = true
          })
        )
        return { Arm: () => client.Ping({ id: 0 }).pipe(Effect.orDie) }
      })).pipe(Layer.provideMerge(senderRunner))
    ).pipe(Scope.extend(senderScope))
    const senderSharding = Context.get(senderContext, Sharding.Sharding)
    const senderShard = senderSharding.getShardId(EntityId.make("one"), "sender")
    yield* Effect.whileLoop({
      while: () => !senderSharding.hasShardId(senderShard),
      body: () => Effect.sleep(5),
      step: () => {}
    }).pipe(Effect.timeout("3 seconds"))
    assert.isFalse(senderSharding.hasShardId(receiverShard), "the discard target must be on the other runner")
    yield* Effect.flatMap(sender.client, (client) => client("one").Arm()).pipe(
      Effect.provide(senderContext),
      Effect.timeout("3 seconds")
    )
    assert.deepStrictEqual(received, [0], "the remote receiver must be reachable before shutdown")
    yield* Scope.close(senderScope, Exit.void)
    assert.isTrue(shuttingDown, "send must run inside the graceful-shutdown window")
    assert.isTrue(finalized)
    assert.isFalse(yield* receiverSharding.isShutdown)
    const result = yield* delivered.await.pipe(Effect.timeoutOption("1 second"))
    assert(Option.isSome(result), `shutdown discarded the remote message; received IDs: ${received}`)
    assert.deepStrictEqual(received, [0, 1])
  }).pipe(
    Effect.scoped,
    Effect.provide(
      Layer.mergeAll(MessageStorage.layerMemory, RunnerStorage.layerMemory, Snowflake.layerGenerator).pipe(
        Layer.provide(ShardingConfig.layerDefaults)
      )
    ),
    TestServices.provideLive
  ), 15_000)

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
