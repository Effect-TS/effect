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
 * Time taken to release a shard after it is reassigned or its lock is lost,
 * from entity teardown until the release completes. Includes retries and any
 * wait for shard lock storage to recover.
 *
 * Only successful releases are recorded. Shutdown handoff and forced releases
 * are not.
 *
 * @since 1.0.0
 * @category metrics
 */
export const shardReleaseDuration = Metric.timer(
  "effect_cluster_shard_release_duration_ms",
  "Time taken to release a reassigned shard, including entity teardown, retries and lock storage recovery. Excludes shutdown handoff and forced releases"
)
