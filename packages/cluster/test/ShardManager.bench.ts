import {
  MessageStorage,
  Pod,
  PodAddress,
  Pods,
  PodsHealth,
  ShardId,
  ShardingConfig,
  ShardManager,
  ShardStorage
} from "@effect/cluster"
import { decideAssignmentsForUnassignedShards, PodWithMetadata, State } from "@effect/cluster/internal/shardManager"
import { bench, describe, expect } from "@effect/vitest"
import { Array, Data, Effect, Layer, Logger, MutableHashMap, Option, TestClock, TestContext } from "effect"

describe("ShardManager", () => {
  const shards300 = Array.makeBy(
    300,
    (i) => [ShardId.make(i + 1), Option.none<PodAddress.PodAddress>()] as const
  )
  const state30 = new State(
    MutableHashMap.fromIterable(Array.makeBy(30, (i) => {
      const address = PodAddress.make(`${i}`, i)
      const meta = PodWithMetadata({
        pod: Pod.Pod.make({ address, version: 1 }),
        registeredAt: Date.now()
      })
      return [address, meta] as const
    })),
    new Map(shards300)
  )

  const shards1000 = Array.makeBy(
    1000,
    (i) => [ShardId.make(i + 1), Option.none<PodAddress.PodAddress>()] as const
  )
  const state100 = new State(
    MutableHashMap.fromIterable(Array.makeBy(100, (i) => {
      const address = PodAddress.make(`${i}`, i)
      const meta = PodWithMetadata({
        pod: Pod.make({ address, version: 1 }),
        registeredAt: Date.now()
      })
      return [address, meta] as const
    })),
    new Map(shards1000)
  )

  bench("decideAssignmentsForUnassignedShards - 30 pods 300 shards", () => {
    decideAssignmentsForUnassignedShards(state30)
  })

  bench("decideAssignmentsForUnassignedShards - 100 pods 1000 shards", () => {
    decideAssignmentsForUnassignedShards(state100)
  })

  const ShardManagerLive = ShardManager.layer.pipe(
    Layer.provide(ShardManager.layerConfig({
      rebalanceDebounce: 0
    }))
  )
  const PodsHealthLive = PodsHealth.layer.pipe(
    Layer.provideMerge(Pods.layerNoop)
  )
  const TestLive = ShardManagerLive.pipe(
    Layer.provideMerge(Layer.mergeAll(
      ShardStorage.layerNoop,
      PodsHealthLive
    )),
    Layer.provide(ShardingConfig.layer()),
    Layer.provide(MessageStorage.layerNoop),
    Layer.provideMerge(TestContext.TestContext),
    Layer.provideMerge(Logger.remove(Logger.defaultLogger))
  )

  bench("ShardManager - 50 pods up & down", () =>
    Effect.gen(function*() {
      const manager = yield* ShardManager.ShardManager

      yield* simulate(Array.range(1, 50).map(registerPod))
      yield* TestClock.adjust("20 seconds")

      const assignments = yield* manager.getAssignments
      const values = Array.fromIterable(assignments.values())
      const allPodsAssigned = Array.every(values, Option.isSome)
      expect(allPodsAssigned).toBe(true)

      yield* simulate(Array.range(1, 50).map(unregisterPod))
      yield* TestClock.adjust("1 second")

      const assignments2 = yield* manager.getAssignments
      const values2 = Array.fromIterable(assignments2.values())
      const allPodsUnassigned = Array.every(values2, Option.isNone)
      expect(allPodsUnassigned).toBe(true)
    }).pipe(
      Effect.provide(TestLive),
      Effect.runPromise
    ))
})

function registerPod(n: number) {
  const pod = Pod.make({
    address: PodAddress.make("server", n),
    version: 1
  })
  return SimulationEvent.RegisterPod({ pod })
}
function unregisterPod(n: number) {
  const address = PodAddress.make("server", n)
  return SimulationEvent.UnregisterPod({ address })
}

type SimulationEvent = Data.TaggedEnum<{
  readonly RegisterPod: { readonly pod: Pod.Pod }
  readonly UnregisterPod: { readonly address: PodAddress.PodAddress }
}>
const SimulationEvent = Data.taggedEnum<SimulationEvent>()

const handleEvent = SimulationEvent.$match({
  RegisterPod: ({ pod }) =>
    ShardManager.ShardManager.pipe(
      Effect.flatMap((manager) => manager.register(pod))
    ),
  UnregisterPod: ({ address }) =>
    ShardManager.ShardManager.pipe(
      Effect.flatMap((manager) => manager.unregister(address))
    )
})

function simulate(events: ReadonlyArray<SimulationEvent>) {
  return Effect.forEach(events, handleEvent, { discard: true })
}
