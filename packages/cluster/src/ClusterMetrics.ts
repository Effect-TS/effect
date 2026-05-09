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
