/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as HashMap from "effect/HashMap"
import type * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as internal from "./internal/shardManagerClient.js"
import type * as PodAddress from "./PodAddress.js"
import type * as ShardId from "./ShardId.js"
import type * as ShardingConfig from "./ShardingConfig.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ShardManagerClientTypeId: unique symbol = internal.ShardManagerClientTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type ShardManagerClientTypeId = typeof ShardManagerClientTypeId

/**
 * ShardManagerClient provides the methods exposed by the ShardManager and called by the Pod.
 *
 * @since 1.0.0
 * @category models
 */
export interface ShardManagerClient {
  readonly [ShardManagerClientTypeId]: ShardManagerClientTypeId
  readonly register: (podAddress: PodAddress.PodAddress) => Effect.Effect<void>
  readonly unregister: (podAddress: PodAddress.PodAddress) => Effect.Effect<void>
  readonly notifyUnhealthyPod: (podAddress: PodAddress.PodAddress) => Effect.Effect<void>
  readonly getAssignments: Effect.Effect<HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (args: Omit<ShardManagerClient, typeof ShardManagerClientTypeId>) => ShardManagerClient =
  internal.make

/**
 * @since 1.0.0
 * @category context
 */
export const ShardManagerClient: Context.Tag<ShardManagerClient, ShardManagerClient> = internal.shardManagerClientTag

/**
 * @since 1.0.0
 * @category layers
 */
export const local: Layer.Layer<ShardManagerClient, never, ShardingConfig.ShardingConfig> = internal.local
