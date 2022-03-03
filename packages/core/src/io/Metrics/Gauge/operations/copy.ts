import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { MetricLabel } from "../../MetricLabel"
import type { Gauge } from "../definition"
import { concreteGauge, InternalGauge } from "./_internal/InternalGauge"

/**
 * Returns a copy of this gauge with the specified name and/or tags.
 *
 * @tsplus fluent ets/Gauge copy
 */
export function copy_<A>(
  self: Gauge<A>,
  params?: Partial<{ readonly name: string; readonly tags: Chunk<MetricLabel> }>
): Gauge<A> {
  concreteGauge(self)
  return new InternalGauge(
    (params && params.name) || self.name,
    (params && params.tags) || self.tags,
    self.aspect
  )
}

/**
 * Returns a copy of this gauge with the specified name and/or tags.
 *
 * @ets_data_first copy_
 */
export function copy(
  params: Partial<{ readonly name: string; readonly tags: Chunk<MetricLabel> }>
) {
  return <A>(self: Gauge<A>): Gauge<A> => self.copy(params)
}
