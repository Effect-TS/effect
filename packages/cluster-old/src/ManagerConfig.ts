/**
 * @since 1.0.0
 */
import type * as ConfigError from "effect/ConfigError"
import type * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/managerConfig.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ManagerConfigTypeId: unique symbol = internal.ManagerConfigTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ManagerConfigTypeId = typeof ManagerConfigTypeId

/**
 * This is the Shard Manager configuration.
 *
 * @param numberOfShards number of shards (see documentation on how to choose this), should be same on all nodes
 * @param apiPort port to expose the GraphQL API
 * @param rebalanceInterval interval for regular rebalancing of shards
 * @param rebalanceRetryInterval retry interval for rebalancing when some shards failed to be rebalanced
 * @param pingTimeout time to wait for a pod to respond to a ping request
 * @param persistRetryInterval retry interval for persistence of pods and shard assignments
 * @param persistRetryCount max retry count for persistence of pods and shard assignments
 * @param rebalanceRate max ratio of shards to rebalance at once
 * @since 1.0.0
 * @category models
 */
export interface ManagerConfig {
  readonly numberOfShards: number
  readonly apiPort: number
  readonly rebalanceInterval: Duration.Duration
  readonly rebalanceRetryInterval: Duration.Duration
  readonly pingTimeout: Duration.Duration
  readonly persistRetryInterval: Duration.Duration
  readonly persistRetryCount: number
  readonly rebalanceRate: number
}

/**
 * @since 1.0.0
 * @category context
 */
export const ManagerConfig: Context.Tag<ManagerConfig, ManagerConfig> = internal.managerConfigTag

/**
 * Uses the default as ManagerConfig.
 *
 * @since 1.0.0
 * @category utils
 */
export const defaults: Layer.Layer<ManagerConfig> = internal.defaults

/**
 * Reads the ManagerConfig from the provided Config.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromConfig: Layer.Layer<ManagerConfig, ConfigError.ConfigError, never> = internal.fromConfig
