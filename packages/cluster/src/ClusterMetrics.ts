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
 * Largest in-flight request count of a single entity of a type on this runner,
 * compared against `mailboxCapacity` when returning `MailboxFull`.
 *
 * @since 1.0.0
 * @category metrics
 */
export const entityMailboxMax = Metric.gauge("effect_cluster_entity_mailbox_max", {
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
