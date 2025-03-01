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
  static fromStorage = Effect.fnUntraced(function*(numberOfShards: number) {
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
    const assignedShards = new Map<ShardId, RunnerAddress>()
    const invalidAssignments = Arr.empty<[ShardId, RunnerAddress]>()
    for (const [shard, address] of storedAssignments) {
      if (Option.isSome(address) && MutableHashMap.has(aliveRunners, address.value)) {
        assignedShards.set(shard, address.value)
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
    const runnerState = MutableHashMap.empty<RunnerAddress, RunnerWithMetadata>()
    for (const [address, runner] of aliveRunners) {
      MutableHashMap.set(runnerState, address, RunnerWithMetadata({ runner, registeredAt: now }))
    }

    const shardState = new Map<ShardId, Option.Option<RunnerAddress>>()
    for (let n = 1; n <= numberOfShards; n++) {
      const shardId = ShardId.make(n)
      shardState.set(shardId, Option.fromNullable(assignedShards.get(shardId)))
    }

    return new State(runnerState, shardState)
  })

  constructor(
    readonly runners: MutableHashMap.MutableHashMap<RunnerAddress, RunnerWithMetadata>,
    readonly shards: Map<ShardId, Option.Option<RunnerAddress>>
  ) {}

  get maxVersion(): Option.Option<number> {
    if (MutableHashMap.size(this.runners) === 0) return Option.none()
    let version: number | undefined = undefined
    for (const [, meta] of this.runners) {
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

  get shardsPerRunner(): MutableHashMap.MutableHashMap<RunnerAddress, Set<ShardId>> {
    const shards = MutableHashMap.empty<RunnerAddress, Set<ShardId>>()

    if (MutableHashMap.isEmpty(this.runners)) return shards
    MutableHashMap.forEach(this.runners, (_, address) => {
      MutableHashMap.set(shards, address, new Set())
    })

    for (const [shard, address] of this.shards) {
      if (Option.isNone(address)) continue
      const shardIds = Option.getOrUndefined(MutableHashMap.get(shards, address.value))!
      shardIds.add(shard)
    }

    return shards
  }

  get averageShardsPerRunner(): number {
    const runnerCount = MutableHashMap.size(this.runners)
    return runnerCount > 0 ? this.shards.size / runnerCount : 0
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

  private get runnerVersions(): Array<number> {
    const runnerVersions: Array<number> = []
    for (const [, meta] of this.runners) {
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
export function decideAssignmentsForUnassignedShards(state: State): readonly [
  assignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<ShardId>>,
  unassignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<ShardId>>,
  changes: MutableHashSet.MutableHashSet<RunnerAddress>
] {
  return pickNewRunners(state.unassignedShards, state, true, 1)
}

const allocationOrder: Order.Order<[ShardId, number, number]> = Order.combine(
  Order.mapInput(Order.number, ([, shards]) => shards),
  Order.mapInput(Order.number, ([, , registeredAt]) => registeredAt)
)

/** @internal */
export function decideAssignmentsForUnbalancedShards(state: State, rate: number): readonly [
  assignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<ShardId>>,
  unassignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<ShardId>>,
  changes: MutableHashSet.MutableHashSet<RunnerAddress>
] {
  const shardsPerRunner = state.shardsPerRunner
  const maxVersion = state.maxVersion
  const extraShardsToAllocate = Arr.empty<[ShardId, shardsInverse: number, registeredAt: number]>()

  if (state.allRunnersHaveVersion(maxVersion)) {
    const averageShardsPerRunner = state.averageShardsPerRunner
    MutableHashMap.forEach(shardsPerRunner, (shards) => {
      // Count how many extra shards there are compared to the average
      const extraShards = Math.max(0, shards.size - averageShardsPerRunner)
      for (const shard of takeRandom(shards, extraShards)) {
        const maybeAddress = state.shards.get(shard) ?? Option.none()
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
          Option.match(MutableHashMap.get(state.runners, address), {
            onNone: () => Number.MIN_SAFE_INTEGER,
            onSome: (meta) => meta.registeredAt
          })
        ])
      }
    })
  }

  const sortedShardsToRebalance = extraShardsToAllocate.sort(allocationOrder).map(([shard]) => shard)

  return pickNewRunners(sortedShardsToRebalance, state, false, rate, shardsPerRunner, maxVersion)
}

function pickNewRunners(
  shardsToRebalance: ReadonlyArray<ShardId>,
  state: State,
  immediate: boolean,
  rate: number,
  shardsPerRunner = state.shardsPerRunner,
  maybeMaxVersion = state.maxVersion
): readonly [
  assignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<ShardId>>,
  unassignments: MutableHashMap.MutableHashMap<RunnerAddress, Set<ShardId>>,
  changes: MutableHashSet.MutableHashSet<RunnerAddress>
] {
  const addressAssignments = MutableHashMap.empty<RunnerAddress, Set<ShardId>>()
  const unassignments = MutableHashMap.empty<RunnerAddress, Set<ShardId>>()
  const changes = MutableHashSet.empty<RunnerAddress>()

  if (Option.isNone(maybeMaxVersion)) {
    return [addressAssignments, unassignments, changes]
  }
  const maxVersion = maybeMaxVersion.value

  for (const shardId of shardsToRebalance) {
    // Find the runner with the fewest assigned shards
    let candidate: RunnerAddress | undefined
    let candidateShards: Set<ShardId> | undefined

    for (const [address, shards] of shardsPerRunner) {
      // Keep only runners with the maximum version
      const maybeRunnerMeta = MutableHashMap.get(state.runners, address)
      if (Option.isNone(maybeRunnerMeta)) continue
      const runnerMeta = maybeRunnerMeta.value
      if (runnerMeta.runner.version !== maxVersion) continue

      // Do not assign to a runner that has unassignments in the same rebalance
      if (MutableHashMap.has(unassignments, address)) continue

      // Do not assign too many shards to each runner unless rebalancing must
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

    // If the old runner is the same as the new runner, do nothing
    const oldRunner = Option.getOrUndefined(state.shards.get(shardId) ?? Option.none())
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
