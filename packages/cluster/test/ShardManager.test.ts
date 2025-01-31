import * as PodWithMetadata from "@effect/cluster/internal/podWithMetadata"
import { decideAssignmentsForUnbalancedShards } from "@effect/cluster/internal/shardManager"
import * as ShardManagerState from "@effect/cluster/internal/shardManagerState"
import * as ManagerConfig from "@effect/cluster/ManagerConfig"
import * as Pod from "@effect/cluster/Pod"
import * as PodAddress from "@effect/cluster/PodAddress"
import * as Pods from "@effect/cluster/Pods"
import * as PodsHealth from "@effect/cluster/PodsHealth"
import * as ShardId from "@effect/cluster/ShardId"
import * as ShardManager from "@effect/cluster/ShardManager"
import * as Storage from "@effect/cluster/Storage"
import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

describe.concurrent("ShardManagerSpec", () => {
  const pod1 = PodWithMetadata.make(Pod.make(PodAddress.make("1", 1), "1.0.0"), 0)
  const pod2 = PodWithMetadata.make(Pod.make(PodAddress.make("2", 2), "1.0.0"), 0)
  const pod3 = PodWithMetadata.make(Pod.make(PodAddress.make("3", 3), "1.0.0"), 0)

  it("Rebalance unbalanced assignments", () => {
    const state = ShardManagerState.make(
      HashMap.fromIterable([
        [pod1.pod.address, pod1],
        [pod2.pod.address, pod2]
      ]),
      HashMap.fromIterable([
        [ShardId.make(1), Option.some(pod1.pod.address)],
        [ShardId.make(2), Option.some(pod1.pod.address)]
      ])
    )
    const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)

    expect(HashMap.has(assignments, pod2.pod.address)).toBe(true)
    expect(HashMap.size(assignments) === 1).toBe(true)
    expect(HashMap.has(unassignments, pod1.pod.address)).toBe(true)
    expect(HashMap.size(unassignments) === 1).toBe(true)
  })

  it("Don't rebalance to pod with older version", () => {
    const newerPod2 = PodWithMetadata.make(Pod.make(pod2.pod.address, "0.1.2"), pod2.registered)
    const state = ShardManagerState.make(
      HashMap.fromIterable([
        [pod1.pod.address, pod1],
        [pod2.pod.address, newerPod2]
      ]),
      HashMap.fromIterable([
        [ShardId.make(1), Option.some(pod1.pod.address)],
        [ShardId.make(2), Option.some(pod1.pod.address)]
      ])
    )
    const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)

    expect(HashMap.isEmpty(assignments)).toBe(true)
    expect(HashMap.isEmpty(unassignments)).toBe(true)
  })

  it("Don't rebalance when already well balanced", () => {
    const state = ShardManagerState.make(
      HashMap.fromIterable([
        [pod1.pod.address, pod1],
        [pod2.pod.address, pod2]
      ]),
      HashMap.fromIterable([
        [ShardId.make(1), Option.some(pod1.pod.address)],
        [ShardId.make(2), Option.some(pod2.pod.address)]
      ])
    )
    const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)

    expect(HashMap.isEmpty(assignments)).toBe(true)
    expect(HashMap.isEmpty(unassignments)).toBe(true)
  })
  it("Don't rebalance when only 1 shard difference", () => {
    const state = ShardManagerState.make(
      HashMap.fromIterable([
        [pod1.pod.address, pod1],
        [pod2.pod.address, pod2]
      ]),
      HashMap.fromIterable([
        [ShardId.make(1), Option.some(pod1.pod.address)],
        [ShardId.make(2), Option.some(pod1.pod.address)],
        [ShardId.make(3), Option.some(pod2.pod.address)]
      ])
    )
    const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)

    expect(HashMap.isEmpty(assignments)).toBe(true)
    expect(HashMap.isEmpty(unassignments)).toBe(true)
  })
  it("Rebalance when 2 shard difference", () => {
    const state = ShardManagerState.make(
      HashMap.fromIterable([
        [pod1.pod.address, pod1],
        [pod2.pod.address, pod2]
      ]),
      HashMap.fromIterable([
        [ShardId.make(1), Option.some(pod1.pod.address)],
        [ShardId.make(2), Option.some(pod1.pod.address)],
        [ShardId.make(3), Option.some(pod1.pod.address)],
        [ShardId.make(4), Option.some(pod2.pod.address)]
      ])
    )
    const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)

    expect(HashMap.has(assignments, pod2.pod.address)).toBe(true)
    expect(HashMap.size(assignments) === 1).toBe(true)
    expect(HashMap.has(unassignments, pod1.pod.address)).toBe(true)
    expect(HashMap.size(unassignments) === 1).toBe(true)
  })
  it("Pick the pod with less shards", () => {
    const state = ShardManagerState.make(
      HashMap.fromIterable([
        [pod1.pod.address, pod1],
        [pod2.pod.address, pod2],
        [pod3.pod.address, pod3]
      ]),
      HashMap.fromIterable([
        [ShardId.make(1), Option.some(pod1.pod.address)],
        [ShardId.make(2), Option.some(pod1.pod.address)],
        [ShardId.make(3), Option.some(pod2.pod.address)]
      ])
    )
    const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)

    expect(HashMap.has(assignments, pod3.pod.address)).toBe(true)
    expect(HashMap.size(assignments) === 1).toBe(true)
    expect(HashMap.has(unassignments, pod1.pod.address)).toBe(true)
    expect(HashMap.size(unassignments) === 1).toBe(true)
  })

  it("Don't rebalance if pod list is empty", () => {
    const state = ShardManagerState.make(
      HashMap.fromIterable([]),
      HashMap.fromIterable([
        [ShardId.make(1), Option.some(pod1.pod.address)]
      ])
    )
    const [assignments, unassignments] = decideAssignmentsForUnbalancedShards(state, 1)

    expect(HashMap.isEmpty(assignments)).toBe(true)
    expect(HashMap.isEmpty(unassignments)).toBe(true)
  })
})

interface SimulatePodRegister {
  _tag: "PodRegister"
  pod: Pod.Pod
}

interface SimulatePodUnregister {
  _tag: "PodUnregister"
  podAddress: PodAddress.PodAddress
}

type SimulationEvent = SimulatePodRegister | SimulatePodUnregister

export function simulatePodRegister(pod: Pod.Pod): SimulationEvent {
  return { _tag: "PodRegister", pod }
}
export function simulatePodUnregister(podAddress: PodAddress.PodAddress): SimulationEvent {
  return { _tag: "PodUnregister", podAddress }
}

export const config = ManagerConfig.defaults

export const shardManager = pipe(
  ShardManager.live,
  Layer.provide(config),
  Layer.provide(PodsHealth.local),
  Layer.provide(Pods.noop),
  Layer.provide(Storage.noop)
)

export function simulate(events: Iterable<SimulationEvent>) {
  return Effect.flatMap(
    ShardManager.ShardManager,
    (shardManager) =>
      Effect.forEach(events, (event) => {
        switch (event._tag) {
          case "PodRegister":
            return shardManager.register(event.pod)
          case "PodUnregister":
            return shardManager.unregister(event.podAddress)
        }
      }, { discard: true })
  )
}
