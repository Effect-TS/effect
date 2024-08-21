/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { Duration } from "effect/Duration"
import * as InternalShardingConfig from "./internal/shardingConfig.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = InternalShardingConfig.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * Represents the configuration for the `Sharding` service on a given pod.
 *
 * @since 1.0.0
 * @category models
 */
export interface ShardingConfig {
  /**
   * The hostname or IP address of the pod.
   */
  readonly host: string
  /**
   * The port used for inter-pod communication.
   */
  readonly port: number
  /**
   * The number of shards to allocate to a pod.
   *
   * **Note**: this value should be consistent across all pods.
   */
  readonly numberOfShards: number
  // readonly shardManagerUri: string
  // readonly serverVersion: string
  /**
   * The maximum duration of inactivity (i.e. without receiving a message)
   * after which an entity will be interrupted.
   */
  readonly entityMaxIdleTime: Duration
  readonly entityTerminationTimeout: Duration
  // readonly refreshAssignmentsRetryInterval: Duration.Duration
  // readonly unhealthyPodReportInterval: Duration.Duration
}

/**
 * @since 1.0.0
 * @category context
 */
export const ShardingConfig: Tag<ShardingConfig, ShardingConfig> = InternalShardingConfig.Tag
