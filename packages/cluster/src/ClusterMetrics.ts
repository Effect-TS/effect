/**
 * @since 1.0.0
 */
import * as Metric from "effect/Metric"

/**
 * @since 1.0.0
 * @category metrics
 */
export const shards = Metric.gauge("effect_cluster_shards")

/**
 * @since 1.0.0
 * @category metrics
 */
export const entities = Metric.gauge("effect_cluster_entities", {
  bigint: true
})

/**
 * @since 1.0.0
 * @category metrics
 */
export const mailboxSize = Metric.gauge("effect_cluster_mailbox_size", {
  bigint: true
})

/**
 * @since 1.0.0
 * @category metrics
 */
export const singletons = Metric.gauge("effect_cluster_singletons")

/**
 * @since 1.0.0
 * @category metrics
 */
export const runners = Metric.gauge("effect_cluster_runners")

/**
 * @since 1.0.0
 * @category metrics
 */
export const assignedShards = Metric.gauge("effect_cluster_shards_assigned")

/**
 * @since 1.0.0
 * @category metrics
 */
export const unassignedShards = Metric.gauge("effect_cluster_shards_unassigned")

/**
 * @since 1.0.0
 * @category metrics
 */
export const rebalances = Metric.counter("effect_cluster_rebalances")

/**
 * @since 1.0.0
 * @category metrics
 */
export const runnerHealthChecked = Metric.counter("effect_cluster_runner_health_checked")
