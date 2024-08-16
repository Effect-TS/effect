import * as Arr from "effect/Array"
import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import { constFalse } from "effect/Function"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableHashSet from "effect/MutableHashSet"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import type { Pod } from "../Pod.js"
import type { PodAddress } from "../PodAddress.js"
import { PodsHealth } from "../PodsHealth.js"
import { ShardId } from "../ShardId.js"
import { ShardStorage } from "../ShardStorage.js"

/** @internal */
export class State {
  static fromStorage = Effect.fnUntraced(function*(numberOfShards: number) {
    const storage = yield* ShardStorage
    const podsHealth = yield* PodsHealth

    // Fetch registered pods and shard assignments from cluster storage
    const storedPods = yield* storage.getPods
    const storedAssignments = yield* storage.getAssignments

    // Determine which pods are still alive
    const deadPods = Arr.empty<Pod>()
    const alivePods = MutableHashMap.empty<PodAddress, Pod>()
    yield* Effect.forEach(storedPods, ([address, pod]) =>
      Effect.map(podsHealth.isAlive(address), (isAlive) => {
        if (isAlive) {
          MutableHashMap.set(alivePods, address, pod)
        } else {
          deadPods.push(pod)
        }
      }), { concurrency: "unbounded", discard: true })
    if (deadPods.length > 0) {
      yield* Effect.logWarning("Ignoring pods that are no longer considered alive:", deadPods)
    }

    // Determine which shards remain unassigned to a pod
    const assignedShards = new Map<ShardId, PodAddress>()
    const invalidAssignments = Arr.empty<[ShardId, PodAddress]>()
    for (const [shard, address] of storedAssignments) {
      if (Option.isSome(address) && MutableHashMap.has(alivePods, address.value)) {
        assignedShards.set(shard, address.value)
      } else if (Option.isSome(address)) {
        invalidAssignments.push([shard, address.value])
      }
    }
    if (invalidAssignments.length > 0) {
      yield* Effect.logWarning(
        "Ignoring shard assignments for pods that are no longer considered alive: ",
        invalidAssignments
      )
    }

    // Construct the initial state
    const now = yield* Clock.currentTimeMillis
    const podState = MutableHashMap.empty<PodAddress, PodWithMetadata>()
    for (const [address, pod] of alivePods) {
      MutableHashMap.set(podState, address, PodWithMetadata({ pod, registeredAt: now }))
    }

    const shardState = new Map<ShardId, Option.Option<PodAddress>>()
    for (let n = 1; n <= numberOfShards; n++) {
      const shardId = ShardId.make(n)
      shardState.set(shardId, Option.fromNullable(assignedShards.get(shardId)))
    }

    return new State(podState, shardState)
  })

  constructor(
    readonly pods: MutableHashMap.MutableHashMap<PodAddress, PodWithMetadata>,
    readonly shards: Map<ShardId, Option.Option<PodAddress>>
  ) {}

  get maxVersion(): Option.Option<number> {
    if (MutableHashMap.size(this.pods) === 0) return Option.none()
    let version: number | undefined = undefined
    for (const [, meta] of this.pods) {
      if (version === undefined || meta.pod.version > version) {
        version = meta.pod.version
      }
    }
    return Option.some(version!)
  }

  allPodsHaveVersion(version: Option.Option<number>): boolean {
    return version.pipe(
      Option.map((max) => Arr.every(this.podVersions, (version) => version === max)),
      Option.getOrElse(constFalse)
    )
  }

  get shardsPerPod(): MutableHashMap.MutableHashMap<PodAddress, Set<ShardId>> {
    const shards = MutableHashMap.empty<PodAddress, Set<ShardId>>()

    if (MutableHashMap.isEmpty(this.pods)) return shards
    MutableHashMap.forEach(this.pods, (_, address) => {
      MutableHashMap.set(shards, address, new Set())
    })

    for (const [shard, address] of this.shards) {
      if (Option.isNone(address)) continue
      const shardIds = Option.getOrUndefined(MutableHashMap.get(shards, address.value))!
      shardIds.add(shard)
    }

    return shards
  }

  get averageShardsPerPod(): number {
    const podCount = MutableHashMap.size(this.pods)
    return podCount > 0 ? this.shards.size / podCount : 0
  }

  get unassignedShards(): Array<ShardId> {
    const shardIds: Array<ShardId> = []
    for (const [shard, address] of this.shards) {
      if (Option.isNone(address)) {
        shardIds.push(shard)
      }
    }
    return shardIds
  }

  private get podVersions(): Array<number> {
    const podVersions: Array<number> = []
    for (const [, meta] of this.pods) {
      podVersions.push(meta.pod.version)
    }
    return podVersions
  }
}

/** @internal */
export interface PodWithMetadata {
  readonly pod: Pod
  readonly registeredAt: number
}
/** @internal */
export const PodWithMetadata = (pod: PodWithMetadata): PodWithMetadata => pod

/** @internal */
export function decideAssignmentsForUnassignedShards(state: State): readonly [
  assignments: MutableHashMap.MutableHashMap<PodAddress, Set<ShardId>>,
  unassignments: MutableHashMap.MutableHashMap<PodAddress, Set<ShardId>>,
  changes: MutableHashSet.MutableHashSet<PodAddress>
] {
  return pickNewPods(state.unassignedShards, state, true, 1)
}

const allocationOrder: Order.Order<[ShardId, number, number]> = Order.combine(
  Order.mapInput(Order.number, ([, shards]) => shards),
  Order.mapInput(Order.number, ([, , registeredAt]) => registeredAt)
)

/** @internal */
export function decideAssignmentsForUnbalancedShards(state: State, rate: number): readonly [
  assignments: MutableHashMap.MutableHashMap<PodAddress, Set<ShardId>>,
  unassignments: MutableHashMap.MutableHashMap<PodAddress, Set<ShardId>>,
  changes: MutableHashSet.MutableHashSet<PodAddress>
] {
  const shardsPerPod = state.shardsPerPod
  const maxVersion = state.maxVersion
  const extraShardsToAllocate = Arr.empty<[ShardId, shardsInverse: number, registeredAt: number]>()

  if (state.allPodsHaveVersion(maxVersion)) {
    const averageShardsPerPod = state.averageShardsPerPod
    MutableHashMap.forEach(shardsPerPod, (shards) => {
      // Count how many extra shards there are compared to the average
      const extraShards = Math.max(0, shards.size - averageShardsPerPod)
      for (const shard of takeRandom(shards, extraShards)) {
        const maybeAddress = state.shards.get(shard) ?? Option.none()
        if (Option.isNone(maybeAddress)) {
          extraShardsToAllocate.push([shard, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER])
          continue
        }
        const address = maybeAddress.value
        extraShardsToAllocate.push([
          shard,
          Option.match(MutableHashMap.get(shardsPerPod, address), {
            onNone: () => Number.MIN_SAFE_INTEGER,
            onSome: (shards) => -shards.size
          }),
          Option.match(MutableHashMap.get(state.pods, address), {
            onNone: () => Number.MIN_SAFE_INTEGER,
            onSome: (meta) => meta.registeredAt
          })
        ])
      }
    })
  }

  const sortedShardsToRebalance = extraShardsToAllocate.sort(allocationOrder).map(([shard]) => shard)

  return pickNewPods(sortedShardsToRebalance, state, false, rate, shardsPerPod, maxVersion)
}

function pickNewPods(
  shardsToRebalance: ReadonlyArray<ShardId>,
  state: State,
  immediate: boolean,
  rate: number,
  shardsPerPod = state.shardsPerPod,
  maybeMaxVersion = state.maxVersion
): readonly [
  assignments: MutableHashMap.MutableHashMap<PodAddress, Set<ShardId>>,
  unassignments: MutableHashMap.MutableHashMap<PodAddress, Set<ShardId>>,
  changes: MutableHashSet.MutableHashSet<PodAddress>
] {
  const addressAssignments = MutableHashMap.empty<PodAddress, Set<ShardId>>()
  const unassignments = MutableHashMap.empty<PodAddress, Set<ShardId>>()
  const changes = MutableHashSet.empty<PodAddress>()

  if (Option.isNone(maybeMaxVersion)) {
    return [addressAssignments, unassignments, changes]
  }
  const maxVersion = maybeMaxVersion.value

  for (const shardId of shardsToRebalance) {
    // Find the pod with the fewest assigned shards
    let candidate: PodAddress | undefined
    let candidateShards: Set<ShardId> | undefined

    for (const [address, shards] of shardsPerPod) {
      // Keep only pods with the maximum version
      const maybePodMeta = MutableHashMap.get(state.pods, address)
      if (Option.isNone(maybePodMeta)) continue
      const podMeta = maybePodMeta.value
      if (podMeta.pod.version !== maxVersion) continue

      // Do not assign to a pod that has unassignments in the same rebalance
      if (MutableHashMap.has(unassignments, address)) continue

      // Do not assign too many shards to each pod unless rebalancing must
      // occur immediately
      if (!immediate) {
        const assignmentCount = Option.getOrUndefined(MutableHashMap.get(addressAssignments, address))?.size ?? 0
        if (assignmentCount >= state.shards.size * rate) continue
      }

      if (candidate === undefined || shards.size < candidateShards!.size) {
        candidate = address
        candidateShards = shards
      }
    }
    if (!candidate || !candidateShards) break

    // If the old pod is the same as the new pod, do nothing
    const oldPod = Option.getOrUndefined(state.shards.get(shardId) ?? Option.none())
    if (oldPod && oldPod.toString() === candidate.toString()) {
      continue
    }
    const oldShards = oldPod && Option.getOrUndefined(MutableHashMap.get(shardsPerPod, oldPod))

    // If the new pod has one less, as many, or more shards than the
    // old pod, do not change anything
    if (oldShards && candidateShards.size + 1 >= oldShards.size) continue

    // Otherwise create a new assignment
    MutableHashMap.modifyAt(
      addressAssignments,
      candidate,
      Option.match({
        onNone: () => Option.some(new Set([shardId])),
        onSome: (shards) => {
          shards.add(shardId)
          return Option.some(shards)
        }
      })
    )
    if (oldPod) {
      MutableHashMap.modifyAt(
        unassignments,
        oldPod,
        Option.match({
          onNone: () => Option.some(new Set([shardId])),
          onSome: (shards) => {
            shards.add(shardId)
            return Option.some(shards)
          }
        })
      )
    }

    // Move the shard to the new pod
    candidateShards.add(shardId)
    if (oldShards) {
      oldShards.delete(shardId)
    }

    // Track changes
    MutableHashSet.add(changes, candidate)
    if (oldPod) MutableHashSet.add(changes, oldPod)
  }

  return [addressAssignments, unassignments, changes]
}

function takeRandom<A>(self: Iterable<A>, n: number): ReadonlyArray<A> {
  const array = Array.from(self)
  let currentIndex = array.length
  while (currentIndex != 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex = currentIndex - 1
    swap(array, currentIndex, randomIndex)
  }
  return n < array.length ? array.slice(0, n) : array
}

function swap<A>(array: Array<A>, i: number, j: number): ReadonlyArray<A> {
  const tmp = array[i]
  array[i] = array[j]
  array[j] = tmp
  return array
}
