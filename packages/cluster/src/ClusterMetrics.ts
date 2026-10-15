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
 * Duration of successful single-shard releases during graceful reassignment,
 * lock loss, or release of acquired-but-unwanted shards. Includes entity teardown,
 * singleton shutdown, lock release, reply-handler cleanup, retries, and any wait
 * for shard lock storage to recover. Interrupted releases, shutdown handoff, and
 * forced releases are not recorded.
 *
 * @since 1.0.0
 * @category metrics
 */
export const shardReleaseDuration = Metric.timer(
  "effect_cluster_shard_release_duration_ms",
  "Duration of successful single-shard releases (reassignment, lock loss, or acquired-but-unwanted shards), including teardown, retries, reply-handler cleanup, and waiting for shard lock storage recovery; excludes interrupted releases, shutdown handoff, and forced releases"
)
