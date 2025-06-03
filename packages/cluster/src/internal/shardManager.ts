import * as Arr from "effect/Array"
import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import { constFalse } from "effect/Function"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableHashSet from "effect/MutableHashSet"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import type { Runner } from "../Runner.js"
import type { RunnerAddress } from "../RunnerAddress.js"
import { RunnerHealth } from "../RunnerHealth.js"
import { ShardId } from "../ShardId.js"
import { ShardStorage } from "../ShardStorage.js"

/** @internal */
export class State {
  static fromStorage = Effect.fnUntraced(function*(
    shardsPerGroup: number
  ) {
    const storage = yield* ShardStorage
    const runnerHealth = yield* RunnerHealth

    // Fetch registered runners and shard assignments from cluster storage
    const storedRunners = yield* storage.getRunners
    const storedAssignments = yield* storage.getAssignments

    // Determine which runners are still alive
    const deadRunners = Arr.empty<Runner>()
    const aliveRunners = MutableHashMap.empty<RunnerAddress, Runner>()
    yield* Effect.forEach(storedRunners, ([address, runner]) =>
      Effect.map(runnerHealth.isAlive(address), (isAlive) => {
        if (isAlive) {
          MutableHashMap.set(aliveRunners, address, runner)
        } else {
          deadRunners.push(runner)
        }
      }), { concurrency: "unbounded", discard: true })
    if (deadRunners.length > 0) {
      yield* Effect.logWarning("Ignoring runners that are no longer considered alive:", deadRunners)
    }

    // Determine which shards remain unassigned to a runner
    const assignedShards = MutableHashMap.empty<ShardId, RunnerAddress>()
    const invalidAssignments = Arr.empty<[ShardId, RunnerAddress]>()
    for (const [shard, address] of storedAssignments) {
      if (Option.isSome(address) && MutableHashMap.has(aliveRunners, address.value)) {
        MutableHashMap.set(assignedShards, shard, address.value)
      } else if (Option.isSome(address)) {
        invalidAssignments.push([shard, address.value])
      }
    }
    if (invalidAssignments.length > 0) {
      yield* Effect.logWarning(
        "Ignoring shard assignments for runners that are no longer considered alive: ",
        invalidAssignments
      )
    }

    // Construct the initial state
    const now = yield* Clock.currentTimeMillis
    const allRunners = MutableHashMap.empty<RunnerAddress, RunnerWithMetadata>()
    const runnerState = new Map<string, MutableHashMap.MutableHashMap<RunnerAddress, RunnerWithMetadata>>()
    // for (const group of groups) {
    //   runnerState.set(group, MutableHashMap.empty<RunnerAddress, RunnerWithMetadata>())
    // }
    for (const [address, runner] of aliveRunners) {
      const withMetadata = RunnerWithMetadata({ runner, registeredAt: now })
      MutableHashMap.set(allRunners, address, withMetadata)
      for (const group of runner.groups) {
        let groupMap = runnerState.get(group)
        if (!groupMap) {
          groupMap = MutableHashMap.empty<RunnerAddress, RunnerWithMetadata>()
          runnerState.set(group, groupMap)
        }
        MutableHashMap.set(groupMap, address, withMetadata)
      }
    }

    const shardState = new Map<string, Map<number, Option.Option<RunnerAddress>>>()
    for (const group of runnerState.keys()) {
      const groupMap = new Map<number, Option.Option<RunnerAddress>>()
      shardState.set(group, groupMap)
      for (let n = 1; n <= shardsPerGroup; n++) {
        const shardId = new ShardId({ group, id: n })
        groupMap.set(n, MutableHashMap.get(assignedShards, shardId))
      }
    }

    return new State(allRunners, runnerState, shardState, shardsPerGroup)
  })

  constructor(
    readonly allRunners: MutableHashMap.MutableHashMap<RunnerAddress, RunnerWithMetadata>,
    readonly runners: Map<string, MutableHashMap.MutableHashMap<RunnerAddress, RunnerWithMetadata>>,
    readonly shards: Map<string, Map<number, Option.Option<RunnerAddress>>>,
    readonly shardsPerGroup: number
  ) {
    this.assignments = MutableHashMap.empty<ShardId, Option.Option<RunnerAddress>>()
    for (const [group, groupMap] of this.shards) {
      for (const [id, address] of groupMap) {
        MutableHashMap.set(this.assignments, new ShardId({ group, id }), address)
      }
    }
  }

  readonly assignments: MutableHashMap.MutableHashMap<ShardId, Option.Option<RunnerAddress>>

  addGroup(group: string): void {
    this.runners.set(group, MutableHashMap.empty<RunnerAddress, RunnerWithMetadata>())
    const shardMap = new Map<number, Option.Option<RunnerAddress>>()
    for (let n = 1; n <= this.shardsPerGroup; n++) {
      shardMap.set(n, Option.none())
      MutableHashMap.set(this.assignments, new ShardId({ group, id: n }), Option.none())
    }
    this.shards.set(group, shardMap)
  }

  addAssignments(
    shards: Iterable<ShardId>,
    address: Option.Option<RunnerAddress>
  ) {
    for (const shardId of shards) {
      MutableHashMap.set(this.assignments, shardId, address)
      this.shards.get(shardId.group)?.set(shardId.id, address)
    }
  }

  addRunner(runner: Runner, registeredAt: number): void {
    const withMetadata = RunnerWithMetadata({ runner, registeredAt })
    MutableHashMap.set(this.allRunners, runner.address, withMetadata)
    for (const group of runner.groups) {
      if (!this.runners.has(group)) {
        this.addGroup(group)
      }
      const groupMap = this.runners.get(group)!
      MutableHashMap.set(groupMap, runner.address, withMetadata)
    }
  }

  removeRunner(address: RunnerAddress): void {
    MutableHashMap.remove(this.allRunners, address)
    for (const groupMap of this.runners.values()) {
      MutableHashMap.remove(groupMap, address)
    }
  }

  get maxVersion(): Option.Option<number> {
    if (MutableHashMap.size(this.allRunners) === 0) return Option.none()
    let version: number | undefined = undefined
    for (const [, meta] of this.allRunners) {
      if (version === undefined || meta.runner.version > version) {
        version = meta.runner.version
      }
    }
    return Option.some(version!)
  }

  allRunnersHaveVersion(version: Option.Option<number>): boolean {
    return version.pipe(
      Option.map((max) => Arr.every(this.runnerVersions, (version) => version === max)),
      Option.getOrElse(constFalse)
    )
  }

  shardsPerRunner(group: string): MutableHashMap.MutableHashMap<RunnerAddress, Set<number>> {
    const groupRunners = this.runners.get(group)
    const shards = MutableHashMap.empty<RunnerAddress, Set<number>>()

    if (!groupRunners || MutableHashMap.isEmpty(groupRunners)) return shards
    MutableHashMap.forEach(groupRunners, (_, address) => {
      MutableHashMap.set(shards, address, new Set())
    })

    const assignments = this.shards.get(group)!
    for (const [id, address] of assignments) {
      if (Option.isNone(address)) continue
      const shardIds = Option.getOrUndefined(MutableHashMap.get(shards, address.value))!
      shardIds.add(id)
    }

    return shards
  }

  averageShardsPerRunner(group: string): number {
    const runnerCount = MutableHashMap.size(this.runners.get(group) ?? MutableHashMap.empty())
    const shardGroup = this.shards.get(group) ?? new Map()
    return runnerCount > 0 ? shardGroup.size / runnerCount : 0
  }

  get allUnassignedShards(): Array<ShardId> {
    const unassigned: Array<ShardId> = []
    for (const [shardId, address] of this.assignments) {
      if (Option.isNone(address)) {
        unassigned.push(shardId)
      }
    }
    return unassigned
  }

  unassignedShards(group: string): Array<number> {
    const shardIds: Array<number> = []
    const assignments = this.shards.get(group)!
    for (const [shard, address] of assignments) {
      if (Option.isNone(address)) {
        shardIds.push(shard)
      }
    }
    return shardIds
  }

  private get runnerVersions(): Array<number> {
    const runnerVersions: Array<number> = []
    for (const [, meta] of this.allRunners) {
      runnerVersions.push(meta.runner.version)
    }
    return runnerVersions
  }
}

/** @internal */
export interface RunnerWithMetadata {
  readonly runner: Runner
  readonly registeredAt: number
}
/** @internal */
export const RunnerWithMetadata = (runner: RunnerWithMetadata): RunnerWithMetadata => runner

/** @internal */
export function decideAssignmentsForUnassignedShards(state: State, group: string): readonly [
  assignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>,
  unassignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>,
  changes: MutableHashSet.MutableHashSet<RunnerAddress>
] {
  return pickNewRunners(state.unassignedShards(group), state, group, true, 1)
}

const allocationOrder: Order.Order<[number, number, number]> = Order.combine(
  Order.mapInput(Order.number, ([, shards]) => shards),
  Order.mapInput(Order.number, ([, , registeredAt]) => registeredAt)
)

/** @internal */
export function decideAssignmentsForUnbalancedShards(state: State, group: string, rate: number): readonly [
  assignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>,
  unassignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>,
  changes: MutableHashSet.MutableHashSet<RunnerAddress>
] {
  const shardsPerRunner = state.shardsPerRunner(group)
  const maxVersion = state.maxVersion
  const extraShardsToAllocate = Arr.empty<[number, shardsInverse: number, registeredAt: number]>()

  const runnerGroup = state.runners.get(group)!
  const shardsGroup = state.shards.get(group)!

  if (state.allRunnersHaveVersion(maxVersion)) {
    const averageShardsPerRunner = state.averageShardsPerRunner(group)
    MutableHashMap.forEach(shardsPerRunner, (shards) => {
      // Count how many extra shards there are compared to the average
      const extraShards = Math.max(0, shards.size - averageShardsPerRunner)
      for (const shard of takeRandom(shards, extraShards)) {
        const maybeAddress = shardsGroup.get(shard) ?? Option.none()
        if (Option.isNone(maybeAddress)) {
          extraShardsToAllocate.push([shard, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER])
          continue
        }
        const address = maybeAddress.value
        extraShardsToAllocate.push([
          shard,
          Option.match(MutableHashMap.get(shardsPerRunner, address), {
            onNone: () => Number.MIN_SAFE_INTEGER,
            onSome: (shards) => -shards.size
          }),
          Option.match(MutableHashMap.get(runnerGroup, address), {
            onNone: () => Number.MIN_SAFE_INTEGER,
            onSome: (meta) => meta.registeredAt
          })
        ])
      }
    })
  }

  const sortedShardsToRebalance = extraShardsToAllocate.sort(allocationOrder).map(([shard]) => shard)

  return pickNewRunners(sortedShardsToRebalance, state, group, false, rate, shardsPerRunner, maxVersion)
}

function pickNewRunners(
  shardsToRebalance: ReadonlyArray<number>,
  state: State,
  group: string,
  immediate: boolean,
  rate: number,
  shardsPerRunner = state.shardsPerRunner(group),
  maybeMaxVersion = state.maxVersion
): readonly [
  assignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>,
  unassignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>,
  changes: MutableHashSet.MutableHashSet<RunnerAddress>
] {
  const addressAssignments = MutableHashMap.empty<RunnerAddress, Set<number>>()
  const unassignments = MutableHashMap.empty<RunnerAddress, Set<number>>()
  const changes = MutableHashSet.empty<RunnerAddress>()

  if (Option.isNone(maybeMaxVersion)) {
    return [addressAssignments, unassignments, changes]
  }
  const maxVersion = maybeMaxVersion.value

  const runnerGroup = state.runners.get(group)!
  const shardsGroup = state.shards.get(group)!

  for (const shardId of shardsToRebalance) {
    // Find the runner with the fewest assigned shards
    let candidate: RunnerAddress | undefined
    let candidateShards: Set<number> | undefined

    for (const [address, shards] of shardsPerRunner) {
      // Keep only runners with the maximum version
      const maybeRunnerMeta = MutableHashMap.get(runnerGroup, address)
      if (Option.isNone(maybeRunnerMeta)) continue
      const runnerMeta = maybeRunnerMeta.value
      if (runnerMeta.runner.version !== maxVersion) continue

      // Do not assign to a runner that has unassignments in the same rebalance
      if (MutableHashMap.has(unassignments, address)) continue

      // Do not assign too many shards to each runner unless rebalancing must
      // occur immediately
      if (!immediate) {
        const assignmentCount = Option.getOrUndefined(MutableHashMap.get(addressAssignments, address))?.size ?? 0
        if (assignmentCount >= shardsGroup.size * rate) continue
      }

      if (candidate === undefined || shards.size < candidateShards!.size) {
        candidate = address
        candidateShards = shards
      }
    }
    if (!candidate || !candidateShards) break

    // If the old runner is the same as the new runner, do nothing
    const oldRunner = Option.getOrUndefined(shardsGroup.get(shardId) ?? Option.none())
    if (oldRunner && oldRunner.toString() === candidate.toString()) {
      continue
    }
    const oldShards = oldRunner && Option.getOrUndefined(MutableHashMap.get(shardsPerRunner, oldRunner))

    // If the new runner has one less, as many, or more shards than the
    // old runner, do not change anything
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
    if (oldRunner) {
      MutableHashMap.modifyAt(
        unassignments,
        oldRunner,
        Option.match({
          onNone: () => Option.some(new Set([shardId])),
          onSome: (shards) => {
            shards.add(shardId)
            return Option.some(shards)
          }
        })
      )
    }

    // Move the shard to the new runner
    candidateShards.add(shardId)
    if (oldShards) {
      oldShards.delete(shardId)
    }

    // Track changes
    MutableHashSet.add(changes, candidate)
    if (oldRunner) MutableHashSet.add(changes, oldRunner)
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

/** @internal */
export const addAllNested = <K, V>(
  self: MutableHashMap.MutableHashMap<K, MutableHashSet.MutableHashSet<V>>,
  key: K,
  values: Iterable<V>
) => {
  const oset = MutableHashMap.get(self, key)
  if (Option.isSome(oset)) {
    for (const value of values) {
      MutableHashSet.add(oset.value, value)
    }
  } else {
    MutableHashMap.set(self, key, MutableHashSet.fromIterable(values))
  }
}
