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
import * as Array from "effect/Array"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
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
        HashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2]
        ),
        HashMap.make(
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)]
        )
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(HashMap.has(assignments, pod2.pod.address)).toBe(true)
      expect(HashMap.size(assignments)).toBe(1)
      expect(HashMap.has(unassignments, pod1.pod.address)).toBe(true)
      expect(HashMap.size(unassignments)).toBe(1)
    })

    it("should not rebalance to pods with an older version", () => {
      const oldPod2 = PodWithMetadata({
        pod: Pod.make({ address: pod2.pod.address, version: 0 }),
        registeredAt: pod2.registeredAt
      })
      const state = new State(
        HashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, oldPod2]
        ),
        HashMap.make(
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)]
        )
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(HashMap.isEmpty(assignments)).toBe(true)
      expect(HashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should not rebalance when already well-balanced", () => {
      const state = new State(
        HashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2]
        ),
        HashMap.make(
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod2.pod.address)]
        )
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(HashMap.isEmpty(assignments)).toBe(true)
      expect(HashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should not rebalance when there is only a one-shard difference", () => {
      const state = new State(
        HashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2]
        ),
        HashMap.make(
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)],
          [ShardId.make(3), Option.some(pod2.pod.address)]
        )
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(HashMap.isEmpty(assignments)).toBe(true)
      expect(HashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should rebalance when there is more than a one-shard difference", () => {
      const state = new State(
        HashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2]
        ),
        HashMap.make(
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)],
          [ShardId.make(3), Option.some(pod1.pod.address)],
          [ShardId.make(4), Option.some(pod2.pod.address)]
        )
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(HashMap.has(assignments, pod2.pod.address)).toBe(true)
      expect(HashMap.size(assignments)).toBe(1)
      expect(HashMap.has(unassignments, pod1.pod.address)).toBe(true)
      expect(HashMap.size(unassignments)).toBe(1)
    })

    it("should pick the pod with less shards", () => {
      const state = new State(
        HashMap.make(
          [pod1.pod.address, pod1],
          [pod2.pod.address, pod2],
          [pod3.pod.address, pod3]
        ),
        HashMap.make(
          [ShardId.make(1), Option.some(pod1.pod.address)],
          [ShardId.make(2), Option.some(pod1.pod.address)],
          [ShardId.make(3), Option.some(pod2.pod.address)]
        )
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(HashMap.has(assignments, pod3.pod.address)).toBe(true)
      expect(HashMap.size(assignments)).toBe(1)
      expect(HashMap.has(unassignments, pod1.pod.address)).toBe(true)
      expect(HashMap.size(unassignments)).toBe(1)
    })

    it("should not rebalance if there are no pods", () => {
      const state = new State(
        HashMap.empty(),
        HashMap.make(
          [ShardId.make(1), Option.some(pod1.pod.address)]
        )
      )
      const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)
      expect(HashMap.isEmpty(assignments)).toBe(true)
      expect(HashMap.isEmpty(unassignments)).toBe(true)
    })

    it("should balance well when many nodes are starting sequentially", () => {
      const shards = Array.makeBy(300, (i) => [ShardId.make(i + 1), Option.none<PodAddress>()] as const)
      const state = new State(HashMap.empty(), HashMap.fromIterable(shards))
      const result = Array.reduce(Array.range(1, 30), state, (state, i) => {
        const address = PodAddress.make({ host: `${i}`, port: i })
        const pod = PodWithMetadata({
          pod: Pod.make({ address, version: 1 }),
          registeredAt: Date.now()
        })
        const state1 = new State(
          HashMap.set(state.pods, address, pod),
          state.shards
        )
        const [assignments, unassignments] = HashSet.size(state.unassignedShards) > 0
          ? decideAssignmentsForUnassignedShards(state1)
          : decideAssignmentsForUnbalancedShards(state1, 1)
        const state2 = HashMap.reduce(
          unassignments,
          state1,
          (state, shards) =>
            HashSet.reduce(
              shards,
              state,
              (state, shard) => new State(state.pods, HashMap.set(state.shards, shard, Option.none()))
            )
        )
        return HashMap.reduce(
          assignments,
          state2,
          (state, shards, address) =>
            HashSet.reduce(
              shards,
              state,
              (state, shard) => new State(state.pods, HashMap.set(state.shards, shard, Option.some(address)))
            )
        )
      })
      const shardsPerPod = result.shards.pipe(
        HashMap.reduce(
          HashMap.empty<PodAddress, HashSet.HashSet<ShardId>>(),
          (map, address, shard) =>
            Option.match(address, {
              onNone: () => map,
              onSome: (address) =>
                HashMap.has(map, address)
                  ? HashMap.modify(map, address, HashSet.add(shard))
                  : HashMap.set(map, address, HashSet.make(shard))
            })
        ),
        Array.fromIterable,
        Array.map(([, shards]) => HashSet.size(shards))
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
        const values = Array.fromIterable(HashMap.values(assignments))
        const allPodsAssigned = Array.every(values, Option.isSome)
        expect(allPodsAssigned).toBe(true)
        const shardsPerPod = getShardsPerPod(assignments)
        expect(shardsPerPod.every((shards) => shards.length === 15))

        // Setup another 5 pods
        yield* simulate(Array.range(21, 25).map(registerPod))
        yield* TestClock.adjust("20 seconds")

        // Check that each of the new pods received 6 shards
        const assignments2 = yield* manager.getAssignments.pipe(
          Effect.map(HashMap.filter((address) => Option.isSome(address) && address.value.port > 20))
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
        const values = Array.fromIterable(HashMap.values(assignments))
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
          Array.fromIterable(HashMap.values(assignments2)),
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
          yield* Effect.iterate(HashMap.empty<ShardId, Option.Option<PodAddress>>(), {
            while: HashMap.isEmpty,
            body: () => storage.getShardAssignments
          })
          yield* Effect.iterate(HashMap.empty<PodAddress, Pod>(), {
            while: HashMap.isEmpty,
            body: () => storage.getPods
          })
          // Simulate a non-persistent storage restart
          yield* storage.saveShardAssignments(HashMap.empty())
          yield* storage.savePods(HashMap.empty())
        }).pipe(Effect.provide(ShardManagerLive.pipe(Layer.provide(PodsHealthLive))))

        const test = Effect.gen(function*() {
          const storage = yield* Storage.Storage
          const shutdownAssignments = yield* storage.getShardAssignments
          const shutdownPods = yield* storage.getPods
          // ShardManager should have saved its state to persistent storage
          // as part of shutdown procedures
          expect(HashMap.isEmpty(shutdownAssignments)).toBe(false)
          expect(HashMap.isEmpty(shutdownPods)).toBe(false)
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

function getShardsPerPod(assignments: HashMap.HashMap<ShardId, Option.Option<PodAddress>>) {
  const shardsPerPod = HashMap.reduce(
    assignments,
    HashMap.empty<PodAddress, ReadonlyArray<ShardId>>(),
    (map, address, shard) =>
      Option.match(address, {
        onNone: () => map,
        onSome: (address) =>
          HashMap.has(map, address)
            ? HashMap.modify(map, address, Array.append(shard)) :
            HashMap.set(map, address, Array.of(shard))
      })
  )
  return Array.fromIterable(HashMap.values(shardsPerPod))
}

type SimulationEvent = Data.TaggedEnum<{
  readonly RegisterPod: { readonly pod: Pod }
  readonly UnregisterPod: { readonly address: PodAddress }
}>
const SimulationEvent = Data.taggedEnum<SimulationEvent>()

const handleEvent = Match.type<SimulationEvent>().pipe(
  Match.tag(
    "RegisterPod",
    ({ pod }) =>
      ShardManager.ShardManager.pipe(
        Effect.flatMap((manager) => manager.register(pod))
      )
  ),
  Match.tag(
    "UnregisterPod",
    ({ address }) =>
      ShardManager.ShardManager.pipe(
        Effect.flatMap((manager) => manager.unregister(address))
      )
  ),
  Match.exhaustive
)

function simulate(events: ReadonlyArray<SimulationEvent>) {
  return Effect.forEach(events, handleEvent, { discard: true })
}
