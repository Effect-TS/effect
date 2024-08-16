/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { TaggedEnum } from "effect/Data"
import type { DurationInput } from "effect/Duration"
import type { Effect } from "effect/Effect"
import type { HashMap } from "effect/HashMap"
import type { HashSet } from "effect/HashSet"
import type { Layer } from "effect/Layer"
import type { Option } from "effect/Option"
import type { Stream } from "effect/Stream"
import * as InternalShardManager from "./internal/shardManager.js"
import * as InternalShardManagerClient from "./internal/shardManagerClient.js"
import type { Pod } from "./Pod.js"
import type { PodAddress } from "./PodAddress.js"
import type { Pods } from "./Pods.js"
import type { PodsHealth } from "./PodsHealth.js"
import type { ShardId } from "./ShardId.js"
import type { ShardingConfig } from "./ShardingConfig.js"
import type { Storage } from "./Storage.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = InternalShardManager.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const ClientTypeId: unique symbol = InternalShardManagerClient.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type ClientTypeId = typeof ClientTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface ShardManager extends ShardManager.Proto {
  /**
   * Get all shard assignments.
   */
  readonly getAssignments: Effect<HashMap<ShardId, Option<PodAddress>>>
  /**
   * Get a stream of sharding events emit by the shard manager.
   */
  readonly getShardingEvents: Stream<ShardManager.ShardingEvent>
  /**
   * Register a new pod with the cluster.
   */
  readonly register: (pod: Pod) => Effect<void>
  /**
   * Unregister a pod from the cluster.
   */
  readonly unregister: (address: PodAddress) => Effect<void>
  /**
   * Rebalance shards assigned to pods within the cluster.
   */
  readonly rebalance: (immediate: boolean) => Effect<void>
  /**
   * Notify the cluster of an unhealthy pod.
   */
  readonly notifyUnhealthyPod: (address: PodAddress) => Effect<void>
  /**
   * Check and repot on the health of all pods in the cluster.
   */
  readonly checkPodHealth: Effect<void>
}

/**
 * @since 1.0.0
 */
export declare namespace ShardManager {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [TypeId]: TypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Config {
    /**
     * The port to use to expose the manager API.
     */
    readonly port: number
    /**
     * The number of shards to allocate to a pod.
     *
     * **Note**: this value should be consistent across all pods.
     */
    readonly numberOfShards: number
    /**
     * The interval on which regular rebalancing of shards will occur.
     */
    readonly rebalanceInterval: DurationInput
    /**
     * The interval on which rebalancing of shards which failed to be
     * rebalanced will be retried.
     */
    readonly rebalanceRetryInterval: DurationInput
    /**
     * The maximum ratio of shards to rebalance at once.
     *
     * **Note**: this value should be a number between `0` and `1`.
     */
    readonly rebalanceRate: number
    /**
     * The interval on which persistence of pods will be retried if it fails.
     */
    readonly persistRetryInterval: DurationInput
    /**
     * The number of times persistence of pods will be retried if it fails.
     */
    readonly persistRetryCount: number
    /**
     * The interval on which pod health will be checked.
     */
    readonly podHealthCheckInterval: DurationInput
    /**
     * The length of time to wait for a pod to respond to a ping.
     */
    readonly podPingTimeout: DurationInput
  }

  /**
   * Represents a client which can be used to communicate with the
   * `ShardManager`.
   *
   * @since 1.0.0
   * @category models
   */
  export interface Client {
    readonly [ClientTypeId]: ClientTypeId
    /**
     * Register a new pod with the cluster.
     */
    readonly register: (address: PodAddress) => Effect<void>
    /**
     * Unregister a pod from the cluster.
     */
    readonly unregister: (address: PodAddress) => Effect<void>
    /**
     * Notify the cluster of an unhealthy pod.
     */
    readonly notifyUnhealthyPod: (address: PodAddress) => Effect<void>
    /**
     * Get all shard assignments.
     */
    readonly getAssignments: Effect<HashMap<ShardId, Option<PodAddress>>>
  }

  /**
   * Represents configuration required to connect to the `ShardManager`.
   *
   * @since 1.0.0
   * @category models
   */
  export interface ClientConfig {
    /**
     * The host of the `ShardManager` instance.
     */
    readonly host: string
    /**
     * The port that the `ShardManager` is exposed on.
     */
    readonly port: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type ShardingEvent = TaggedEnum<{
    readonly ShardsAssigned: {
      readonly address: PodAddress
      readonly shards: HashSet<ShardId>
    }
    readonly ShardsUnassigned: {
      readonly address: PodAddress
      readonly shards: HashSet<ShardId>
    }
    readonly PodRegistered: {
      readonly address: PodAddress
    }
    readonly PodUnregistered: {
      readonly address: PodAddress
    }
    readonly PodHealthChecked: {
      readonly address: PodAddress
    }
  }>
}

/**
 * @since 1.0.0
 * @category context
 */
export const ShardManager: Tag<ShardManager, ShardManager> = InternalShardManager.Tag

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: (
  config?: Partial<ShardManager.Config>
) => Layer<ShardManager, never, Storage | PodsHealth | Pods> = InternalShardManager.layer

/**
 * A layer that constructs a client which mocks connecting to the
 * `ShardManager`.
 *
 * Useful for testing with a single pod.
 *
 * @since 1.0.0
 * @category layer
 */
export const layerClientLocal: Layer<ShardManager.Client, never, ShardingConfig> = InternalShardManagerClient.layerLocal
