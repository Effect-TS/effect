import * as Metric from "effect/Metric"

/** @internal */
export const shards = Metric.gauge("effect_cluster_shards")

/** @internal */
export const entities = Metric.gauge("effect_cluster_entities", {
  bigint: true
}).pipe(Metric.withConstantInput(BigInt(1)))

/** @internal */
export const singletons = Metric.gauge("effect_cluster_singletons")

/** @internal */
export const pods = Metric.gauge("effect_cluster_pods")

/** @internal */
export const assignedShards = Metric.gauge("effect_cluster_shards_assigned")

/** @internal */
export const unassignedShards = Metric.gauge("effect_cluster_shards_unassigned")

/** @internal */
export const rebalances = Metric.counter("effect_cluster_rebalances")

/** @internal */
export const podHealthChecked = Metric.counter("effect_cluster_pod_health_checked")
