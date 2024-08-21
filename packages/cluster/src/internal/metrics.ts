import * as Metric from "effect/Metric"

/** @internal */
export const shards = Metric.gauge("effect_cluster_shards")

/** @internal */
export const entities = Metric.gauge("effect_cluster_entities", {
  bigint: true
}).pipe(Metric.withConstantInput(BigInt(1)))

/** @internal */
export const singletons = Metric.gauge("effect_cluster_singletons")
