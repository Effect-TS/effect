/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { HashSet } from "effect/HashSet"
import type { Layer } from "effect/Layer"
import type { Envelope } from "./Envelope.js"
import * as InternalPods from "./internal/pods.js"
import type { PodAddress } from "./PodAddress.js"
import type { ShardId } from "./ShardId.js"
import type { PodUnavailable } from "./ShardingException.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = InternalPods.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Pods extends Pods.Proto {
  /**
   * Checks if a pod is responsive.
   */
  readonly ping: (address: PodAddress) => Effect<void, PodUnavailable>

  // TODO: improve type signature
  /**
   * Send a message to a pod.
   */
  readonly send: (address: PodAddress, envelope: Envelope.Encoded) => Effect<
    void,
    PodUnavailable
  >

  /**
   * Notify a pod that it was assigned a set of shards.
   */
  readonly assignShards: (address: PodAddress, shards: HashSet<ShardId>) => Effect<void>

  /**
   * Notify a pod that it was unassigned a set of shards.
   */
  readonly unassignShards: (address: PodAddress, shards: HashSet<ShardId>) => Effect<void>
}

/**
 * @since 1.0.0
 */
export declare namespace Pods {
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
export const Pods: Tag<Pods, Pods> = InternalPods.Tag

/**
 * @since 1.0.0
 * @category layer
 */
export const layerNoop: Layer<Pods> = InternalPods.layerNoop
