import {
  ClusterSchema,
  Entity,
  MessageStorage,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Layer, MutableRef, Schedule, Schema, Scope, Stream, TestClock } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"

const StreamEntity = Entity.make("StreamEntity", [
  Rpc.make("Subscribe", { success: Schema.Number, stream: true }),
  Rpc.make("Boom")
]).annotateRpcs(ClusterSchema.Persisted, false)

class StreamEntityState extends Effect.Service<StreamEntityState>()("StreamEntityState", {
  sync: () => ({
    subscribes: MutableRef.make(0),
    poisoned: MutableRef.make(false)
  })
}) {}

const StreamEntityLayer = StreamEntity.toLayer(
  Effect.gen(function*() {
    const state = yield* StreamEntityState
    return {
      Subscribe: () =>
        Rpc.fork(Stream.suspend(() => {
          MutableRef.increment(state.subscribes)
          if (MutableRef.getAndSet(state.poisoned, false)) {
            return Stream.die("poisoned")
          }
          return Stream.concat(Stream.make(0), Stream.never)
        })),
      Boom: () => Effect.suspend(() => MutableRef.getAndSet(state.poisoned, false) ? Effect.die("boom") : Effect.void)
    }
  }),
  { defectRetryPolicy: Schedule.forever }
)

const TestSharding = (entityTerminationTimeout: number) =>
  StreamEntityLayer.pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(Runners.layerNoop),
    Layer.provide(MessageStorage.layerMemory),
    Layer.provide(ShardingConfig.layer({
      entityMailboxCapacity: 10,
      entityTerminationTimeout,
      entityMessagePollInterval: 5000,
      sendRetryInterval: 100
    })),
    Layer.provideMerge(StreamEntityState.Default)
  )

const isInterruptedOnly = (exit: Exit.Exit<unknown, unknown> | null) =>
  exit !== null && Exit.isFailure(exit) && Cause.isInterruptedOnly(exit.cause)

describe("ShardReleaseStreams", () => {
  it.effect("entity teardown interrupts non-persisted streams instead of waiting entityTerminationTimeout", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const context = yield* Layer.buildWithScope(TestSharding(30_000), scope)
      const subscription = yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const client = (yield* StreamEntity.client)("1")
        const subscription = yield* client.Subscribe().pipe(Stream.runDrain, Effect.fork)
        yield* TestClock.adjust(1)
        return subscription
      }).pipe(Effect.provide(context))

      const closing = yield* Effect.fork(Scope.close(scope, Exit.void))
      yield* TestClock.adjust(1)
      const closedPromptly = closing.unsafePoll() !== null
      const subscriptionExit = subscription.unsafePoll()

      // let a stuck teardown run out its timeout so the test cleans up
      yield* TestClock.adjust(30_000)
      yield* Fiber.join(closing)

      assert.isTrue(closedPromptly, "shard release waited for the non-persisted stream to finish")
      assert.isTrue(isInterruptedOnly(subscriptionExit))
    }))

  it.effect("defect restart does not replay a poisoned non-persisted stream", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const state = yield* StreamEntityState
      const client = (yield* StreamEntity.client)("1")

      MutableRef.set(state.poisoned, true)
      const subscription = yield* client.Subscribe().pipe(Stream.runDrain, Effect.fork)
      yield* TestClock.adjust(1)
      yield* TestClock.adjust(1)

      assert.strictEqual(state.subscribes.current, 1, "poisoned stream was replayed into the rebuilt entity")
      assert.isTrue(isInterruptedOnly(subscription.unsafePoll()))
    }).pipe(Effect.provide(TestSharding(0))))

  it.effect("defect restart interrupts live non-persisted streams instead of replaying them", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const state = yield* StreamEntityState
      const client = (yield* StreamEntity.client)("1")

      const received: Array<number> = []
      const subscription = yield* client.Subscribe().pipe(
        Stream.runForEach((n) => Effect.sync(() => received.push(n))),
        Effect.fork
      )
      yield* TestClock.adjust(1)
      assert.deepStrictEqual(received, [0])

      MutableRef.set(state.poisoned, true)
      yield* client.Boom().pipe(Effect.fork)
      yield* TestClock.adjust(1)
      yield* TestClock.adjust(1)

      assert.deepStrictEqual(received, [0], "stream restarted from scratch and re-emitted")
      assert.strictEqual(state.subscribes.current, 1)
      assert.isTrue(isInterruptedOnly(subscription.unsafePoll()))
    }).pipe(Effect.provide(TestSharding(0))))
})
