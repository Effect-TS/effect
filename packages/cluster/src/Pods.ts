/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Envelope } from "./Envelope.js"
import * as InternalPods from "./internal/pods.js"
import type { PodAddress } from "./PodAddress.js"
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
  // TODO: improve type signature
  readonly send: (address: PodAddress, envelope: Envelope.Encoded) => Effect<
    void,
    PodUnavailable
  >
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
