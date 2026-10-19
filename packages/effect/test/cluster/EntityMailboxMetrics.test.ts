import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Latch, Layer, Metric, Option } from "effect"
import {
  ClusterMetrics,
  ClusterSchema,
  Entity,
  MessageStorage,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "effect/cluster"
import { Rpc } from "effect/rpc"
import { TestClock } from "effect/testing"

const MailboxEntity = Entity.make("MailboxMetricsEntity", [
  Rpc.make("Wait").annotate(ClusterSchema.Persisted, false)
])

const gate = Latch.makeUnsafe()

const TestSharding = MailboxEntity.toLayer({ Wait: () => gate.await }).pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provide([RunnerStorage.layerMemory, RunnerHealth.layerNoop, Runners.layerNoop]),
  Layer.provide(MessageStorage.layerMemory),
  Layer.provide(ShardingConfig.layer({
    runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
    shardsPerGroup: 1
  }))
)

const mailboxMax = () =>
  ClusterMetrics.entityMailboxMax.valueUnsafe(
    Metric.CurrentMetricAttributes.context({ type: MailboxEntity.type })
  ).value

describe("EntityMailboxMetrics", () => {
  it.effect("tracks the largest in-flight request count of a single entity", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const makeClient = yield* MailboxEntity.client
      const fibers = yield* Effect.forEach(
        ["1", "1", "2"],
        (id) => makeClient(id).Wait().pipe(Effect.forkChild({ startImmediately: true }))
      )
      yield* TestClock.adjust(1001)
      assert.strictEqual(mailboxMax(), 2n)

      yield* gate.open
      yield* Fiber.joinAll(fibers)
      yield* TestClock.adjust(1001)
      assert.strictEqual(mailboxMax(), 0n)
    }).pipe(Effect.provide(TestSharding)))
})
