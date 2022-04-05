import type { Boundaries } from "@effect-ts/core/io/Metrics/Histogram/definition";
import {
  concreteHistogram,
  InternalHistogram
} from "@effect-ts/core/io/Metrics/Histogram/operations/_internal/InternalHistogram";

/**
 * Returns a copy of this histogram with the specified name, boundaries, and/or
 * tags.
 *
 * @tsplus fluent ets/Histogram copy
 */
export function copy_<A>(
  self: Histogram<A>,
  params?: Partial<{
    readonly name: string;
    readonly boundaries: Boundaries;
    readonly tags: Chunk<MetricLabel>;
  }>
): Histogram<A> {
  concreteHistogram(self);
  return new InternalHistogram(
    (params && params.name) || self.name,
    (params && params.boundaries) || self.boundaries,
    (params && params.tags) || self.tags,
    self.aspect
  );
}

/**
 * Returns a copy of this histogram with the specified name, boundaries, and/or
 * tags.
 *
 * @tsplus static ets/Histogram/Aspects copy
 */
export const copy = Pipeable(copy_);
