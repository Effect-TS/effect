import {
  ClusterError,
  ClusterSchema,
  Entity,
  EntityId,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Fiber, FiberId, Layer, Option, Scope, TestClock, TestServices } from "effect"
import { abandonmentCause, MemoryLive } from "./fixtures/abandonment.js"
import { makeAckChunk, makeChunkReply, makeRequest, StreamRpc, StreamTest } from "./fixtures/message-storage.js"

describe("shutdown follow-up", () => {
  for (const persisted of [false, true]) {
    for (const discard of [false, true]) {
      for (const preemptiveShutdown of [false, true]) {
        it.effect(
          `finalizing entity settles nested request (persisted=${persisted}, discard=${discard}, preemptive=${preemptiveShutdown})`,
          () =>
            Effect.gen(function*() {
              const ready = yield* Effect.makeLatch()
              let finalized = false
              const receiver = Entity.make("FinalizerReceiver", [
                Rpc.make("Ping").annotate(ClusterSchema.Persisted, persisted)
              ])
              const sender = Entity.make("FinalizerSender", [Rpc.make("Arm").annotate(ClusterSchema.Persisted, false)])
              const env = Layer.merge(
                receiver.toLayer({ Ping: () => Effect.void }),
                sender.toLayer(Effect.gen(function*() {
                  const client = (yield* receiver.client)("peer")
                  yield* Effect.addFinalizer(() =>
                    client.Ping(undefined, { discard }).pipe(
                      Effect.exit,
                      Effect.tap(() =>
                        Effect.sync(() => {
                          finalized = true
                        })
                      )
                    )
                  )
                  return { Arm: () => Effect.void }
                }))
              ).pipe(
                Layer.provideMerge(Sharding.layer),
                Layer.provide(RunnerStorage.layerMemory),
                Layer.provide(RunnerHealth.layerNoop),
                Layer.provide(Runners.layerNoop),
                Layer.provideMerge(MessageStorage.layerMemory),
                Layer.provide(
                  ShardingConfig.layer({
                    shardsPerGroup: 1,
                    entityTerminationTimeout: 0,
                    entityMessagePollInterval: 20,
                    refreshAssignmentsInterval: 20,
                    sendRetryInterval: 10,
                    preemptiveShutdown
                  })
                )
              )
              const fiber = yield* Effect.gen(function*() {
                const sharding = yield* Sharding.Sharding
                const shard = sharding.getShardId(EntityId.make("one"), "default")
                while (!sharding.hasShardId(shard)) yield* Effect.sleep(5)
                yield* (yield* sender.client)("one").Arm()
                yield* ready.open
                return yield* Effect.never
              }).pipe(Effect.provide(env), Effect.forkDaemon)
              yield* ready.await.pipe(Effect.timeout("3 seconds"))
              fiber.unsafeInterruptAsFork(FiberId.none)
              const exit = yield* Fiber.await(fiber).pipe(Effect.timeoutOption("3 seconds"))
              assert(Option.isSome(exit), "closing a finalizing entity left an outgoing retry loop running")
              assert.isTrue(finalized)
            }).pipe(TestServices.provideLive),
          10_000
        )
      }
    }
  }

  for (const persisted of [false, true]) {
    it.effect(`abandoned AckChunk returns a routing error (persisted=${persisted})`, () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const rpc = StreamRpc.annotate(ClusterSchema.Persisted, persisted)
        const request = yield* makeRequest({ rpc, payload: new StreamTest({ id: 1 }) })
        const scope = yield* Scope.make()
        const context = yield* Layer.build(Sharding.layer.pipe(
          Layer.provide(RunnerStorage.layerMemory),
          Layer.provide(RunnerHealth.layerNoop),
          Layer.provide(Runners.layerNoop),
          Layer.provide(ShardingConfig.layer({ entityTerminationTimeout: 0, sendRetryInterval: 10 }))
        )).pipe(Scope.extend(scope))
        yield* TestClock.adjust(1)
        yield* Scope.close(scope, Exit.void)
        yield* storage.saveRequest(request)
        const chunk = yield* makeChunkReply(request)
        yield* storage.saveReply(chunk)
        const ack = yield* makeAckChunk(request, chunk)
        const result = yield* Context.get(context, Sharding.Sharding).sendOutgoing(ack, false).pipe(
          Effect.exit,
          Effect.timeoutOption(200),
          TestServices.provideLive
        )
        assert(Option.isSome(result), "AckChunk retry loop did not settle")
        assert(Exit.isFailure(result.value))
        assert.instanceOf(Cause.squash(result.value.cause), ClusterError.EntityNotAssignedToRunner)
      }).pipe(Effect.provide(MemoryLive)))
  }

  it.effect("RPC cleanup does not journal cancellation after a marked abandonment while Sharding is alive", () =>
    Effect.gen(function*() {
      const cause = yield* abandonmentCause
      const storage = yield* MessageStorage.MessageStorage
      const driver = yield* MessageStorage.MemoryDriver
      const noop = yield* Runners.makeNoop.pipe(Effect.provide(ShardingConfig.layerDefaults))
      const entity = Entity.make("RpcAbandonment", [Rpc.make("Run").annotate(ClusterSchema.Persisted, true)])
      const layer = Sharding.layer.pipe(
        Layer.provide(RunnerStorage.layerMemory),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provide(
          Layer.succeed(Runners.Runners, {
            ...noop,
            notify: ({ message }) =>
              (message._tag === "OutgoingRequest" ? storage.saveRequest(message) : storage.saveEnvelope(message)).pipe(
                Effect.orDie,
                Effect.andThen(Effect.failCause(cause))
              )
          })
        ),
        Layer.provide(ShardingConfig.layer({ runnerAddress: Option.none(), sendRetryInterval: 10 }))
      )
      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const exit = yield* (yield* entity.client)("one").Run().pipe(Effect.fork, Effect.flatMap(Fiber.await))
        assert(Exit.isFailure(exit) && Cause.isInterruptedOnly(exit.cause))
        assert.isFalse(yield* sharding.isShutdown)
        assert.deepStrictEqual(driver.journal.map((e) => e._tag), ["Request"])
      }).pipe(Effect.provide(layer))
    }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
})
