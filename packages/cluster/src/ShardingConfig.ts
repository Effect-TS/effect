/**
 * @since 1.0.0
 */
import type * as ConfigError from "effect/ConfigError"
import type * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/shardingConfig.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ShardingConfigTypeId: unique symbol = internal.ShardingConfigTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ShardingConfigTypeId = typeof ShardingConfigTypeId

/**
 * Sharding configuration
 * @param numberOfShards number of shards (see documentation on how to choose this), should be same on all nodes
 * @param selfHost hostname or IP address of the current pod
 * @param shardingPort port used for pods to communicate together
 * @param shardManagerUri url of the Shard Manager API
 * @param serverVersion version of the current pod
 * @param entityMaxIdleTime time of inactivity (without receiving any message) after which an entity will be interrupted
 * @param entityTerminationTimeout time we give to an entity to handle the termination message before interrupting it
 * @param refreshAssignmentsRetryInterval retry interval in case of failure getting shard assignments from storage
 * @param unhealthyPodReportInterval interval to report unhealthy pods to the Shard Manager (this exists to prevent calling the Shard Manager for each failed message)
 * @since 1.0.0
 * @category models
 */
export interface ShardingConfig {
  readonly numberOfShards: number
  readonly selfHost: string
  readonly shardingPort: number
  readonly shardManagerUri: string
  readonly serverVersion: string
  readonly entityMaxIdleTime: Duration.Duration
  readonly entityTerminationTimeout: Duration.Duration
  readonly refreshAssignmentsRetryInterval: Duration.Duration
  readonly unhealthyPodReportInterval: Duration.Duration
}

/**
 * @since 1.0.0
 * @category context
 */
export const ShardingConfig: Context.Tag<ShardingConfig, ShardingConfig> = internal.shardingConfigTag

/**
 * Provides the default values for the ShardingConfig.
 *
 * @since 1.0.0
 * @category layers
 */
export const defaults: Layer.Layer<ShardingConfig> = internal.defaults

/**
 * Provides the ShardingConfig, values that are omitted will be read from the defaults
 *
 * @since 1.0.0
 * @category layers
 */
export const withDefaults: (customs: Partial<ShardingConfig>) => Layer.Layer<ShardingConfig> = internal.withDefaults

/**
 * Reads the ShardingConfig from the effect/ConfigProvider
 *
 * @since 1.0.0
 * @category layers
 */
export const fromConfig: Layer.Layer<ShardingConfig, ConfigError.ConfigError> = internal.fromConfig
