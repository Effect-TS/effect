/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as HashMap from "effect/HashMap"
import type * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type * as Stream from "effect/Stream"
import * as internal from "./internal/storage.js"
import type * as Pod from "./Pod.js"
import type * as PodAddress from "./PodAddress.js"
import type * as ShardId from "./ShardId.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const StorageTypeId: unique symbol = internal.StorageTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type StorageTypeId = typeof StorageTypeId

/**
 * The storage Service is responsible of persisting assignments and registered pods.
 * The storage is expected to be shared among all pods, so it works also as communication of assignments between Pods.
 *
 * @since 1.0.0
 * @category models
 */
export interface Storage {
  readonly [StorageTypeId]: StorageTypeId

  /**
   * Get the current state of shard assignments to pods
   */
  readonly getAssignments: Effect.Effect<HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>>

  /**
   * Save the current state of shard assignments to pods
   */
  readonly saveAssignments: (
    assignments: HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>
  ) => Effect.Effect<void>

  /**
   * A stream that will emit the state of shard assignments whenever it changes
   */
  readonly assignmentsStream: Stream.Stream<HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>>

  /**
   * Get the list of existing pods
   */
  readonly getPods: Effect.Effect<HashMap.HashMap<PodAddress.PodAddress, Pod.Pod>>

  /**
   * Save the list of existing pods
   */
  readonly savePods: (pods: HashMap.HashMap<PodAddress.PodAddress, Pod.Pod>) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (args: Omit<Storage, typeof StorageTypeId>) => Storage = internal.make

/**
 * @since 1.0.0
 * @category context
 */
export const Storage: Context.Tag<Storage, Storage> = internal.storageTag

/**
 * A layer that stores data in-memory.
 * This is useful for testing with a single pod only.
 *
 * @since 1.0.0
 * @category layers
 */
export const memory: Layer.Layer<Storage> = internal.memory

/**
 * A layer that does nothing, useful for testing.
 *
 * @since 1.0.0
 * @category layers
 */
export const noop: Layer.Layer<Storage> = internal.noop
