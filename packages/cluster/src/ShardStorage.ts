/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as MutableHashMap from "effect/MutableHashMap"
import * as Option from "effect/Option"
import type { PersistenceError } from "./ClusterError.js"
import { Runner } from "./Runner.js"
import { RunnerAddress } from "./RunnerAddress.js"
import { ShardId } from "./ShardId.js"

/**
 * Represents a generic interface to the persistent storage required by the
 * cluster.
 *
 * @since 1.0.0
 * @category models
 */
export class ShardStorage extends Context.Tag("@effect/cluster/ShardStorage")<ShardStorage, {
  /**
   * Get the current assignments of shards to runners.
   */
  readonly getAssignments: Effect.Effect<
    Array<[ShardId, Option.Option<RunnerAddress>]>,
    PersistenceError
  >

  /**
   * Save the current state of shards assignments to runners.
   */
  readonly saveAssignments: (
    assignments: Iterable<readonly [ShardId, Option.Option<RunnerAddress>]>
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Get all runners registered with the cluster.
   */
  readonly getRunners: Effect.Effect<Array<[RunnerAddress, Runner]>, PersistenceError>

  /**
   * Save the current runners registered with the cluster.
   */
  readonly saveRunners: (runners: Iterable<readonly [RunnerAddress, Runner]>) => Effect.Effect<void, PersistenceError>

  /**
   * Try to acquire the given shard ids for processing.
   *
   * It returns an array of shards it was able to acquire.
   */
  readonly acquire: (
    address: RunnerAddress,
    shardIds: Iterable<ShardId>
  ) => Effect.Effect<Array<ShardId>, PersistenceError>

  /**
   * Refresh the locks owned by the given runner.
   *
   * Locks expire after 15 seconds, so this method should be called every 10
   * seconds to keep the locks alive.
   */
  readonly refresh: (
    address: RunnerAddress,
    shardIds: Iterable<ShardId>
  ) => Effect.Effect<Array<ShardId>, PersistenceError>

  /**
   * Release the given shard ids.
   */
  readonly release: (
    address: RunnerAddress,
    shardId: ShardId
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Release all the shards assigned to the given runner.
   */
  readonly releaseAll: (address: RunnerAddress) => Effect.Effect<void, PersistenceError>
}>() {}

/**
 * @since 1.0.0
 * @category Encoded
 */
export interface Encoded {
  /**
   * Get the current assignments of shards to runners.
   */
  readonly getAssignments: Effect.Effect<
    Array<
      readonly [
        shardId: string,
        runnerAddress: string | null
      ]
    >,
    PersistenceError
  >

  /**
   * Save the current state of shards assignments to runners.
   */
  readonly saveAssignments: (
    assignments: Array<readonly [shardId: string, RunnerAddress: string | null]>
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Get all runners registered with the cluster.
   */
  readonly getRunners: Effect.Effect<Array<readonly [address: string, runner: string]>, PersistenceError>

  /**
   * Save the current runners registered with the cluster.
   */
  readonly saveRunners: (
    runners: Array<readonly [address: string, runner: string]>
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Acquire the lock on the given shards, returning the shards that were
   * successfully locked.
   */
  readonly acquire: (
    address: string,
    shardIds: ReadonlyArray<string>
  ) => Effect.Effect<Array<string>, PersistenceError>

  /**
   * Refresh the lock on the given shards, returning the shards that were
   * successfully locked.
   */
  readonly refresh: (
    address: string,
    shardIds: ReadonlyArray<string>
  ) => Effect.Effect<Array<string>, PersistenceError>

  /**
   * Release the lock on the given shard.
   */
  readonly release: (
    address: string,
    shardId: string
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Release the lock on all shards for the given runner.
   */
  readonly releaseAll: (address: string) => Effect.Effect<void, PersistenceError>
}

/**
 * @since 1.0.0
 * @category layers
 */
export const makeEncoded = (encoded: Encoded) =>
  ShardStorage.of({
    getAssignments: Effect.map(encoded.getAssignments, (assignments) => {
      const arr = Arr.empty<[ShardId, Option.Option<RunnerAddress>]>()
      for (const [shardId, runnerAddress] of assignments) {
        arr.push([
          ShardId.fromString(shardId),
          runnerAddress === null ? Option.none() : Option.some(decodeRunnerAddress(runnerAddress))
        ])
      }
      return arr
    }),
    saveAssignments: (assignments) => {
      const arr = Arr.empty<readonly [string, string | null]>()
      for (const [shardId, runnerAddress] of assignments) {
        arr.push([
          shardId.toString(),
          Option.isNone(runnerAddress) ? null : encodeRunnerAddress(runnerAddress.value)
        ])
      }
      return encoded.saveAssignments(arr)
    },
    getRunners: Effect.gen(function*() {
      const runners = yield* encoded.getRunners
      const results = new Array<[RunnerAddress, Runner]>(runners.length)
      for (let i = 0; i < runners.length; i++) {
        const [address, runner] = runners[i]
        results[i] = [decodeRunnerAddress(address), Runner.decodeSync(runner)]
      }
      return results
    }),
    saveRunners: (runners) =>
      Effect.suspend(() =>
        encoded.saveRunners(
          Array.from(runners, ([address, runner]) => [encodeRunnerAddress(address), Runner.encodeSync(runner)])
        )
      ),
    acquire: (address, shardIds) => {
      const arr = Array.from(shardIds, (id) => id.toString())
      return encoded.acquire(encodeRunnerAddress(address), arr).pipe(
        Effect.map((shards) => shards.map(ShardId.fromString))
      )
    },
    refresh: (address, shardIds) => {
      const arr = Array.from(shardIds, (id) => id.toString())
      return encoded.refresh(encodeRunnerAddress(address), arr).pipe(
        Effect.map((shards) => shards.map(ShardId.fromString))
      )
    },
    release(address, shardId) {
      return encoded.release(encodeRunnerAddress(address), shardId.toString())
    },
    releaseAll(address) {
      return encoded.releaseAll(encodeRunnerAddress(address))
    }
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerNoop: Layer.Layer<ShardStorage> = Layer.sync(
  ShardStorage,
  () => {
    let acquired: Array<ShardId> = []
    return ShardStorage.of({
      getAssignments: Effect.sync(() => []),
      saveAssignments: () => Effect.void,
      getRunners: Effect.sync(() => []),
      saveRunners: () => Effect.void,
      acquire: (_address, shards) => {
        acquired = Array.from(shards)
        return Effect.succeed(Array.from(shards))
      },
      refresh: () => Effect.sync(() => acquired),
      release: () => Effect.void,
      releaseAll: () => Effect.void
    })
  }
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeMemory = Effect.gen(function*() {
  const assignments = MutableHashMap.empty<ShardId, Option.Option<RunnerAddress>>()
  const runners = MutableHashMap.empty<RunnerAddress, Runner>()

  function saveAssignments(value: Iterable<readonly [ShardId, Option.Option<RunnerAddress>]>) {
    return Effect.sync(() => {
      for (const [shardId, runnerAddress] of value) {
        MutableHashMap.set(assignments, shardId, runnerAddress)
      }
    })
  }

  function saveRunners(value: Iterable<readonly [RunnerAddress, Runner]>) {
    return Effect.sync(() => {
      for (const [address, runner] of value) {
        MutableHashMap.set(runners, address, runner)
      }
    })
  }

  let acquired: Array<ShardId> = []

  return ShardStorage.of({
    getAssignments: Effect.sync(() => Array.from(assignments)),
    saveAssignments,
    getRunners: Effect.sync(() => Array.from(runners)),
    saveRunners,
    acquire: (_address, shardIds) => {
      acquired = Array.from(shardIds)
      return Effect.succeed(Array.from(shardIds))
    },
    refresh: () => Effect.sync(() => acquired),
    release: () => Effect.void,
    releaseAll: () => Effect.void
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layerMemory: Layer.Layer<ShardStorage> = Layer.effect(ShardStorage, makeMemory)

// -------------------------------------------------------------------------------------
// internal
// -------------------------------------------------------------------------------------

const encodeRunnerAddress = (runnerAddress: RunnerAddress) => `${runnerAddress.host}:${runnerAddress.port}`

const decodeRunnerAddress = (runnerAddress: string): RunnerAddress => {
  const [host, port] = runnerAddress.split(":")
  return new RunnerAddress({ host, port: Number(port) })
}
