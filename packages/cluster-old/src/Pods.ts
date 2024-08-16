/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as HashSet from "effect/HashSet"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/pods.js"
import type * as MessageState from "./MessageState.js"
import type * as PodAddress from "./PodAddress.js"
import type * as SerializedEnvelope from "./SerializedEnvelope.js"
import type * as SerializedMessage from "./SerializedMessage.js"
import type * as ShardId from "./ShardId.js"
import type * as ShardingException from "./ShardingException.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const PodsTypeId: unique symbol = internal.PodsTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type PodsTypeId = typeof PodsTypeId

/**
 * An interface to communicate with remote pods.
 * This is used by the Shard Manager for assigning and unassigning shards.
 * This is also used by pods for internal communication (forward messages to each other).
 *
 * @since 1.0.0
 * @category models
 */
export interface Pods {
  /**
   * @since 1.0.0
   */
  readonly [PodsTypeId]: PodsTypeId

  /**
   * Notify a pod that it was assigned a list of shards
   * @since 1.0.0
   */
  readonly assignShards: (
    pod: PodAddress.PodAddress,
    shards: HashSet.HashSet<ShardId.ShardId>
  ) => Effect.Effect<void, ShardingException.PodUnavailableException>

  /**
   * Notify a pod that it was unassigned a list of shards
   * @since 1.0.0
   */
  readonly unassignShards: (
    pod: PodAddress.PodAddress,
    shards: HashSet.HashSet<ShardId.ShardId>
  ) => Effect.Effect<void, ShardingException.PodUnavailableException>

  /**
   * Check that a pod is responsive
   * @since 1.0.0
   */
  readonly ping: (pod: PodAddress.PodAddress) => Effect.Effect<void, ShardingException.PodUnavailableException>

  /**
   * Send a message to a pod and receive its message state
   * @since 1.0.0
   */
  readonly sendAndGetState: (
    pod: PodAddress.PodAddress,
    envelope: SerializedEnvelope.SerializedEnvelope
  ) => Effect.Effect<
    MessageState.MessageState<SerializedMessage.SerializedMessage>,
    ShardingException.ShardingException
  >
}

/**
 * @since 1.0.0
 * @category context
 */
export const Pods: Context.Tag<Pods, Pods> = internal.podsTag

/**
 * Constructs a Pods service from its implementation
 *
 * @since 1.0.0
 * @category context
 */
export const make: (args: Omit<Pods, typeof PodsTypeId>) => Pods = internal.make

/**
 * A layer that creates a service that does nothing when called.
 * Useful for testing ShardManager or when using Sharding.local.
 *
 * @since 1.0.0
 * @category layers
 */
export const noop: Layer.Layer<Pods> = internal.noop
