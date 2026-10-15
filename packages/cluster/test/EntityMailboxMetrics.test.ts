import {
  ClusterMetrics,
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
import { Effect, Fiber, Layer, Metric, TestClock } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"

const MailboxEntity = Entity.make("MailboxEntity", [
  Rpc.make("Wait").annotate(ClusterSchema.Persisted, false)
])

class Gate extends Effect.Service<Gate>()("Gate", {
  effect: Effect.makeLatch(false)
}) {}

const MailboxEntityLayer = MailboxEntity.toLayer(Effect.gen(function*() {
  const gate = yield* Gate
  return { Wait: () => gate.await }
}))

const TestSharding = MailboxEntityLayer.pipe(
  Layer.provideMerge(Gate.Default),
  Layer.provideMerge(Sharding.layer),
  Layer.provide([RunnerStorage.layerMemory, RunnerHealth.layerNoop, Runners.layerNoop]),
  Layer.provide(MessageStorage.layerMemory),
  Layer.provide(ShardingConfig.layer())
)

const mailboxMax = Metric.value(ClusterMetrics.entityMailboxMax.pipe(Metric.tagged("type", "MailboxEntity")))

describe("EntityMailboxMetrics", () => {
  it.scoped("tracks the largest entity mailbox", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const gate = yield* Gate
      const makeClient = yield* MailboxEntity.client
      const fibers = yield* Effect.forEach(
        ["1", "1", "2"],
        (id) => Effect.fork(makeClient(id).Wait()),
        { concurrency: "unbounded" }
      )
      yield* TestClock.adjust(1001)
      assert.strictEqual((yield* mailboxMax).value, 2n)

      yield* gate.open
      yield* Fiber.joinAll(fibers)
      yield* TestClock.adjust(1001)
      assert.strictEqual((yield* mailboxMax).value, 0n)
    }).pipe(Effect.provide(TestSharding)))
})
