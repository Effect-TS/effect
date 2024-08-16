/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as MutableHashMap from "effect/MutableHashMap"
import * as Option from "effect/Option"
import type { PersistenceError } from "./ClusterError.js"
import { Pod } from "./Pod.js"
import { PodAddress } from "./PodAddress.js"
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
   * Get the current assignments of shards to pods.
   */
  readonly getAssignments: Effect.Effect<ReadonlyMap<ShardId, Option.Option<PodAddress>>, PersistenceError>

  /**
   * Save the current state of shards assignments to pods.
   */
  readonly saveAssignments: (
    assignments: Iterable<readonly [ShardId, Option.Option<PodAddress>]>
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Get all pods registered with the cluster.
   */
  readonly getPods: Effect.Effect<Array<[PodAddress, Pod]>, PersistenceError>

  /**
   * Save the current pods registered with the cluster.
   */
  readonly savePods: (pods: Iterable<readonly [PodAddress, Pod]>) => Effect.Effect<void, PersistenceError>

  /**
   * Try to acquire the given shard ids for processing.
   *
   * It returns an array of shards it was able to acquire.
   */
  readonly acquire: (
    address: PodAddress,
    shardIds: Iterable<ShardId>
  ) => Effect.Effect<Array<ShardId>, PersistenceError>

  /**
   * Refresh the locks owned by the given pod.
   *
   * Locks expire after 90 seconds, so this method should be called every 60
   * seconds to keep the locks alive.
   */
  readonly refresh: (
    address: PodAddress,
    shardIds: Iterable<ShardId>
  ) => Effect.Effect<Array<ShardId>, PersistenceError>

  /**
   * Release the given shard ids.
   */
  readonly release: (
    address: PodAddress,
    shardId: ShardId
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Release all the shards assigned to the given pod.
   */
  readonly releaseAll: (address: PodAddress) => Effect.Effect<void, PersistenceError>
}>() {}

/**
 * @since 1.0.0
 * @category Encoded
 */
export interface Encoded {
  /**
   * Get the current assignments of shards to pods.
   */
  readonly getAssignments: Effect.Effect<
    Array<
      readonly [
        shardId: number,
        podAddress: string | null
      ]
    >,
    PersistenceError
  >

  /**
   * Save the current state of shards assignments to pods.
   */
  readonly saveAssignments: (
    assignments: Array<readonly [shardId: number, podAddress: string | null]>
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Get all pods registered with the cluster.
   */
  readonly getPods: Effect.Effect<Array<readonly [address: string, pod: string]>, PersistenceError>

  /**
   * Save the current pods registered with the cluster.
   */
  readonly savePods: (pods: Array<readonly [address: string, pod: string]>) => Effect.Effect<void, PersistenceError>

  /**
   * Acquire the lock on the given shards, returning the shards that were
   * successfully locked.
   */
  readonly acquire: (
    address: string,
    shardIds: ReadonlyArray<number>
  ) => Effect.Effect<Array<number>, PersistenceError>

  /**
   * Refresh the lock on the given shards, returning the shards that were
   * successfully locked.
   */
  readonly refresh: (
    address: string,
    shardIds: ReadonlyArray<number>
  ) => Effect.Effect<Array<number>, PersistenceError>

  /**
   * Release the lock on the given shards.
   */
  readonly release: (
    address: string,
    shardIds: number
  ) => Effect.Effect<void, PersistenceError>

  /**
   * Release the lock on all shards for the given pod.
   */
  readonly releaseAll: (address: string) => Effect.Effect<void, PersistenceError>
}

/**
 * @since 1.0.0
 * @category layers
 */
export const makeEncoded = Effect.fnUntraced(function*(encoded: Encoded) {
  const activeShards = new Set<ShardId>()

  return ShardStorage.of({
    getAssignments: Effect.map(encoded.getAssignments, (assignments) => {
      const map = new Map<ShardId, Option.Option<PodAddress>>()
      for (const [shardId, podAddress] of assignments) {
        map.set(ShardId.make(shardId), podAddress === null ? Option.none() : Option.some(decodePodAddress(podAddress)))
      }
      return map
    }),
    saveAssignments: (assignments) =>
      encoded.saveAssignments(
        Array.from(
          assignments,
          ([shardId, podAddress]) => [shardId, Option.isNone(podAddress) ? null : encodePodAddress(podAddress.value)]
        )
      ),
    getPods: Effect.gen(function*() {
      const pods = yield* encoded.getPods
      const results = new Array<[PodAddress, Pod]>(pods.length)
      for (let i = 0; i < pods.length; i++) {
        const [address, pod] = pods[i]
        results[i] = [decodePodAddress(address), Pod.decodeSync(pod)]
      }
      return results
    }),
    savePods: (pods) =>
      Effect.suspend(() =>
        encoded.savePods(Array.from(pods, ([address, pod]) => [encodePodAddress(address), Pod.encodeSync(pod)]))
      ),
    acquire: (address, shardIds) =>
      encoded.acquire(encodePodAddress(address), Array.from(shardIds)) as Effect.Effect<
        Array<ShardId>,
        PersistenceError
      >,
    refresh: (address, shardIds) => encoded.refresh(encodePodAddress(address), Array.from(shardIds)) as any,
    release: Effect.fnUntraced(function*(address, shardId) {
      activeShards.delete(shardId)
      yield* encoded.release(encodePodAddress(address), shardId).pipe(
        Effect.onError(() => Effect.sync(() => activeShards.add(shardId)))
      )
    }),
    releaseAll: Effect.fnUntraced(function*(address) {
      activeShards.clear()
      yield* encoded.releaseAll(encodePodAddress(address))
    })
  })
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
      getAssignments: Effect.succeed(new Map()),
      saveAssignments: () => Effect.void,
      getPods: Effect.sync(() => []),
      savePods: () => Effect.void,
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
  const assignments = new Map<ShardId, Option.Option<PodAddress>>()
  const pods = MutableHashMap.empty<PodAddress, Pod>()

  function saveAssignments(value: Iterable<readonly [ShardId, Option.Option<PodAddress>]>) {
    return Effect.sync(() => {
      for (const [shardId, podAddress] of value) {
        assignments.set(shardId, podAddress)
      }
    })
  }

  function savePods(value: Iterable<readonly [PodAddress, Pod]>) {
    return Effect.sync(() => {
      for (const [address, pod] of value) {
        MutableHashMap.set(pods, address, pod)
      }
    })
  }

  let acquired: Array<ShardId> = []

  return ShardStorage.of({
    getAssignments: Effect.sync(() => new Map(assignments)),
    saveAssignments,
    getPods: Effect.sync(() => Array.from(pods)),
    savePods,
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

const encodePodAddress = (podAddress: PodAddress) => `${podAddress.host}:${podAddress.port}`

const decodePodAddress = (podAddress: string): PodAddress => {
  const [host, port] = podAddress.split(":")
  return new PodAddress({ host, port: Number(port) })
}
