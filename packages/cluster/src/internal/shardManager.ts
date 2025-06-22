import * as Arr from "effect/Array"
import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import { constFalse } from "effect/Function"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableHashSet from "effect/MutableHashSet"
import * as Option from "effect/Option"
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
    this.perRunner = new Map<string, MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>>()

    for (const [address, meta] of this.allRunners) {
      for (const group of meta.runner.groups) {
        let runnerMap = this.perRunner.get(group)
        if (!runnerMap) {
          runnerMap = MutableHashMap.empty<RunnerAddress, Set<number>>()
          this.perRunner.set(group, runnerMap)
        }
        MutableHashMap.set(runnerMap, address, new Set())
      }
    }

    for (const [group, groupMap] of this.shards) {
      const perRunnerMap = this.perRunner.get(group)!
      for (const [id, address_] of groupMap) {
        const address = Option.filter(address_, (addr) => MutableHashMap.has(this.allRunners, addr))
        MutableHashMap.set(this.assignments, new ShardId({ group, id }), address)
        if (Option.isSome(address)) {
          Option.getOrUndefined(MutableHashMap.get(perRunnerMap, address.value))?.add(id)
        }
      }
    }
  }

  readonly assignments: MutableHashMap.MutableHashMap<ShardId, Option.Option<RunnerAddress>>
  readonly perRunner: Map<string, MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>>

  addGroup(group: string): void {
    this.runners.set(group, MutableHashMap.empty<RunnerAddress, RunnerWithMetadata>())
    const shardMap = new Map<number, Option.Option<RunnerAddress>>()
    this.shards.set(group, shardMap)
    for (let n = 1; n <= this.shardsPerGroup; n++) {
      shardMap.set(n, Option.none())
      MutableHashMap.set(this.assignments, new ShardId({ group, id: n }), Option.none())
    }

    const perRunnerMap = MutableHashMap.empty<RunnerAddress, Set<number>>()
    this.perRunner.set(group, perRunnerMap)
    for (const [address] of this.allRunners) {
      MutableHashMap.set(perRunnerMap, address, new Set())
    }
  }

  addAssignments(
    shards: Iterable<ShardId>,
    address: Option.Option<RunnerAddress>
  ) {
    for (const shardId of shards) {
      const currentAddress = Option.flatten(MutableHashMap.get(this.assignments, shardId))
      MutableHashMap.set(this.assignments, shardId, address)
      this.shards.get(shardId.group)?.set(shardId.id, address)

      const perRunner = this.perRunner.get(shardId.group)!
      if (Option.isSome(currentAddress)) {
        Option.getOrUndefined(MutableHashMap.get(perRunner, currentAddress.value))?.delete(shardId.id)
      }
      if (Option.isSome(address)) {
        Option.getOrUndefined(MutableHashMap.get(perRunner, address.value))?.add(shardId.id)
      }
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
      const perRunner = this.perRunner.get(group)!
      MutableHashMap.set(perRunner, runner.address, new Set())
    }
  }

  removeRunner(address: RunnerAddress): void {
    MutableHashMap.remove(this.allRunners, address)
    for (const group of this.runners.keys()) {
      const groupMap = this.runners.get(group)!
      MutableHashMap.remove(groupMap, address)

      const perRunner = this.perRunner.get(group)!
      MutableHashMap.remove(perRunner, address)
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

  get shardStats(): {
    readonly perRunner: Map<string, number>
    readonly unassigned: number
  } {
    const perRunner = new Map<string, number>()
    let unassigned = 0
    for (const [, address] of this.assignments) {
      if (Option.isNone(address)) {
        unassigned++
        continue
      }
      const runner = address.value.toString()
      const count = perRunner.get(runner) ?? 0
      perRunner.set(runner, count + 1)
    }

    return { perRunner, unassigned }
  }

  shardsPerRunner(group: string): MutableHashMap.MutableHashMap<RunnerAddress, Set<number>> {
    const shards = MutableHashMap.empty<RunnerAddress, Set<number>>()
    const perRunner = this.perRunner.get(group)
    if (!perRunner || MutableHashMap.isEmpty(perRunner)) return shards

    for (const [address, shardSet] of perRunner) {
      MutableHashMap.set(shards, address, new Set(shardSet))
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
export function decideAssignmentsForShards(state: State, group: string): readonly [
  assignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>,
  unassignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>,
  changes: MutableHashSet.MutableHashSet<RunnerAddress>
] {
  const shardsPerRunner = state.shardsPerRunner(group)
  const maxVersion = state.maxVersion
  const shardsToRebalance = state.unassignedShards(group)

  if (state.allRunnersHaveVersion(maxVersion)) {
    const averageShardsPerRunner = state.averageShardsPerRunner(group)
    MutableHashMap.forEach(shardsPerRunner, (shards) => {
      const extraShards = Math.max(0, shards.size - averageShardsPerRunner)
      const iter = shards.values()
      for (let i = 0; i < extraShards; i++) {
        const shard = iter.next()
        if (shard.done) break
        shardsToRebalance.push(shard.value)
      }
    })
  }

  return pickNewRunners(shardsToRebalance, state, group, shardsPerRunner, maxVersion)
}

function pickNewRunners(
  shardsToRebalance: ReadonlyArray<number>,
  state: State,
  group: string,
  shardsPerRunner: MutableHashMap.MutableHashMap<RunnerAddress, Set<number>>,
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
