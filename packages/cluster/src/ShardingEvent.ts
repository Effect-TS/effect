/**
 * @since 1.0.0
 */
import type * as HashSet from "effect/HashSet"
import type * as PodAddress from "./PodAddress.js"
import type * as ShardId from "./ShardId.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface ShardsAssigned {
  readonly _tag: "ShardsAssigned"
  readonly pod: PodAddress.PodAddress
  readonly shards: HashSet.HashSet<ShardId.ShardId>
}

/**
 * Constructs the event that occurs when new shards are assigned to Pod.
 *
 * @since 1.0.0
 * @category constructors
 */
export function ShardsAssigned(
  pod: PodAddress.PodAddress,
  shards: HashSet.HashSet<ShardId.ShardId>
): ShardsAssigned {
  return { _tag: "ShardsAssigned", pod, shards }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ShardsUnassigned {
  readonly _tag: "ShardsUnassigned"
  readonly pod: PodAddress.PodAddress
  readonly shards: HashSet.HashSet<ShardId.ShardId>
}

/**
 * Constructs the event that occurs when shards are unassigned to a Pod
 * @since 1.0.0
 * @category constructors
 */
export function ShardsUnassigned(
  pod: PodAddress.PodAddress,
  shards: HashSet.HashSet<ShardId.ShardId>
): ShardsUnassigned {
  return { _tag: "ShardsUnassigned", pod, shards }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface PodHealthChecked {
  readonly _tag: "PodHealthChecked"
  readonly pod: PodAddress.PodAddress
}

/**
 * Constructs the event that occurs when the health of a Pod has been checked
 *
 * @since 1.0.0
 * @category constructors
 */
export function PodHealthChecked(pod: PodAddress.PodAddress): PodHealthChecked {
  return { _tag: "PodHealthChecked", pod }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface PodRegistered {
  readonly _tag: "PodRegistered"
  readonly pod: PodAddress.PodAddress
}

/**
 * Constructs the event that occurs when a new Pod has registered
 *
 * @since 1.0.0
 * @category constructors
 */
export function PodRegistered(pod: PodAddress.PodAddress): PodRegistered {
  return { _tag: "PodRegistered", pod }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface PodUnregistered {
  readonly _tag: "PodUnregistered"
  readonly pod: PodAddress.PodAddress
}

/**
 * Constructs the event that occurs when a pod has unregistered
 *
 * @since 1.0.0
 * @category constructors
 */
export function PodUnregistered(pod: PodAddress.PodAddress): PodUnregistered {
  return { _tag: "PodUnregistered", pod }
}

/**
 * This are the events that may occur over the ShardManager during its lifetime.
 *
 * @since 1.0.0
 * @category models
 */
export type ShardingEvent =
  | ShardsAssigned
  | ShardsUnassigned
  | PodHealthChecked
  | PodRegistered
  | PodUnregistered
