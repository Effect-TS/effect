/**
 * @since 1.0.0
 */
import * as Metric from "effect/Metric"

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
export const singletons = Metric.gauge("effect_cluster_singletons", {
  bigint: true
})

/**
 * @since 1.0.0
 * @category metrics
 */
export const runners = Metric.gauge("effect_cluster_runners", {
  bigint: true
})

/**
 * @since 1.0.0
 * @category metrics
 */
export const runnersHealthy = Metric.gauge("effect_cluster_runners_healthy", {
  bigint: true
})

/**
 * @since 1.0.0
 * @category metrics
 */
export const shards = Metric.gauge("effect_cluster_shards", {
  bigint: true
})

/**
 * Time taken to release a single shard, including entity shutdown and retries.
 *
 * @since 1.0.0
 * @category metrics
 */
export const shardReleaseDuration = Metric.timer(
  "effect_cluster_shard_release_duration_ms",
  "Time taken to release a single shard, including entity shutdown and retries"
)
