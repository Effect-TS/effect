/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type { DurationInput } from "effect/Duration"

/**
 * Represents the configuration for the `Sharding` service on a given pod.
 *
 * @since 1.0.0
 * @category models
 */
export class ShardingConfig extends Context.Tag("@effect/cluster/ShardingConfig")<ShardingConfig, {
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
  readonly entityMaxIdleTime: DurationInput
  readonly entityTerminationTimeout: DurationInput
  // readonly refreshAssignmentsRetryInterval: Duration.Duration
  // readonly unhealthyPodReportInterval: Duration.Duration
  /**
   * Simulate serialization and deserialization to remote pods for local
   * entities.
   */
  readonly simulateRemoteSerialization: boolean
}>() {}
