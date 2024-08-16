/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import * as InternalPodsHealth from "./internal/podsHealth.js"
import type { PodAddress } from "./PodAddress.js"
import type { Pods } from "./Pods.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = InternalPodsHealth.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * Represents the service used to check if a pod is healthy.
 *
 * If a pod is responsive, shards will not be re-assigned because the pod may
 * still be processing messages. If a pod is not responsive, then its
 * associated shards can and will be re-assigned to a different pod.
 *
 * @since 1.0.0
 * @category models
 */
export interface PodsHealth extends PodsHealth.Proto {
  readonly isAlive: (address: PodAddress) => Effect<boolean>
}

/**
 * @since 1.0.0
 */
export declare namespace PodsHealth {
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
export const PodsHealth: Tag<PodsHealth, PodsHealth> = InternalPodsHealth.Tag

/**
 * A layer which will **always** consider a pod healthy.
 *
 * This is useful for testing.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerNoop: Layer<PodsHealth> = InternalPodsHealth.layerNoop

/**
 * A layer which will ping a pod directly on the same machine to check if it
 * is healthy.
 *
 * This is useful when prototyping a cluster with a single machine, but is not
 * reliable when multiple machines are introduced.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerLocal: Layer<PodsHealth, never, Pods> = InternalPodsHealth.layerLocal
