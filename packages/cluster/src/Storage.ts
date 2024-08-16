/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { HashMap } from "effect/HashMap"
import type { Layer } from "effect/Layer"
import type { Option } from "effect/Option"
import type { Stream } from "effect/Stream"
import * as InternalStorage from "./internal/storage.js"
import type { Pod } from "./Pod.js"
import type { PodAddress } from "./PodAddress.js"
import type { ShardId } from "./ShardId.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = InternalStorage.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * Represents a generic interface to the persistent storage required by the
 * cluster.
 *
 * @since 1.0.0
 * @category models
 */
export interface Storage extends Storage.Proto {
  /**
   * Get the current assignments of shards to pods.
   */
  readonly getShardAssignments: Effect<HashMap<ShardId, Option<PodAddress>>>
  /**
   * Returns a `Stream` which will emit the state of all shard assignments
   * whenever assignments are updated.
   */
  readonly streamShardAssignments: Stream<HashMap<ShardId, Option<PodAddress>>>
  /**
   * Save the current state of shards assignments to pods.
   */
  readonly saveShardAssignments: (assignments: HashMap<ShardId, Option<PodAddress>>) => Effect<void>
  /**
   * Get all pods registered with the cluster.
   */
  readonly getPods: Effect<HashMap<PodAddress, Pod>>
  /**
   * Save the current pods registered with the cluster.
   */
  readonly savePods: (pods: HashMap<PodAddress, Pod>) => Effect<void>
}

/**
 * @since 1.0.0
 */
export declare namespace Storage {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [TypeId]: TypeId
  }
}

/**
 * @since 1.0.0
 * @category context
 */
export const Storage: Tag<Storage, Storage> = InternalStorage.Tag

/**
 * @since 1.0.0
 * @category layer
 */
export const layerNoop: Layer<Storage> = InternalStorage.layerNoop

/**
 * @since 1.0.0
 * @category layer
 */
export const layerMemory: Layer<Storage> = InternalStorage.layerMemory
