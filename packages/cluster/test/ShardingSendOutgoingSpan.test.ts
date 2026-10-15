import {
  ClusterSchema,
  Entity,
  MessageStorage,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option, TestClock, Tracer } from "effect"

describe("Sharding.sendOutgoing span", () => {
  it.scoped("traces outgoing sends with routing attributes", () =>
    Effect.gen(function*() {
      const base = yield* Effect.tracer
      const spans: Array<{ name: string; attributes: ReadonlyMap<string, unknown> }> = []
      const tracer = Tracer.make({
        context: base.context,
        span(name, parent, context, links, startTime, kind, options) {
          const span = base.span(name, parent, context, links, startTime, kind, options)
          spans.push({ name, attributes: span.attributes })
          return span
        }
      })
      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* PingEntity.client
        yield* makeClient("1").Ping()
      }).pipe(Effect.provide(makeSharding(34701)), Effect.withTracer(tracer))
      const span = spans.find((span) => span.name === "Sharding.sendOutgoing")
      assert.isDefined(span)
      assert.strictEqual(span!.attributes.get("cluster.entity.type"), "PingEntity")
      assert.strictEqual(span!.attributes.get("cluster.runner.local"), true)
    }))
})

const PingEntity = Entity.make("PingEntity", [
  Rpc.make("Ping").annotate(ClusterSchema.Persisted, false)
])

const makeSharding = (port: number) =>
  PingEntity.toLayer({ Ping: () => Effect.void }).pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(Runners.layerNoop),
    Layer.provideMerge(MessageStorage.layerMemory),
    Layer.provide(ShardingConfig.layer({
      runnerAddress: Option.some(RunnerAddress.make("localhost", port)),
      entityTerminationTimeout: 0,
      entityMessagePollInterval: 5000,
      sendRetryInterval: 100
    }))
  )
