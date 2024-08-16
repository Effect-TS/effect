/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as HashMap from "effect/HashMap"
import type * as Option from "effect/Option"
import type * as Stream from "effect/Stream"
import * as internal from "./internal/shardManager.js"
import type * as Pod from "./Pod.js"
import type * as PodAddress from "./PodAddress.js"
import type * as ShardId from "./ShardId.js"
import type * as ShardingEvent from "./ShardingEvent.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ShardManagerTypeId: unique symbol = internal.ShardManagerTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ShardManagerTypeId = typeof ShardManagerTypeId

/**
 * @since 1.0.0
 * @category context
 */
export const ShardManager = internal.shardManagerTag

/**
 * @since 1.0.0
 * @category models
 */
export interface ShardManager {
  readonly getShardingEvents: Stream.Stream<ShardingEvent.ShardingEvent>
  readonly register: (pod: Pod.Pod) => Effect.Effect<void>
  readonly unregister: (podAddress: PodAddress.PodAddress) => Effect.Effect<void>
  readonly notifyUnhealthyPod: (podAddress: PodAddress.PodAddress) => Effect.Effect<void>
  readonly checkAllPodsHealth: Effect.Effect<void>
  readonly getAssignments: Effect.Effect<HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>>
  /* @internal */
  readonly rebalance: (rebalanceImmediately: boolean) => Effect.Effect<void>
  /* @internal */
  readonly persistPods: Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category layers
 */
export const live = internal.live
