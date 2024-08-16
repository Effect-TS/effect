/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/podsHealth.js"
import type * as PodAddress from "./PodAddress.js"
import type * as Pods from "./Pods.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const PodsHealthTypeId: unique symbol = internal.PodsHealthTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type PodsHealthTypeId = typeof PodsHealthTypeId

/**
 * An interface to check a pod's health.
 * This is used when a pod is unresponsive, to check if it should be unassigned all its shards or not.
 * If the pod is alive, shards will not be unassigned because the pods might still be processing messages and might be responsive again.
 * If the pod is not alive, shards can be safely reassigned somewhere else.
 * A typical implementation for this is using k8s to check if the pod still exists.
 *
 * @since 1.0.0
 * @category models
 */
export interface PodsHealth {
  /**
   * @since 1.0.0
   */
  readonly [PodsHealthTypeId]: PodsHealthTypeId

  /**
   * Check if a pod is still alive.
   * @since 1.0.0
   */
  readonly isAlive: (podAddress: PodAddress.PodAddress) => Effect.Effect<boolean>
}

/**
 * Constructs a PodsHealth from its implementation
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: (args: Omit<PodsHealth, typeof PodsHealthTypeId>) => PodsHealth = internal.make

/**
 * @since 1.0.0
 * @category context
 */
export const PodsHealth: Context.Tag<PodsHealth, PodsHealth> = internal.podsHealthTag

/**
 * A layer that considers pods as always alive.
 * This is useful for testing only.
 * @since 1.0.0
 * @category layers
 */
export const noop: Layer.Layer<PodsHealth> = internal.noop

/**
 * A layer that pings the pod directly to check if it's alive.
 * This is useful for developing and testing but not reliable in production.
 * @since 1.0.0
 * @category layers
 */
export const local: Layer.Layer<PodsHealth, never, Pods.Pods> = internal.local
