import {
  decideAssignmentsForUnassignedShards,
  decideAssignmentsForUnbalancedShards,
  PodWithMetadata,
  State
} from "@effect/cluster/internal/shardManager"
import { Pod } from "@effect/cluster/Pod"
import { PodAddress } from "@effect/cluster/PodAddress"
import * as Pods from "@effect/cluster/Pods"
import * as PodsHealth from "@effect/cluster/PodsHealth"
import { ShardId } from "@effect/cluster/ShardId"
import * as ShardManager from "@effect/cluster/ShardManager"
import * as Storage from "@effect/cluster/Storage"
import { describe, expect, it } from "@effect/vitest"
import { Iterable, MutableHashMap } from "effect"
import * as Array from "effect/Array"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as TestClock from "effect/TestClock"

const pod1 = PodWithMetadata({
  pod: Pod.make({ address: PodAddress.make({ host: "1", port: 1 }), version: 1 }),
  registeredAt: Number.MIN_SAFE_INTEGER
})
const pod2 = PodWithMetadata({
  pod: Pod.make({ address: PodAddress.make({ host: "2", port: 2 }), version: 1 }),
  registeredAt: Number.MIN_SAFE_INTEGER
})
const pod3 = PodWithMetadata({
  pod: Pod.make({ address: PodAddress.make({ host: "3", port: 3 }), version: 1 }),
  registeredAt: Number.MIN_SAFE_INTEGER
})

describe("ShardManager", () => {
  describe("Rebalancing", () => {
    it("should rebalance unbalanced assignments", () => {
      const state = new State(
        MutableHashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2]
        ),
        new Map([
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.has(assignments, pod2.pod.address)).toBe(true)
      expect(MutableHashMap.size(assignments)).toBe(1)
      expect(MutableHashMap.has(unassignments, pod1.pod.address)).toBe(true)
      expect(MutableHashMap.size(unassignments)).toBe(1)
    })

    it("should not rebalance to pods with an older version", () => {
      const oldPod2 = PodWithMetadata({
        pod: Pod.make({ address: pod2.pod.address, version: 0 }),
        registeredAt: pod2.registeredAt
      })
      const state = new State(
        MutableHashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, oldPod2]
        ),
        new Map([
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.size(assignments) === 0).toBe(true)
      expect(MutableHashMap.size(unassignments) === 0).toBe(true)
    })

    it("should not rebalance when already well-balanced", () => {
      const state = new State(
        MutableHashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2]
        ),
        new Map([
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod2.pod.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.isEmpty(assignments)).toBe(true)
      expect(MutableHashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should not rebalance when there is only a one-shard difference", () => {
      const state = new State(
        MutableHashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2]
        ),
        new Map([
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)],
          [ShardId.make(3), Option.some(pod2.pod.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.isEmpty(assignments)).toBe(true)
      expect(MutableHashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should rebalance when there is more than a one-shard difference", () => {
      const state = new State(
        MutableHashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2]
        ),
        new Map([
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)],
          [ShardId.make(3), Option.some(pod1.pod.address)],
          [ShardId.make(4), Option.some(pod2.pod.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.has(assignments, pod2.pod.address)).toBe(true)
      expect(MutableHashMap.size(assignments)).toBe(1)
      expect(MutableHashMap.has(unassignments, pod1.pod.address)).toBe(true)
      expect(MutableHashMap.size(unassignments)).toBe(1)
    })

    it("should pick the pod with less shards", () => {
      const state = new State(
        MutableHashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2],
          [pod3.pod.address, pod3]
        ),
        new Map([
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)],
          [ShardId.make(3), Option.some(pod2.pod.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.has(assignments, pod3.pod.address)).toBe(true)
      expect(MutableHashMap.size(assignments)).toBe(1)
      expect(MutableHashMap.has(unassignments, pod1.pod.address)).toBe(true)
      expect(MutableHashMap.size(unassignments)).toBe(1)
    })

    it("should not rebalance if there are no pods", () => {
      const state = new State(
        MutableHashMap.empty(),
        new Map([
          [ShardId.make(1), Option.some(pod1.pod.address)]
        ])
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(MutableHashMap.isEmpty(assignments)).toBe(true)
      expect(MutableHashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should balance well when many nodes are starting sequentially", () => {
      const shards = Array.makeBy(300, (i) => [ShardId.make(i + 1), Option.none<PodAddress>()] as const)
      const state = new State(MutableHashMap.empty(), new Map(shards))
      for (let i = 1; i <= 30; i++) {
        const address = PodAddress.make({ host: `${i}`, port: i })
        const pod = PodWithMetadata({
          pod: Pod.make({ address, version: 1 }),
          registeredAt: Date.now()
        })
        MutableHashMap.set(state.pods, address, pod)
        const [assignments, unassignments] = state.unassignedShards.length > 0
          ? decideAssignmentsForUnassignedShards(state)
          : decideAssignmentsForUnbalancedShards(state, 1)
        for (const [, shards] of unassignments) {
          for (const shard of shards) {
            state.shards.set(shard, Option.none())
          }
        }
        for (const [address, shards] of assignments) {
          for (const shard of shards) {
            state.shards.set(shard, Option.some(address))
          }
        }
      }
      const shardsPerPod = state.shardsPerPod.pipe(
        Array.fromIterable,
        Array.map(([, shards]) => shards.size)
      )
      expect(shardsPerPod).toHaveLength(30)
      expect(Array.every(shardsPerPod, (n) => n === 10)).toBe(true)
    })
  })

  describe.concurrent("Simulation", () => {
    const ShardManagerLive = ShardManager.layer()
    const PodsHealthLive = PodsHealth.layerLocal.pipe(
      Layer.provideMerge(Pods.layerNoop)
    )
    const TestLive = ShardManagerLive.pipe(
      Layer.provideMerge(Layer.mergeAll(
        Storage.layerNoop,
        PodsHealthLive
      ))
    )

    it.effect("should successfully scale up", () =>
      Effect.gen(function*() {
        const manager = yield* ShardManager.ShardManager

        // Setup 20 pods first
        yield* simulate(Array.range(1, 20).map(registerPod))
        yield* TestClock.adjust("20 seconds")

        // Check that all pods are assigned and have 15 shards each
        const assignments = yield* manager.getAssignments
        const values = Array.fromIterable(assignments.values())
        const allPodsAssigned = Array.every(values, Option.isSome)
        expect(allPodsAssigned).toBe(true)
        const shardsPerPod = getShardsPerPod(assignments)
        expect(shardsPerPod.every((shards) => shards.length === 15))

        // Setup another 5 pods
        yield* simulate(Array.range(21, 25).map(registerPod))
        yield* TestClock.adjust("20 seconds")

        // Check that each of the new pods received 6 shards
        const assignments2 = yield* manager.getAssignments.pipe(
          Effect.map(Iterable.filter(([, address]) => Option.isSome(address) && address.value.port > 20))
        )
        const shardsPerPod2 = getShardsPerPod(assignments2)
        expect(shardsPerPod2.every((shards) => shards.length === 6))

        // Check that all pods have 12 shards assigned
        yield* TestClock.adjust("1 minute")
        const assignments3 = yield* manager.getAssignments
        const shardsPerPod3 = getShardsPerPod(assignments3)
        expect(shardsPerPod3.every((shards) => shards.length === 12))
      }).pipe(Effect.provide(TestLive)), 10_000)

    it.effect("should succcessfully scale down", () =>
      Effect.gen(function*() {
        const manager = yield* ShardManager.ShardManager

        // Setup 25 pods
        yield* simulate(Array.range(1, 25).map(registerPod))
        yield* TestClock.adjust("20 seconds")

        // Check that all pods are assigned and have 12 shards each
        const assignments = yield* manager.getAssignments
        const values = Array.fromIterable(assignments.values())
        const allPodsAssigned = Array.every(values, Option.isSome)
        expect(allPodsAssigned).toBe(true)
        const shardsPerPod = getShardsPerPod(assignments)
        expect(shardsPerPod.every((shards) => shards.length === 12))

        // Remove 5 pods
        yield* simulate(Array.range(21, 25).map(unregisterPod))
        yield* TestClock.adjust("1 second")

        // Check that all shards have already been rebalanced
        const assignments2 = yield* manager.getAssignments
        const allPodsUnassigned = pipe(
          Array.fromIterable(assignments2.values()),
          Array.every((address) => Option.isSome(address) && address.value.port <= 20)
        )
        expect(allPodsUnassigned).toBe(true)
        const shardsPerPod2 = getShardsPerPod(assignments2)
        expect(shardsPerPod2.every((shards) => shards.length === 15))
      }).pipe(Effect.provide(TestLive)), 10_000)

    it.effect("should save state to storage when restarted", () =>
      Effect.gen(function*() {
        const setup = Effect.gen(function*() {
          const storage = yield* Storage.Storage

          yield* simulate(Array.range(1, 10).map(registerPod))
          yield* TestClock.adjust("20 seconds")

          // Wait for the forked daemon fibers to do their work
          yield* Effect.iterate(new Map() as ReadonlyMap<ShardId, Option.Option<PodAddress>>, {
            while: (assignments) => assignments.size === 0,
            body: () => storage.getShardAssignments
          })
          yield* Effect.iterate(Array.empty<[PodAddress, Pod]>(), {
            while: Array.isEmptyArray,
            body: () => storage.getPods
          })
          // Simulate a non-persistent storage restart
          yield* storage.saveShardAssignments([])
          yield* storage.savePods([])
        }).pipe(Effect.provide(ShardManagerLive.pipe(Layer.provide(PodsHealthLive))))

        const test = Effect.gen(function*() {
          const storage = yield* Storage.Storage
          const shutdownAssignments = yield* storage.getShardAssignments
          const shutdownPods = yield* storage.getPods
          // ShardManager should have saved its state to persistent storage
          // as part of shutdown procedures
          expect(shutdownAssignments.size === 0).toBe(false)
          expect(Array.isEmptyArray(shutdownPods)).toBe(false)
        })

        yield* setup
        yield* test
      }).pipe(Effect.provide(Storage.layerMemory)), 10_000)
  })
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

function getShardsPerPod(assignments: Iterable<[ShardId, Option.Option<PodAddress>]>) {
  const shardsPerPod = MutableHashMap.empty<PodAddress, ReadonlyArray<ShardId>>()
  for (const [shard, address] of assignments) {
    if (Option.isNone(address)) continue
    MutableHashMap.modifyAt(
      shardsPerPod,
      address.value,
      Option.match({
        onNone: () => Option.some(Array.of(shard)),
        onSome: (shards) => Option.some(Array.append(shards, shard))
      })
    )
  }
  return MutableHashMap.values(shardsPerPod)
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
