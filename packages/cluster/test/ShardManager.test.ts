import {
  decideAssignmentsForUnassignedShards,
  decideAssignmentsForUnbalancedShards,
  PodWithMetadata,
  ShardManagerState
} from "@effect/cluster/internal/shardManager"
import { Pod } from "@effect/cluster/Pod"
import { PodAddress } from "@effect/cluster/PodAddress"
import { ShardId } from "@effect/cluster/ShardId"
import * as ShardManager from "@effect/cluster/ShardManager"
import { describe, expect, it } from "@effect/vitest"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"

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
      const state = new ShardManagerState(
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
      const state = new ShardManagerState(
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
      const state = new ShardManagerState(
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
      const state = new ShardManagerState(
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
      const state = new ShardManagerState(
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
      const state = new ShardManagerState(
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
      const state = new ShardManagerState(
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
      const state = new ShardManagerState(HashMap.empty(), HashMap.fromIterable(shards))
      const result = Array.reduce(Array.range(1, 30), state, (state, i) => {
        const address = PodAddress.make({ host: `${i}`, port: i })
        const pod = PodWithMetadata({
          pod: Pod.make({ address, version: 1 }),
          registeredAt: Date.now()
        })
        const state1 = new ShardManagerState(
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
              (state, shard) => new ShardManagerState(state.pods, HashMap.set(state.shards, shard, Option.none()))
            )
        )
        return HashMap.reduce(
          assignments,
          state2,
          (state, shards, address) =>
            HashSet.reduce(
              shards,
              state,
              (state, shard) =>
                new ShardManagerState(state.pods, HashMap.set(state.shards, shard, Option.some(address)))
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
})
