import { concreteGauge, InternalGauge } from "@effect/core/io/Metrics/Gauge/operations/_internal/InternalGauge";

/**
 * Returns a copy of this gauge with the specified name and/or tags.
 *
 * @tsplus fluent ets/Gauge copy
 */
export function copy_<A>(
  self: Gauge<A>,
  params?: Partial<{ readonly name: string; readonly tags: Chunk<MetricLabel>; }>
): Gauge<A> {
  concreteGauge(self);
  return new InternalGauge(
    (params && params.name) || self.name,
    (params && params.tags) || self.tags,
    self.aspect
  );
}

/**
 * Returns a copy of this gauge with the specified name and/or tags.
 *
 * @tsplus static ets/Gauge/Aspects copy
 */
export const copy = Pipeable(copy_);
