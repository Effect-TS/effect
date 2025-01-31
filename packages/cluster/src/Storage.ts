/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as MutableHashMap from "effect/MutableHashMap"
import type * as Option from "effect/Option"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import type { Pod } from "./Pod.js"
import type { PodAddress } from "./PodAddress.js"
import type { ShardId } from "./ShardId.js"

/**
 * Represents a generic interface to the persistent storage required by the
 * cluster.
 *
 * @since 1.0.0
 * @category models
 */
export class Storage extends Context.Tag("@effect/cluster/Storage")<Storage, {
  /**
   * Get the current assignments of shards to pods.
   */
  readonly getShardAssignments: Effect.Effect<ReadonlyMap<ShardId, Option.Option<PodAddress>>>

  /**
   * Returns a `Stream` which will emit the state of all shard assignments
   * whenever assignments are updated.
   */
  readonly streamShardAssignments: Stream.Stream<ReadonlyMap<ShardId, Option.Option<PodAddress>>>

  /**
   * Save the current state of shards assignments to pods.
   */
  readonly saveShardAssignments: (
    assignments: Iterable<readonly [ShardId, Option.Option<PodAddress>]>
  ) => Effect.Effect<void>

  /**
   * Get all pods registered with the cluster.
   */
  readonly getPods: Effect.Effect<Array<[PodAddress, Pod]>>

  /**
   * Save the current pods registered with the cluster.
   */
  readonly savePods: (pods: Iterable<readonly [PodAddress, Pod]>) => Effect.Effect<void>
}>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layerNoop: Layer.Layer<Storage> = Layer.succeed(
  Storage,
  Storage.of({
    getShardAssignments: Effect.succeed(new Map()),
    saveShardAssignments: () => Effect.void,
    streamShardAssignments: Stream.empty,
    getPods: Effect.sync(() => []),
    savePods: () => Effect.void
  })
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeMemory = Effect.gen(function*() {
  const assignments = new Map<ShardId, Option.Option<PodAddress>>()
  const pubsub = yield* PubSub.unbounded<ReadonlyMap<ShardId, Option.Option<PodAddress>>>()
  const pods = MutableHashMap.empty<PodAddress, Pod>()

  function saveShardAssignments(value: Iterable<readonly [ShardId, Option.Option<PodAddress>]>) {
    return Effect.suspend(() => {
      for (const [shardId, podAddress] of value) {
        assignments.set(shardId, podAddress)
      }
      return pubsub.publish(new Map(assignments))
    })
  }

  function savePods(value: Iterable<readonly [PodAddress, Pod]>) {
    return Effect.sync(() => {
      for (const [address, pod] of value) {
        MutableHashMap.set(pods, address, pod)
      }
    })
  }

  return Storage.of({
    getShardAssignments: Effect.sync(() => new Map(assignments)),
    saveShardAssignments,
    streamShardAssignments: Stream.fromPubSub(pubsub),
    getPods: Effect.sync(() => Array.from(pods)),
    savePods
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layerMemory: Layer.Layer<Storage> = Layer.effect(Storage, makeMemory)
