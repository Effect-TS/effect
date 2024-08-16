import { decideAssignmentsForUnassignedShards, PodWithMetadata, State } from "@effect/cluster/internal/shardManager"
import { Pod } from "@effect/cluster/Pod"
import { PodAddress } from "@effect/cluster/PodAddress"
import * as Pods from "@effect/cluster/Pods"
import * as PodsHealth from "@effect/cluster/PodsHealth"
import { ShardId } from "@effect/cluster/ShardId"
import * as ShardManager from "@effect/cluster/ShardManager"
import * as Storage from "@effect/cluster/Storage"
import { bench, describe, expect } from "@effect/vitest"
import { Data, Effect, Layer, Logger, MutableHashMap, TestClock, TestContext } from "effect"
import * as Array from "effect/Array"
import * as Option from "effect/Option"

describe("ShardManager", () => {
  const shards300 = Array.makeBy(300, (i) => [ShardId.make(i + 1), Option.none<PodAddress>()] as const)
  const state30 = new State(
    MutableHashMap.fromIterable(Array.makeBy(30, (i) => {
      const address = PodAddress.make({ host: `${i}`, port: i })
      const meta = PodWithMetadata({
        pod: Pod.make({ address, version: 1 }),
        registeredAt: Date.now()
      })
      return [address, meta] as const
    })),
    new Map(shards300)
  )

  const shards1000 = Array.makeBy(1000, (i) => [ShardId.make(i + 1), Option.none<PodAddress>()] as const)
  const state100 = new State(
    MutableHashMap.fromIterable(Array.makeBy(100, (i) => {
      const address = PodAddress.make({ host: `${i}`, port: i })
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

  const ShardManagerLive = ShardManager.layer()
  const PodsHealthLive = PodsHealth.layerLocal.pipe(
    Layer.provideMerge(Pods.layerNoop)
  )
  const TestLive = ShardManagerLive.pipe(
    Layer.provideMerge(Layer.mergeAll(
      Storage.layerNoop,
      PodsHealthLive
    )),
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

      // Check that each of the new pods received 6 shards
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
    address: PodAddress.make({ host: "server", port: n }),
    version: 1
  })
  return SimulationEvent.RegisterPod({ pod })
}
function unregisterPod(n: number) {
  const address = PodAddress.make({ host: "server", port: n })
  return SimulationEvent.UnregisterPod({ address })
}

type SimulationEvent = Data.TaggedEnum<{
  readonly RegisterPod: { readonly pod: Pod }
  readonly UnregisterPod: { readonly address: PodAddress }
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
